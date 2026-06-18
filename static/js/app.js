"use strict";

/* =========================================================================
   AlFursan Seats Finder — shared front-end logic (picker / flights / detail)
   The page is selected by <body data-page="picker|flights|detail">.
   Filter state persists across pages via sessionStorage.
   ========================================================================= */

const I18N = {
  ar: {
    title: "Alfursan seats finder", subtitle: "المقاعد المتاحة بالأميال — الخطوط السعودية وشركاء سكاي تيم",
    from: "مدينة المغادرة", cabin: "درجة السفر", range: "نطاق التاريخ", rangeArrow: "←", country: "الدولة", all: "كل الدول",
    allCab: "الكل", eco: "اقتصادي", biz: "رجال أعمال", first: "أولى", directLabel: "نوع الرحلة", directOnly: "المباشر فقط", loading: "…جارٍ تحميل البيانات",
    seatsLabel: "عدد المقاعد معًا", specificDay: "يوم محدّد", clearDay: "مسح اليوم",
    foot: "بيانات مخزّنة ومحدّثة دوريًا · أكّد دائمًا على موقع السعودية قبل الحجز",
    backTo: "رجوع للوجهات", daysAvail: "يوم متاح", from2: "ابتداءً من", miles: "ميل", cheapest: "أرخص سعر",
    exactDays: "الأيام المتاحة بالضبط", direct: "مباشر", stop: "توقف", seat: "مقعد", seats: "مقاعد", tapHint: "اضغط أي صف لعرض رقم الرحلة والأوقات",
    colDate: "التاريخ", colCabin: "الدرجة", colMiles: "الأميال", colStop: "النوع", colSeats: "مقاعد", colFlights: "رحلات", flight: "رحلة", flights: "رحلات",
    resultMeta: (n) => `${n} وجهة متاحة`, emptyTitle: "ما فيه مقاعد في هذا النطاق",
    emptyBody: "جرّب درجة مختلفة، قلّل عدد المقاعد، أو وسّع نطاق الأشهر.",
    errTitle: "تعذّر جلب البيانات", updNow: "محدّث الآن", updMin: (n) => `آخر تحديث: قبل ${n} دقيقة`, updHr: (n) => `آخر تحديث: قبل ${n} ساعة`, updDay: (n) => `آخر تحديث: قبل ${n} يوم`,
    refreshing: "جارٍ التحديث…", noData: "لا توجد بيانات بعد", refreshNow: "تحديث الآن",
    loadingFlights: "…جارٍ جلب الرحلات", flightsErr: "تعذّر جلب تفاصيل الرحلة", book: "احجز",
    refreshPrompt: "اكتب كلمة مرور التحديث", refreshWrong: "كلمة المرور غير صحيحة",
    pickTitle: "من وين مسافر؟", pickSub: "اختر مدينة المغادرة لتشوف كل وجهة توصلها بأميال الفرسان.",
    searchPh: "ابحث بالمدينة أو رمز المطار…", saudiCities: "داخل السعودية", otherCities: "مدن أخرى",
    filters: "الفلاتر", apply: "تطبيق", reset: "مسح الكل", destination: "الوجهة", allDest: "كل الوجهات",
    noMatch: "ما فيه مدن مطابقة", changeCity: "غيّر المدينة", flightsFrom: "الرحلات من", noFlightsFrom: (n) => `لا توجد رحلات فرسان من ${n}`, showFlights: "اعرض النتائج", editFilters: "تعديل الفلتر", dateLabel: "التاريخ", monthsRange: "نطاق الأشهر", pickDay: "اختر يوماً"
  },
  en: {
    title: "Alfursan seats finder", subtitle: "Seats bookable with miles — Saudia & SkyTeam partners",
    from: "Departure city", cabin: "Cabin", range: "Date range", rangeArrow: "→", country: "Country", all: "All countries",
    allCab: "All", eco: "Economy", biz: "Business", first: "First", directLabel: "Flight type", directOnly: "Direct only", loading: "Loading data…",
    seatsLabel: "Seats together", specificDay: "Specific day", clearDay: "Clear day",
    foot: "Cached data, refreshed periodically · always confirm on Saudia before booking",
    backTo: "Back to destinations", daysAvail: "days available", from2: "from", miles: "miles", cheapest: "cheapest",
    exactDays: "Exact available days", direct: "Direct", stop: "stop", seat: "seat", seats: "seats", tapHint: "Tap any row for flight number & times",
    colDate: "Date", colCabin: "Cabin", colMiles: "Miles", colStop: "Type", colSeats: "Seats", colFlights: "Flights", flight: "flight", flights: "flights",
    resultMeta: (n) => `${n} destinations available`, emptyTitle: "No seats in this range",
    emptyBody: "Try a different cabin, fewer seats, or widen the month range.",
    errTitle: "Couldn't load data", updNow: "updated just now", updMin: (n) => `updated ${n} min ago`, updHr: (n) => `updated ${n}h ago`, updDay: (n) => `updated ${n}d ago`,
    refreshing: "refreshing…", noData: "no data yet", refreshNow: "Refresh now",
    loadingFlights: "loading flights…", flightsErr: "couldn't load flight details", book: "Book",
    refreshPrompt: "Enter refresh password", refreshWrong: "Wrong password",
    pickTitle: "Where are you flying from?", pickSub: "Pick your departure city to see every destination you can reach with AlFursan miles.",
    searchPh: "Search city or airport code…", saudiCities: "In Saudi Arabia", otherCities: "Other cities",
    filters: "Filters", apply: "Apply", reset: "Reset all", destination: "Destination", allDest: "All destinations",
    noMatch: "No matching cities", changeCity: "Change city", flightsFrom: "Flights from", noFlightsFrom: (n) => `No AlFursan flights from ${n}`, showFlights: "View results", editFilters: "Edit filters", dateLabel: "Date", monthsRange: "Months range", pickDay: "Pick a date"
  }
};

