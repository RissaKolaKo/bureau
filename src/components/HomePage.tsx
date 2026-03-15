/* ═══════════════════════════════════════════════════════════════════
   HOMEPAGE — SEO Optimized Landing Page
   مكتب الخدمات الإدارية — Bureau de Services Administratifs
   Public access: المساطر الإدارية (free) + Scan Studio (5 uses free)
   Authenticated: All other modules
═══════════════════════════════════════════════════════════════════ */
import { useState, useEffect } from 'react';
import { ServiceConfig, AdItem, SiteSettings } from '../utils/siteSettings';

type ServiceKey = 'procedures' | 'scanner' | 'writer' | 'cv' | 'letters' | 'invoices';

interface HomePageProps {
  onLogin: () => void;
  onRegister: () => void;
  onProcedures: () => void;
  onScanStudio: () => void;
  scanUsesLeft: number;
  onServicePage?: (key: ServiceKey) => void;
  /* Props from App.tsx (single source of truth) */
  serviceConfigs: ServiceConfig[];
  ads: AdItem[];
  site: SiteSettings;
}

/* ── Moroccan Star SVG ── */
function MoroccanStar({ size = 40, color = '#c8962c', opacity = 1 }: { size?: number; color?: string; opacity?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ opacity }}>
      <polygon points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35"
        fill={color} />
    </svg>
  );
}

/* ── Animated counter ── */
function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const step = Math.ceil(target / 60);
    const timer = setInterval(() => {
      setCount(c => {
        if (c + step >= target) { clearInterval(timer); return target; }
        return c + step;
      });
    }, 25);
    return () => clearInterval(timer);
  }, [target]);
  return <span>{count.toLocaleString('fr-MA')}{suffix}</span>;
}

/* ── Service Card ── */
function ServiceCard({
  icon, title, titleFr, desc, badge, badgeColor,
  onClick, onDetails, locked, freeUses
}: {
  icon: string; title: string; titleFr: string; desc: string;
  badge?: string; badgeColor?: string; onClick: () => void;
  onDetails?: () => void;
  locked?: boolean; freeUses?: number;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'linear-gradient(135deg,#ffffff,#f8faff)' : 'white',
        border: `2px solid ${hovered ? '#c8962c' : '#e2e8f0'}`,
        borderRadius: 20, padding: '28px 24px',
        transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
        transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
        boxShadow: hovered ? '0 20px 60px rgba(200,150,44,0.18)' : '0 2px 12px rgba(0,0,0,0.06)',
        position: 'relative', overflow: 'hidden', textAlign: 'right',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Background pattern */}
      <div style={{
        position: 'absolute', top: -20, left: -20, width: 100, height: 100,
        background: 'radial-gradient(circle, rgba(200,150,44,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Badge */}
      {badge && (
        <div style={{
          position: 'absolute', top: 14, left: 14,
          background: badgeColor ?? '#dbeafe', color: '#1e40af',
          fontSize: 9, fontWeight: 800, padding: '3px 9px',
          borderRadius: 20, fontFamily: 'Inter, sans-serif', letterSpacing: 0.5,
        }}>{badge}</div>
      )}

      {/* Free uses indicator */}
      {freeUses !== undefined && (
        <div style={{
          position: 'absolute', top: 14, left: 14,
          background: freeUses > 0 ? '#dcfce7' : '#fee2e2',
          color: freeUses > 0 ? '#15803d' : '#991b1b',
          fontSize: 9, fontWeight: 800, padding: '3px 9px',
          borderRadius: 20, fontFamily: 'Inter, sans-serif',
        }}>
          {freeUses > 0 ? `${freeUses} essais gratuits` : 'Inscription requise'}
        </div>
      )}

      {/* Lock icon */}
      {locked && !badge && (
        <div style={{ position: 'absolute', top: 14, left: 14, fontSize: 16 }}>🔒</div>
      )}

      <div style={{ fontSize: 44, marginBottom: 12, display: 'block' }}>{icon}</div>
      <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: '#0f2744', fontFamily: "'Cairo', sans-serif" }}>
        {title}
      </h3>
      <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'Inter, sans-serif', marginBottom: 10 }}>{titleFr}</div>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: '#475569', lineHeight: 1.7, fontFamily: "'Cairo', sans-serif", flex: 1 }}>{desc}</p>

      {/* Action row */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end', marginTop: 'auto' }}>
        {onDetails && (
          <button
            onClick={e => { e.stopPropagation(); onDetails(); }}
            style={{
              padding: '6px 13px', borderRadius: 8, border: '1px solid #e2e8f0',
              background: '#f8fafc', color: '#64748b', fontSize: 11, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#c8962c'; (e.currentTarget as HTMLButtonElement).style.color = '#c8962c'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLButtonElement).style.color = '#64748b'; }}
          >
            تفاصيل →
          </button>
        )}
        <button
          onClick={e => { e.stopPropagation(); onClick(); }}
          style={{
            padding: '6px 14px', borderRadius: 8, border: 'none',
            background: hovered ? 'linear-gradient(135deg,#c8962c,#e8b84b)' : 'linear-gradient(135deg,#0f2744,#1a3a5c)',
            color: hovered ? '#0f2744' : '#fff',
            fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all 0.25s',
          }}
        >
          {locked ? 'تسجيل' : freeUses !== undefined ? 'جرّب' : 'دخول'}
        </button>
      </div>
    </div>
  );
}

/* ── Step Card ── */
function StepCard({ n, icon, title, desc }: { n: number; icon: string; title: string; desc: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '0 16px' }}>
      <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'linear-gradient(135deg,#0f2744,#1a3a5c)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, boxShadow: '0 8px 24px rgba(15,39,68,0.25)',
        }}>{icon}</div>
        <div style={{
          position: 'absolute', top: -6, right: -6,
          width: 22, height: 22, borderRadius: '50%',
          background: 'linear-gradient(135deg,#c8962c,#e8b84b)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 900, color: '#0f2744', fontFamily: 'Inter, sans-serif',
        }}>{n}</div>
      </div>
      <h4 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 800, color: '#0f2744', fontFamily: "'Cairo', sans-serif" }}>{title}</h4>
      <p style={{ margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.7, fontFamily: "'Cairo', sans-serif" }}>{desc}</p>
    </div>
  );
}

