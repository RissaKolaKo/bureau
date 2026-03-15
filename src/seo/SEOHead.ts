/* ═══════════════════════════════════════════════════════════
   SEOHead — Dynamic meta tag & structured data injector
   Updates <head> tags for each route without Next.js
═══════════════════════════════════════════════════════════ */

export interface SEOConfig {
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  keywords: string;
  canonical: string;
  ogImage?: string;
  schema?: object;
  lang?: 'ar' | 'fr' | 'ar-FR';
}

const SITE_NAME  = 'مكتب الخدمات — Bureau de Services Administratifs Maroc';
const SITE_URL   = 'https://bureau-services.ma';
const OG_DEFAULT = `${SITE_URL}/og-default.jpg`;

export function applySEO(cfg: SEOConfig) {
  /* ── Title ── */
  document.title = `${cfg.title} | ${SITE_NAME}`;

  /* ── Lang ── */
  document.documentElement.lang = cfg.lang ?? 'ar';

  /* ── Helper: upsert <meta> ── */
  function meta(sel: string, attr: string, val: string) {
    let el = document.querySelector<HTMLMetaElement>(sel);
    if (!el) {
      el = document.createElement('meta');
      document.head.appendChild(el);
    }
    (el as HTMLElement).setAttribute(attr, val);
  }
  function link(rel: string, href: string) {
    let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
    if (!el) { el = document.createElement('link'); el.rel = rel; document.head.appendChild(el); }
    el.href = href;
  }

  /* ── Standard meta ── */
  meta('meta[name="description"]',        'name',    'description');
  meta('meta[name="description"]',        'content', cfg.description);
  meta('meta[name="keywords"]',           'name',    'keywords');
  meta('meta[name="keywords"]',           'content', cfg.keywords);
  meta('meta[name="robots"]',             'name',    'robots');
  meta('meta[name="robots"]',             'content', 'index, follow, max-image-preview:large');
  meta('meta[name="author"]',             'name',    'author');
  meta('meta[name="author"]',             'content', 'مكتب الخدمات الإدارية المغربية');
  meta('meta[name="geo.region"]',         'name',    'geo.region');
  meta('meta[name="geo.region"]',         'content', 'MA');
  meta('meta[name="geo.country"]',        'name',    'geo.country');
  meta('meta[name="geo.country"]',        'content', 'Morocco');
  meta('meta[name="language"]',           'name',    'language');
  meta('meta[name="language"]',           'content', 'Arabic, French');

  /* ── Open Graph ── */
  meta('meta[property="og:title"]',       'property','og:title');
  meta('meta[property="og:title"]',       'content', cfg.title);
  meta('meta[property="og:description"]', 'property','og:description');
  meta('meta[property="og:description"]', 'content', cfg.description);
  meta('meta[property="og:type"]',        'property','og:type');
  meta('meta[property="og:type"]',        'content', 'website');
  meta('meta[property="og:url"]',         'property','og:url');
  meta('meta[property="og:url"]',         'content', `${SITE_URL}${cfg.canonical}`);
  meta('meta[property="og:image"]',       'property','og:image');
  meta('meta[property="og:image"]',       'content', cfg.ogImage ?? OG_DEFAULT);
  meta('meta[property="og:site_name"]',   'property','og:site_name');
  meta('meta[property="og:site_name"]',   'content', SITE_NAME);
  meta('meta[property="og:locale"]',      'property','og:locale');
  meta('meta[property="og:locale"]',      'content', 'ar_MA');

  /* ── Twitter Card ── */
  meta('meta[name="twitter:card"]',        'name',    'twitter:card');
  meta('meta[name="twitter:card"]',        'content', 'summary_large_image');
  meta('meta[name="twitter:title"]',       'name',    'twitter:title');
  meta('meta[name="twitter:title"]',       'content', cfg.title);
  meta('meta[name="twitter:description"]', 'name',    'twitter:description');
  meta('meta[name="twitter:description"]', 'content', cfg.description);
  meta('meta[name="twitter:image"]',       'name',    'twitter:image');
  meta('meta[name="twitter:image"]',       'content', cfg.ogImage ?? OG_DEFAULT);

  /* ── Canonical + hreflang ── */
  link('canonical', `${SITE_URL}${cfg.canonical}`);

  /* ── JSON-LD Structured Data ── */
  const schemaId = 'seo-json-ld';
  let schemaEl = document.getElementById(schemaId) as HTMLScriptElement | null;
  if (!schemaEl) {
    schemaEl = document.createElement('script');
    schemaEl.id   = schemaId;
    schemaEl.type = 'application/ld+json';
    document.head.appendChild(schemaEl);
  }
  const baseSchema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'مكتب الخدمات الإدارية',
    alternateName: 'Bureau de Services Administratifs Maroc',
    description: cfg.description,
    url: `${SITE_URL}${cfg.canonical}`,
    telephone: '+212-000-000000',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'MA',
      addressRegion: 'Maroc',
    },
    areaServed: { '@type': 'Country', name: 'Morocco' },
    availableLanguage: ['Arabic', 'French'],
    sameAs: [`${SITE_URL}`],
  };
  schemaEl.textContent = JSON.stringify(cfg.schema ?? baseSchema, null, 2);
}

