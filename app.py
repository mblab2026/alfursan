"""
AlFursan award-seat finder — backend service.

Pulls AlFursan (Saudia) award availability from the seats.aero Pro API on a
schedule, keeps a cached copy on disk, and serves the web page plus a small
JSON endpoint the page reads. The API key never reaches the browser.
"""

import os
import json
import atexit
import threading
import datetime

import requests
from flask import Flask, jsonify, send_from_directory, request
from werkzeug.middleware.proxy_fix import ProxyFix

# ---- configuration (all from environment / .env) ----
API_KEY = os.environ.get("SEATS_API_KEY", "").strip()
SOURCE = os.environ.get("SEATS_SOURCE", "saudia").strip()          # AlFursan program slug
ORIGIN_REGION = os.environ.get("ORIGIN_REGION", "Asia").strip()    # "" = no region filter
ORIGIN_COUNTRY = os.environ.get("ORIGIN_COUNTRY", "Saudi Arabia").strip()  # used when ORIGINS is empty
ORIGINS = [x.strip().upper() for x in os.environ.get("ORIGINS", "").split(",") if x.strip()]  # empty = all cities in ORIGIN_COUNTRY
REFRESH_HOURS = float(os.environ.get("REFRESH_HOURS", "6"))
DATA_DIR = os.environ.get("DATA_DIR", "/data")
PORT = int(os.environ.get("PORT", "8080"))
REFRESH_PASSWORD = os.environ.get("REFRESH_PASSWORD", "").strip()  # empty = refresh open; set = password required

BASE = "https://seats.aero/partnerapi"
HERE = os.path.dirname(os.path.abspath(__file__))
CACHE_FILE = os.path.join(DATA_DIR, "cache.json")

app = Flask(__name__, static_folder="static", static_url_path="/static")
# Honor X-Forwarded-* from the upstream TLS terminator / tunnel (scheme, host, port, client IP).
# The app emits no redirects today, but this keeps request.scheme/host correct behind the proxy.
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1)

# ---- airport -> city/country lookup ----
with open(os.path.join(HERE, "static", "airports.json"), encoding="utf-8") as fh:
    AIRPORTS = json.load(fh)

# Supplementary entries for airports missing from / outdated in the open dataset.
EXTRA_AIRPORTS = {
    "RSI": {"c": "Red Sea (Umluj)", "k": "Saudi Arabia"},   # Red Sea International
    "AQI": {"c": "Al Qaisumah", "k": "Saudi Arabia"},
    "NUM": {"c": "Neom Bay", "k": "Saudi Arabia"},
    "ULH": {"c": "AlUla", "k": "Saudi Arabia"},
}


def city_of(iata):
    a = EXTRA_AIRPORTS.get(iata) or AIRPORTS.get(iata)
    return a["c"] if a else iata


def country_of(iata):
    a = EXTRA_AIRPORTS.get(iata) or AIRPORTS.get(iata)
    return a["k"] if a else "—"


# ---- shared state ----
state = {"updated": None, "records": [], "status": "starting", "error": None}
lock = threading.Lock()
refresh_guard = threading.Lock()  # ensures only one refresh runs at a time
_stop = threading.Event()         # set on shutdown so the scheduler's sleep is interruptible


def _cabin(obj, letter):
    """Extract one cabin (Y/J/F) from a seats.aero availability object."""
    if not obj.get(letter + "Available"):
        return None
    try:
        miles = int(obj.get(letter + "MileageCost") or 0)
    except (ValueError, TypeError):
        miles = 0
    return {
        "miles": miles,
        "seats": obj.get(letter + "RemainingSeats") or 0,
        "direct": bool(obj.get(letter + "Direct")),
        "airlines": obj.get(letter + "Airlines") or "",
    }