const ORIGIN_NAMES = {
  RUH: { ar: "الرياض", en: "Riyadh" }, JED: { ar: "جدة", en: "Jeddah" }, DMM: { ar: "الدمام", en: "Dammam" },
  MED: { ar: "المدينة المنورة", en: "Madinah" }, AHB: { ar: "أبها", en: "Abha" }, TIF: { ar: "الطائف", en: "Taif" },
  ELQ: { ar: "القصيم", en: "Qassim" }, GIZ: { ar: "جازان", en: "Jazan" }, TUU: { ar: "تبوك", en: "Tabuk" }, YNB: { ar: "ينبع", en: "Yanbu" },
  ULH: { ar: "العُلا", en: "AlUla" }, RSI: { ar: "البحر الأحمر", en: "Red Sea" }, EAM: { ar: "نجران", en: "Najran" },
  BHH: { ar: "بيشة", en: "Bisha" }, SHW: { ar: "شرورة", en: "Sharurah" }, AJF: { ar: "الجوف", en: "Al-Jawf" },
  RAE: { ar: "عرعر", en: "Arar" }, RAH: { ar: "رفحاء", en: "Rafha" }, WAE: { ar: "وادي الدواسر", en: "Wadi Dawasir" },
  EJH: { ar: "الوجه", en: "Wedjh" }, DWD: { ar: "دوادمي", en: "Dawadmi" }, HAS: { ar: "حائل", en: "Hail" }
};

const COUNTRIES_AR = {
  "Egypt": "مصر", "France": "فرنسا", "Netherlands": "هولندا", "United States": "الولايات المتحدة",
  "Indonesia": "إندونيسيا", "India": "الهند", "Kenya": "كينيا", "Morocco": "المغرب", "Turkey": "تركيا",
  "United Kingdom": "المملكة المتحدة", "United Arab Emirates": "الإمارات", "Qatar": "قطر", "Bahrain": "البحرين",
  "Kuwait": "الكويت", "Oman": "عُمان", "Jordan": "الأردن", "Lebanon": "لبنان", "Iraq": "العراق", "Pakistan": "باكستان",
  "Bangladesh": "بنغلاديش", "Sri Lanka": "سريلانكا", "Philippines": "الفلبين", "Malaysia": "ماليزيا", "Thailand": "تايلاند",
  "China": "الصين", "Japan": "اليابان", "South Korea": "كوريا الجنوبية", "Spain": "إسبانيا", "Italy": "إيطاليا",
  "Germany": "ألمانيا", "Greece": "اليونان", "Switzerland": "سويسرا", "Belgium": "بلجيكا", "Austria": "النمسا",
  "Sweden": "السويد", "Russia": "روسيا", "Ethiopia": "إثيوبيا", "South Africa": "جنوب أفريقيا", "Nigeria": "نيجيريا",
  "Sudan": "السودان", "Tunisia": "تونس", "Algeria": "الجزائر", "Canada": "كندا", "Brazil": "البرازيل",
  "Azerbaijan": "أذربيجان", "Maldives": "المالديف", "Singapore": "سنغافورة", "Vietnam": "فيتنام",
  "Saudi Arabia": "السعودية", "Yemen": "اليمن", "Syria": "سوريا", "Eritrea": "إريتريا", "Tanzania": "تنزانيا"
};

const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW_AR = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
const DOW_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CABMAP = { Y: "economy", J: "business", F: "first" };

/* ---------------- persisted filter state ---------------- */
const $ = (s) => document.querySelector(s);
const SKEY = "alf_state";
function _load() { try { return JSON.parse(sessionStorage.getItem(SKEY)) || {}; } catch (e) { return {}; } }
function _save() {
  try { sessionStorage.setItem(SKEY, JSON.stringify({ lang, cabin, seats, directOnly, mFrom, mTo, day, country, dateMode })); } catch (e) { /* ignore */ }
}
const _st = _load();
let lang = _st.lang || "en";
let cabin = _st.cabin || "ALL", seats = _st.seats || 1, directOnly = !!_st.directOnly;
let mFrom = _st.mFrom || null, mTo = _st.mTo || null, day = _st.day || null, country = _st.country || "ALL";
let dateMode = _st.dateMode || (_st.day ? "day" : "range");

