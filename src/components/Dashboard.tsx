
import { useState, useEffect } from 'react';
import { Module } from '../types';
import { getAnalytics, clearVisits, AnalyticsSummary } from '../utils/visitAnalytics';
import { authService } from '../utils/authService';

interface Props {
  onNavigate : (m: Module) => void;
  pendingCount: number;
}

const MODULES: { key: Module; icon: string; label: string; color: string; desc: string; adminOnly?: boolean }[] = [
  { key: 'public-writer',     icon: '✍️',  label: 'الكاتب العمومي',       color: '#0f2744', desc: 'إنشاء وثائق رسمية' },
  { key: 'cv-generator',      icon: '📄',  label: 'مولد السيرة الذاتية',  color: '#1a5276', desc: 'CV بالفرنسية' },
  { key: 'cin-scanner',       icon: '🪪',  label: 'Scan Studio',           color: '#0e7490', desc: 'مسح الوثائق' },
  { key: 'french-letters',    icon: '📝',  label: 'الرسائل الفرنسية',     color: '#1e40af', desc: 'رسائل رسمية' },
  { key: 'admin-procedures',  icon: '🏛️',  label: 'المساطر الإدارية',     color: '#065f46', desc: 'إجراءات إدارية' },
  { key: 'invoice-generator', icon: '🧾',  label: 'الفواتير',              color: '#92400e', desc: 'Factures & Devis' },
  { key: 'user-management',   icon: '👥',  label: 'إدارة المستخدمين',     color: '#4a044e', desc: 'الأعضاء والصلاحيات', adminOnly: true },
  { key: 'registration-manager', icon: '📬', label: 'طلبات التسجيل',      color: '#7f1d1d', desc: 'قبول/رفض الطلبات', adminOnly: true },
  { key: 'general-settings',  icon: '⚙️',  label: 'الإعدادات العامة',     color: '#1c1917', desc: 'إعدادات الموقع', adminOnly: true },
];

const LANG: Record<string, string> = { ar: 'العربية', fr: 'الفرنسية', en: 'الإنجليزية' };

