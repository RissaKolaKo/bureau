/* ═══════════════════════════════════════════════════════════════
   ANALYTICS TRACKER — Visit counting (daily / weekly / monthly)
   Pure localStorage — no external service
   ═══════════════════════════════════════════════════════════════ */

const KEY = 'moas_analytics';

export interface VisitRecord {
  date: string;   // YYYY-MM-DD
  count: number;
}

export interface AnalyticsData {
  visits: VisitRecord[];      // last 90 days
  lastUpdated: string;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function load(): AnalyticsData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as AnalyticsData;
  } catch { /* ignore */ }
  return { visits: [], lastUpdated: today() };
}

function save(data: AnalyticsData) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

/* Record a visit (called once per app load) */
export function recordVisit() {
  const data = load();
  const t = today();
  const existing = data.visits.find(v => v.date === t);
  if (existing) {
    existing.count += 1;
  } else {
    data.visits.push({ date: t, count: 1 });
  }
  // keep last 90 days only
  data.visits = data.visits
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-90);
  data.lastUpdated = new Date().toISOString();
  save(data);
}

/* ── Aggregation helpers ── */
export function getDailyCount(): number {
  const data = load();
  const t = today();
  return data.visits.find(v => v.date === t)?.count ?? 0;
}

export function getWeeklyCount(): number {
  const data = load();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return data.visits
    .filter(v => v.date >= cutoffStr)
    .reduce((s, v) => s + v.count, 0);
}

export function getMonthlyCount(): number {
  const data = load();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return data.visits
    .filter(v => v.date >= cutoffStr)
    .reduce((s, v) => s + v.count, 0);
}

export function getLast7Days(): VisitRecord[] {
  const data = load();
  const days: VisitRecord[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const found = data.visits.find(v => v.date === dateStr);
    days.push({ date: dateStr, count: found?.count ?? 0 });
  }
  return days;
}

export function getLast30Days(): VisitRecord[] {
  const data = load();
  const days: VisitRecord[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const found = data.visits.find(v => v.date === dateStr);
    days.push({ date: dateStr, count: found?.count ?? 0 });
  }
  return days;
}

export function getTotalVisits(): number {
  const data = load();
  return data.visits.reduce((s, v) => s + v.count, 0);
}

export function getPeakDay(): VisitRecord | null {
  const data = load();
  if (!data.visits.length) return null;
  return data.visits.reduce((max, v) => v.count > max.count ? v : max, data.visits[0]);
}