let RECORDS = [], META = {}, MONTHS = [], FROM = null, m1 = 0, m2 = 0;
const TRIP_CACHE = {};
let AIRPORTS_DB = null; // full IATA -> {c,k} lookup, loaded lazily on the picker page

/* ---------------- helpers ---------------- */
const L = () => I18N[lang];
const seatLabel = (n) => (n === 1 ? L().seat : L().seats);
const flightLabel = (n) => (n === 1 ? L().flight : L().flights);
const ctryName = (k) => (lang === "ar" && COUNTRIES_AR[k]) ? COUNTRIES_AR[k] : k;
const origName = (o, city) => (ORIGIN_NAMES[o] ? ORIGIN_NAMES[o][lang] : (city || o));
const ymOf = (d) => d.slice(0, 7);
const kk = (v) => { const n = v / 1000; return (v % 1000 === 0 ? n : n.toFixed(1).replace(/\.0$/, "")) + "k"; };
const CABS = () => (cabin === "ALL" ? ["Y", "J", "F"] : [cabin]);
const passSeat = (c) => c && (seats <= 1 || (c.seats || 0) >= seats);
const passCab = (c) => passSeat(c) && (!directOnly || c.direct);
const qualifies = (x) => CABS().some((c) => passCab(x[c]));
const fmtT = (iso) => (iso ? iso.slice(11, 16) : "");
const scrollToEl = (el) => {
  if (!el) return;
  const h = document.querySelector("header");
  const hh = h ? h.getBoundingClientRect().height : 0;
  const y = el.getBoundingClientRect().top + window.pageYOffset - hh - 8;
  window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
};

function resolveMonths() {
  if (!MONTHS.length) { m1 = 0; m2 = 0; return; }
  let i1 = mFrom ? MONTHS.indexOf(mFrom) : -1;
  let i2 = mTo ? MONTHS.indexOf(mTo) : -1;
  if (i1 < 0) i1 = 0;
  if (i2 < 0) i2 = Math.min(2, MONTHS.length - 1);
  i1 = Math.min(i1, MONTHS.length - 1);
  i2 = Math.min(Math.max(i2, i1), MONTHS.length - 1);
  m1 = i1; m2 = i2; mFrom = MONTHS[m1]; mTo = MONTHS[m2];
}
function inRange(d) {
  if (dateMode === "day") return day ? d === day : false;
  if (!MONTHS.length) return true;
  const ym = ymOf(d);
  return ym >= MONTHS[m1] && ym <= MONTHS[m2];
}

/* ---------------- header: status / refresh / language ---------------- */
function updateStatus() {
  const dot = $("#statusDot"), txt = $("#updatedTxt");
  if (!dot || !txt) return;
  if (META.status === "refreshing") { dot.className = "dot warn"; txt.textContent = L().refreshing; return; }
  if (!META.updated) { dot.className = "dot warn"; txt.textContent = L().noData; return; }
  dot.className = META.status === "error" ? "dot err" : "dot";
  const mins = Math.max(0, Math.floor((Date.now() - Date.parse(META.updated)) / 60000));
  txt.textContent = mins < 2 ? L().updNow : mins < 60 ? L().updMin(mins) : mins < 1440 ? L().updHr(Math.floor(mins / 60)) : L().updDay(Math.floor(mins / 1440));
}

let RERENDER = () => {};   // redraw current page from current data (no fetch)
let RELOAD = async () => {}; // re-fetch current page data, then redraw

let refreshKey = "";
async function refreshNow() {
  const btn = $("#refreshBtn"); if (!btn || btn.classList.contains("spin")) return;
  let key = refreshKey;
  if (META.refreshProtected && !key) { key = (prompt(L().refreshPrompt) || "").trim(); if (!key) return; }
  btn.classList.add("spin"); btn.disabled = true;
  if ($("#statusDot")) { $("#statusDot").className = "dot warn"; $("#updatedTxt").textContent = L().refreshing; }
  const prev = META.updated;
  try {
    const r = await fetch("/api/refresh", { cache: "no-store", headers: key ? { "X-Refresh-Key": key } : {} });
    if (r.status === 401) { refreshKey = ""; btn.classList.remove("spin"); btn.disabled = false; updateStatus(); alert(L().refreshWrong); return; }
    if (r.status === 403) { btn.classList.remove("spin"); btn.disabled = false; updateStatus(); return; }
    if (META.refreshProtected) refreshKey = key;
    let tries = 0;
    const poll = async () => {
      tries++; let j;
      try { j = await (await fetch("/api/data", { cache: "no-store" })).json(); }
      catch (_) { if (tries < 60) return setTimeout(poll, 3000); j = META; }
      if (((j.status !== "refreshing") && (j.updated !== prev || j.status === "error")) || tries >= 60) {
        btn.classList.remove("spin"); btn.disabled = false;
        await RELOAD();
      } else setTimeout(poll, 3000);
    };
    setTimeout(poll, 2500);
  } catch (e) { btn.classList.remove("spin"); btn.disabled = false; updateStatus(); }
}

