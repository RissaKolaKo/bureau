/* ═══════════════════════════════════════════════════════════════
   HOMEPAGE CONTROL PANEL — Admin control over the public homepage
   Stored in localStorage: moas_homepage_settings
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect } from 'react';

const SETTINGS_KEY = 'moas_homepage_settings';

export interface HomepageSettings {
  /* Hero */
  heroTitle: string;
  heroSubtitle: string;
  heroBadge: string;
  heroCtaMain: string;
  heroCtaScan: string;
  heroCtaRegister: string;
  showHeroStats: boolean;
  stat1Label: string; stat1Value: string;
  stat2Label: string; stat2Value: string;
  stat3Label: string; stat3Value: string;
  stat4Label: string; stat4Value: string;
  /* Navbar */
  brandName: string;
  brandSlogan: string;
  /* Announcement banner */
  showBanner: boolean;
  bannerText: string;
  bannerColor: string;
  /* Services section */
  servicesTitle: string;
  showServices: boolean;
  /* How it works */
  showHowItWorks: boolean;
  howItWorksTitle: string;
  /* Testimonials */
  showTestimonials: boolean;
  /* FAQ */
  showFAQ: boolean;
  /* Contact */
  phone: string;
  email: string;
  address: string;
  city: string;
  /* Colors */
  primaryColor: string;
  accentColor: string;
  /* Footer */
  footerText: string;
  copyrightYear: string;
}

export const DEFAULT_SETTINGS: HomepageSettings = {
  heroTitle: 'مكتب الخدمات الإدارية',
  heroSubtitle: 'Votre Bureau Numérique Marocain',
  heroBadge: '🇲🇦 خدمات رقمية موثوقة — Services Numériques Fiables',
  heroCtaMain: '🏛️ المساطر الإدارية — مجاناً',
  heroCtaScan: '🪪 Scan Studio',
  heroCtaRegister: '✨ إنشاء حساب مجاني',
  showHeroStats: true,
  stat1Label: 'مسطرة إدارية', stat1Value: '55+',
  stat2Label: 'نوع وثيقة', stat2Value: '9',
  stat3Label: 'قالب CV', stat3Value: '3',
  stat4Label: 'مجاني 100%', stat4Value: '✓',
  brandName: 'مكتب الخدمات',
  brandSlogan: 'Bureau de Services',
  showBanner: true,
  bannerText: '✅ المساطر الإدارية متاحة مجاناً لجميع الزوار — Scan Studio: 5 essais gratuits',
  bannerColor: '#c8962c',
  servicesTitle: 'خدماتنا الرقمية',
  showServices: true,
  showHowItWorks: true,
  howItWorksTitle: 'كيف يعمل النظام؟',
  showTestimonials: true,
  showFAQ: true,
  phone: '+212 6XX XXX XXX',
  email: 'contact@bureau.ma',
  address: 'شارع محمد الخامس',
  city: 'الرباط، المغرب',
  primaryColor: '#0f2744',
  accentColor: '#c8962c',
  footerText: 'مكتب الخدمات الإدارية الرقمية',
  copyrightYear: '2025',
};

export function loadHomepageSettings(): HomepageSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}

export function saveHomepageSettings(s: HomepageSettings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

/* ── Sub-components ── */
function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ border: '1.5px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px', background: open ? '#f8fafc' : '#fff', border: 'none',
        cursor: 'pointer', fontFamily: 'inherit',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>{icon}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0f2744' }}>{title}</span>
        </div>
        <span style={{ fontSize: 12, color: '#94a3b8', transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }}>▼</span>
      </button>
      {open && (
        <div style={{ padding: '16px 18px', background: '#fff', borderTop: '1px solid #f1f5f9' }}>
          {children}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder = '', dir = 'rtl' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; dir?: string;
}) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} dir={dir}
      style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', color: '#1e293b', background: '#fafafa' }}
      onFocus={e => { e.target.style.borderColor = '#2563a8'; e.target.style.background = '#fff'; }}
      onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#fafafa'; }}
    />
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '6px 0' }}>
      <div onClick={() => onChange(!checked)} style={{
        width: 40, height: 22, borderRadius: 11, background: checked ? '#2563a8' : '#cbd5e1',
        position: 'relative', transition: 'background .2s', cursor: 'pointer', flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', top: 3, left: checked ? 21 : 3,
          width: 16, height: 16, borderRadius: '50%', background: 'white',
          transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
        }} />
      </div>
      <span style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>{label}</span>
    </label>
  );
}

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <input type="color" value={value} onChange={e => onChange(e.target.value)}
        style={{ width: 36, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer', padding: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{label}</div>
        <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{value}</div>
      </div>
      <input value={value} onChange={e => onChange(e.target.value)} dir="ltr"
        style={{ width: 90, padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 11, fontFamily: 'monospace', color: '#374151' }} />
    </div>
  );
}

/* ════════════════════════════
   MAIN COMPONENT
   ════════════════════════════ */
