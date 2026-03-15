/* ═══════════════════════════════════════════════════════════
   ServicePage — Individual SEO-optimized page for each service
   Each service gets a dedicated landing page with:
   - Full SEO meta tags via SEOHead
   - Hero section specific to the service
   - Feature list
   - How-it-works steps
   - FAQ accordion
   - CTA section
   - Breadcrumb navigation
═══════════════════════════════════════════════════════════ */
import { useEffect, useState } from 'react';
import { applySEO, SEO_PAGES } from '../seo/SEOHead';

type ServiceKey = 'procedures' | 'scanner' | 'writer' | 'cv' | 'letters' | 'invoices';

interface ServicePageProps {
  service: ServiceKey;
  onLogin: () => void;
  onRegister: () => void;
  onGoHome: () => void;
  onLaunch: () => void;  // opens the actual tool
  scanUsesLeft?: number;
}

/* ── Breadcrumb ── */
function Breadcrumb({ items, onGoHome }: { items: { label: string; href?: () => void }[]; onGoHome: () => void }) {
  return (
    <nav aria-label="breadcrumb" style={{ padding: '12px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', direction: 'rtl' }}>
      <ol style={{ display: 'flex', gap: 8, listStyle: 'none', margin: 0, padding: 0, flexWrap: 'wrap', alignItems: 'center', fontSize: 13, fontFamily: "'Cairo', sans-serif" }}>
        <li>
          <button onClick={onGoHome} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c8962c', fontWeight: 700, fontSize: 13, fontFamily: 'inherit' }}>
            🏠 الرئيسية
          </button>
        </li>
        {items.map((item, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#94a3b8' }}>›</span>
            {item.href ? (
              <button onClick={item.href} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c8962c', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' }}>
                {item.label}
              </button>
            ) : (
              <span style={{ color: '#475569', fontWeight: 600 }}>{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* ── FAQ Item ── */
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden',
        marginBottom: 10, transition: 'box-shadow 0.2s',
        boxShadow: open ? '0 4px 20px rgba(200,150,44,0.1)' : 'none',
      }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '16px 20px', background: open ? 'linear-gradient(135deg,#0f2744,#1a3a5c)' : '#fff',
          border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', direction: 'rtl', fontFamily: "'Cairo', sans-serif",
          fontSize: 15, fontWeight: 700, color: open ? '#fff' : '#0f2744',
          transition: 'all 0.25s',
        }}
      >
        <span>{q}</span>
        <span style={{ fontSize: 20, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s', flexShrink: 0 }}>▾</span>
      </button>
      {open && (
        <div style={{
          padding: '16px 20px', background: '#f8fafc', direction: 'rtl',
          fontFamily: "'Cairo', sans-serif", fontSize: 14, color: '#475569', lineHeight: 1.9,
        }}>
          {a}
        </div>
      )}
    </div>
  );
}

/* ── Feature Card ── */
function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  const [h, setH] = useState(false);
  return (
    <div
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        background: '#fff', border: `2px solid ${h ? '#c8962c' : '#e2e8f0'}`,
        borderRadius: 16, padding: '24px 20px', transition: 'all 0.25s',
        transform: h ? 'translateY(-4px)' : 'none',
        boxShadow: h ? '0 12px 40px rgba(200,150,44,0.12)' : '0 2px 8px rgba(0,0,0,0.05)',
        direction: 'rtl', textAlign: 'right',
      }}
    >
      <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontWeight: 800, fontSize: 15, color: '#0f2744', marginBottom: 8, fontFamily: "'Cairo', sans-serif" }}>{title}</div>
      <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.8, fontFamily: "'Cairo', sans-serif" }}>{desc}</div>
    </div>
  );
}

/* ── Step Item ── */
function StepItem({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', direction: 'rtl', marginBottom: 28 }}>
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        background: 'linear-gradient(135deg,#c8962c,#e8b84b)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 900, fontSize: 18, color: '#0f2744', flexShrink: 0,
        boxShadow: '0 4px 12px rgba(200,150,44,0.35)',
      }}>{n}</div>
      <div>
        <div style={{ fontWeight: 800, fontSize: 16, color: '#0f2744', marginBottom: 6, fontFamily: "'Cairo', sans-serif" }}>{title}</div>
        <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.8, fontFamily: "'Cairo', sans-serif" }}>{desc}</div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   SERVICE CONFIGS