function applyLang() {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  const lb = $("#langBtn"); if (lb) lb.textContent = lang === "ar" ? "EN" : "ع";
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const k = el.getAttribute("data-i18n");
    if (typeof L()[k] === "string") el.textContent = L()[k];
  });
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
    const k = el.getAttribute("data-i18n-ph");
    if (typeof L()[k] === "string") el.setAttribute("placeholder", L()[k]);
  });
}

function bindHeader() {
  const lb = $("#langBtn");
  if (lb) lb.onclick = () => { lang = lang === "ar" ? "en" : "ar"; _save(); applyLang(); updateStatus(); RERENDER(); };
  const rb = $("#refreshBtn");
  if (rb) rb.onclick = refreshNow;
}

/* ---------------- data fetch ---------------- */
async function fetchData(frm) {
  const url = "/api/data" + (frm ? ("?from=" + encodeURIComponent(frm)) : "");
  const j = await (await fetch(url, { cache: "no-store" })).json();
  RECORDS = j.records || [];
  META = j;
  MONTHS = [...new Set(RECORDS.map((x) => ymOf(x.date)).filter(Boolean))].sort();
  resolveMonths();
  return j;
}

/* ---------------- filter helpers (filter page + results summary) ---------------- */
function destCountriesFor(cab, sts, dir, i1, i2, dayv) {
  const cabs = cab === "ALL" ? ["Y", "J", "F"] : [cab];
  const passS = (c) => c && (sts <= 1 || (c.seats || 0) >= sts);
  const passC = (c) => passS(c) && (!dir || c.direct);
  const inR = (d) => { if (dayv) return d === dayv; if (!MONTHS.length) return true; const ym = ymOf(d); return ym >= MONTHS[i1] && ym <= MONTHS[i2]; };
  const counts = {};
  RECORDS.filter((x) => inR(x.date) && cabs.some((c) => passC(x[c]))).forEach((x) => {
    counts[x.dcountry] = counts[x.dcountry] || new Set();
    counts[x.dcountry].add(x.d); // distinct destination cities in this country
  });
  return Object.keys(counts).map((c) => ({ c, n: counts[c].size })).sort((a, b) => b.n - a.n);
}
function setFromName() {
  const head = $("#fromName"); if (!head) return;
  const o = (META.from || {});
  head.textContent = origName(FROM, o.city) + " (" + FROM + ")";
}

/* ---------------- filter page form ---------------- */
function applyDateMode() {
  const seg = $("#dateModeSeg");
  if (seg) seg.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.mode === dateMode));
  const rangeRow = $("#rangeRow"), dayRow = $("#dayRow");
  if (rangeRow) rangeRow.style.display = dateMode === "range" ? "" : "none";
  if (dayRow) dayRow.style.display = dateMode === "day" ? "" : "none";
}
function setDateMode(mode) {
  dateMode = mode;
  if (mode === "range" && $("#fDay")) { day = null; $("#fDay").value = ""; }
  applyDateMode();
  refreshFilterDest();
  syncFromForm();
  updateShowCount();
}
function refreshFilterDest(preferred) {
  const sel = $("#fDest"); if (!sel) return;
  const want = preferred !== undefined ? preferred : sel.value;
  const dv = $("#fDay").value || null;
  let dests;
  if (dateMode === "day" && !dv) {
    dests = [];
  } else {
    const a = +$("#fM1").value || 0, b = +$("#fM2").value || 0;
    dests = destCountriesFor($("#fCabin").value, +$("#fSeats").value, $("#fDirect").checked, Math.min(a, b), Math.max(a, b), dv);
  }
  const has = dests.some((d) => d.c === want);
  sel.innerHTML = `<option value="ALL">${L().allDest}</option>` +
    dests.map((d) => `<option value="${d.c}">${ctryName(d.c)} (${d.n})</option>`).join("");
  sel.value = has ? want : "ALL";
}
function updateShowCount() {
  const n = destAgg().length;
  const cs = $("#showCount"); if (cs) cs.textContent = "(" + n + ")";
  const btn = $("#showBtn");
  if (btn) {
    const blocked = dateMode === "day" && !day;   // day mode chosen but no date picked
    btn.disabled = blocked;
    btn.style.opacity = blocked ? ".5" : "";
    btn.style.pointerEvents = blocked ? "none" : "";
  }
}
// read every control into global state, persist
function syncFromForm() {
  cabin = $("#fCabin").value;
  directOnly = $("#fDirect").checked;
  seats = +$("#fSeats").value;
  if (dateMode === "day") {
    day = $("#fDay").value || null;
  } else {
    day = null;
    const a = +$("#fM1").value || 0, b = +$("#fM2").value || 0;
    mFrom = MONTHS[Math.min(a, b)] || null; mTo = MONTHS[Math.max(a, b)] || null;
  }
  resolveMonths();
  country = $("#fDest").value;
  _save();
}
function fillFilterForm() {
  if (!$("#fCabin")) return;
  $("#fCabin").value = cabin;
  $("#fDirect").checked = directOnly;
  $("#fSeats").value = seats;
  const opt = (sel) => MONTHS.map((ym, i) => { const [y, mm] = ym.split("-"); return `<option value="${i}" ${i === sel ? "selected" : ""}>${(lang === "ar" ? MONTHS_AR : MONTHS_EN)[+mm - 1]} ${y}</option>`; }).join("");
  $("#fM1").innerHTML = opt(m1); $("#fM2").innerHTML = opt(m2);
  const fDay = $("#fDay");
  const ds = RECORDS.map((x) => x.date).filter(Boolean).sort();
  if (ds.length) { fDay.min = ds[0]; fDay.max = ds[ds.length - 1]; }
  fDay.value = day || "";
  applyDateMode();
  refreshFilterDest(country);
}
function wireFilterForm() {
  const onAny = () => { applyDateMode(); refreshFilterDest(); syncFromForm(); updateShowCount(); };
  ["#fCabin", "#fSeats", "#fDirect", "#fM1", "#fM2", "#fDay"].forEach((s) => { const el = $(s); if (el) el.onchange = onAny; });
  const seg = $("#dateModeSeg");
  if (seg) seg.querySelectorAll("button").forEach((b) => { b.onclick = () => setDateMode(b.dataset.mode); });
  const dd = $("#fDest"); if (dd) dd.onchange = () => { country = dd.value; _save(); updateShowCount(); };
}