export default function HomepageControl() {
  const [settings, setSettings] = useState<HomepageSettings>(loadHomepageSettings());
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'design' | 'contact' | 'visibility'>('content');

  useEffect(() => { setSettings(loadHomepageSettings()); }, []);

  function update(patch: Partial<HomepageSettings>) {
    setSettings(prev => ({ ...prev, ...patch }));
  }

  function handleSave() {
    saveHomepageSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function handleReset() {
    if (!confirm('هل تريد إعادة تعيين جميع الإعدادات للقيم الافتراضية؟')) return;
    setSettings({ ...DEFAULT_SETTINGS });
    saveHomepageSettings({ ...DEFAULT_SETTINGS });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const tabs: { id: typeof activeTab; label: string; icon: string }[] = [
    { id: 'content', label: 'المحتوى', icon: '📝' },
    { id: 'design', label: 'التصميم', icon: '🎨' },
    { id: 'contact', label: 'معلومات الاتصال', icon: '📞' },
    { id: 'visibility', label: 'الأقسام', icon: '👁️' },
  ];

  return (
    <div className="module-page animate-fadeIn" style={{ padding: '24px 28px', maxWidth: 900, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,#0f2744,#2563a8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🏠</div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f2744', margin: 0 }}>التحكم في الصفحة الرئيسية</h1>
            <p style={{ fontSize: 12, color: '#64748b', margin: 0, fontFamily: 'Inter, sans-serif' }}>Contrôle de la Page d'Accueil</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleReset} style={{ padding: '9px 18px', borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            ↺ إعادة تعيين
          </button>
          <button onClick={handleSave} style={{ padding: '9px 22px', borderRadius: 9, border: 'none', background: saved ? '#16a34a' : 'linear-gradient(135deg,#0f2744,#2563a8)', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'background .3s' }}>
            {saved ? '✅ تم الحفظ' : '💾 حفظ التغييرات'}
          </button>
        </div>
      </div>

      {/* Live preview button */}
      <div style={{ padding: '10px 16px', background: 'linear-gradient(135deg,#fef3c7,#fffbeb)', border: '1.5px solid #fde68a', borderRadius: 10, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 18 }}>ℹ️</span>
        <p style={{ margin: 0, fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
          التغييرات تُطبَّق فوراً على الصفحة الرئيسية بعد الحفظ. انقر على "الصفحة الرئيسية" في الشريط العلوي لمعاينة النتيجة.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, background: '#f1f5f9', borderRadius: 12, padding: 6 }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex: 1, padding: '9px 12px', borderRadius: 9, border: 'none', cursor: 'pointer',
            background: activeTab === tab.id ? 'white' : 'transparent',
            color: activeTab === tab.id ? '#0f2744' : '#64748b',
            fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 600,
            fontFamily: 'inherit', boxShadow: activeTab === tab.id ? '0 1px 6px rgba(0,0,0,0.08)' : 'none',
            transition: 'all .2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: CONTENT ── */}
      {activeTab === 'content' && (
        <div>
          <Section title="العلامة التجارية (Brand)" icon="⚜️">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="اسم المكتب — Nom du Bureau">
                <TextInput value={settings.brandName} onChange={v => update({ brandName: v })} />
              </Field>
              <Field label="الشعار الفرعي — Slogan FR">
                <TextInput value={settings.brandSlogan} onChange={v => update({ brandSlogan: v })} dir="ltr" />
              </Field>
            </div>
          </Section>

          <Section title="قسم Hero الرئيسي" icon="🦸">
            <Field label="العنوان الرئيسي (H1)">
              <TextInput value={settings.heroTitle} onChange={v => update({ heroTitle: v })} />
            </Field>
            <Field label="العنوان الفرعي (Sous-titre)">
              <TextInput value={settings.heroSubtitle} onChange={v => update({ heroSubtitle: v })} dir="ltr" />
            </Field>
            <Field label="Badge النص الصغير أعلى العنوان">
              <TextInput value={settings.heroBadge} onChange={v => update({ heroBadge: v })} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <Field label="زر رئيسي (CTA 1)">
                <TextInput value={settings.heroCtaMain} onChange={v => update({ heroCtaMain: v })} />
              </Field>
              <Field label="زر Scan Studio (CTA 2)">
                <TextInput value={settings.heroCtaScan} onChange={v => update({ heroCtaScan: v })} />
              </Field>
              <Field label="زر التسجيل (CTA 3)">
                <TextInput value={settings.heroCtaRegister} onChange={v => update({ heroCtaRegister: v })} />
              </Field>
            </div>
            <Toggle label="إظهار الإحصائيات (Stats Bar)" checked={settings.showHeroStats} onChange={v => update({ showHeroStats: v })} />
            {settings.showHeroStats && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 10 }}>
                {[
                  { vk: 'stat1Value' as const, lk: 'stat1Label' as const, label: 'إحصاء 1' },
                  { vk: 'stat2Value' as const, lk: 'stat2Label' as const, label: 'إحصاء 2' },
                  { vk: 'stat3Value' as const, lk: 'stat3Label' as const, label: 'إحصاء 3' },
                  { vk: 'stat4Value' as const, lk: 'stat4Label' as const, label: 'إحصاء 4' },
                ].map(stat => (
                  <div key={stat.label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>{stat.label}</div>
                    <input value={settings[stat.vk]} onChange={e => update({ [stat.vk]: e.target.value })}
                      placeholder="القيمة" dir="ltr"
                      style={{ width: '100%', padding: '5px 8px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, fontWeight: 800, marginBottom: 4, color: '#2563a8', textAlign: 'center', boxSizing: 'border-box' }} />
                    <input value={settings[stat.lk]} onChange={e => update({ [stat.lk]: e.target.value })}
                      placeholder="التسمية"
                      style={{ width: '100%', padding: '5px 8px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 11, color: '#374151', textAlign: 'center', boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="الشريط الإعلاني (Banner)" icon="📢">
            <Toggle label="إظهار الشريط الإعلاني" checked={settings.showBanner} onChange={v => update({ showBanner: v })} />
            {settings.showBanner && (
              <>
                <Field label="نص الشريط">
                  <TextInput value={settings.bannerText} onChange={v => update({ bannerText: v })} />
                </Field>
                <ColorPicker label="لون الخلفية" value={settings.bannerColor} onChange={v => update({ bannerColor: v })} />
              </>
            )}
          </Section>

          <Section title="عناوين الأقسام" icon="📋">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="عنوان قسم الخدمات">
                <TextInput value={settings.servicesTitle} onChange={v => update({ servicesTitle: v })} />
              </Field>
              <Field label="عنوان قسم كيف يعمل">
                <TextInput value={settings.howItWorksTitle} onChange={v => update({ howItWorksTitle: v })} />
              </Field>
            </div>
          </Section>

          <Section title="الفوتر (Footer)" icon="📎">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="نص الفوتر">
                <TextInput value={settings.footerText} onChange={v => update({ footerText: v })} />
              </Field>
              <Field label="سنة حقوق النشر">
                <TextInput value={settings.copyrightYear} onChange={v => update({ copyrightYear: v })} dir="ltr" />
              </Field>
            </div>
          </Section>
        </div>
      )}

      {/* ── TAB: DESIGN ── */}
      {activeTab === 'design' && (
        <div>
          <Section title="الألوان الرئيسية" icon="🎨">
            <ColorPicker label="اللون الأساسي (Primary)" value={settings.primaryColor} onChange={v => update({ primaryColor: v })} />
            <ColorPicker label="اللون المميز (Accent / Gold)" value={settings.accentColor} onChange={v => update({ accentColor: v })} />
            <div style={{ marginTop: 16, padding: 14, background: settings.primaryColor, borderRadius: 10, display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: settings.accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>⚜️</div>
              <div>
                <div style={{ color: 'white', fontWeight: 800, fontSize: 15 }}>{settings.brandName}</div>
                <div style={{ color: settings.accentColor, fontSize: 12 }}>{settings.brandSlogan}</div>
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* ── TAB: CONTACT ── */}
      {activeTab === 'contact' && (
        <div>
          <Section title="معلومات الاتصال" icon="📞">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="رقم الهاتف">
                <TextInput value={settings.phone} onChange={v => update({ phone: v })} dir="ltr" />
              </Field>
              <Field label="البريد الإلكتروني">
                <TextInput value={settings.email} onChange={v => update({ email: v })} dir="ltr" />
              </Field>
              <Field label="العنوان">
                <TextInput value={settings.address} onChange={v => update({ address: v })} />
              </Field>
              <Field label="المدينة">
                <TextInput value={settings.city} onChange={v => update({ city: v })} />
              </Field>
            </div>
          </Section>
        </div>
      )}

      {/* ── TAB: VISIBILITY ── */}
      {activeTab === 'visibility' && (
        <div>
          <Section title="إظهار / إخفاء الأقسام" icon="👁️">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Toggle label="قسم الخدمات (Services Grid)" checked={settings.showServices} onChange={v => update({ showServices: v })} />
              <Toggle label="قسم كيف يعمل (How it Works)" checked={settings.showHowItWorks} onChange={v => update({ showHowItWorks: v })} />
              <Toggle label="قسم الشهادات (Testimonials)" checked={settings.showTestimonials} onChange={v => update({ showTestimonials: v })} />
              <Toggle label="قسم الأسئلة الشائعة (FAQ)" checked={settings.showFAQ} onChange={v => update({ showFAQ: v })} />
              <Toggle label="الشريط الإعلاني (Banner)" checked={settings.showBanner} onChange={v => update({ showBanner: v })} />
              <Toggle label="إحصائيات Hero" checked={settings.showHeroStats} onChange={v => update({ showHeroStats: v })} />
            </div>
          </Section>
        </div>
      )}

      {/* Save button (bottom) */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24, gap: 12 }}>
        <button onClick={handleReset} style={{ padding: '11px 28px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          ↺ إعادة تعيين
        </button>
        <button onClick={handleSave} style={{ padding: '11px 36px', borderRadius: 10, border: 'none', background: saved ? '#16a34a' : 'linear-gradient(135deg,#c8962c,#e8b84b)', color: 'white', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(200,150,44,0.3)' }}>
          {saved ? '✅ تم حفظ الإعدادات بنجاح' : '💾 حفظ جميع التغييرات'}
        </button>
      </div>
    </div>
  );
}