/* ── Predefined SEO configs for each page ── */
export const SEO_PAGES: Record<string, SEOConfig> = {

  home: {
    title: 'مكتب الخدمات الإدارية المغربية — Bureau de Services Maroc',
    titleAr: 'مكتب الخدمات الإدارية المغربية',
    description: 'منصة رقمية متكاملة لخدمات الكتابة العمومية، مسح الوثائق، إنشاء السير الذاتية، والفواتير بالمغرب. خدمات إدارية احترافية باللغتين العربية والفرنسية.',
    descriptionAr: 'منصة رقمية متكاملة لخدمات الكتابة العمومية بالمغرب',
    keywords: 'كاتب عمومي المغرب, خدمات إدارية مغرب, مسح وثائق, سيرة ذاتية, فواتير مغربية, bureau de services maroc, كتابة عمومية, وثائق رسمية',
    canonical: '/',
    lang: 'ar',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'مكتب الخدمات — Bureau de Services',
      url: 'https://bureau-services.ma',
      description: 'منصة رقمية متكاملة لخدمات الكتابة العمومية بالمغرب',
      inLanguage: ['ar', 'fr'],
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://bureau-services.ma/search?q={search_term_string}',
        'query-input': 'required name=search_term_string',
      },
    },
  },

  procedures: {
    title: 'المساطر الإدارية المغربية 2025 — Procédures Administratives Maroc',
    titleAr: 'المساطر الإدارية المغربية 2025',
    description: 'دليل شامل للمساطر الإدارية في المغرب 2025: تجديد البطاقة الوطنية، جواز السفر، رخصة السياقة، الحالة المدنية، التسجيل التجاري وأكثر من 55 مسطرة إدارية.',
    descriptionAr: 'دليل شامل للمساطر الإدارية في المغرب 2025',
    keywords: 'مساطر إدارية مغرب 2025, تجديد بطاقة وطنية, جواز سفر مغرب, رخصة سياقة, الحالة المدنية, التسجيل التجاري, procédures administratives maroc, renouvellement CIN',
    canonical: '/procedures',
    lang: 'ar',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      name: 'المساطر الإدارية المغربية 2025',
      description: 'دليل شامل للمساطر الإدارية في المغرب',
      mainEntity: [
        { '@type': 'Question', name: 'كيف أجدد بطاقتي الوطنية في المغرب؟', acceptedAnswer: { '@type': 'Answer', text: 'تقدم بطلب تجديد إلى مقاطعتك مع صور للبطاقة المنتهية وصورة شخصية.' } },
        { '@type': 'Question', name: 'ما هي وثائق استخراج جواز السفر المغربي؟', acceptedAnswer: { '@type': 'Answer', text: 'عقد الازدياد، البطاقة الوطنية، صورتان شمسيتان، ووصل الأداء.' } },
      ],
    },
  },

  scanner: {
    title: 'مسح وثائق مغربية — Scanner CIN & Documents | Scan Studio',
    titleAr: 'مسح الوثائق والبطاقة الوطنية',
    description: 'أداة مجانية لمسح البطاقة الوطنية المغربية والوثائق الإدارية. تصحيح المنظور تلقائياً، تحسين الصورة، وتصدير PDF جاهز للطباعة. لا تسجيل مطلوب.',
    descriptionAr: 'أداة مجانية لمسح البطاقة الوطنية المغربية والوثائق الإدارية',
    keywords: 'مسح بطاقة وطنية مغرب, scanner CIN maroc, مسح وثائق مجاني, تصحيح منظور, PDF بطاقة وطنية, scan document maroc, numériser CIN maroc',
    canonical: '/scanner',
    lang: 'ar',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Scan Studio — مسح الوثائق المغربية',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'MAD' },
      description: 'أداة مجانية لمسح البطاقة الوطنية المغربية والوثائق الإدارية',
      inLanguage: ['ar', 'fr'],
      featureList: ['تصحيح منظور تلقائي', 'تحسين الصورة', 'تصدير PDF', 'كشف الحواف'],
    },
  },

  writer: {
    title: 'الكاتب العمومي الرقمي — وثائق رسمية مغربية | مكتب الخدمات',
    titleAr: 'الكاتب العمومي الرقمي المغربي',
    description: 'إنشاء وثائق رسمية مغربية باللغة العربية: تصاريح بالشرف، وكالات خاصة، عقود الكراء، التزامات، وإقرارات. تصدير PDF و Word جاهز للطباعة.',
    descriptionAr: 'إنشاء وثائق رسمية مغربية باللغة العربية',
    keywords: 'كاتب عمومي مغرب, وثائق رسمية عربية, تصريح بالشرف, وكالة خاصة, عقد كراء, التزام كتابي, وثائق إدارية مغرب, rédacteur public maroc',
    canonical: '/writer',
    lang: 'ar',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'الكاتب العمومي الرقمي — Bureau de Services',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web Browser',
      description: 'إنشاء وثائق رسمية مغربية باللغة العربية مع تصدير PDF و Word',
      featureList: ['تصريح بالشرف', 'وكالة خاصة', 'عقد كراء', 'إقرار بدين', 'التزام كتابي'],
      inLanguage: ['ar', 'fr'],
    },
  },

  cv: {
    title: 'مولد السيرة الذاتية بالفرنسية — CV Professionnel Maroc | مكتب الخدمات',
    titleAr: 'مولد السيرة الذاتية الاحترافية',
    description: 'أنشئ سيرتك الذاتية الاحترافية بالفرنسية بسهولة. 3 قوالب أنيقة، ألوان مخصصة، صورة شخصية، تصدير PDF و Word. مجاناً للمستخدمين المسجلين.',
    descriptionAr: 'أنشئ سيرتك الذاتية الاحترافية بالفرنسية',
    keywords: 'سيرة ذاتية فرنسية مغرب, CV professionnel maroc, CV en français, modèle CV maroc, créer CV gratuit, سيرة ذاتية احترافية, CV marocain',
    canonical: '/cv',
    lang: 'ar',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'مولد السيرة الذاتية — Bureau de Services',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web Browser',
      description: 'أنشئ سيرتك الذاتية الاحترافية بالفرنسية مع تصدير PDF',
      featureList: ['3 قوالب احترافية', 'ألوان مخصصة', 'صورة شخصية', 'تصدير PDF', 'تصدير Word'],
    },
  },

  letters: {
    title: 'رسائل رسمية بالفرنسية — Lettres Administratives Maroc | مكتب الخدمات',
    titleAr: 'الرسائل الرسمية الفرنسية',
    description: 'إنشاء رسائل رسمية بالفرنسية: طلب تدريب، خطاب استقالة، مراسلة إدارية. نماذج جاهزة بالصيغة الرسمية المغربية مع تصدير PDF و Word.',
    descriptionAr: 'إنشاء رسائل رسمية بالفرنسية للإدارة المغربية',
    keywords: 'رسالة رسمية فرنسية مغرب, lettre administrative maroc, demande de stage maroc, lettre démission maroc, modèles lettres officielles, رسائل إدارية',
    canonical: '/letters',
    lang: 'fr',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Générateur de Lettres Officielles — Bureau de Services',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web Browser',
      description: 'Créez des lettres officielles en français pour l\'administration marocaine',
      featureList: ['Demande de stage', 'Lettre de démission', 'Demande administrative', 'Lettre officielle'],
    },
  },

  invoices: {
    title: 'إنشاء فواتير مغربية بالفرنسية — Factures & Devis Maroc | مكتب الخدمات',
    titleAr: 'مولد الفواتير والعروض التجارية',
    description: 'أنشئ فواتير ومراسلات تجارية احترافية بالفرنسية: Facture، Devis، Avoir، Bon de commande. حساب TVA 20% تلقائي، المبلغ بالحروف، تصدير PDF و Word.',
    descriptionAr: 'إنشاء فواتير ومراسلات تجارية احترافية بالفرنسية',
    keywords: 'فاتورة مغربية, facture maroc, devis maroc, TVA maroc 20%, bon de commande, avoir maroc, فاتورة بالفرنسية, مولد فواتير مغرب',
    canonical: '/invoices',
    lang: 'fr',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Générateur de Factures — Bureau de Services Maroc',
      applicationCategory: 'AccountingApplication',
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'MAD' },
      description: 'Créez des factures et devis professionnels avec calcul TVA automatique',
      featureList: ['Facture', 'Devis', 'Avoir', 'Bon de commande', 'TVA 20%', 'Montant en lettres'],
    },
  },
};