/* ============================ PAGE 1: picker ============================ */
async function initPicker() {
  RERENDER = renderPicker;
  RELOAD = async () => { await fetchData(null); renderPicker(); };
  if (!AIRPORTS_DB) fetch("/static/airports.json", { cache: "force-cache" }).then((r) => r.json()).then((d) => { AIRPORTS_DB = d; }).catch(() => {});
  try {
    await fetchData(null);
    $("#pickLoading") && ($("#pickLoading").style.display = "none");
    if (META.status === "error" && !(META.origins || []).length) { showPickError(META.error); return; }
    renderPicker();
    if (META.status === "refreshing") watchRefresh();
  } catch (e) {
    $("#pickLoading") && ($("#pickLoading").style.display = "none");
    showPickError(String(e));
  }
}
function showPickError(msg) {
  const n = $("#pickList"); if (n) n.innerHTML = `<div class="no-match">${L().errTitle}${msg ? " — " + msg : ""}</div>`;
}
let _pickQuery = "";
function renderPicker() {
  const box = $("#pickList"); if (!box) return;
  const origins = META.origins || [];
  const q = _pickQuery.trim().toLowerCase();
  const match = (o) => {
    if (!q) return true;
    const names = [o.iata, o.city || "", origName(o.iata, o.city), (ORIGIN_NAMES[o.iata] ? ORIGIN_NAMES[o.iata].en + " " + ORIGIN_NAMES[o.iata].ar : "")].join(" ").toLowerCase();
    return names.includes(q);
  };
  const sa = origins.filter((o) => o.saudi && match(o));
  const other = origins.filter((o) => !o.saudi && match(o));
  const card = (o) => `<div class="city-card" data-iata="${o.iata}">
      <div><div class="cc-name">${origName(o.iata, o.city)}</div><div class="cc-sub">${ctryName(o.country)}</div></div>
      <span class="cc-code">${o.iata}</span></div>`;
  let html = "";
  if (sa.length) html += `<div class="city-group">${L().saudiCities}</div><div class="city-list">${sa.map(card).join("")}</div>`;
  if (other.length) html += `<div class="city-group">${L().otherCities}</div><div class="city-list">${other.map(card).join("")}</div>`;
  if (!sa.length && !other.length) {
    const ap = findAirport(_pickQuery);
    html = ap ? `<div class="no-match">${L().noFlightsFrom(ap.name + " (" + ap.code + ")")}</div>`
              : `<div class="no-match">${L().noMatch}</div>`;
  }
  box.innerHTML = html;
}
// is the query a real airport (code or city) that simply has no AlFursan flights?
function findAirport(q) {
  if (!AIRPORTS_DB) return null;
  const Q = (q || "").trim(); if (!Q) return null;
  const up = Q.toUpperCase();
  if (AIRPORTS_DB[up]) return { code: up, name: AIRPORTS_DB[up].c || up };
  const lc = Q.toLowerCase();
  for (const code in AIRPORTS_DB) { const a = AIRPORTS_DB[code]; if ((a.c || "").toLowerCase().includes(lc)) return { code, name: a.c }; }
  return null;
}

