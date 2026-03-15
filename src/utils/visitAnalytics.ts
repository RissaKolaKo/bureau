
// ─── Visit Analytics ─────────────────────────────────────────────────────────
const VISITS_KEY   = 'moas_visits_v2';
const SESSION_KEY  = 'moas_session_id';
const GEO_KEY      = 'moas_geo_cache';
const GEO_TTL      = 1000 * 60 * 60 * 6; // 6 hours

export interface VisitRecord {
  id        : string;
  sessionId : string;
  date      : string;       // YYYY-MM-DD
  hour      : number;       // 0-23
  timestamp : number;
  region    : string;
  city      : string;
  country   : string;
  lang      : string;
  isNew     : boolean;
}

// ── helpers ──────────────────────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function uid() {
  return Math.random().toString(36).slice(2, 10);
}
function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) { id = uid(); sessionStorage.setItem(SESSION_KEY, id); }
  return id;
}

// ── geo cache ─────────────────────────────────────────────────────────────────
interface GeoData { region: string; city: string; country: string; }

async function fetchGeo(): Promise<GeoData> {
  const cached = localStorage.getItem(GEO_KEY);
  if (cached) {
    try {
      const { data, ts } = JSON.parse(cached);
      if (Date.now() - ts < GEO_TTL) return data;
    } catch { /* ignore */ }
  }
  const fallback: GeoData = { region: 'غير محدد', city: 'غير محدد', country: 'MA' };
  const apis = [
    () => fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) })
            .then(r => r.json())
            .then(d => ({ region: d.region || fallback.region, city: d.city || fallback.city, country: d.country_code || 'MA' })),
    () => fetch('https://ip-api.com/json/?fields=regionName,city,countryCode', { signal: AbortSignal.timeout(3000) })
            .then(r => r.json())
            .then(d => ({ region: d.regionName || fallback.region, city: d.city || fallback.city, country: d.countryCode || 'MA' })),
  ];
  for (const api of apis) {
    try {
      const data = await api();
      localStorage.setItem(GEO_KEY, JSON.stringify({ data, ts: Date.now() }));
      return data;
    } catch { /* try next */ }
  }
  return fallback;
}

// ── load / save ───────────────────────────────────────────────────────────────
function loadVisits(): VisitRecord[] {
  try { return JSON.parse(localStorage.getItem(VISITS_KEY) || '[]'); } catch { return []; }
}
function saveVisits(v: VisitRecord[]) {
  // keep last 2000
  localStorage.setItem(VISITS_KEY, JSON.stringify(v.slice(-2000)));
}

// ── record a visit (idempotent per session per day) ───────────────────────────
export async function recordVisit(): Promise<void> {
  const sessionId = getSessionId();
  const today     = todayStr();
  const visits    = loadVisits();

  // ── one visit per session per day ──
  const already = visits.some(v => v.sessionId === sessionId && v.date === today);
  if (already) return;

  const isNew = !visits.some(v => v.sessionId === sessionId);
  const geo   = await fetchGeo().catch(() => ({ region: 'غير محدد', city: 'غير محدد', country: 'MA' }));

  const record: VisitRecord = {
    id        : uid(),
    sessionId,
    date      : today,
    hour      : new Date().getHours(),
    timestamp : Date.now(),
    region    : geo.region,
    city      : geo.city,
    country   : geo.country,
    lang      : navigator.language?.slice(0, 2) || 'ar',
    isNew,
  };

  saveVisits([...visits, record]);
}

// ── analytics queries ──────────────────────────────────────────────────────────
export interface AnalyticsSummary {
  today      : number;
  yesterday  : number;
  week       : number;
  month      : number;
  total      : number;
  newVisitors: number;
  returning  : number;
  byDay      : { date: string; count: number }[];
  byHour     : { hour: number; count: number }[];
  byRegion   : { region: string; count: number }[];
  byCity     : { city: string; count: number }[];
  byLang     : { lang: string; count: number }[];
  recent     : VisitRecord[];
}

export function getAnalytics(): AnalyticsSummary {
  const visits  = loadVisits();
  const now     = new Date();
  const today   = todayStr();

  const yDate   = new Date(now); yDate.setDate(yDate.getDate() - 1);
  const yesterday = yDate.toISOString().slice(0, 10);

  const weekAgo  = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(now); monthAgo.setDate(monthAgo.getDate() - 30);

  const count = (pred: (v: VisitRecord) => boolean) => visits.filter(pred).length;

  // by-day last 14 days
  const byDay: { date: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    byDay.push({ date: ds, count: count(v => v.date === ds) });
  }

  // by-hour
  const byHour = Array.from({ length: 24 }, (_, h) => ({
    hour : h,
    count: count(v => v.hour === h),
  }));

  // by-region top 10
  const regionMap: Record<string, number> = {};
  visits.forEach(v => { regionMap[v.region] = (regionMap[v.region] || 0) + 1; });
  const byRegion = Object.entries(regionMap)
    .map(([region, count]) => ({ region, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // by-city top 8
  const cityMap: Record<string, number> = {};
  visits.forEach(v => { cityMap[v.city] = (cityMap[v.city] || 0) + 1; });
  const byCity = Object.entries(cityMap)
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // by-lang
  const langMap: Record<string, number> = {};
  visits.forEach(v => { langMap[v.lang] = (langMap[v.lang] || 0) + 1; });
  const byLang = Object.entries(langMap)
    .map(([lang, count]) => ({ lang, count }))
    .sort((a, b) => b.count - a.count);

  return {
    today      : count(v => v.date === today),
    yesterday  : count(v => v.date === yesterday),
    week       : count(v => new Date(v.date) >= weekAgo),
    month      : count(v => new Date(v.date) >= monthAgo),
    total      : visits.length,
    newVisitors: count(v => v.isNew),
    returning  : count(v => !v.isNew),
    byDay,
    byHour,
    byRegion,
    byCity,
    byLang,
    recent     : [...visits].sort((a, b) => b.timestamp - a.timestamp).slice(0, 30),
  };
}

export function clearVisits() {
  localStorage.removeItem(VISITS_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}