def fetch_all():
    """Page through Bulk Availability for the AlFursan program."""
    if not API_KEY:
        raise RuntimeError("SEATS_API_KEY is not set")
    headers = {"Partner-Authorization": API_KEY, "accept": "application/json"}
    collected = []
    cursor = None
    skip = 0
    pages = 0
    while True:
        params = {"source": SOURCE, "take": 1000}
        # full program pull — no region filter, so every origin & destination is captured
        if cursor is not None:
            params["cursor"] = cursor
            params["skip"] = skip
        resp = requests.get(BASE + "/availability", headers=headers, params=params, timeout=90)
        resp.raise_for_status()
        body = resp.json()
        data = body.get("data", [])
        collected.extend(data)
        pages += 1
        if not body.get("hasMore"):
            break
        cursor = body.get("cursor")
        skip = len(collected)
        if pages > 300:  # safety stop
            break
    return collected


def transform(raw):
    """Keep flights leaving our origin airports; compress to small records."""
    recs = []
    for obj in raw:
        route = obj.get("Route", {}) or {}
        origin = route.get("OriginAirport")
        dest = route.get("DestinationAirport")
        if not origin or not dest:
            continue
        rec = {
            "id": obj.get("ID"),
            "o": origin,
            "ocity": city_of(origin),
            "d": dest,
            "date": obj.get("Date"),
            "dcity": city_of(dest),
            "dcountry": country_of(dest),
            "Y": _cabin(obj, "Y"),
            "J": _cabin(obj, "J"),
            "F": _cabin(obj, "F"),
        }
        if rec["Y"] or rec["J"] or rec["F"]:
            recs.append(rec)
    return recs


def save_cache():
    os.makedirs(DATA_DIR, exist_ok=True)
    # write atomically so a shutdown mid-write can never leave a corrupt cache
    tmp = CACHE_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump({"updated": state["updated"], "records": state["records"]}, fh, ensure_ascii=False)
    os.replace(tmp, CACHE_FILE)


def load_cache():
    try:
        with open(CACHE_FILE, encoding="utf-8") as fh:
            cached = json.load(fh)
        state["records"] = cached.get("records", [])
        state["updated"] = cached.get("updated")
        if state["records"]:
            state["status"] = "ok"
    except (FileNotFoundError, json.JSONDecodeError):
        pass


def refresh():
    # skip if a refresh is already in progress (protects the daily API quota)
    if not refresh_guard.acquire(blocking=False):
        print("[refresh] skipped — already running", flush=True)
        return
    try:
        with lock:
            state["status"] = "refreshing"
        raw = fetch_all()
        recs = transform(raw)
        with lock:
            state["records"] = recs
            state["updated"] = datetime.datetime.utcnow().isoformat(timespec="seconds") + "Z"
            state["status"] = "ok"
            state["error"] = None
        save_cache()
        print(f"[refresh] ok — {len(recs)} records from {len(raw)} availability objects", flush=True)
    except Exception as exc:  # noqa: BLE001 - surface any failure to the UI
        with lock:
            state["status"] = "error"
            state["error"] = str(exc)
        print(f"[refresh] error: {exc}", flush=True)
    finally:
        refresh_guard.release()


def scheduler():
    load_cache()
    refresh()
    # interruptible wait: _stop.wait() returns True the moment _stop is set,
    # so the daemon thread never delays shutdown. Same cadence as before.
    while not _stop.wait(max(0.25, REFRESH_HOURS) * 3600):
        refresh()


# ---- routes ----
@app.route("/")
def index():
    return send_from_directory("static", "index.html")


@app.route("/flights/<frm>")
def filters_page(frm):
    return send_from_directory("static", "filters.html")


@app.route("/flights/<frm>/results")
def results_page(frm):
    return send_from_directory("static", "results.html")


@app.route("/flights/<frm>/<to>")
def detail_page(frm, to):
    return send_from_directory("static", "detail.html")