/* ============================ PAGE 2: filter page ============================ */
function rowsForFrom() { return RECORDS.filter((x) => inRange(x.date)); }
function destAgg() {
  const rows = rowsForFrom().filter(qualifies);
  const map = {};
  rows.forEach((x) => {
    const m = map[x.d] || (map[x.d] = { d: x.d, dcity: x.dcity, dcountry: x.dcountry, days: 0, cheapest: Infinity, best: { Y: Infinity, J: Infinity, F: Infinity } });
    m.days++;
    CABS().forEach((c) => { if (passCab(x[c]) && x[c].miles < m.cheapest) m.cheapest = x[c].miles; });
  });
  rowsForFrom().forEach((x) => { if (map[x.d]) ["Y", "J", "F"].forEach((c) => { if (passCab(x[c]) && x[c].miles < map[x.d].best[c]) map[x.d].best[c] = x[c].miles; }); });
  let list = Object.values(map);
  if (country !== "ALL") list = list.filter((m) => m.dcountry === country);
  return list.sort((a, b) => a.cheapest - b.cheapest);
}
function cabChip(label, cls, val) {
  if (val === Infinity || val == null) return `<div class="cab">${label}</div>`;
  return `<div class="cab has ${cls}">${label}<span class="v">${kk(val)}</span></div>`;
}
async function initFilters() {
  FROM = decodeURIComponent((location.pathname.split("/")[2] || "")).toUpperCase();
  RERENDER = () => { setFromName(); fillFilterForm(); updateShowCount(); };
  RELOAD = async () => { await fetchData(FROM); RERENDER(); };
  const sb = $("#showBtn"); if (sb) sb.onclick = () => { location.href = "/flights/" + encodeURIComponent(FROM) + "/results"; };
  try {
    await fetchData(FROM);
    $("#loading") && ($("#loading").style.display = "none");
    if (META.status === "error" && !RECORDS.length) { if ($("#fromName")) $("#fromName").textContent = L().errTitle; return; }
    if ($("#filterPanel")) $("#filterPanel").style.display = "block";
    if ($("#showBtn")) $("#showBtn").style.display = "flex";
    setFromName();
    fillFilterForm();
    wireFilterForm();
    updateShowCount();
    if (META.status === "refreshing") watchRefresh();
  } catch (e) {
    $("#loading") && ($("#loading").style.display = "none");
    if ($("#fromName")) $("#fromName").textContent = L().errTitle;
  }
}

/* ============================ PAGE 3: results ============================ */
function renderResults() {
  setFromName();
  const list = destAgg();
  const cards = $("#cards"); if (!cards) return;
  if (!list.length) {
    cards.innerHTML = `<div class="empty" style="grid-column:1/-1"><div class="big">${L().emptyTitle}</div><div>${L().emptyBody}</div></div>`;
    return;
  }
  cards.innerHTML = list.map((m) => `
    <div class="card" data-dest="${m.d}">
      <div class="top"><div class="dest"><div class="city">${m.dcity}</div><div class="ctyname">${ctryName(m.dcountry)}</div>
        <div class="route"><span>${FROM}</span><span class="pin">\u2708</span><span>${m.d}</span></div></div>
        <span class="iata-badge">${m.d}</span></div>
      <div class="cabins">${cabChip(L().eco, "y", m.best.Y)}${cabChip(L().biz, "j", m.best.J)}${cabChip(L().first, "f", m.best.F)}</div>
      <div class="foot"><span><b>${m.days}</b> ${L().daysAvail}</span><span>${L().from2} <b>${kk(m.cheapest)}</b> ${L().miles}</span></div>
    </div>`).join("");
}
async function initResults() {
  FROM = decodeURIComponent((location.pathname.split("/")[2] || "")).toUpperCase();
  RERENDER = () => { renderResults(); };
  RELOAD = async () => { await fetchData(FROM); renderResults(); };
  const ed = $("#editFilters"); if (ed) ed.href = "/flights/" + encodeURIComponent(FROM);
  const cards = $("#cards");
  if (cards) cards.onclick = (e) => {
    const c = e.target.closest("[data-dest]"); if (!c) return;
    location.href = "/flights/" + encodeURIComponent(FROM) + "/" + encodeURIComponent(c.getAttribute("data-dest"));
  };
  try {
    await fetchData(FROM);
    $("#loading") && ($("#loading").style.display = "none");
    if (META.status === "error" && !RECORDS.length) { const cd = $("#cards"); if (cd) cd.innerHTML = `<div class="empty" style="grid-column:1/-1"><div class="big">${L().errTitle}</div>${META.error ? `<div>${META.error}</div>` : ""}</div>`; return; }
    renderResults();
    if (META.status === "refreshing") watchRefresh();
  } catch (e) {
    $("#loading") && ($("#loading").style.display = "none");
    const cd = $("#cards"); if (cd) cd.innerHTML = `<div class="empty" style="grid-column:1/-1"><div class="big">${L().errTitle}</div></div>`;
  }
}

