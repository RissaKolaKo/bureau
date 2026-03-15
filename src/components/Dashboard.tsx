/* ═══════════════════════════════════════════════════════════════
   DASHBOARD — with Visit Analytics (daily/weekly/monthly)
   + Mini bar chart for last 7 days
   ═══════════════════════════════════════════════════════════════ */
import { useEffect, useState } from 'react';
import { Module, DocRecord } from '../types';
import { formatDate } from '../utils/storage';
import { ActiveSession } from '../utils/authService';
import {
  getDailyCount, getWeeklyCount, getMonthlyCount,
  getTotalVisits, getLast7Days, getPeakDay, VisitRecord,
} from '../utils/analytics';

interface DashboardProps {
  onNavigate: (m: Module) => void;
  history: DocRecord[];
  session?: ActiveSession;
  pendingCount?: number;
}

const MODULES = [
  { id: 'public-writer' as Module, icon: '✍️', titleAr: 'الكاتب العمومي', titleFr: 'Rédacteur Public', descAr: 'طلبات إدارية، تعهدات، تصاريح، عقود، وكالات، مراسلات رسمية', color: '#2563a8', bg: '#eff6ff', border: '#bfdbfe' },
  { id: 'cv-generator' as Module, icon: '📄', titleAr: 'مولّد السيرة الذاتية', titleFr: 'Générateur de CV', descAr: 'إنشاء سيرة ذاتية احترافية بالفرنسية مع قوالب متعددة', color: '#059669', bg: '#f0fdf4', border: '#bbf7d0' },
  { id: 'cin-scanner' as Module, icon: '🪪', titleAr: 'Scan Studio', titleFr: 'Scanner CIN', descAr: 'مسح وتحسين وطباعة بطاقة التعريف الوطنية', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  { id: 'french-letters' as Module, icon: '📝', titleAr: 'الرسائل الفرنسية', titleFr: 'Lettres en Français', descAr: 'طلب تدريب، استقالة، طلب إداري، مراسلة رسمية', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  { id: 'admin-procedures' as Module, icon: '🏛️', titleAr: 'المساطر الإدارية', titleFr: 'Procédures Administratives', descAr: 'دليل شامل للإجراءات الإدارية: CIN، رخصة، جواز سفر', color: '#dc2626', bg: '#fff1f2', border: '#fecaca' },
  { id: 'invoice-generator' as Module, icon: '🧾', titleAr: 'الفواتير والحسابات', titleFr: 'Factures & Devis', descAr: 'إنشاء فواتير، devis، حساب TVA 20%، تحويل المبلغ إلى حروف', color: '#059669', bg: '#f0fdf4', border: '#a7f3d0' },
];

/* ── Mini Bar Chart ── */
function MiniBarChart({ data }: { data: VisitRecord[] }) {
  const max = Math.max(...data.map(d => d.count), 1);
  const days = ['أحد', 'إث', 'ثل', 'أر', 'خم', 'جم', 'سب'];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 60, paddingTop: 6 }}>
      {data.map((d, i) => {
        const pct = Math.max(4, Math.round((d.count / max) * 100));
        const isToday = i === data.length - 1;
        const dow = new Date(d.date).getDay();
        return (
          <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: 9, fontWeight: isToday ? 800 : 400, color: isToday ? '#2563a8' : '#94a3b8' }}>
              {d.count > 0 ? d.count : ''}
            </div>
            <div style={{
              width: '100%', borderRadius: '4px 4px 0 0',
              background: isToday
                ? 'linear-gradient(180deg,#2563a8,#3b82f6)'
                : d.count > 0 ? 'linear-gradient(180deg,#93c5fd,#bfdbfe)' : '#f1f5f9',
              height: `${pct}%`,
              transition: 'height .4s ease',
              minHeight: 4,
            }} title={`${d.date}: ${d.count} زيارة`} />
            <div style={{ fontSize: 8, color: isToday ? '#2563a8' : '#cbd5e1', fontWeight: isToday ? 800 : 400 }}>
              {days[dow]}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Analytics Card ── */
function AnalyticsPanel({ history }: { history: DocRecord[] }) {
  const [daily, setDaily] = useState(0);
  const [weekly, setWeekly] = useState(0);
  const [monthly, setMonthly] = useState(0);
  const [total, setTotal] = useState(0);
  const [last7, setLast7] = useState<VisitRecord[]>([]);
  const [peak, setPeak] = useState<VisitRecord | null>(null);
  const [tab, setTab] = useState<'visits' | 'docs'>('visits');

  useEffect(() => {
    setDaily(getDailyCount());
    setWeekly(getWeeklyCount());
    setMonthly(getMonthlyCount());
    setTotal(getTotalVisits());
    setLast7(getLast7Days());
    setPeak(getPeakDay());
  }, []);

  const stats = [
    { label: 'اليوم', labelFr: 'Aujourd\'hui', value: daily, icon: '📅', color: '#2563a8', bg: '#eff6ff' },
    { label: 'هذا الأسبوع', labelFr: 'Cette Semaine', value: weekly, icon: '📆', color: '#059669', bg: '#f0fdf4' },
    { label: 'هذا الشهر', labelFr: 'Ce Mois', value: monthly, icon: '🗓️', color: '#7c3aed', bg: '#f5f3ff' },
    { label: 'إجمالي الزيارات', labelFr: 'Total Visites', value: total, icon: '🌐', color: '#d97706', bg: '#fffbeb' },
  ];

  // Docs per module last 30 days
  const now = Date.now();
  const last30 = history.filter(d => now - new Date(d.createdAt).getTime() < 30 * 24 * 60 * 60 * 1000);
  const docsPerModule = MODULES.map(m => ({
    ...m,
    count: last30.filter(d => d.module === m.id).length,
  })).sort((a, b) => b.count - a.count);

  return (
    <div style={{ background: 'white', borderRadius: 16, border: '1.5px solid #e2e8f0', overflow: 'hidden', marginBottom: 28, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
      {/* Panel header */}
      <div style={{ padding: '16px 22px', background: 'linear-gradient(135deg,#0f2744,#1a3a5c)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>📊</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'white' }}>إحصائيات الزيارات</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter, sans-serif' }}>Statistiques de Visites</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {([['visits', '📈 الزيارات'], ['docs', '📋 الوثائق']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: tab === id ? 'rgba(255,255,255,0.2)' : 'transparent',
              color: tab === id ? 'white' : 'rgba(255,255,255,0.4)',
              fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
            }}>{label}</button>
          ))}
        </div>
      </div>

      {tab === 'visits' && (
        <div style={{ padding: '18px 22px' }}>
          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
            {stats.map((s, i) => (
              <div key={i} style={{ background: s.bg, borderRadius: 12, padding: '14px 16px', border: `1px solid ${s.color}22` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 18 }}>{s.icon}</span>
                  <span style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{s.label}</div>
                <div style={{ fontSize: 9, color: '#94a3b8', fontFamily: 'Inter, sans-serif' }}>{s.labelFr}</div>
              </div>
            ))}
          </div>

          {/* Bar chart */}
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>آخر 7 أيام</div>
              <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'Inter, sans-serif' }}>
                {peak && `ذروة: ${peak.count} زيارة (${peak.date})`}
              </div>
            </div>
            <MiniBarChart data={last7} />
          </div>
        </div>
      )}

      {tab === 'docs' && (
        <div style={{ padding: '18px 22px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 14 }}>
            الوثائق المنشأة — آخر 30 يوم
            <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 400, marginRight: 8, fontFamily: 'Inter, sans-serif' }}>
              (Total: {last30.length})
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {docsPerModule.map(m => {
              const pct = last30.length > 0 ? Math.round((m.count / Math.max(last30.length, 1)) * 100) : 0;
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 16, width: 24, textAlign: 'center' }}>{m.icon}</span>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', width: 130, flexShrink: 0 }}>{m.titleAr}</div>
                  <div style={{ flex: 1, height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: m.color, borderRadius: 4, transition: 'width .5s ease', minWidth: m.count > 0 ? 8 : 0 }} />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: m.color, width: 28, textAlign: 'right' }}>{m.count}</div>
                </div>
              );
            })}
          </div>
          {last30.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: 13 }}>
              لا توجد وثائق في آخر 30 يوم
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════
   MAIN DASHBOARD
   ════════════════════════════ */