══════════════════════════════════════════ */
const SERVICE_DATA: Record<ServiceKey, {
  hero: { icon: string; title: string; subtitle: string; tag: string; color: string; free: boolean };
  features: { icon: string; title: string; desc: string }[];
  steps: { title: string; desc: string }[];
  faqs: { q: string; a: string }[];
  cta: { label: string; sublabel: string };
}> = {

  procedures: {
    hero: {
      icon: '🏛️', color: '#0f2744',
      tag: 'مجاني — بدون تسجيل',
      title: 'المساطر الإدارية المغربية 2025',
      subtitle: 'دليل شامل ومحدث لجميع الإجراءات الإدارية في المغرب — من تجديد البطاقة الوطنية إلى التسجيل التجاري، كل ما تحتاجه في مكان واحد',
      free: true,
    },
    features: [
      { icon: '🪪', title: 'البطاقة الوطنية', desc: 'جميع إجراءات استخراج وتجديد بطاقة التعريف الوطنية للبالغين والقاصرين' },
      { icon: '🚗', title: 'رخصة السياقة', desc: 'تجديد الرخصة، استخراجها لأول مرة، والبطاقة الرمادية' },
      { icon: '✈️', title: 'جواز السفر', desc: 'وثائق استخراج جواز السفر المغربي ولايسيه باسيه في حالات الطوارئ' },
      { icon: '📑', title: 'الحالة المدنية', desc: 'عقود الازدياد، الزواج، الطلاق، الوفاة وشهادات الحالة المدنية' },
      { icon: '🏘️', title: 'الجماعة والمقاطعة', desc: 'شهادة الإقامة، مصادقة الإمضاء، النسخة المطابقة وغيرها' },
      { icon: '💼', title: 'التسجيل التجاري', desc: 'تأسيس الشركات، السجل التجاري، الضريبة المهنية، CNSS وANAPEC' },
    ],
    steps: [
      { title: 'اختر المسطرة الإدارية', desc: 'تصفح أكثر من 55 مسطرة مقسمة حسب الجهة الإدارية المختصة' },
      { title: 'اطلع على الوثائق المطلوبة', desc: 'قائمة كاملة بجميع الوثائق والشروط المطلوبة لكل مسطرة' },
      { title: 'تحقق من الرسوم والأجل', desc: 'رسوم أداء المسطرة والمدة الزمنية المتوقعة للمعالجة' },
      { title: 'توجّه للجهة المختصة', desc: 'العنوان والرابط الإلكتروني للجهة المعنية إن وُجد' },
    ],
    faqs: [
      { q: 'كم تستغرق عملية تجديد البطاقة الوطنية؟', a: 'تستغرق عادة بين 7 و15 يوم عمل من تاريخ تقديم الطلب. يمكن الاستعلام عن حالة الطلب عبر الموقع الإلكتروني للمديرية العامة للأمن الوطني.' },
      { q: 'هل يمكن استخراج شهادة السكنى عبر الإنترنت؟', a: 'نعم، يمكن طلب شهادة الإقامة (السكنى) إلكترونياً عبر بوابة الجماعة أو المقاطعة التابعة لمحل سكنك.' },
      { q: 'ما هي تكلفة استخراج جواز السفر المغربي؟', a: 'تبلغ رسوم استخراج جواز السفر حوالي 225 درهماً. تجديد الجواز المنتهي يكلف 150 درهماً. الأسعار قابلة للتغيير.' },
      { q: 'أين أتقدم لاستخراج رخصة السياقة؟', a: 'يمكن تقديم طلب رخصة السياقة في مركز الاختبارات التابع للسيارة والدراجة في إقليمك، أو عبر مدرسة السياقة المعتمدة.' },
      { q: 'ما الوثائق المطلوبة لتسجيل مقاولة فردية؟', a: 'نسخة من البطاقة الوطنية، عقد الإيجار أو عقد الملكية، وتعبئة الاستمارة المخصصة لدى المركز الجهوي للاستثمار أو عبر الموقع الإلكتروني CRI.' },
      { q: 'كيف أحصل على نسخة من عقد الازدياد؟', a: 'تقدم إلى مصلحة الحالة المدنية في البلدية التي وُلدت بها مع البطاقة الوطنية. النسخة مجانية للشخص المعني.' },
    ],
    cta: { label: '🏛️ استعرض جميع المساطر الإدارية', sublabel: 'مجاني — بدون تسجيل — 55+ مسطرة محدثة' },
  },

  scanner: {
    hero: {
      icon: '🪪', color: '#0c1a2e',
      tag: '5 استخدامات مجانية — بدون تسجيل',
      title: 'Scan Studio — مسح وثائق مغربية احترافي',
      subtitle: 'أداة متطورة لمسح البطاقة الوطنية المغربية وأي وثيقة إدارية. كشف الحواف تلقائياً، تصحيح المنظور، تحسين الصورة، وتصدير PDF جاهز للطباعة بضغطة واحدة.',
      free: false,
    },
    features: [
      { icon: '🔍', title: 'كشف الحواف التلقائي', desc: 'تقنية Canny Edge Detection تكشف حواف الوثيقة تلقائياً بدقة عالية حتى في ظروف الإضاءة السيئة' },
      { icon: '⬡', title: 'تصحيح المنظور', desc: 'خوارزمية Homography تصحح أي انحراف في زاوية التصوير وتنتج صورة مسطحة تماماً' },
      { icon: '🎛️', title: 'تحسين الصورة', desc: 'فلاتر متعددة: تحسين تلقائي، أبيض وأسود، تباين عالي، وضع CIN مع تحكم يدوي في السطوع' },
      { icon: '📐', title: 'تحكم في الحجم', desc: 'تحديد حجم الصورة للطباعة بدقة مع الحفاظ على النسب الأصلية وحواف القطع' },
      { icon: '📄', title: 'تصدير A5 مزدوج', desc: 'تصدير الوجهين في صفحتين منفصلتين بتنسيق A5 للطباعة على وجهين بدون أي نص' },
      { icon: '📱', title: 'متوافق مع الموبايل', desc: 'واجهة محسّنة للهاتف المحمول مع دعم اللمس لتحريك نقاط التقطيع يدوياً' },
    ],
    steps: [
      { title: 'رفع صورة الوثيقة', desc: 'رفع الوجه الأمامي والخلفي للبطاقة الوطنية أو أي وثيقة عبر النقر أو السحب والإفلات' },
      { title: 'كشف الحواف التلقائي', desc: 'تعمل خوارزمية OpenCV.js تلقائياً لتحديد زوايا الوثيقة الأربعة بعدة استراتيجيات متتالية' },
      { title: 'ضبط الزوايا يدوياً', desc: 'في حالة عدم الدقة يمكن سحب النقاط الأربع يدوياً أو رسم مستطيل التقطيع مباشرة' },
      { title: 'تطبيق الفلاتر وتصحيح المنظور', desc: 'اختيار الفلتر المناسب ثم الضغط على "تطبيق" لتصحيح المنظور والحصول على صورة نظيفة' },
      { title: 'اختيار تخطيط الطباعة', desc: 'اختيار A5 رجوعي، A4 نسختين، A4 أربع نسخ، أو تنسيق جواز السفر حسب الحاجة' },
      { title: 'تصدير PDF جاهز للطباعة', desc: 'تحميل ملف PDF بدقة 300 DPI جاهز للطباعة فوراً بدون أي نص أو علامة مائية' },
    ],
    faqs: [
      { q: 'هل يعمل Scan Studio على الهاتف المحمول؟', a: 'نعم، Scan Studio محسّن للهاتف المحمول بالكامل. يمكنك التقاط صورة مباشرة بكاميرا هاتفك ومعالجتها.' },
      { q: 'هل تُخزَّن صوري على السيرفر؟', a: 'لا، جميع عمليات المعالجة تتم محلياً في المتصفح باستخدام OpenCV.js. لا تُرسَل أي صور إلى أي سيرفر.' },
      { q: 'ما عدد المرات المجانية في Scan Studio؟', a: 'يمكنك مسح 5 وثائق مجاناً بدون تسجيل. بعد التسجيل المجاني تستفيد من عدد غير محدود من عمليات المسح.' },
      { q: 'ما صيغ الصور المقبولة؟', a: 'تقبل الأداة صيغ JPG, PNG, WebP وبعض إصدارات HEIC. الصور ذات الدقة العالية تعطي نتائج أفضل.' },
      { q: 'هل يمكن مسح وثائق أخرى غير البطاقة الوطنية؟', a: 'نعم، تعمل الأداة على جميع الوثائق المستطيلة: جواز السفر، رخصة السياقة، الشهادات، الفواتير وغيرها.' },
    ],
    cta: { label: '🪪 ابدأ المسح الآن — مجاناً', sublabel: '5 استخدامات مجانية بدون تسجيل' },
  },

  writer: {
    hero: {
      icon: '✍️', color: '#0f2744',
      tag: 'للمستخدمين المسجلين',
      title: 'الكاتب العمومي الرقمي المغربي',
      subtitle: 'أنشئ وثائق رسمية مغربية احترافية باللغة العربية بسهولة تامة. من التصاريح بالشرف إلى عقود الكراء — نماذج جاهزة وفق الصيغة الرسمية المغربية مع تصدير PDF و Word فوري.',
      free: false,
    },
    features: [
      { icon: '📋', title: 'تصريح بالشرف', desc: 'نموذج تصريح بالشرف رسمي وفق الصيغة القانونية المغربية جاهز للتوقيع' },
      { icon: '🔑', title: 'وكالة خاصة', desc: 'وثيقة وكالة خاصة بين طرفين محددة الصلاحيات والمدة وفق الفصل 879 من ق.ل.ع' },
      { icon: '🏠', title: 'عقد الكراء', desc: 'عقد كراء سكني أو تجاري مكتمل الشروط وفق القانون المغربي مع مدة وإيداع الضمان' },
      { icon: '💰', title: 'إقرار بدين', desc: 'وثيقة إقرار بدين معترف به قانونياً مع تاريخ الاستحقاق والمبلغ المطلوب' },
      { icon: '✍️', title: 'التزام كتابي', desc: 'وثيقة التزام كتابي قانونية للالتزامات الشخصية والمهنية مع بنود مخصصة' },
      { icon: '📄', title: 'نماذج مخصصة', desc: 'إنشاء نماذج وثائق مخصصة بالكامل مع محرر نص وتحكم في الشكل والمضمون' },
    ],
    steps: [
      { title: 'اختر نوع الوثيقة', desc: 'اختر من بين 9 أنواع وثائق رسمية جاهزة أو أنشئ نموذجاً مخصصاً' },
      { title: 'أدخل بيانات الأطراف', desc: 'معلومات الطرف الأول وحتى الطرف الثاني للوثائق الثنائية (الاسم، CIN، العنوان، المدينة)' },
      { title: 'تخصيص الوثيقة', desc: 'أضف بنوداً إضافية، عدّل المضمون بمحرر WYSIWYG، خصّص شكل الوثيقة وعنوانها' },
      { title: 'معاينة قبل التصدير', desc: 'معاينة مباشرة للوثيقة النهائية بتنسيق A4 قبل التصدير' },
      { title: 'تصدير PDF أو Word', desc: 'تحميل الوثيقة بتنسيق PDF جاهز للطباعة أو Word قابل للتعديل' },
    ],
    faqs: [
      { q: 'هل الوثائق المنشأة معترف بها قانونياً؟', a: 'الوثائق منسقة وفق الصيغة المغربية الرسمية. للاعتراف القانوني الكامل قد تحتاج إلى مصادقة على الإمضاء لدى الجماعة أو التوثيق.' },
      { q: 'هل يمكن تعديل الوثيقة بعد إنشائها؟', a: 'نعم، يمكن التعديل المباشر على نص الوثيقة بمحرر WYSIWYG الكامل قبل التصدير.' },
      { q: 'ما اللغات المدعومة في الوثائق؟', a: 'الكاتب العمومي يدعم العربية بالكامل مع RTL، والفرنسية للمراسلات والوثائق الرسمية الفرنسية.' },
      { q: 'هل يمكن إضافة نموذج وثيقة خاص؟', a: 'نعم، ميزة إدارة النماذج تسمح بإضافة أنواع وثائق مخصصة بالكامل مع تحديد الحقول والنص التلقائي.' },
    ],
    cta: { label: '✍️ أنشئ وثيقة رسمية الآن', sublabel: 'سجّل مجاناً للوصول الكامل' },
  },

  cv: {
    hero: {
      icon: '📄', color: '#1e3a5f',
      tag: 'للمستخدمين المسجلين',
      title: 'مولد السيرة الذاتية الاحترافية بالفرنسية',
      subtitle: 'أنشئ سيرة ذاتية احترافية بالفرنسية تبرز مهاراتك وخبراتك. 3 قوالب أنيقة، ألوان مخصصة، تصدير PDF جاهز لإرساله لأصحاب العمل.',
      free: false,
    },
    features: [
      { icon: '🖼️', title: 'صورة شخصية', desc: 'إضافة صورة شخصية احترافية بأشكال مختلفة حسب القالب (مستطيل، دائري)' },
      { icon: '🎨', title: '3 قوالب احترافية', desc: 'كلاسيك، مودرن بسايدبار ملون، وبروفيشنال — كل قالب بأسلوب مميز وتخطيط فريد' },
      { icon: '🌈', title: 'ألوان مخصصة', desc: 'اختيار لون الخلفية ولون النص لكل قالب مع معاينة فورية — 12 لوناً جاهزاً + مخصص' },
      { icon: '📚', title: 'أقسام كاملة', desc: 'الملف الشخصي، التكوين، الخبرة المهنية، المهارات، اللغات، والاهتمامات' },
      { icon: '📏', title: 'تنسيق A4 دقيق', desc: 'تنسيق A4 احترافي بهوامش صحيحة جاهز للطباعة وإرساله بالبريد الإلكتروني' },
      { icon: '💾', title: 'تصدير PDF و Word', desc: 'تحميل السيرة الذاتية بتنسيق PDF جاهز للإرسال أو Word قابل للتعديل' },
    ],
    steps: [
      { title: 'اختر القالب والألوان', desc: 'اختر من بين 3 قوالب احترافية وخصّص الألوان لتعكس شخصيتك المهنية' },
      { title: 'أدخل معلوماتك الشخصية', desc: 'الاسم، الوظيفة المستهدفة، معلومات الاتصال، وصورة شخصية اختيارية' },
      { title: 'أضف التكوين والخبرة', desc: 'مؤهلاتك الدراسية وتجاربك المهنية مرتبة تسلسلياً مع توصيف مفصّل' },
      { title: 'المهارات واللغات', desc: 'مستويات اللغات (مبتدئ → ممتاز) والمهارات التقنية والشخصية' },
      { title: 'معاينة وتصدير', desc: 'معاينة السيرة الذاتية النهائية بدقة وتحميلها بتنسيق PDF أو Word' },
    ],
    faqs: [
      { q: 'هل يمكن إنشاء سيرة ذاتية بالعربية؟', a: 'حالياً المولد متخصص في السير الذاتية بالفرنسية. السيرة الذاتية الفرنسية هي الأكثر طلباً في سوق الشغل المغربي.' },
      { q: 'ما الفرق بين القوالب الثلاثة؟', a: 'Classique: تقليدي بسيط مناسب للقطاع العام. Moderne: سايدبار ملون مناسب للقطاع الخاص. Professionnel: هيدر ملون مناسب للمناصب العليا.' },
      { q: 'هل يمكن تعديل السيرة بعد تصديرها؟', a: 'تنسيق Word قابل للتعديل بالكامل في Microsoft Word. PDF للطباعة والإرسال المباشر.' },
      { q: 'هل الصورة الشخصية إلزامية؟', a: 'الصورة اختيارية لكن موصى بها في السوق المغربية. القوالب تعمل بشكل كامل بدون صورة.' },
    ],
    cta: { label: '📄 أنشئ سيرتك الذاتية الآن', sublabel: 'سجّل مجاناً للوصول الكامل' },
  },

  letters: {
    hero: {
      icon: '📝', color: '#1a3a5c',
      tag: 'للمستخدمين المسجلين',
      title: 'الرسائل الرسمية الفرنسية — Lettres Officielles',
      subtitle: 'أنشئ رسائل إدارية رسمية بالفرنسية وفق الصيغة المغربية المعتمدة. من طلب التدريب إلى خطاب الاستقالة — نماذج جاهزة بالصيغة الاحترافية الصحيحة.',
      free: false,
    },
    features: [
      { icon: '🎓', title: 'Demande de Stage', desc: 'طلب تدريب احترافي بالفرنسية مع كل المعلومات المطلوبة والصيغة الرسمية الصحيحة' },
      { icon: '🚪', title: 'Lettre de Démission', desc: 'خطاب استقالة رسمي باحترام فترة الإشعار وفق قانون الشغل المغربي' },
      { icon: '📬', title: 'Demande Administrative', desc: 'مراسلة إدارية رسمية لجميع الطلبات الإدارية الموجهة للإدارات العمومية' },
      { icon: '✉️', title: 'Lettre Officielle', desc: 'رسالة رسمية بالصيغة المغربية المعتمدة مع كل عناصر التنسيق الإداري الصحيح' },
      { icon: '📅', title: 'تاريخ وتوقيع تلقائي', desc: 'التاريخ بالصيغة الفرنسية المغربية، المدينة، ومنطقة التوقيع جاهزة تلقائياً' },
      { icon: '✏️', title: 'تعديل كامل', desc: 'تعديل النص الكامل للرسالة مع الحفاظ على الصيغة الرسمية والهيكل الصحيح' },
    ],
    steps: [
      { title: 'اختر نوع الرسالة', desc: 'اختر من بين 4 أنواع رسائل رسمية جاهزة للصيغة الإدارية المغربية' },
      { title: 'أدخل معلوماتك', desc: 'الاسم، العنوان، معلومات الاتصال، والجهة المرسل إليها' },
      { title: 'خصّص محتوى الرسالة', desc: 'تعديل نص الرسالة المولّد تلقائياً حسب حالتك الخاصة' },
      { title: 'تصدير وطباعة', desc: 'تحميل الرسالة بتنسيق PDF للإرسال أو Word للتعديل' },
    ],
    faqs: [
      { q: 'هل الرسائل مناسبة للإدارات المغربية الرسمية؟', a: 'نعم، الرسائل مصممة وفق الصيغة الإدارية الرسمية المعتمدة في المغرب مع التنسيق الصحيح.' },
      { q: 'هل يمكن إضافة مرفقات في الرسالة؟', a: 'يمكن ذكر المرفقات في نص الرسالة (PJ: ...). إرفاق ملفات فعلية يتم عند طباعة الرسالة وإرسالها.' },
      { q: 'هل الرسائل بالعربية مدعومة؟', a: 'وحدة الرسائل الفرنسية متخصصة. للمراسلات العربية استخدم وحدة الكاتب العمومي.' },
    ],
    cta: { label: '📝 أنشئ رسالتك الرسمية الآن', sublabel: 'سجّل مجاناً للوصول الكامل' },
  },

  invoices: {
    hero: {
      icon: '🧾', color: '#0f2744',
      tag: 'للمستخدمين المسجلين',
      title: 'مولد الفواتير والعروض التجارية — Factures & Devis',
      subtitle: 'أنشئ فواتير تجارية احترافية بالفرنسية بسهولة. حساب TVA 20% تلقائي، كتابة المبلغ بالحروف، وتصدير PDF و Word فوري. Facture, Devis, Avoir, Bon de commande.',
      free: false,
    },
    features: [
      { icon: '🧾', title: 'Facture', desc: 'فاتورة تجارية كاملة بالمعلومات الضريبية (ICE, IF, RC, Patente, CNSS) وجميع البيانات القانونية' },
      { icon: '📋', title: 'Devis', desc: 'عرض الأسعار بصلاحية 30 يوماً مع منطقة "Bon pour accord" للتوقيع' },
      { icon: '↩️', title: 'Avoir', desc: 'مذكرة دائنة لإلغاء أو تصحيح فواتير سابقة بنفس التنسيق الاحترافي' },
      { icon: '📦', title: 'Bon de Commande', desc: 'أمر الشراء الرسمي للموردين مع جميع تفاصيل الطلب' },
      { icon: '🔢', title: 'TVA 20% تلقائي', desc: 'حساب تلقائي لـ HT, TVA (0%, 7%, 10%, 14%, 20%), TTC لكل سطر وللمجموع' },
      { icon: '✍️', title: 'المبلغ بالحروف', desc: 'تحويل تلقائي للمبلغ الإجمالي إلى حروف فرنسية صحيحة بالدرهم أو اليورو أو الدولار' },
    ],
    steps: [
      { title: 'اختر نوع الوثيقة', desc: 'Facture، Devis، Avoir أو Bon de Commande حسب نوع المعاملة التجارية' },
      { title: 'معلومات المرسِل والعميل', desc: 'بيانات شركتك (ICE, IF, RC) وبيانات العميل مع جميع المعلومات الضريبية' },
      { title: 'إضافة بنود الفاتورة', desc: 'أضف الخدمات أو المنتجات مع الكمية والسعر ونسبة TVA — الحسابات تلقائية فورية' },
      { title: 'مراجعة المجاميع', desc: 'HT الإجمالي، مجموع TVA، الرسوم، الأداء المسبق، والمبلغ الكلي TTC' },
      { title: 'تصدير PDF أو Word', desc: 'تحميل الفاتورة بتنسيق PDF احترافي أو Word قابل للتعديل' },
    ],
    faqs: [
      { q: 'هل الفاتورة معتمدة ضريبياً في المغرب؟', a: 'الفاتورة مصممة وفق الشروط القانونية للفوترة في المغرب. للاعتماد الضريبي الكامل تأكد من ملء جميع بيانات ICE وIF الصحيحة.' },
      { q: 'هل يمكن إضافة شعار الشركة؟', a: 'حالياً يمكن إضافة اسم وعنوان الشركة. إضافة الشعار كصورة ستتوفر في التحديثات القادمة.' },
      { q: 'ما نسبة TVA المدعومة؟', a: 'يدعم النظام جميع نسب TVA المغربية: 0%, 7%, 10%, 14%, و20% بشكل مستقل لكل سطر.' },
      { q: 'هل يمكن إنشاء فواتير بالدرهم واليورو؟', a: 'نعم، يدعم النظام عملات MAD و EUR و USD مع كتابة المبلغ بالحروف لكل عملة.' },
      { q: 'هل يمكن حفظ بيانات العميل لاستخدامها لاحقاً؟', a: 'حالياً تُحفظ البيانات في الجلسة الحالية. ميزة قاعدة بيانات العملاء ستتوفر في التحديثات القادمة.' },
    ],
    cta: { label: '🧾 أنشئ فاتورتك الأولى الآن', sublabel: 'سجّل مجاناً للوصول الكامل' },
  },
};