export default function Dashboard({ onNavigate, pendingCount }: Props) {
  const session     = authService.getUserSession() || authService.getAdminSession();
  const isAdmin     = session?.role === 'admin' || session?.role === 'superadmin';
  const isSuperAdmin = session?.role === 'superadmin';

  const [stats, setStats]     = useState<AnalyticsSummary | null>(null);
  const [tab, setTab]         = useState<'overview' | 'regions' | 'recent'>('overview');
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    setStats(getAnalytics());
    const t = setInterval(() => setStats(getAnalytics()), 30000);
    return () => clearInterval(t);
  }, [cleared]);

  const visibleModules = MODULES.filter(m => !m.adminOnly || isAdmin);

  const maxDay = stats ? Math.max(...stats.byDay.map(d => d.count), 1) : 1;
  const maxHour = stats ? Math.max(...stats.byHour.map(h => h.count), 1) : 1;

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto', direction: 'rtl' }}>

      {/* ── admin quick bar ─────────────────────────────────────────────── */}
      {isAdmin && (
        <div style={{ background: 'linear-gradient(135deg,#0f2744,#1a3a5c)', borderRadius: 12, padding: '14px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ color: '#c8962c', fontWeight: 700, fontSize: 14 }}>⚡ لوحة الإدارة</span>
          {[
            { key: 'user-management' as Module,      icon: '👥', label: 'المستخدمون' },
            { key: 'registration-manager' as Module, icon: '📬', label: `الطلبات${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
            ...(isSuperAdmin ? [{ key: 'general-settings' as Module, icon: '⚙️', label: 'الإعدادات' }] : []),
          ].map(b => (
            <button key={b.key} onClick={() => onNavigate(b.key)}
              style={{ background: 'rgba(200,150,44,0.15)', border: '1px solid rgba(200,150,44,0.3)', color: '#f5d78e', borderRadius: 8, padding: '6px 14px', fontSize: 13, cursor: 'pointer' }}>
              {b.icon} {b.label}
            </button>
          ))}
        </div>
      )}

      {/* ── module grid ─────────────────────────────────────────────────── */}
      <h2 style={{ color: '#0f2744', fontWeight: 700, fontSize: 18, marginBottom: 16 }}>🗂️ الخدمات</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 14, marginBottom: 32 }}>
        {visibleModules.map(m => (
          <button key={m.key} onClick={() => onNavigate(m.key)}
            style={{ background: '#fff', border: `2px solid ${m.color}22`, borderRadius: 12, padding: '18px 12px', cursor: 'pointer', textAlign: 'center', transition: 'all .2s', position: 'relative' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 8px 24px ${m.color}33`; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = ''; }}>
            {m.key === 'registration-manager' && pendingCount > 0 && (
              <span style={{ position: 'absolute', top: 8, left: 8, background: '#dc2626', color: '#fff', borderRadius: '50%', width: 20, height: 20, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{pendingCount}</span>
            )}
            <div style={{ fontSize: 28, marginBottom: 8 }}>{m.icon}</div>
            <div style={{ color: m.color, fontWeight: 600, fontSize: 13 }}>{m.label}</div>
            <div style={{ color: '#6b7280', fontSize: 11, marginTop: 4 }}>{m.desc}</div>
          </button>
        ))}
      </div>

      {/* ── visit analytics (admin only) ───────────────────────────────── */}
      {isAdmin && stats && (
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px #0002', overflow: 'hidden' }}>

          {/* header */}
          <div style={{ background: 'linear-gradient(135deg,#0f2744,#1a3a5c)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>📊 إحصائيات الزيارات</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['overview', 'regions', 'recent'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  style={{ background: tab === t ? '#c8962c' : 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: 8, padding: '5px 14px', fontSize: 12, cursor: 'pointer' }}>
                  {t === 'overview' ? '📈 عام' : t === 'regions' ? '🗺️ مناطق' : '🕐 أخيرة'}
                </button>
              ))}
              <button onClick={() => { clearVisits(); setCleared(c => !c); }}
                style={{ background: 'rgba(220,38,38,0.3)', color: '#fca5a5', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer' }}>
                🗑️ مسح
              </button>
            </div>
          </div>

          {/* summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 12, padding: '16px 20px' }}>
            {[
              { label: 'اليوم',      value: stats.today,       color: '#0f2744' },
              { label: 'الأمس',      value: stats.yesterday,   color: '#1a5276' },
              { label: 'الأسبوع',    value: stats.week,        color: '#065f46' },
              { label: 'الشهر',      value: stats.month,       color: '#92400e' },
              { label: 'الإجمالي',   value: stats.total,       color: '#4a044e' },
              { label: 'زوار جدد',   value: stats.newVisitors, color: '#0e7490' },
              { label: 'عائدون',     value: stats.returning,   color: '#7f1d1d' },
            ].map(c => (
              <div key={c.label} style={{ background: `${c.color}11`, border: `1px solid ${c.color}22`, borderRadius: 10, padding: '12px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: c.color }}>{c.value}</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{c.label}</div>
              </div>
            ))}
          </div>

          <div style={{ padding: '0 20px 20px' }}>

            {/* ── OVERVIEW TAB ─────────────────────────────── */}
            {tab === 'overview' && (
              <>
                {/* 14-day bar chart */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>📅 آخر 14 يوم</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 100, background: '#f8fafc', borderRadius: 10, padding: '10px 8px', overflowX: 'auto' }}>
                    {stats.byDay.map(d => {
                      const h = Math.max(4, Math.round((d.count / maxDay) * 80));
                      const isToday = d.date === new Date().toISOString().slice(0, 10);
                      return (
                        <div key={d.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flex: '0 0 auto', minWidth: 28 }} title={`${d.date}: ${d.count} زيارة`}>
                          <span style={{ fontSize: 9, color: '#6b7280' }}>{d.count || ''}</span>
                          <div style={{ width: 22, height: h, background: isToday ? '#c8962c' : '#0f2744', borderRadius: '4px 4px 0 0', opacity: isToday ? 1 : 0.7 }} />
                          <span style={{ fontSize: 8, color: '#9ca3af', writingMode: 'vertical-rl' }}>{d.date.slice(5)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* hours heatmap */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>⏰ توزيع الساعات</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', gap: 4 }}>
                    {stats.byHour.map(h => {
                      const opacity = Math.max(0.08, h.count / maxHour);
                      return (
                        <div key={h.hour} title={`${h.hour}:00 — ${h.count} زيارة`}
                          style={{ background: `rgba(15,39,68,${opacity})`, borderRadius: 4, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: opacity > 0.5 ? '#fff' : '#0f2744' }}>
                          {h.hour}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* languages */}
                {stats.byLang.length > 0 && (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>🌐 اللغات</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {stats.byLang.map(l => (
                        <span key={l.lang} style={{ background: '#e0f2fe', color: '#0369a1', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>
                          {LANG[l.lang] || l.lang} — {l.count}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── REGIONS TAB ──────────────────────────────── */}
            {tab === 'regions' && (
              <>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>🗺️ المناطق</div>
                  {stats.byRegion.length === 0 ? (
                    <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: 20 }}>لا توجد بيانات مناطق بعد</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {stats.byRegion.map((r, i) => {
                        const pct = Math.round((r.count / stats.total) * 100);
                        return (
                          <div key={r.region} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ width: 20, fontSize: 12, color: '#6b7280', textAlign: 'center' }}>{i + 1}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                <span style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>{r.region}</span>
                                <span style={{ fontSize: 12, color: '#6b7280' }}>{r.count} ({pct}%)</span>
                              </div>
                              <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#0f2744,#1a5276)', borderRadius: 3 }} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>🏙️ المدن</div>
                  {stats.byCity.length === 0 ? (
                    <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: 20 }}>لا توجد بيانات مدن بعد</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 8 }}>
                      {stats.byCity.map(c => (
                        <div key={c.city} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 13, color: '#374151' }}>📍 {c.city}</span>
                          <span style={{ background: '#0f2744', color: '#fff', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{c.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── RECENT TAB ───────────────────────────────── */}
            {tab === 'recent' && (
              <div style={{ overflowX: 'auto' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>🕐 آخر الزيارات</div>
                {stats.recent.length === 0 ? (
                  <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: 20 }}>لا توجد زيارات مسجلة بعد</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9' }}>
                        {['التاريخ', 'الساعة', 'المنطقة', 'المدينة', 'اللغة', 'النوع'].map(h => (
                          <th key={h} style={{ padding: '8px 10px', color: '#374151', fontWeight: 600, textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recent.map((v, i) => (
                        <tr key={v.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                          <td style={{ padding: '7px 10px', color: '#374151' }}>{v.date}</td>
                          <td style={{ padding: '7px 10px', color: '#374151' }}>{v.hour}:00</td>
                          <td style={{ padding: '7px 10px', color: '#374151' }}>{v.region}</td>
                          <td style={{ padding: '7px 10px', color: '#374151' }}>{v.city}</td>
                          <td style={{ padding: '7px 10px', color: '#374151' }}>{LANG[v.lang] || v.lang}</td>
                          <td style={{ padding: '7px 10px' }}>
                            <span style={{ background: v.isNew ? '#dcfce7' : '#e0f2fe', color: v.isNew ? '#166534' : '#0369a1', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                              {v.isNew ? '🆕 جديد' : '🔄 عائد'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
