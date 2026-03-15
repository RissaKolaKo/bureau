/* ═══════════════════════════════════════════════════════════════
   GENERAL SETTINGS — Unified Admin Control Panel
   Uses shared siteSettings store for real-time sync with HomePage
   ═══════════════════════════════════════════════════════════════ */
import { useState, useRef } from 'react';
import {
  ServiceConfig, AdItem, AdPosition, SiteSettings,
  DEFAULT_SERVICES,
  loadServices, saveServices,
  loadAds, saveAds,
  loadSite, saveSite,
} from '../utils/siteSettings';

/* ─── AD_POSITIONS defined locally (not from siteSettings) ─── */
const AD_POSITIONS: { value: AdPosition; label: string; labelFr: string }[] = [
  { value:'navbar-banner',   label:'شريط الناف بار',      labelFr:'Bannière Navbar'        },
  { value:'hero-top',        label:'فوق Hero Section',     labelFr:'Au-dessus du Hero'      },
  { value:'hero-bottom',     label:'أسفل Hero Section',    labelFr:'En-dessous du Hero'     },
  { value:'services-top',    label:'فوق قسم الخدمات',      labelFr:'Au-dessus des Services' },
  { value:'services-bottom', label:'أسفل قسم الخدمات',     labelFr:'En-dessous des Services'},
  { value:'how-it-works',    label:'داخل "كيف يعمل"',      labelFr:'Dans Comment ça marche' },
  { value:'testimonials',    label:'قسم الشهادات',          labelFr:'Section Témoignages'    },
  { value:'faq',             label:'قسم الأسئلة',           labelFr:'Section FAQ'            },
  { value:'footer-top',      label:'فوق الـ Footer',        labelFr:'Au-dessus du Footer'    },
];

/* ─── Re-export types so other files can import from here ─── */
export type { ServiceConfig, AdItem, AdPosition, SiteSettings };

/* ─── UI color palette ─── */
const C = {
  primary: '#0f2744', accent: '#c8962c', border: '#e2e8f0',
  cardBg: '#fff', pageBg: '#f4f6fa', danger: '#dc2626',
  success: '#16a34a', warn: '#d97706',
};