/* ══════════════════════════════════════════
   MAIN ServicePage COMPONENT
══════════════════════════════════════════ */
export default function ServicePage({ service, onLogin, onRegister, onGoHome, onLaunch, scanUsesLeft = 5 }: ServicePageProps) {
  const seo = SEO_PAGES[service];
  const data = SERVICE_DATA[service];

  useEffect(() => {
    applySEO(seo);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [service, seo]);

  const isFree = data.hero.free || service === 'procedures';
  const isScan = service === 'scanner';

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Cairo', sans-serif", direction: 'rtl' }}>

      {/* ── Sticky Navbar ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 200,
        background: 'linear-gradient(135deg,#0f2744,#1a3a5c)',
        boxShadow: '0 2px 20px rgba(0,0,0,0.25)',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          {/* Logo */}
          <button onClick={onGoHome} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#c8962c,#e8b84b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚜️</div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 14, lineHeight: 1.2 }}>مكتب الخدمات</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontFamily: 'Inter, sans-serif' }}>Bureau de Services</div>
            </div>
          </button>

          {/* Breadcrumb inline */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13 }}>
            <button onClick={onGoHome} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontFamily: 'inherit' }}>الرئيسية</button>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>›</span>
            <span style={{ color: '#c8962c', fontWeight: 700, fontSize: 12 }}>{data.hero.icon} {seo.titleAr.substring(0, 30)}</span>
          </div>

          {/* CTA buttons */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            {isScan && scanUsesLeft > 0 && (
              <div style={{ fontSize: 11, color: '#22d3ee', fontWeight: 700, padding: '3px 10px', background: 'rgba(34,211,238,0.1)', borderRadius: 20, border: '1px solid rgba(34,211,238,0.3)' }}>
                {scanUsesLeft} / 5 مجاني
              </div>
            )}
            <button onClick={onLogin} style={{ padding: '6px 14px', borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.25)', background: 'transparent', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>دخول</button>
            <button onClick={onRegister} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#c8962c,#e8b84b)', color: '#0f2744', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>تسجيل مجاني</button>
          </div>
        </div>
      </nav>

      {/* ── Breadcrumb bar ── */}
      <Breadcrumb
        onGoHome={onGoHome}
        items={[{ label: `${data.hero.icon} ${seo.titleAr}` }]}
      />

      {/* ── HERO SECTION ── */}
      <section style={{
        background: `linear-gradient(135deg, ${data.hero.color} 0%, #1a3a5c 60%, #0c2135 100%)`,
        padding: '60px 20px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative stars */}
        {[
          { top: '10%', right: '5%', size: 60, op: 0.06 },
          { top: '60%', left: '3%', size: 100, op: 0.04 },
          { top: '30%', right: '15%', size: 40, op: 0.08 },
        ].map((s, i) => (
          <div key={i} style={{ position: 'absolute', top: s.top, right: s.right, left: s.left, opacity: s.op, pointerEvents: 'none' }}>
            <svg width={s.size} height={s.size} viewBox="0 0 100 100">
              <polygon points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35" fill="#c8962c" />
            </svg>
          </div>
        ))}

        <div style={{ maxWidth: 820, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          {/* Tag */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 20px', borderRadius: 50,
            background: isFree ? 'rgba(34,197,94,0.15)' : 'rgba(200,150,44,0.15)',
            border: `1px solid ${isFree ? 'rgba(34,197,94,0.3)' : 'rgba(200,150,44,0.3)'}`,
            marginBottom: 24,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: isFree ? '#22c55e' : '#c8962c', display: 'inline-block' }} />
            <span style={{ color: isFree ? '#22c55e' : '#c8962c', fontSize: 13, fontWeight: 700 }}>{data.hero.tag}</span>
          </div>

          {/* Icon */}
          <div style={{ fontSize: 64, marginBottom: 20 }}>{data.hero.icon}</div>

          {/* H1 */}
          <h1 style={{ color: '#fff', fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 900, margin: '0 0 20px', lineHeight: 1.4 }}>
            {data.hero.title}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 'clamp(14px, 2.5vw, 17px)', lineHeight: 1.9, margin: '0 0 36px' }}>
            {data.hero.subtitle}
          </p>

          {/* CTA */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={isFree || isScan ? onLaunch : onRegister}
              style={{
                padding: '14px 32px', borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg,#c8962c,#e8b84b)',
                color: '#0f2744', fontSize: 15, fontWeight: 800, cursor: 'pointer',
                fontFamily: 'inherit', boxShadow: '0 8px 32px rgba(200,150,44,0.4)',
                transition: 'transform 0.2s', display: 'flex', alignItems: 'center', gap: 8,
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {data.cta.label}
            </button>
            {!isFree && (
              <button onClick={onLogin} style={{
                padding: '14px 28px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.25)',
                background: 'rgba(255,255,255,0.06)', color: '#fff',
                fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                لدي حساب — دخول
              </button>
            )}
          </div>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 16 }}>{data.cta.sublabel}</p>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section style={{ padding: '60px 20px', background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ display: 'inline-block', background: 'linear-gradient(135deg,#c8962c,#e8b84b)', borderRadius: 50, padding: '4px 18px', fontSize: 12, fontWeight: 800, color: '#0f2744', marginBottom: 14 }}>⭐ الميزات</div>
            <h2 style={{ fontSize: 'clamp(20px, 3.5vw, 30px)', fontWeight: 900, color: '#0f2744', margin: 0 }}>كل ما تحتاجه في مكان واحد</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {data.features.map((f, i) => <FeatureCard key={i} {...f} />)}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: '60px 20px', background: '#f8fafc' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ display: 'inline-block', background: '#e0f2fe', borderRadius: 50, padding: '4px 18px', fontSize: 12, fontWeight: 800, color: '#0369a1', marginBottom: 14 }}>📋 كيف يعمل</div>
            <h2 style={{ fontSize: 'clamp(20px, 3.5vw, 28px)', fontWeight: 900, color: '#0f2744', margin: 0 }}>خطوات بسيطة للنتيجة المثالية</h2>
          </div>
          <div style={{ background: '#fff', borderRadius: 20, padding: '32px 28px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
            {data.steps.map((s, i) => <StepItem key={i} n={i + 1} title={s.title} desc={s.desc} />)}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ padding: '60px 20px', background: '#fff' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ display: 'inline-block', background: '#fef3c7', borderRadius: 50, padding: '4px 18px', fontSize: 12, fontWeight: 800, color: '#92400e', marginBottom: 14 }}>❓ أسئلة شائعة</div>
            <h2 style={{ fontSize: 'clamp(20px, 3.5vw, 28px)', fontWeight: 900, color: '#0f2744', margin: 0 }}>الأسئلة الأكثر شيوعاً</h2>
          </div>
          {data.faqs.map((faq, i) => <FAQItem key={i} {...faq} />)}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ padding: '60px 20px', background: 'linear-gradient(135deg,#0f2744,#1a3a5c)', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>{data.hero.icon}</div>
          <h2 style={{ color: '#fff', fontSize: 'clamp(20px, 3.5vw, 28px)', fontWeight: 900, marginBottom: 12 }}>
            جاهز للبدء؟
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15, marginBottom: 32, lineHeight: 1.8 }}>
            {data.cta.sublabel}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={isFree || isScan ? onLaunch : onRegister}
              style={{
                padding: '14px 36px', borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg,#c8962c,#e8b84b)',
                color: '#0f2744', fontSize: 15, fontWeight: 800,
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 8px 32px rgba(200,150,44,0.4)',
              }}
            >
              {data.cta.label}
            </button>
            <button onClick={onGoHome} style={{
              padding: '14px 28px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.25)',
              background: 'rgba(255,255,255,0.06)', color: '#fff',
              fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              🏠 العودة للرئيسية
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#070d1a', padding: '28px 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
            {[
              { label: '🏛️ المساطر الإدارية', key: 'procedures' },
              { label: '🪪 Scan Studio', key: 'scanner' },
              { label: '✍️ الكاتب العمومي', key: 'writer' },
              { label: '📄 السيرة الذاتية', key: 'cv' },
              { label: '📝 الرسائل الرسمية', key: 'letters' },
              { label: '🧾 الفواتير', key: 'invoices' },
            ].map(link => (
              <span key={link.key} style={{ color: link.key === service ? '#c8962c' : 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: link.key === service ? 800 : 400, cursor: 'default' }}>
                {link.label}
              </span>
            ))}
          </div>
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, margin: 0, fontFamily: 'Inter, sans-serif' }}>
            © {new Date().getFullYear()} مكتب الخدمات الإدارية المغربية — Bureau de Services Administratifs Maroc
          </p>
        </div>
      </footer>
    </div>
  );
}
