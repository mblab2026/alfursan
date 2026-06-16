# AlFursan Seats Finder

`alfursan` — a small self-hosted web app that shows Saudia **AlFursan** award-flight
availability (seats bookable with miles), pulled from the seats.aero Pro API. A
Python/Flask backend fetches and caches the data on a schedule and serves a single-page
frontend plus a tiny JSON API. **The seats.aero API key is used server-side only and never
reaches the browser.**

- **Version:** 1.1.0
- **Port:** 8080 (plain HTTP — TLS is terminated upstream by the proxy / Cloudflare tunnel)
- **Public domain:** https://alfursan.globalmblab.com
- **Image:** `ghcr.io/mblab2026/alfursan:1.1.0`

---

## Configuration (environment variables)

All configuration is via environment variables, supplied through a `.env` file
(`env_file` in compose). Copy `.env.example` to `.env` and fill it in. **Only
`SEATS_API_KEY` is a hard secret** — keep it out of the image and out of version control.

| Variable           | Default         | Secret? | Purpose |
|--------------------|-----------------|---------|---------|
| `SEATS_API_KEY`    | (none)          | **YES** | seats.aero Pro key, sent server-side as the `Partner-Authorization` header. The container **refuses to start** if this is empty. Never bake it into the image. |
| `SEATS_SOURCE`     | `saudia`        | no      | seats.aero program slug for AlFursan. First thing to change if results come back empty. |
| `ORIGIN_REGION`    | `Asia`          | no      | Restrict the bulk pull to one region (keeps API usage low). Empty = all regions. |
| `ORIGIN_COUNTRY`   | `Saudi Arabia`  | no      | Used only when `ORIGINS` is empty — keeps flights whose origin airport is in this country. |
| `ORIGINS`          | (empty)         | no      | Comma-separated IATA codes to restrict departure cities (e.g. `RUH,JED`). Empty = every city in `ORIGIN_COUNTRY`. |
| `REFRESH_HOURS`    | `6`             | no      | Hours between automatic background refreshes. |
| `REFRESH_PASSWORD` | (empty)         | sensitive | Gates the manual `/api/refresh` endpoint. **Empty = endpoint disabled (returns 403).** Set a value to require it via the `X-Refresh-Key` header. |
| `DATA_DIR`         | `/data`         | no      | Directory for the on-disk cache. Set to `/data` in the image; the data volume mounts here. |
| `PORT`             | `8080`          | no      | Listen port. Gunicorn binds `0.0.0.0:$PORT`. |

A real key is **never** committed. `.env`, `data/`, and `cache.json` are git-ignored and
docker-ignored.

---

## Data / persistence

The app is **not** stateless and uses **no database**. It writes a single cache file,
`cache.json`, to the `/data` volume (`DATA_DIR`). On startup it loads the cache (serving
stale data immediately if present), then refreshes from the API. The provided compose file
mounts a named Docker volume **`alfursan-data`** at `/data` — this is the only writable
mount (the container root filesystem is read-only). The cache is regenerable, so losing the
volume is harmless beyond one extra refresh on next start.

---

## Endpoints

- `GET /` — the single-page UI.
- `GET /api/data` — cached records + metadata (and `refreshProtected`).
- `GET /api/trips/<id>` — on-demand flight-level detail (1 API call each).
- `GET /api/refresh` — manual refresh (see `REFRESH_PASSWORD` above; disabled unless set).
- `GET /healthz` — liveness: `{"status": ..., "updated": ...}` (used by the image HEALTHCHECK).

---

## Release method 1 — public image (pull and run)

No source needed. Create a `.env` (see the table above), then use a small compose file
that references the public image:

```bash
mkdir -p alfursan && cd alfursan

cat > .env <<'ENV'
SEATS_API_KEY=pro_your_real_key_here
SEATS_SOURCE=saudia
ORIGIN_REGION=Asia
ORIGINS=
REFRESH_HOURS=6
REFRESH_PASSWORD=choose_a_strong_value
ENV
chmod 600 .env

cat > docker-compose.yml <<'YAML'
services:
  alfursan:
    image: ghcr.io/mblab2026/alfursan:1.1.0
    container_name: alfursan
    env_file: .env
    ports:
      - "8080:8080"
    volumes:
      - alfursan-data:/data
    tmpfs:
      - /tmp
    read_only: true
    security_opt:
      - no-new-privileges:true
    restart: unless-stopped
volumes:
  alfursan-data:
YAML

docker compose pull
docker compose up -d
```

### One-command setup (wraps method 1)

`setup.sh` does all of the above interactively (checks Docker, hidden prompts for the key
and refresh password, auto-generates a strong refresh password if you leave it blank, writes
a `0600` .env, then pulls and starts):

```bash
curl -fsSL https://raw.githubusercontent.com/mblab2026/alfursan/main/setup.sh | bash
```

---

## Release method 2 — source build (build on the target)

Ship the source tree (this repo) to the target and build locally. The compose file declares
both `build: .` and the image tag, so this also produces a correctly named local image.

```bash
# from the project root, with a populated .env present
cp .env.example .env        # then edit .env and set SEATS_API_KEY
chmod 600 .env
docker compose up -d --build
```

To publish the built image to GHCR afterward:

```bash
echo "$GHCR_TOKEN" | docker login ghcr.io -u <github-user> --password-stdin
docker compose build
docker compose push          # pushes ghcr.io/mblab2026/alfursan:1.1.0
```

---

## Release method 3 — offline image tar (no registry, no source bundle)

Use this to move the **image** between machines without a registry and without shipping a
source bundle. Build/pull once, save to a `.tar`, copy it across, and load it.

```bash
# on a machine that has the image
docker save ghcr.io/mblab2026/alfursan:1.1.0 -o alfursan-1.1.0.tar

# copy alfursan-1.1.0.tar to the target, then on the target:
docker load -i alfursan-1.1.0.tar

# create .env and an image-based docker-compose.yml (as in method 1), then:
docker compose up -d
```

> **Note:** the offline `.tar` is just a way to **ship the image without a source bundle**.
> It does **not** protect or hide the source code — a Python image still contains the
> readable `app.py` and assets. Treat the image as readable; true source protection is out
> of scope here.

---

## Operating notes

- **Exactly one Gunicorn worker** — the in-process refresh scheduler must run once and only
  once; never raise `--workers` (it would multiply API calls). Concurrency uses threads.
- Logs go to stdout/stderr only (`docker compose logs -f alfursan`).
- The container runs as a non-root user, with a read-only root filesystem,
  `no-new-privileges`, a tmpfs `/tmp`, and a stdlib HEALTHCHECK against `/healthz`.
- A full refresh takes ~1–2 minutes (~34 API calls). Cached page views cost 0 calls.