/* ============================ PAGE 3: detail ============================ */
async function loadTrips(id, cab, exp, countEl) {
  exp.innerHTML = `<div class="exp-load">${L().loadingFlights}</div>`;
  try {
    let data = TRIP_CACHE[id];
    if (!data) { data = await (await fetch("/api/trips/" + id, { cache: "no-store" })).json(); TRIP_CACHE[id] = data; }
    if (!data.ok) { exp.innerHTML = `<div class="exp-err">${L().flightsErr}</div>`; return; }
    const want = CABMAP[cab];
    let trips = data.trips.filter((t) => (t.cabin || "").toLowerCase() === want);
    if (!trips.length) trips = data.trips;
    if (directOnly) trips = trips.filter((t) => !t.stops);
    if (seats > 1) trips = trips.filter((t) => (t.seats || 0) >= seats);
    if (countEl) countEl.textContent = `${trips.length} ${flightLabel(trips.length)}`;
    const body = trips.map((t) => {
      const stops = t.stops ? `${t.stops} ${L().stop}` : L().direct;
      const dur = t.duration ? ` · ${Math.floor(t.duration / 60)}h${String(t.duration % 60).padStart(2, "0")}` : "";
      const seatsTxt = t.seats ? ` · ${t.seats} ${seatLabel(t.seats)}` : "";
      const segs = (t.segments || []).map((s) => `<div class="seg2"><b>${s.fn || ""}</b> ${s.o}→${s.d} · ${fmtT(s.dep)}–${fmtT(s.arr)}${s.aircraft ? ` · ${s.aircraft}` : ""}</div>`).join("");
      return `<div class="trip"><div class="trip-h"><span class="fn">${t.flightNumbers || t.carriers || ""}</span><span class="trip-meta">${stops}${dur}${seatsTxt}</span></div><div class="segs">${segs}</div></div>`;
    }).join("");
    exp.innerHTML = body || `<div class="exp-load">—</div>`;
  } catch (e) { exp.innerHTML = `<div class="exp-err">${L().flightsErr}</div>`; }
}