/* ── Testimonial ── */
function TestimonialCard({ text, name, role, city }: { text: string; name: string; role: string; city: string }) {
  return (
    <div style={{
      background: 'white', borderRadius: 16, padding: '24px 20px',
      border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
      textAlign: 'right',
    }}>
      <div style={{ fontSize: 32, marginBottom: 12, color: '#c8962c' }}>"</div>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: '#475569', lineHeight: 1.8, fontFamily: "'Cairo', sans-serif" }}>{text}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#0f2744', fontFamily: "'Cairo', sans-serif" }}>{name}</div>
          <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'Inter, sans-serif' }}>{role} — {city}</div>
        </div>
        <div style={{
          width: 42, height: 42, borderRadius: '50%',
          background: 'linear-gradient(135deg,#c8962c,#e8b84b)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>👤</div>
      </div>
    </div>
  );
}

/* ── FAQ Item ── */
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      border: `1px solid ${open ? '#c8962c' : '#e2e8f0'}`, borderRadius: 12,
      overflow: 'hidden', transition: 'border-color 0.2s',
    }}>
      <button onClick={() => setOpen(v => !v)} style={{
        width: '100%', padding: '16px 20px', background: open ? '#fffbf0' : 'white',
        border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', fontFamily: "'Cairo', sans-serif",
        textAlign: 'right', transition: 'background 0.2s',
      }}>
        <span style={{ fontSize: 18, color: '#c8962c', flexShrink: 0 }}>{open ? '−' : '+'}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#0f2744' }}>{q}</span>
      </button>
      {open && (
        <div style={{
          padding: '0 20px 16px', background: '#fffbf0',
          fontSize: 13, color: '#475569', lineHeight: 1.8,
          fontFamily: "'Cairo', sans-serif", textAlign: 'right',
          borderTop: '1px solid #fef3c7',
        }}>
          {a}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════
   MAIN HOMEPAGE
════════════════════════════════════════ */
/* ── AdSlot: render a single ad by position ── */
function AdSlot({ position, ads }: { position: string; ads: AdItem[] }) {
  const ad = ads.find(a => a.position === position && a.enabled);
  if (!ad) return null;
  const wrap = (child: React.ReactNode) => (
    ad.link ? <a href={ad.link} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>{child}</a> : <>{child}</>
  );
  if (ad.type === 'image' && ad.content) {
    return (
      <div style={{ textAlign: 'center', margin: '12px 0' }}>
        {wrap(<img src={ad.content} alt={ad.alt || ''} style={{ maxWidth: '100%', borderRadius: 10, display: 'inline-block' }} />)}
      </div>
    );
  }
  if (ad.type === 'html' && ad.content) {
    return <div style={{ margin: '12px 0' }} dangerouslySetInnerHTML={{ __html: ad.content }} />;
  }
  return null;
}

export default function HomePage({ onLogin, onRegister, onProcedures, onScanStudio, scanUsesLeft, onServicePage, serviceConfigs, ads, site: _site }: HomePageProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /* scrolled effect */
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  /* ── Build services list from config ── */
  const SERVICE_DEFS: Record<string, {
    icon: string; title: string; titleFr: string; desc: string;
    onClick: () => void; onDetails?: () => void;
  }> = {
    procedures: {
      icon: '🏛️', title: 'المساطر الإدارية', titleFr: 'Procédures Administratives',
      desc: 'دليل شامل لجميع المساطر الإدارية المغربية: CIN، رخصة السياقة، جواز السفر، العقار، التجارة وأكثر من 55 مسطرة.',
      onClick: onProcedures,
      onDetails: onServicePage ? () => onServicePage('procedures') : undefined,
    },
    scanner: {
      icon: '🪪', title: 'Scan Studio', titleFr: 'Numérisation de Documents',
      desc: 'مسح البطاقة الوطنية وأي وثيقة مع تصحيح تلقائي للمنظور وتصدير PDF بدقة 300 DPI جاهز للطباعة.',
      onClick: onScanStudio,
      onDetails: onServicePage ? () => onServicePage('scanner') : undefined,
    },
    writer: {
      icon: '✍️', title: 'الكاتب العمومي', titleFr: 'Rédacteur Public',
      desc: 'إنشاء وثائق رسمية: تصريح بالشرف، وكالة، عقود، التزامات، إقرار بدين — بصيغة مغربية رسمية.',
      onClick: onRegister,
      onDetails: onServicePage ? () => onServicePage('writer') : undefined,
    },
    cv: {
      icon: '📄', title: 'مولّد السيرة الذاتية', titleFr: 'Générateur de CV',
      desc: 'إنشاء سيرة ذاتية احترافية بالفرنسية مع 3 قوالب، ألوان مخصصة وتصدير PDF وWord بجودة عالية.',
      onClick: onRegister,
      onDetails: onServicePage ? () => onServicePage('cv') : undefined,
    },
    letters: {
      icon: '📝', title: 'الرسائل الفرنسية', titleFr: 'Lettres Officielles',
      desc: 'نماذج جاهزة: طلب تدريب، استقالة، مراسلة رسمية — بأسلوب إداري فرنسي رسمي.',
      onClick: onRegister,
      onDetails: onServicePage ? () => onServicePage('letters') : undefined,
    },
    invoices: {
      icon: '🧾', title: 'الفواتير والحسابات', titleFr: 'Factures & Devis',
      desc: 'إنشاء فواتير وعروض أسعار بالفرنسية مع حساب TVA 20% تلقائي وكتابة المبلغ بالحروف.',
      onClick: onRegister,
      onDetails: onServicePage ? () => onServicePage('invoices') : undefined,
    },
  };

  type ServiceItem = {
    icon: string; title: string; titleFr: string; desc: string;
    badge?: string; badgeColor?: string; onClick: () => void;
    onDetails?: () => void; locked?: boolean; freeUses?: number;
  };

  /* Build dynamic services list — only show enabled + visible */
  const services: ServiceItem[] = serviceConfigs
    .filter(cfg => cfg.enabled && cfg.visible)
    .map(cfg => {
      const def = SERVICE_DEFS[cfg.key];
      if (!def) return null;
      const isFree = cfg.freeAccess;
      const hasFreeUses = isFree && cfg.freeUses > 0;
      return {
        ...def,
        badge: isFree ? (hasFreeUses ? undefined : '✓ مجاني') : '🔒 حساب مطلوب',
        badgeColor: isFree ? '#dcfce7' : '#fef3c7',
        locked: !isFree,
        freeUses: (cfg.key === 'scanner' && hasFreeUses) ? scanUsesLeft : undefined,
        onClick: isFree ? (cfg.key === 'scanner' ? onScanStudio : cfg.key === 'procedures' ? onProcedures : def.onClick) : onRegister,
      } as ServiceItem;
    }).filter((x): x is ServiceItem => x !== null);



  const steps = [
    { n: 1, icon: '📋', title: 'اختر الخدمة', desc: 'حدد نوع الوثيقة أو الخدمة التي تحتاجها من بين خياراتنا الشاملة' },
    { n: 2, icon: '✏️', title: 'أدخل المعطيات', desc: 'عبّئ النموذج الذكي بالمعلومات المطلوبة — سريع وسهل وبدون أخطاء' },
    { n: 3, icon: '⚡', title: 'توليد فوري', desc: 'النظام يولّد الوثيقة تلقائياً بتنسيق احترافي وفق الأسلوب الإداري المغربي' },
    { n: 4, icon: '📥', title: 'تصدير وطباعة', desc: 'حمّل وثيقتك كـ PDF أو Word جاهزة للطباعة والتسليم فوراً' },
  ];

  const faqs = [
    { q: 'هل خدماتكم مجانية؟', a: 'المساطر الإدارية مجانية بالكامل لجميع الزوار. Scan Studio متاح 5 مرات مجاناً. باقي الخدمات تتطلب إنشاء حساب مجاني.' },
    { q: 'كيف أنشئ حساباً؟', a: 'انقر على "إنشاء حساب" واملأ النموذج. طلبك سيُراجع من قِبل المدير خلال 24 ساعة ثم تصلك رسالة تأكيد على بريدك الإلكتروني.' },
    { q: 'هل الوثائق المُنتجة رسمية ومقبولة؟', a: 'نعم. جميع القوالب مصاغة وفق الأسلوب الإداري المغربي الرسمي، ويمكن مراجعتها وتوقيعها قبل التقديم.' },
    { q: 'هل يمكنني تعديل الوثيقة بعد إنشائها؟', a: 'نعم، يمكنك تعديل المتن مباشرة عبر المحرر المدمج قبل التصدير، كما يمكنك تحميلها بصيغة Word للتعديل لاحقاً.' },
    { q: 'ما هي صيغ التصدير المتاحة؟', a: 'جميع الوثائق قابلة للتصدير كـ PDF بجودة طباعة A4 أو Word (.docx) قابل للتحرير.' },
    { q: 'هل بياناتي محفوظة وآمنة؟', a: 'نعم، البيانات تُحفظ محلياً في متصفحك فقط ولا تُرسل إلى أي خادم خارجي.' },
  ];

  return (
    <div style={{ fontFamily: "'Cairo', sans-serif", color: '#1e293b', overflowX: 'hidden', direction: 'rtl' }}>

      {/* ════ NAVBAR ════ */}
      <nav style={{
        position: 'fixed', top: 0, right: 0, left: 0, zIndex: 999,
        background: scrolled ? 'rgba(15,39,68,0.97)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.08)' : 'none',
        transition: 'all 0.3s ease', padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 64,
      }}>
        {/* Logo — click to scroll to top (home) */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          title="العودة للصفحة الرئيسية"
        >
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'linear-gradient(135deg,#c8962c,#e8b84b)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            transition: 'transform 0.2s',
          }}>⚜️</div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'white', fontWeight: 800, fontSize: 14, lineHeight: 1.2 }}>مكتب الخدمات</div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 9, fontFamily: 'Inter, sans-serif' }}>Bureau de Services — الصفحة الرئيسية</div>
          </div>
        </button>

        {/* Desktop nav links */}
        <div className="hp-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {[
            { label: 'الخدمات', href: '#services' },
            { label: 'المساطر الإدارية', href: '#', onClick: onProcedures },
            { label: 'كيف يعمل؟', href: '#how' },
            { label: 'الأسئلة الشائعة', href: '#faq' },
          ].map(l => (
            <a key={l.label} href={l.href}
              onClick={l.onClick ? (e) => { e.preventDefault(); l.onClick!(); } : undefined}
              style={{
                color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600,
                textDecoration: 'none', transition: 'color 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#e8b84b')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
            >{l.label}</a>
          ))}
        </div>

        {/* Auth buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={onLogin} style={{
            padding: '8px 18px', borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.25)',
            background: 'transparent', color: 'white', fontSize: 12, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#c8962c'; e.currentTarget.style.color = '#e8b84b'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = 'white'; }}
          >تسجيل الدخول</button>
          <button onClick={onRegister} style={{
            padding: '8px 18px', borderRadius: 8, border: 'none',
            background: 'linear-gradient(135deg,#c8962c,#e8b84b)', color: '#0f2744',
            fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 4px 16px rgba(200,150,44,0.35)',
          }}>إنشاء حساب</button>
          {/* Mobile hamburger */}
          <button onClick={() => setMobileMenuOpen(v => !v)} className="hp-hamburger"
            style={{ display: 'none', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', color: 'white', fontSize: 18 }}>
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div style={{
          position: 'fixed', top: 64, right: 0, left: 0, zIndex: 998,
          background: 'rgba(15,39,68,0.98)', backdropFilter: 'blur(20px)',
          padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}>
          {[
            { label: '🏛️ المساطر الإدارية', onClick: () => { onProcedures(); setMobileMenuOpen(false); } },
            { label: '🪪 Scan Studio', onClick: () => { onScanStudio(); setMobileMenuOpen(false); } },
            { label: '🔐 تسجيل الدخول', onClick: () => { onLogin(); setMobileMenuOpen(false); } },
            { label: '📝 إنشاء حساب', onClick: () => { onRegister(); setMobileMenuOpen(false); } },
          ].map(item => (
            <button key={item.label} onClick={item.onClick} style={{
              display: 'block', width: '100%', padding: '12px 0', background: 'none',
              border: 'none', color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit', textAlign: 'right',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>{item.label}</button>
          ))}
        </div>
      )}

      {/* ════ HERO ════ */}
      <section style={{
        minHeight: '100vh', position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, #071425 0%, #0f2744 45%, #1a3a5c 75%, #0f1f35 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '80px 24px 60px',
      }}>
        {/* Background stars */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          {[
            { top: '8%', right: '5%', size: 60, opacity: 0.08 },
            { top: '15%', left: '8%', size: 40, opacity: 0.06 },
            { bottom: '20%', right: '12%', size: 50, opacity: 0.07 },
            { bottom: '35%', left: '5%', size: 35, opacity: 0.05 },
            { top: '45%', right: '2%', size: 25, opacity: 0.04 },
            { top: '60%', left: '15%', size: 45, opacity: 0.06 },
          ].map((s, i) => (
            <div key={i} style={{ position: 'absolute', ...s }}>
              <MoroccanStar size={s.size} opacity={s.opacity} />
            </div>
          ))}
          {/* Gradient orbs */}
          <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(200,150,44,0.12) 0%, transparent 70%)', top: '-10%', right: '-10%' }} />
          <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)', bottom: '0%', left: '-5%' }} />
          {/* Moroccan geometric grid */}
          {Array.from({ length: 5 }).map((_, r) =>
            Array.from({ length: 8 }).map((_, c) => (
              <div key={`${r}-${c}`} style={{
                position: 'absolute', left: c * 160 - 60, top: r * 160 - 60,
                width: 80, height: 80, border: '1px solid rgba(200,150,44,0.04)',
                transform: 'rotate(45deg)', borderRadius: 4,
              }} />
            ))
          )}
        </div>

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
          {/* Flag badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(200,150,44,0.12)', border: '1px solid rgba(200,150,44,0.3)',
            borderRadius: 30, padding: '6px 20px', marginBottom: 28,
          }}>
            <span style={{ fontSize: 18 }}>🇲🇦</span>
            <span style={{ color: '#e8b84b', fontSize: 11, fontWeight: 700, fontFamily: 'Inter, sans-serif', letterSpacing: 1 }}>
              BUREAU DE SERVICES ADMINISTRATIFS — MAROC
            </span>
            <span style={{ fontSize: 18 }}>🇲🇦</span>
          </div>

          {/* Main heading */}
          <h1 style={{ margin: '0 0 16px', color: 'white', lineHeight: 1.25 }}>
            <span style={{ display: 'block', fontSize: 'clamp(28px,5vw,52px)', fontWeight: 900 }}>
              مكتب الخدمات الإدارية
            </span>
            <span style={{
              display: 'block', fontSize: 'clamp(16px,2.5vw,24px)',
              background: 'linear-gradient(90deg,#c8962c,#e8b84b,#c8962c)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text', marginTop: 8, fontWeight: 700,
              fontFamily: 'Inter, sans-serif',
            }}>
              Votre Bureau Numérique Marocain
            </span>
          </h1>

          <p style={{
            color: 'rgba(255,255,255,0.65)', fontSize: 'clamp(13px,2vw,17px)',
            lineHeight: 1.8, margin: '0 auto 36px', maxWidth: 680,
          }}>
            وثائق إدارية رسمية، سيرة ذاتية، مسح البطاقات، فواتير، مساطر إدارية —
            <br />كل ما تحتاجه في مكان واحد، بسرعة واحترافية تامة.
          </p>

          {/* CTA Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 48 }}>
            <button onClick={onProcedures} style={{
              padding: '14px 32px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg,#c8962c,#e8b84b)', color: '#0f2744',
              fontSize: 15, fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 8px 32px rgba(200,150,44,0.4)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              🏛️ المساطر الإدارية — مجاناً
            </button>
            <button onClick={onScanStudio} style={{
              padding: '14px 32px', borderRadius: 12,
              border: '2px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.08)',
              color: 'white', fontSize: 15, fontWeight: 800, cursor: 'pointer',
              fontFamily: 'inherit', backdropFilter: 'blur(10px)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              🪪 Scan Studio
              <span style={{ background: 'rgba(200,150,44,0.4)', padding: '2px 8px', borderRadius: 10, fontSize: 11 }}>
                {scanUsesLeft} essais gratuits
              </span>
            </button>
            <button onClick={onRegister} style={{
              padding: '14px 32px', borderRadius: 12,
              border: '2px solid rgba(255,255,255,0.15)', background: 'transparent',
              color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              إنشاء حساب مجاني →
            </button>
          </div>

          {/* Stats */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'center',
            padding: '24px 32px', background: 'rgba(255,255,255,0.04)',
            borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(10px)',
          }}>
            {[
              { value: 55, suffix: '+', label: 'مسطرة إدارية' },
              { value: 9, suffix: '', label: 'نوع وثيقة' },
              { value: 3, suffix: '', label: 'قالب سيرة ذاتية' },
              { value: 100, suffix: '%', label: 'مجاني للمساطر' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', minWidth: 100 }}>
                <div style={{
                  fontSize: 28, fontWeight: 900, fontFamily: 'Inter, sans-serif',
                  background: 'linear-gradient(135deg,#c8962c,#e8b84b)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  <Counter target={s.value} suffix={s.suffix} />
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 4, fontFamily: 'inherit' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', animation: 'bounce 2s infinite' }}>
          <div style={{ width: 28, height: 44, border: '2px solid rgba(255,255,255,0.2)', borderRadius: 14, display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
            <div style={{ width: 4, height: 10, background: '#c8962c', borderRadius: 2, animation: 'scrollDot 1.5s infinite' }} />
          </div>
        </div>
      </section>

      {/* Ad slot: hero-bottom */}
      <AdSlot position="hero-bottom" ads={ads} />

      {/* ════ FREE ACCESS BANNER ════ */}
      <section style={{ background: 'linear-gradient(135deg,#c8962c,#e8b84b)', padding: '20px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>🎁</span>
            <div>
              <div style={{ fontWeight: 900, fontSize: 16, color: '#0f2744' }}>وصول مجاني فوري — Accès Gratuit Immédiat</div>
              <div style={{ fontSize: 12, color: 'rgba(15,39,68,0.7)', fontFamily: 'Inter, sans-serif' }}>
                المساطر الإدارية + 5 استخدامات من Scan Studio — بدون تسجيل
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onProcedures} style={{
              padding: '10px 24px', borderRadius: 10, border: 'none',
              background: '#0f2744', color: 'white', fontSize: 13, fontWeight: 800,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>ابدأ الآن →</button>
          </div>
        </div>
      </section>

      {/* Ad slot: services-top */}
      <AdSlot position="services-top" ads={ads} />

      {/* ════ SERVICES ════ */}
      <section id="services" style={{ padding: 'clamp(48px,8vw,80px) 24px', background: '#f8fafc' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{
              display: 'inline-block', background: '#fef3c7', color: '#92400e',
              padding: '4px 16px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              marginBottom: 12, fontFamily: 'Inter, sans-serif',
            }}>NOS SERVICES</div>
            <h2 style={{ margin: '0 0 12px', fontSize: 'clamp(22px,4vw,36px)', fontWeight: 900, color: '#0f2744' }}>
              خدماتنا الشاملة
            </h2>
            <p style={{ margin: '0 auto', fontSize: 14, color: '#64748b', maxWidth: 560, lineHeight: 1.8 }}>
              منصة متكاملة لجميع احتياجاتك الإدارية والمهنية — سريعة، احترافية، جاهزة للطباعة
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20,
          }}>
            {services.map((s: ServiceItem) => (
              <ServiceCard key={s.title} {...s} />
            ))}
          </div>
        </div>
      </section>

      {/* ════ HOW IT WORKS ════ */}
      <section id="how" style={{ padding: 'clamp(48px,8vw,80px) 24px', background: 'white' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{
              display: 'inline-block', background: '#dbeafe', color: '#1e40af',
              padding: '4px 16px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              marginBottom: 12, fontFamily: 'Inter, sans-serif',
            }}>COMMENT ÇA MARCHE</div>
            <h2 style={{ margin: '0 0 12px', fontSize: 'clamp(22px,4vw,36px)', fontWeight: 900, color: '#0f2744' }}>
              كيف يعمل النظام؟
            </h2>
            <p style={{ margin: 0, fontSize: 14, color: '#64748b', lineHeight: 1.8 }}>
              4 خطوات بسيطة للحصول على وثيقتك الرسمية
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 32, position: 'relative' }}>
            {/* Connector line */}
            <div className="hp-connector" style={{
              position: 'absolute', top: 32, right: '12.5%', left: '12.5%', height: 2,
              background: 'linear-gradient(90deg,transparent,#c8962c,transparent)',
              zIndex: 0,
            }} />
            {steps.map(s => <StepCard key={s.n} {...s} />)}
          </div>
        </div>
      </section>

      {/* ════ FREE VS REGISTERED ════ */}
      <section style={{
        padding: 'clamp(48px,8vw,80px) 24px',
        background: 'linear-gradient(135deg, #071425, #0f2744)',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 'clamp(22px,4vw,36px)', fontWeight: 900, color: 'white' }}>
              ماذا تحصل مع كل مستوى وصول؟
            </h2>
            <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.8 }}>
              Que bénéficiez-vous selon votre niveau d'accès ?
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20 }}>
            {/* Visitor */}
            <div style={{
              background: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: '28px 24px',
              border: '2px solid rgba(255,255,255,0.1)', textAlign: 'right',
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>👁️</div>
              <h3 style={{ margin: '0 0 6px', color: 'white', fontSize: 18, fontWeight: 800 }}>زائر بدون تسجيل</h3>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginBottom: 18, fontFamily: 'Inter, sans-serif' }}>Visiteur Sans Compte</div>
              {[
                '✅ المساطر الإدارية الكاملة (55+)',
                `✅ Scan Studio (${scanUsesLeft}/5 استخدامات)`,
                '❌ الكاتب العمومي',
                '❌ مولّد السيرة الذاتية',
                '❌ الرسائل الفرنسية',
                '❌ الفواتير والحسابات',
              ].map(item => (
                <div key={item} style={{
                  fontSize: 13, color: item.startsWith('✅') ? '#86efac' : 'rgba(255,255,255,0.3)',
                  marginBottom: 8, fontFamily: 'inherit',
                }}>{item}</div>
              ))}
            </div>

            {/* Registered */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(200,150,44,0.15), rgba(232,184,75,0.08))',
              borderRadius: 20, padding: '28px 24px',
              border: '2px solid rgba(200,150,44,0.4)', textAlign: 'right',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: 16, left: 16,
                background: 'linear-gradient(135deg,#c8962c,#e8b84b)', color: '#0f2744',
                fontSize: 10, fontWeight: 900, padding: '3px 10px', borderRadius: 20,
                fontFamily: 'Inter, sans-serif',
              }}>⭐ RECOMMANDÉ</div>
              <div style={{ fontSize: 32, marginBottom: 12 }}>👤</div>
              <h3 style={{ margin: '0 0 6px', color: 'white', fontSize: 18, fontWeight: 800 }}>مستخدم مسجَّل</h3>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginBottom: 18, fontFamily: 'Inter, sans-serif' }}>Utilisateur Inscrit</div>
              {[
                '✅ المساطر الإدارية الكاملة',
                '✅ Scan Studio — استخدام غير محدود',
                '✅ الكاتب العمومي (9 أنواع)',
                '✅ مولّد السيرة الذاتية (3 قوالب)',
                '✅ الرسائل الفرنسية (4 أنواع)',
                '✅ الفواتير والحسابات',
                '✅ سجل الوثائق',
              ].map(item => (
                <div key={item} style={{ fontSize: 13, color: '#86efac', marginBottom: 8, fontFamily: 'inherit' }}>{item}</div>
              ))}
              <button onClick={onRegister} style={{
                marginTop: 20, width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg,#c8962c,#e8b84b)', color: '#0f2744',
                fontSize: 14, fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit',
              }}>إنشاء حساب مجاني ←</button>
            </div>
          </div>
        </div>
      </section>

      {/* ════ TESTIMONIALS ════ */}
      <section style={{ padding: 'clamp(48px,8vw,80px) 24px', background: '#f8fafc' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <div style={{
              display: 'inline-block', background: '#dcfce7', color: '#15803d',
              padding: '4px 16px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              marginBottom: 12, fontFamily: 'Inter, sans-serif',
            }}>TÉMOIGNAGES</div>
            <h2 style={{ margin: '0 0 12px', fontSize: 'clamp(22px,4vw,36px)', fontWeight: 900, color: '#0f2744' }}>
              ماذا يقول مستخدمونا؟
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20 }}>
            <TestimonialCard
              text="أنجزت وثيقة تصريح بالشرف في دقيقتين فقط! التنسيق رائع ومطابق تماماً للأسلوب الإداري المغربي. وفّر عليّ الكثير من الوقت."
              name="أحمد البوعناني" role="موظف إداري" city="الرباط"
            />
            <TestimonialCard
              text="استخدمت Scan Studio لمسح بطاقتي الوطنية وطبعتها في ثوانٍ. الجودة ممتازة والتصحيح التلقائي يعمل بشكل احترافي."
              name="فاطمة الزهراء" role="طالبة جامعية" city="الدار البيضاء"
            />
            <TestimonialCard
              text="مولّد السيرة الذاتية أنقذني! حصلت على سيرتي الذاتية بالفرنسية في أقل من 10 دقائق بتنسيق أوروبي احترافي. شكراً جزيلاً."
              name="يوسف المرابط" role="باحث عن عمل" city="فاس"
            />
          </div>
        </div>
      </section>

      {/* ════ FAQ ════ */}
      <section id="faq" style={{ padding: 'clamp(48px,8vw,80px) 24px', background: 'white' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <div style={{
              display: 'inline-block', background: '#f3e8ff', color: '#7c3aed',
              padding: '4px 16px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              marginBottom: 12, fontFamily: 'Inter, sans-serif',
            }}>FAQ</div>
            <h2 style={{ margin: '0 0 12px', fontSize: 'clamp(22px,4vw,36px)', fontWeight: 900, color: '#0f2744' }}>
              الأسئلة الشائعة
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {faqs.map(f => <FAQItem key={f.q} {...f} />)}
          </div>
        </div>
      </section>

      {/* ════ FINAL CTA ════ */}
      <section style={{
        padding: 'clamp(48px,8vw,80px) 24px',
        background: 'linear-gradient(135deg, #071425, #0f2744, #1a3a5c)',
        textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {[
            { top: '20%', right: '10%', size: 80, opacity: 0.05 },
            { bottom: '15%', left: '8%', size: 60, opacity: 0.04 },
          ].map((s, i) => (
            <div key={i} style={{ position: 'absolute', ...s }}>
              <MoroccanStar size={s.size} opacity={s.opacity} />
            </div>
          ))}
        </div>
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 640, margin: '0 auto' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚜️</div>
          <h2 style={{ margin: '0 0 12px', color: 'white', fontSize: 'clamp(22px,4vw,36px)', fontWeight: 900 }}>
            ابدأ الآن — C'est Gratuit
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, lineHeight: 1.8, marginBottom: 32 }}>
            انضم إلى مئات المستخدمين الذين يعتمدون على مكتب الخدمات الإدارية
            <br />لإنجاز وثائقهم بسرعة واحترافية
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            <button onClick={onProcedures} style={{
              padding: '14px 32px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg,#c8962c,#e8b84b)', color: '#0f2744',
              fontSize: 15, fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 8px 32px rgba(200,150,44,0.4)',
            }}>🏛️ المساطر — مجاناً</button>
            <button onClick={onRegister} style={{
              padding: '14px 32px', borderRadius: 12,
              border: '2px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.08)',
              color: 'white', fontSize: 15, fontWeight: 800, cursor: 'pointer',
              fontFamily: 'inherit', backdropFilter: 'blur(10px)',
            }}>📝 إنشاء حساب مجاني</button>
          </div>
        </div>
      </section>

      {/* ════ FOOTER ════ */}
      <footer style={{
        background: '#071425', padding: 'clamp(32px,6vw,48px) 24px 20px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 32, marginBottom: 32 }}>
            {/* Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: 'linear-gradient(135deg,#c8962c,#e8b84b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚜️</div>
                <div>
                  <div style={{ color: 'white', fontWeight: 800, fontSize: 13 }}>مكتب الخدمات</div>
                  <div style={{ color: '#475569', fontSize: 9, fontFamily: 'Inter, sans-serif' }}>Bureau de Services</div>
                </div>
              </div>
              <p style={{ color: '#475569', fontSize: 12, lineHeight: 1.7, margin: 0 }}>
                منصة رقمية مغربية متخصصة في إنشاء الوثائق الإدارية وتقديم الخدمات المكتبية.
              </p>
            </div>
            {/* Services */}
            <div>
              <h4 style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, marginBottom: 12, fontFamily: 'Inter, sans-serif', letterSpacing: 1 }}>SERVICES</h4>
              {['المساطر الإدارية', 'Scan Studio', 'الكاتب العمومي', 'مولّد السيرة الذاتية', 'الفواتير'].map(s => (
                <div key={s} style={{ color: '#475569', fontSize: 12, marginBottom: 7 }}>{s}</div>
              ))}
            </div>
            {/* Access */}
            <div>
              <h4 style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, marginBottom: 12, fontFamily: 'Inter, sans-serif', letterSpacing: 1 }}>ACCÈS</h4>
              {[
                { label: 'تسجيل الدخول', onClick: onLogin },
                { label: 'إنشاء حساب', onClick: onRegister },
                { label: 'المساطر — مجاني', onClick: onProcedures },
                { label: 'Scan Studio', onClick: onScanStudio },
              ].map(l => (
                <button key={l.label} onClick={l.onClick} style={{
                  display: 'block', background: 'none', border: 'none',
                  color: '#475569', fontSize: 12, marginBottom: 7, cursor: 'pointer',
                  fontFamily: 'inherit', textAlign: 'right', padding: 0, transition: 'color 0.2s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#e8b84b')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
                >{l.label}</button>
              ))}
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20,
            display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10,
          }}>
            <div style={{ color: '#334155', fontSize: 11, fontFamily: 'Inter, sans-serif' }}>
              © 2025 مكتب الخدمات الإدارية — Bureau de Services Administratifs 🇲🇦
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              {['🇲🇦 Maroc', 'v4.0', '🔒 Sécurisé'].map(t => (
                <span key={t} style={{ color: '#334155', fontSize: 10, fontFamily: 'Inter, sans-serif' }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* Inline styles for animations and responsive */}
      <style>{`
        @keyframes bounce {
          0%,100%{transform:translateX(-50%) translateY(0)}
          50%{transform:translateX(-50%) translateY(8px)}
        }
        @keyframes scrollDot {
          0%{transform:translateY(0);opacity:1}
          100%{transform:translateY(14px);opacity:0}
        }
        @media (max-width: 768px) {
          .hp-nav-links { display: none !important; }
          .hp-hamburger { display: flex !important; }
          .hp-connector { display: none !important; }
        }
      `}</style>
    </div>
  );
}