/* ─── UI primitives ─── */
function Toggle({ value, onChange, color = C.success }: { value: boolean; onChange: (v: boolean) => void; color?: string }) {
  return (
    <button onClick={() => onChange(!value)} style={{
      width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', padding: 3,
      background: value ? color : '#cbd5e1', transition: 'background .2s', position: 'relative', flexShrink: 0,
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        transform: value ? 'translateX(-20px)' : 'translateX(0)',
        transition: 'transform .2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  );
}

function SectionCard({ title, icon, children, extra }: { title: string; icon: string; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div style={{ background: C.cardBg, borderRadius: 14, border: `1px solid ${C.border}`, marginBottom: 20, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: `1px solid ${C.border}`, background: '#fafbfc' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>{icon}</span>
          <span style={{ fontWeight: 800, color: C.primary, fontSize: 14 }}>{title}</span>
        </div>
        {extra}
      </div>
      <div style={{ padding: '18px' }}>{children}</div>
    </div>
  );
}

function Btn({ onClick, children, color = C.primary, small }: { onClick: () => void; children: React.ReactNode; color?: string; small?: boolean }) {
  return (
    <button onClick={onClick} style={{
      padding: small ? '5px 12px' : '8px 18px',
      background: color, color: '#fff', border: 'none', borderRadius: 8,
      fontFamily: 'inherit', fontWeight: 700, fontSize: small ? 11 : 13,
      cursor: 'pointer', transition: 'opacity .15s',
    }}
      onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
    >{children}</button>
  );
}

function Input({ label, value, onChange, type = 'text', placeholder }: { label?: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      {label && <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>{label}</label>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
    </div>
  );
}

/* ══════════════════════════════════════════════════
   TAB 1 — SERVICES
══════════════════════════════════════════════════ */
function ServicesTab() {
  const [services, setServices] = useState<ServiceConfig[]>(loadServices);
  const [saved, setSaved] = useState(false);
  const [_dirty, setDirty] = useState(false);

  /* Save immediately on every change — dispatches custom event to App.tsx listener */
  function update(key: string, field: keyof ServiceConfig, val: unknown) {
    setServices(prev => {
      const updated = prev.map(s => s.key === key ? { ...s, [field]: val } : s);
      saveServices(updated); // ← immediate save + notify
      return updated;
    });
    setDirty(true);
    setSaved(false);
  }

  function save() {
    saveServices(services);
    setSaved(true);
    setDirty(false);
    setTimeout(() => setSaved(false), 3000);
  }

  function reset() {
    setServices(DEFAULT_SERVICES);
    saveServices(DEFAULT_SERVICES);
    setSaved(true);
    setDirty(false);
    setTimeout(() => setSaved(false), 3000);
  }

  const stats = {
    enabled: services.filter(s => s.enabled).length,
    disabled: services.filter(s => !s.enabled).length,
    free: services.filter(s => s.freeAccess).length,
    locked: services.filter(s => !s.freeAccess).length,
  };

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'مفعّلة', count: stats.enabled, color: C.success, icon: '✅' },
          { label: 'معطّلة', count: stats.disabled, color: C.danger, icon: '❌' },
          { label: 'مجانية', count: stats.free, color: C.accent, icon: '🆓' },
          { label: 'مقيّدة', count: stats.locked, color: '#7c3aed', icon: '🔒' },
        ].map(s => (
          <div key={s.label} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 12px', textAlign: 'center', borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: 22 }}>{s.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.count}</div>
            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Info banner */}
      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16 }}>✅</span>
        <span style={{ fontSize: 11, color: '#15803d', fontWeight: 700 }}>
          كل تغيير يُحفظ فوراً تلقائياً — الصفحة الرئيسية تتحدث عند العودة إليها. اضغط "حفظ" للتأكيد.
        </span>
      </div>

      {/* Services list */}
      {services.map(svc => (
        <div key={svc.key} style={{
          background: !svc.enabled ? '#f8fafc' : C.cardBg,
          border: `1px solid ${!svc.enabled ? '#e2e8f0' : svc.color + '44'}`,
          borderRadius: 14, marginBottom: 14, overflow: 'hidden',
          opacity: svc.enabled ? 1 : 0.7, transition: 'all .2s',
          borderRight: `4px solid ${svc.enabled ? svc.color : '#cbd5e1'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px', flexWrap: 'wrap' }}>
            {/* Icon + Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 200, flex: 1 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: svc.enabled ? svc.color + '18' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, border: `1px solid ${svc.color}30` }}>
                {svc.icon}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13, color: C.primary }}>{svc.nameAr}</div>
                <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'Inter,sans-serif' }}>{svc.nameFr}</div>
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              {/* Enable/Disable */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#64748b' }}>تفعيل</span>
                <Toggle value={svc.enabled} onChange={v => update(svc.key, 'enabled', v)} />
              </div>

              {/* Visible */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#64748b' }}>ظاهر</span>
                <Toggle value={svc.visible} onChange={v => update(svc.key, 'visible', v)} color="#7c3aed" />
              </div>

              {/* Free Access */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#64748b' }}>مجاني</span>
                <Toggle value={svc.freeAccess} onChange={v => update(svc.key, 'freeAccess', v)} color={C.accent} />
              </div>

              {/* Free uses (only if freeAccess) */}
              {svc.freeAccess && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#64748b' }}>عدد مجاني</span>
                  <input type="number" min={0} max={100} value={svc.freeUses}
                    onChange={e => update(svc.key, 'freeUses', parseInt(e.target.value) || 0)}
                    style={{ width: 56, textAlign: 'center', padding: '4px', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 12, fontFamily: 'inherit' }} />
                </div>
              )}

              {/* Status badge */}
              <div style={{
                padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 800,
                background: !svc.enabled ? '#f1f5f9' : svc.freeAccess ? '#fef3c7' : '#dbeafe',
                color: !svc.enabled ? '#94a3b8' : svc.freeAccess ? C.accent : '#2563a8',
                border: `1px solid ${!svc.enabled ? '#e2e8f0' : svc.freeAccess ? '#fde68a' : '#93c5fd'}`,
              }}>
                {!svc.enabled ? '❌ معطّلة' : svc.freeAccess ? '🆓 مجانية' : '🔒 مسجَّل'}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10, alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
          التغييرات محفوظة تلقائياً عند كل تعديل
        </span>
        <Btn onClick={reset} color="#94a3b8" small>↺ إعادة الضبط</Btn>
        <Btn onClick={save} color={saved ? C.success : C.primary}>
          {saved ? '✅ تم الحفظ بنجاح' : '💾 تأكيد الحفظ'}
        </Btn>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   TAB 2 — ADS
══════════════════════════════════════════════════ */
function AdsTab() {
  const [ads, setAds] = useState<AdItem[]>(loadAds);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<AdItem, 'id' | 'createdAt'>>({
    position: 'hero-top', type: 'image', content: '', link: '',
    alt: '', enabled: true, label: 'إعلان جديد',
  });
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function openNew() {
    setEditId(null);
    setForm({ position: 'hero-top', type: 'image', content: '', link: '', alt: '', enabled: true, label: 'إعلان جديد' });
    setShowForm(true);
  }

  function openEdit(ad: AdItem) {
    setEditId(ad.id);
    setForm({ position: ad.position, type: ad.type, content: ad.content, link: ad.link, alt: ad.alt, enabled: ad.enabled, label: ad.label });
    setShowForm(true);
  }

  function handleSave() {
    let updated: AdItem[];
    if (editId) {
      updated = ads.map(a => a.id === editId ? { ...a, ...form } : a);
    } else {
      const newAd: AdItem = { ...form, id: Date.now().toString(), createdAt: new Date().toISOString() };
      updated = [...ads, newAd];
    }
    setAds(updated);
    saveAds(updated); // ← dispatches custom event
    setShowForm(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function toggleAd(id: string) {
    const updated = ads.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a);
    setAds(updated);
    saveAds(updated); // ← dispatches custom event immediately
  }

  function deleteAd(id: string) {
    if (!confirm('حذف هذا الإعلان؟')) return;
    const updated = ads.filter(a => a.id !== id);
    setAds(updated);
    saveAds(updated); // ← dispatches custom event
  }

  function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setForm(f => ({ ...f, content: ev.target?.result as string }));
    reader.readAsDataURL(file);
  }

  const posLabel = (pos: AdPosition) => AD_POSITIONS.find((p: typeof AD_POSITIONS[0]) => p.value === pos)?.label ?? pos;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '6px 12px', fontSize: 11, color: C.success, fontWeight: 700 }}>
            ✅ {ads.filter(a => a.enabled).length} مفعّل
          </div>
          <div style={{ background: '#f8fafc', border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 12px', fontSize: 11, color: '#64748b', fontWeight: 700 }}>
            📢 {ads.length} إعلان
          </div>
        </div>
        <Btn onClick={openNew} color={C.accent}>+ إضافة إعلان</Btn>
      </div>

      {/* Info banner */}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16 }}>ℹ️</span>
        <span style={{ fontSize: 11, color: '#1e40af', fontWeight: 700 }}>
          الإعلانات تُطبَّق فوراً على الصفحة الرئيسية عند التفعيل/التعطيل — لا حاجة لإعادة تحميل الصفحة
        </span>
      </div>

      {/* Empty state */}
      {ads.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📢</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>لا توجد إعلانات بعد</div>
          <div style={{ fontSize: 12, marginBottom: 20 }}>أضف إعلانك الأول ليظهر في الصفحة الرئيسية</div>
          <Btn onClick={openNew} color={C.accent}>+ إضافة إعلان</Btn>
        </div>
      )}

      {/* Ads list */}
      {ads.map(ad => (
        <div key={ad.id} style={{
          background: C.cardBg, border: `1px solid ${ad.enabled ? '#bbf7d0' : C.border}`,
          borderRadius: 12, marginBottom: 12, overflow: 'hidden',
          borderRight: `4px solid ${ad.enabled ? C.success : '#cbd5e1'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', flexWrap: 'wrap' }}>
            {/* Preview */}
            <div style={{ width: 80, height: 48, borderRadius: 8, overflow: 'hidden', background: '#f8fafc', border: `1px solid ${C.border}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {ad.type === 'image' && ad.content ? (
                <img src={ad.content} alt={ad.alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 24 }}>💻</span>
              )}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 120 }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: C.primary }}>{ad.label}</div>
              <div style={{ fontSize: 10, color: '#64748b', display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                <span>📍 {posLabel(ad.position)}</span>
                <span>•</span>
                <span>{ad.type === 'image' ? '🖼️ صورة' : '💻 HTML'}</span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Toggle value={ad.enabled} onChange={() => toggleAd(ad.id)} />
              <button onClick={() => openEdit(ad)} style={{ padding: '5px 12px', background: '#dbeafe', color: '#1e40af', border: 'none', borderRadius: 7, fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>✏️ تعديل</button>
              <button onClick={() => deleteAd(ad.id)} style={{ padding: '5px 12px', background: '#fee2e2', color: C.danger, border: 'none', borderRadius: 7, fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>🗑️</button>
            </div>
          </div>
        </div>
      ))}

      {/* ADD/EDIT FORM MODAL */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: C.cardBg, borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', borderBottom: `1px solid ${C.border}`, background: C.primary }}>
              <span style={{ fontWeight: 800, color: '#fff', fontSize: 15 }}>{editId ? '✏️ تعديل الإعلان' : '+ إضافة إعلان جديد'}</span>
              <button onClick={() => setShowForm(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 30, height: 30, borderRadius: 8, cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>

            <div style={{ padding: 20 }}>
              <Input label="تسمية الإعلان" value={form.label} onChange={v => setForm(f => ({ ...f, label: v }))} placeholder="مثال: إعلان البانر العلوي" />

              {/* Position */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>موقع الإعلان في الصفحة</label>
                <select value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value as AdPosition }))}
                  style={{ width: '100%', padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, fontFamily: 'inherit', background: '#fff' }}>
                  {AD_POSITIONS.map(p => (
                    <option key={p.value} value={p.value}>{p.label} — {p.labelFr}</option>
                  ))}
                </select>
              </div>

              {/* Type */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 8 }}>نوع الإعلان</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[{ v: 'image', label: '🖼️ صورة', desc: 'رفع صورة أو رابط URL' }, { v: 'html', label: '💻 كود HTML', desc: 'Google AdSense أو أي كود' }].map(t => (
                    <button key={t.v} onClick={() => setForm(f => ({ ...f, type: t.v as 'image' | 'html' }))}
                      style={{ flex: 1, padding: '10px', border: `2px solid ${form.type === t.v ? C.accent : C.border}`, borderRadius: 10, background: form.type === t.v ? '#fffbeb' : '#fafafa', cursor: 'pointer', textAlign: 'center' }}>
                      <div style={{ fontSize: 18 }}>{t.label.split(' ')[0]}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: form.type === t.v ? C.accent : '#64748b' }}>{t.label.split(' ').slice(1).join(' ')}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Content */}
              {form.type === 'image' ? (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>رفع صورة</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input ref={fileRef} type="file" accept="image/*" onChange={handleImageFile} style={{ display: 'none' }} />
                      <button onClick={() => fileRef.current?.click()} style={{ padding: '8px 16px', background: '#f1f5f9', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                        📁 اختيار صورة
                      </button>
                    </div>
                    {form.content && form.content.startsWith('data:') && (
                      <img src={form.content} alt="" style={{ width: '100%', maxHeight: 120, objectFit: 'contain', marginTop: 8, borderRadius: 8, border: `1px solid ${C.border}` }} />
                    )}
                  </div>
                  <Input label="أو أدخل رابط الصورة (URL)" value={form.content.startsWith('data:') ? '' : form.content}
                    onChange={v => setForm(f => ({ ...f, content: v }))} placeholder="https://example.com/banner.jpg" />
                  <Input label="رابط عند النقر (اختياري)" value={form.link || ''} onChange={v => setForm(f => ({ ...f, link: v }))} placeholder="https://..." />
                  <Input label="النص البديل (SEO)" value={form.alt || ''} onChange={v => setForm(f => ({ ...f, alt: v }))} placeholder="وصف الصورة" />
                </>
              ) : (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>كود HTML / AdSense</label>
                  <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                    placeholder="<!-- أدخل كود الإعلان هنا -->"
                    style={{ width: '100%', height: 140, padding: '10px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 11, fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }} />
                </div>
              )}

              {/* Enabled */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                <Toggle value={form.enabled} onChange={v => setForm(f => ({ ...f, enabled: v }))} />
                <span style={{ fontSize: 12, color: '#475569', fontWeight: 700 }}>تفعيل الإعلان الآن</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '14px 20px', borderTop: `1px solid ${C.border}`, background: '#fafbfc' }}>
              <Btn onClick={() => setShowForm(false)} color="#94a3b8" small>إلغاء</Btn>
              <Btn onClick={handleSave} color={C.accent}>{editId ? '💾 حفظ التعديلات' : '➕ إضافة الإعلان'}</Btn>
            </div>
          </div>
        </div>
      )}

      {saved && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: C.success, color: '#fff', padding: '10px 24px', borderRadius: 24, fontWeight: 700, fontSize: 13, zIndex: 2000, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
          ✅ تم حفظ الإعلانات — الصفحة الرئيسية محدَّثة
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   TAB 3 — HOMEPAGE CONTENT
══════════════════════════════════════════════════ */
function HomepageTab() {
  const [site, setSite] = useState<SiteSettings>(loadSite);
  const [saved, setSaved] = useState(false);
  const [section, setSection] = useState<'identity' | 'hero' | 'sections' | 'contact' | 'seo'>('identity');

  /* Save immediately on every field change */
  function update(field: keyof SiteSettings, value: unknown) {
    setSite(s => {
      const updated = { ...s, [field]: value };
      saveSite(updated); // ← immediate save + notify App.tsx
      return updated;
    });
    setSaved(false);
  }

  function save() {
    saveSite(site);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const sections: { id: typeof section; icon: string; label: string }[] = [
    { id: 'identity', icon: '🏷️', label: 'الهوية' },
    { id: 'hero',     icon: '🦸', label: 'Hero Section' },
    { id: 'sections', icon: '📋', label: 'الأقسام' },
    { id: 'contact',  icon: '📞', label: 'التواصل' },
    { id: 'seo',      icon: '🔍', label: 'SEO & Analytics' },
  ];

  return (
    <div>
      {/* Info banner */}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16 }}>ℹ️</span>
        <span style={{ fontSize: 11, color: '#1e40af', fontWeight: 700 }}>
          التغييرات تُحفظ وتُطبَّق فوراً على الصفحة الرئيسية بعد الضغط على "حفظ"
        </span>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {sections.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)} style={{
            padding: '7px 14px', borderRadius: 20, border: `1px solid ${section === s.id ? C.primary : C.border}`,
            background: section === s.id ? C.primary : '#fff', color: section === s.id ? '#fff' : '#64748b',
            fontFamily: 'inherit', fontWeight: 700, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <span>{s.icon}</span> {s.label}
          </button>
        ))}
      </div>

      {/* IDENTITY */}
      {section === 'identity' && (
        <SectionCard title="هوية الموقع" icon="🏷️">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Input label="اسم الموقع (عربي)" value={site.siteName} onChange={v => update('siteName', v)} />
            <Input label="اسم الموقع (فرنسي)" value={site.siteNameFr} onChange={v => update('siteNameFr', v)} />
            <Input label="الشعار (عربي)" value={site.slogan} onChange={v => update('slogan', v)} />
            <Input label="الشعار (فرنسي)" value={site.sloganFr} onChange={v => update('sloganFr', v)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <Input label="أيقونة/لوجو (Emoji)" value={site.logo} onChange={v => update('logo', v)} />
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>اللون الرئيسي</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={site.primaryColor} onChange={e => update('primaryColor', e.target.value)}
                  style={{ width: 44, height: 36, borderRadius: 8, border: `1px solid ${C.border}`, cursor: 'pointer', padding: 2 }} />
                <input type="text" value={site.primaryColor} onChange={e => update('primaryColor', e.target.value)}
                  style={{ flex: 1, padding: '6px 10px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 11, fontFamily: 'monospace' }} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>اللون الثانوي</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={site.accentColor} onChange={e => update('accentColor', e.target.value)}
                  style={{ width: 44, height: 36, borderRadius: 8, border: `1px solid ${C.border}`, cursor: 'pointer', padding: 2 }} />
                <input type="text" value={site.accentColor} onChange={e => update('accentColor', e.target.value)}
                  style={{ flex: 1, padding: '6px 10px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 11, fontFamily: 'monospace' }} />
              </div>
            </div>
          </div>
          {/* Live preview */}
          <div style={{ marginTop: 16, padding: 16, background: site.primaryColor, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 32 }}>{site.logo}</span>
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>{site.siteName}</div>
              <div style={{ color: site.accentColor, fontSize: 12 }}>{site.siteNameFr}</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 }}>{site.slogan}</div>
            </div>
            <div style={{ marginRight: 'auto', fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>معاينة حية</div>
          </div>
        </SectionCard>
      )}

      {/* HERO */}
      {section === 'hero' && (
        <SectionCard title="Hero Section — الصفحة الرئيسية" icon="🦸">
          <Input label="العنوان الرئيسي (عربي)" value={site.heroTitle} onChange={v => update('heroTitle', v)} />
          <Input label="العنوان الفرعي (عربي)" value={site.heroSubtitle} onChange={v => update('heroSubtitle', v)} />
          <Input label="العنوان بالفرنسية" value={site.heroTitleFr} onChange={v => update('heroTitleFr', v)} />
          <Input label="نص الـ Footer" value={site.footerText} onChange={v => update('footerText', v)} />
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: 14, marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 800, color: '#c2410c', fontSize: 13 }}>🔧 وضع الصيانة</span>
              <Toggle value={site.maintenanceMode} onChange={v => update('maintenanceMode', v)} color={C.danger} />
            </div>
            {site.maintenanceMode && (
              <Input label="رسالة الصيانة" value={site.maintenanceMessage} onChange={v => update('maintenanceMessage', v)} placeholder="الموقع في وضع الصيانة..." />
            )}
          </div>
        </SectionCard>
      )}

      {/* SECTIONS visibility */}
      {section === 'sections' && (
        <SectionCard title="الأقسام المرئية" icon="📋">
          {[
            { key: 'showStats',        label: 'قسم الإحصائيات',       icon: '📊' },
            { key: 'showHowItWorks',   label: 'كيف يعمل الموقع',      icon: '🔄' },
            { key: 'showTestimonials', label: 'شهادات العملاء',        icon: '💬' },
            { key: 'showFaq',          label: 'الأسئلة الشائعة',       icon: '❓' },
          ].map(s => (
            <div key={s.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>{s.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, color: C.primary, fontSize: 13 }}>{s.label}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>يظهر / يُخفى في الصفحة الرئيسية</div>
                </div>
              </div>
              <Toggle value={site[s.key as keyof SiteSettings] as boolean} onChange={v => update(s.key as keyof SiteSettings, v)} />
            </div>
          ))}
        </SectionCard>
      )}

      {/* CONTACT */}
      {section === 'contact' && (
        <SectionCard title="معلومات التواصل" icon="📞">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Input label="البريد الإلكتروني" value={site.contactEmail} onChange={v => update('contactEmail', v)} placeholder="contact@bureau.ma" />
            <Input label="رقم الهاتف" value={site.contactPhone} onChange={v => update('contactPhone', v)} placeholder="+212 5XX-XXXXXX" />
            <Input label="العنوان" value={site.address} onChange={v => update('address', v)} placeholder="شارع محمد الخامس" />
            <Input label="المدينة" value={site.city} onChange={v => update('city', v)} placeholder="الرباط" />
          </div>
        </SectionCard>
      )}

      {/* SEO */}
      {section === 'seo' && (
        <SectionCard title="SEO & Analytics" icon="🔍">
          <Input label="Google Analytics ID" value={site.googleAnalyticsId} onChange={v => update('googleAnalyticsId', v)} placeholder="G-XXXXXXXXXX" />
          <Input label="Facebook Pixel ID" value={site.facebookPixelId} onChange={v => update('facebookPixelId', v)} placeholder="XXXXXXXXXXXXXXX" />
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 12, marginTop: 8 }}>
            <div style={{ fontSize: 11, color: '#166534', fontWeight: 700, marginBottom: 4 }}>✅ SEO تلقائي مُفعَّل</div>
            <div style={{ fontSize: 10, color: '#166534' }}>الموقع يحتوي على Schema.org، Open Graph، Twitter Cards، Canonical URLs — جميعها محدَّثة تلقائياً</div>
          </div>
        </SectionCard>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
        <Btn onClick={save} color={saved ? C.success : C.primary}>
          {saved ? '✅ تم الحفظ — الصفحة الرئيسية محدَّثة' : '💾 حفظ التغييرات'}
        </Btn>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   MAIN GeneralSettings
══════════════════════════════════════════════════ */
type Tab = 'services' | 'ads' | 'homepage';

export default function GeneralSettings() {
  const [tab, setTab] = useState<Tab>('services');

  const tabs: { id: Tab; icon: string; labelAr: string; labelFr: string; color: string }[] = [
    { id: 'services', icon: '⚙️', labelAr: 'إدارة الخدمات',   labelFr: 'Gestion des Services', color: '#2563a8' },
    { id: 'ads',      icon: '📢', labelAr: 'الإعلانات',        labelFr: 'Publicités',           color: C.accent  },
    { id: 'homepage', icon: '🏠', labelAr: 'الصفحة الرئيسية', labelFr: "Page d'Accueil",       color: '#7c3aed' },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto', direction: 'rtl', fontFamily: "'Cairo', sans-serif" }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28, paddingBottom: 20, borderBottom: `2px solid ${C.border}` }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: `linear-gradient(135deg,${C.primary},#1e3a5f)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
          ⚙️
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: C.primary }}>الإعدادات العامة</h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b', fontFamily: 'Inter,sans-serif' }}>
            Paramètres Généraux — Gestion complète du système
          </p>
        </div>
        <div style={{ marginRight: 'auto', display: 'flex', gap: 8 }}>
          <div style={{ padding: '4px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 20, fontSize: 10, color: C.success, fontWeight: 700 }}>
            🟢 Système Actif
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, background: '#f4f6fa', borderRadius: 14, padding: 5, border: `1px solid ${C.border}` }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '12px 8px', border: 'none', borderRadius: 10,
            background: tab === t.id ? '#fff' : 'transparent',
            boxShadow: tab === t.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            fontFamily: 'inherit', cursor: 'pointer', transition: 'all .2s',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          }}>
            <span style={{ fontSize: 22 }}>{t.icon}</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: tab === t.id ? t.color : '#94a3b8' }}>{t.labelAr}</span>
            <span style={{ fontSize: 9, color: tab === t.id ? '#94a3b8' : '#cbd5e1', fontFamily: 'Inter,sans-serif' }}>{t.labelFr}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'services' && <ServicesTab />}
      {tab === 'ads'      && <AdsTab />}
      {tab === 'homepage' && <HomepageTab />}
    </div>
  );
}