let DEST = null;
function renderDetail() {
  const host = $("#detailView"); if (!host) return;
  const rows = RECORDS.filter((x) => x.d === DEST && inRange(x.date) && qualifies(x)).sort((a, b) => (a.date < b.date ? -1 : 1));
  let cheapest = Infinity;
  rows.forEach((x) => CABS().forEach((c) => { if (passCab(x[c]) && x[c].miles < cheapest) cheapest = x[c].miles; }));
  const dcity = (rows[0] || {}).dcity || DEST, dcountry = (rows[0] || {}).dcountry || "";
  const o = (META.from || {});
  const monthsPresent = [...new Set(rows.map((x) => ymOf(x.date)))].sort();
  let strip = "";
  monthsPresent.forEach((ym) => {
    const [y, mm] = ym.split("-"); const mo = +mm - 1; let cells = "";
    rows.filter((x) => ymOf(x.date) === ym).forEach((rec) => {
      const dd = +rec.date.slice(8, 10); let pips = "";
      ["Y", "J", "F"].forEach((c) => { if (passCab(rec[c])) { const col = c === "Y" ? "var(--jade)" : c === "J" ? "var(--gold)" : "var(--burgundy)"; pips += `<i style="background:${col}"></i>`; } });
      if (pips) cells += `<div class="day hit" data-date="${rec.date}"><span class="dn">${dd}</span><span class="pips">${pips}</span></div>`;
    });
    if (cells) strip += `<div class="month-block"><div class="mname">${(lang === "ar" ? MONTHS_AR : MONTHS_EN)[mo]} ${y}</div><div class="days">${cells}</div></div>`;
  });
  const flat = [];
  rows.forEach((x) => CABS().forEach((c) => { if (passCab(x[c])) flat.push({ x, c }); }));
  const tableRows = flat.map(({ x, c }, i) => {
    const cd = x[c], [yy, mm, dd] = x.date.split("-").map(Number), dt = new Date(yy, mm - 1, dd);
    const dn = (lang === "ar" ? DOW_AR : DOW_EN)[dt.getDay()], mn = (lang === "ar" ? MONTHS_AR : MONTHS_EN)[mm - 1];
    const cls = c === "Y" ? "y" : c === "J" ? "j" : "f", lab = c === "Y" ? L().eco : c === "J" ? L().biz : L().first;
    return `<div class="trow" data-id="${x.id}" data-cab="${c}" data-i="${i}" data-date="${x.date}">
      <div class="t-date">${dd} ${mn}<small>${dn}</small></div>
      <div class="t-cabin"><span class="pill ${cls}">${lab}</span> <span class="airl">${cd.airlines || ""}</span></div>
      <div class="t-miles">${(cd.miles || 0).toLocaleString("en")}</div>
      <div class="t-type">${cd.direct ? `<span class="tag-direct">${L().direct}</span>` : `<span class="tag-stop">${L().stop}</span>`}</div>
      <div class="t-flights fcount" data-fc="${i}">—</div>
      <div class="caret">▾</div>
    </div><div class="trow-exp" data-exp="${i}"></div>`;
  }).join("");

  host.innerHTML = `
    <div class="dhead"><div><div class="city">${dcity}</div><div class="ctyname">${ctryName(dcountry)}</div>
      <div class="pathline"><span>${origName(FROM, o.city)}</span><span>✈</span><span>${DEST}</span></div></div>
      <div class="price-tag"><span class="k">${cheapest === Infinity ? "—" : kk(cheapest)}</span><small>${rows.length} ${L().daysAvail}</small></div></div>
    <div class="strip-wrap"><div class="lab">${L().exactDays}</div>
      <div class="legend"><span><i style="background:var(--jade)"></i>${L().eco}</span><span><i style="background:var(--gold)"></i>${L().biz}</span><span><i style="background:var(--burgundy)"></i>${L().first}</span></div>${strip}</div>
    <div class="meta">${L().tapHint}</div>
    <div class="table" id="tbl">
      <div class="thead"><div>${L().colDate}</div><div>${L().colCabin}</div><div>${L().colMiles}</div><div>${L().colStop}</div><div>${L().colFlights}</div><div></div></div>
      ${tableRows || `<div class="trow" style="cursor:default"><div style="grid-column:1/-1;color:var(--muted)">${L().emptyTitle}</div></div>`}
    </div>`;

  $("#tbl").onclick = (e) => {
    const row = e.target.closest(".trow[data-id]"); if (!row) return;
    const exp = row.nextElementSibling;
    const opening = !row.classList.contains("open");
    row.classList.toggle("open"); exp.classList.toggle("show");
    if (opening && !exp.dataset.loaded) { exp.dataset.loaded = "1"; loadTrips(row.dataset.id, row.dataset.cab, exp, row.querySelector(".fcount")); }
  };
  const sw = $(".strip-wrap");
  if (sw) sw.onclick = (e) => {
    const cell = e.target.closest(".day.hit[data-date]"); if (!cell) return;
    const tr = $(`#tbl .trow[data-date="${cell.dataset.date}"]`);
    if (!tr) return;
    scrollToEl(tr);
    tr.classList.remove("flash"); void tr.offsetWidth; tr.classList.add("flash");
    const exp = tr.nextElementSibling;
    if (!tr.classList.contains("open")) {
      tr.classList.add("open"); exp.classList.add("show");
      if (!exp.dataset.loaded) { exp.dataset.loaded = "1"; loadTrips(tr.dataset.id, tr.dataset.cab, exp, tr.querySelector(".fcount")); }
    }
  };
}
async function initDetail() {
  const parts = location.pathname.split("/");
  FROM = decodeURIComponent(parts[2] || "").toUpperCase();
  DEST = decodeURIComponent(parts[3] || "").toUpperCase();
  const back = $("#backFlights"); if (back) back.href = "/flights/" + encodeURIComponent(FROM) + "/results";
  RERENDER = () => { renderDetail(); };
  RELOAD = async () => { await fetchData(FROM); RERENDER(); };
  try {
    await fetchData(FROM);
    $("#loading") && ($("#loading").style.display = "none");
    RERENDER();
    if (META.status === "refreshing") watchRefresh();
  } catch (e) {
    $("#loading") && ($("#loading").style.display = "none");
    if ($("#detailView")) $("#detailView").innerHTML = `<div class="empty"><div class="big">${L().errTitle}</div></div>`;
  }
}

/* ---------------- refresh watcher ---------------- */
let _watching = false;
async function watchRefresh() {
  if (_watching || META.status !== "refreshing") return;
  _watching = true;
  const tick = async () => {
    let j;
    try { j = await (await fetch("/api/data", { cache: "no-store" })).json(); }
    catch (_) { return setTimeout(tick, 5000); }
    if (j.status !== "refreshing") { _watching = false; await RELOAD(); return; }
    setTimeout(tick, 5000);
  };
  setTimeout(tick, 5000);
}

/* ---------------- boot ---------------- */
applyLang();
bindHeader();
const _PAGE = document.body.dataset.page;
if (_PAGE === "picker") initPicker();
else if (_PAGE === "filters") initFilters();
else if (_PAGE === "results") initResults();
else if (_PAGE === "detail") initDetail();
// search box (picker only)
const _sb = $("#pickSearch");
if (_sb) _sb.oninput = (e) => { _pickQuery = e.target.value; renderPicker(); };
// picker list click
const _pl = $("#pickList");
if (_pl) _pl.onclick = (e) => {
  const c = e.target.closest("[data-iata]"); if (!c) return;
  // fresh start for a newly chosen departure city — clear the previous city's filters
  cabin = "ALL"; seats = 1; directOnly = false; mFrom = null; mTo = null; day = null; country = "ALL"; _save();
  location.href = "/flights/" + encodeURIComponent(c.getAttribute("data-iata"));
};
setInterval(updateStatus, 60000);