@app.route("/api/data")
def api_data():
    frm = (request.args.get("from") or "").strip().upper()
    with lock:
        recs = state["records"]
        meta = {"updated": state["updated"], "status": state["status"], "error": state["error"], "refreshProtected": bool(REFRESH_PASSWORD)}
    # distinct departure cities present in the data: Saudi cities first, then busiest
    counts, cities = {}, {}
    for r in recs:
        counts[r["o"]] = counts.get(r["o"], 0) + 1
        cities[r["o"]] = r.get("ocity", r["o"])
    origins = sorted(
        (
            {"iata": o, "city": cities[o], "country": country_of(o),
             "saudi": country_of(o) == "Saudi Arabia", "n": counts[o]}
            for o in counts
        ),
        key=lambda x: (not x["saudi"], -x["n"]),
    )
    meta["origins"] = origins
    # records are returned only for a specific departure city, to keep each payload small
    meta["records"] = [r for r in recs if r["o"] == frm] if frm else []
    if frm:
        meta["from"] = {"iata": frm, "city": city_of(frm), "country": country_of(frm)}
    resp = jsonify(meta)
    # The big per-city payload (~3MB) changes only every refresh cycle, so let the
    # browser cache it briefly: navigating filter -> results -> detail reuses one download.
    # The status/origins response (no ?from=) must stay fresh.
    resp.headers["Cache-Control"] = "private, max-age=300" if frm else "no-store"
    return resp


@app.route("/api/trips/<aid>")
def api_trips(aid):
    """On-demand flight-level detail (flight numbers, times, booking links) for one availability object."""
    if not API_KEY:
        return jsonify({"ok": False, "error": "no api key"}), 400
    headers = {"Partner-Authorization": API_KEY, "accept": "application/json"}
    try:
        resp = requests.get(f"{BASE}/trips/{aid}", headers=headers, timeout=30)
        resp.raise_for_status()
        body = resp.json()
    except Exception as exc:  # noqa: BLE001
        return jsonify({"ok": False, "error": str(exc)}), 502
    trips = []
    for t in (body.get("data") or []):
        trips.append({
            "cabin": t.get("Cabin"),
            "flightNumbers": t.get("FlightNumbers"),
            "stops": t.get("Stops"),
            "carriers": t.get("Carriers"),
            "seats": t.get("RemainingSeats"),
            "miles": t.get("MileageCost"),
            "departsAt": t.get("DepartsAt"),
            "arrivesAt": t.get("ArrivesAt"),
            "duration": t.get("TotalDuration"),
            "segments": [
                {
                    "fn": s.get("FlightNumber"),
                    "o": s.get("OriginAirport"),
                    "d": s.get("DestinationAirport"),
                    "dep": s.get("DepartsAt"),
                    "arr": s.get("ArrivesAt"),
                    "aircraft": s.get("AircraftName"),
                }
                for s in (t.get("AvailabilitySegments") or [])
            ],
        })
    return jsonify({"ok": True, "trips": trips, "booking_links": body.get("booking_links", [])})


@app.route("/api/refresh")
def api_refresh():
    # No password configured => the endpoint is DISABLED (closed by default), not open.
    if not REFRESH_PASSWORD:
        return jsonify({"ok": False, "error": "refresh disabled"}), 403
    # Password configured => require a matching X-Refresh-Key header.
    if request.headers.get("X-Refresh-Key", "") != REFRESH_PASSWORD:
        return jsonify({"ok": False, "error": "unauthorized"}), 401
    if refresh_guard.locked():
        return jsonify({"ok": True, "message": "already refreshing"})
    threading.Thread(target=refresh, daemon=True).start()
    return jsonify({"ok": True, "message": "refresh started"})


@app.route("/healthz")
def healthz():
    return jsonify({"status": state["status"], "updated": state["updated"]})


# Stop the scheduler cleanly when the process exits — including when a gunicorn worker
# exits on SIGTERM (atexit fires on normal interpreter shutdown); _stop.wait() then returns
# immediately, so nothing lingers and the container stops fast.
atexit.register(_stop.set)

# start the background scheduler as soon as the module is imported (works under gunicorn too)
threading.Thread(target=scheduler, daemon=True).start()

if __name__ == "__main__":
    import signal
    # Direct-run path: stop the scheduler cleanly on termination.
    # (Under gunicorn, gunicorn owns the signals; the daemon thread + atomic cache
    #  writes already guarantee a fast, safe shutdown.)
    signal.signal(signal.SIGTERM, lambda *_: _stop.set())
    signal.signal(signal.SIGINT, lambda *_: _stop.set())
    app.run(host="0.0.0.0", port=PORT)