export default function Dashboard({ onNavigate, history, session, pendingCount }: DashboardProps) {
  const isAdmin = session?.role === 'admin' || session?.role === 'superadmin';
  const recentDocs = history.slice(0, 6);

  const allModules = [
    ...MODULES,
    ...(isAdmin ? [{
      id: 'user-management' as Module, icon: '👥',
      titleAr: 'إدارة المستخدمين', titleFr: 'Gestion des Utilisateurs',
      descAr: 'إدارة الحسابات، الصلاحيات، سجل المراقبة، إعدادات النظام',
      color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd',
    }] : []),
    ...(isAdmin ? [{
      id: 'homepage-control' as Module, icon: '🏠',
      titleAr: 'التحكم في الصفحة الرئيسية', titleFr: 'Contrôle Homepage',
      descAr: 'تخصيص محتوى وتصميم الصفحة الرئيسية للموقع',
      color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe',
    }] : []),
    ...(isAdmin && (pendingCount ?? 0) > 0 ? [{
      id: 'registration-manager' as Module, icon: '📬',
      titleAr: `طلبات التسجيل (${pendingCount})`, titleFr: 'Demandes d\'inscription',
      descAr: 'مراجعة وقبول أو رفض طلبات تسجيل المستخدمين الجدد',
      color: '#dc2626', bg: '#fff1f2', border: '#fecaca',
    }] : []),
    ...(isAdmin ? [{
      id: 'general-settings' as Module, icon: '⚙️',
      titleAr: 'الإعدادات العامة', titleFr: 'Paramètres Généraux',
      descAr: 'إدارة الخدمات، الإعلانات، الصفحة الرئيسية وإعدادات النظام',
      color: '#c8962c', bg: '#fffbeb', border: '#fde68a',
    }] : []),
  ];

  return (
    <div className="animate-fadeIn module-page" style={{ padding: '24px 28px' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#c8962c,#e8b84b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>⚜️</div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f2744', margin: 0 }}>نظام خدمات المكتب</h1>
            <p style={{ color: '#64748b', fontSize: 13, margin: 0, fontFamily: 'Inter, sans-serif' }}>
              Système de Gestion des Services — {session?.name && <span style={{ color: '#2563a8', fontWeight: 600 }}>مرحباً، {session.name}</span>}
            </p>
          </div>
        </div>
        <div className="moroccan-ornament" />
      </div>

      {/* Analytics Panel (admin only) */}
      {isAdmin && <AnalyticsPanel history={history} />}

      {/* Admin Quick Access Bar */}
      {isAdmin && (
        <div style={{ background: 'linear-gradient(135deg,#0f2744,#1a3a5c)', borderRadius: 14, padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
            <span style={{ fontSize: 24 }}>⚙️</span>
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>لوحة الإدارة</div>
              <div style={{ color: '#94a3b8', fontSize: 10, fontFamily: 'Inter,sans-serif' }}>Panneau d'Administration</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { id: 'general-settings' as Module, icon: '⚙️', label: 'الإعدادات', color: '#c8962c' },
              { id: 'user-management' as Module,  icon: '👥', label: 'المستخدمون', color: '#38bdf8' },
              { id: 'registration-manager' as Module, icon: '📬', label: 'التسجيلات', color: '#fb923c' },
            ].map(btn => (
              <button key={btn.id} onClick={() => onNavigate(btn.id)} style={{
                padding: '7px 14px', borderRadius: 9, border: `1px solid ${btn.color}44`,
                background: `${btn.color}18`, color: btn.color,
                fontFamily: 'inherit', fontWeight: 700, fontSize: 11, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5, transition: 'all .15s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${btn.color}30`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = `${btn.color}18`; }}
              >
                <span>{btn.icon}</span> {btn.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modules Grid */}
      <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0f2744', marginBottom: 14 }}>
        الوحدات — <span style={{ fontSize: 13, color: '#64748b', fontFamily: 'Inter, sans-serif', fontWeight: 400 }}>Modules Disponibles</span>
      </h2>
      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 28 }}>
        {allModules.map(mod => (
          <button key={mod.id} onClick={() => onNavigate(mod.id)} style={{
            background: mod.bg, border: `1.5px solid ${mod.border}`, borderRadius: 14,
            padding: '20px', cursor: 'pointer', textAlign: 'right', transition: 'all 0.18s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)', fontFamily: 'inherit', position: 'relative', overflow: 'hidden',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 8px 24px ${mod.border}`; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; }}
          >
            <div style={{ fontSize: 32, marginBottom: 10 }}>{mod.icon}</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: mod.color, marginBottom: 3 }}>{mod.titleAr}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: mod.color, opacity: 0.7, fontFamily: 'Inter, sans-serif', marginBottom: 8 }}>{mod.titleFr}</div>
            <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.6 }}>{mod.descAr}</div>
          </button>
        ))}
      </div>

      {/* Recent Documents */}
      {recentDocs.length > 0 && (
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0f2744', marginBottom: 14 }}>
            آخر الوثائق — <span style={{ fontSize: 13, color: '#64748b', fontFamily: 'Inter, sans-serif', fontWeight: 400 }}>Documents Récents</span>
          </h2>
          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="history-table">
              <thead><tr><th>الوثيقة</th><th>النوع</th><th>الوحدة</th><th>التاريخ</th></tr></thead>
              <tbody>
                {recentDocs.map(doc => (
                  <tr key={doc.id}>
                    <td style={{ fontWeight: 600 }}>{doc.title}</td>
                    <td><span className="badge badge-blue">{doc.type}</span></td>
                    <td>{moduleLabel(doc.module)}</td>
                    <td style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#64748b' }}>{formatDate(doc.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function moduleLabel(m: Module): string {
  const map: Partial<Record<Module, string>> = {
    dashboard: 'الرئيسية', 'public-writer': 'كاتب عمومي',
    'cv-generator': 'سيرة ذاتية', 'cin-scanner': 'بطاقة CIN',
    'french-letters': 'رسائل فرنسية', 'admin-procedures': 'مساطر إدارية',
    'user-management': 'إدارة المستخدمين', 'registration-manager': 'طلبات التسجيل',
    'invoice-generator': 'الفواتير', 'homepage-control': 'الصفحة الرئيسية',
    'general-settings': 'الإعدادات العامة',
  };
  return map[m] || m;
}
