/* ═══════════════════════════════════════════════════════════
   SITE SETTINGS STORE — Shared between GeneralSettings & HomePage
   Uses localStorage + custom events for real-time sync
   ═══════════════════════════════════════════════════════════ */

export const SERVICES_KEY  = 'moas_service_config';
export const ADS_KEY       = 'moas_ads';
export const SITE_KEY      = 'moas_site_settings';
export const SETTINGS_EVENT = 'moas_settings_changed';

/* ─── Types ─── */
export interface ServiceConfig {
  key: string;
  nameAr: string;
  nameFr: string;
  icon: string;
  enabled: boolean;
  visible: boolean;
  freeAccess: boolean;
  freeUses: number;
  color: string;
}

export interface AdItem {
  id: string;
  position: AdPosition;
  type: 'image' | 'html';
  content: string;
  link?: string;
  alt?: string;
  enabled: boolean;
  createdAt: string;
  label: string;
}

export type AdPosition =
  | 'hero-top' | 'hero-bottom'
  | 'services-top' | 'services-bottom'
  | 'how-it-works' | 'testimonials'
  | 'faq' | 'footer-top' | 'navbar-banner';

export interface SiteSettings {
  siteName: string;
  siteNameFr: string;
  slogan: string;
  sloganFr: string;
  logo: string;
  primaryColor: string;
  accentColor: string;
  heroTitle: string;
  heroSubtitle: string;
  heroTitleFr: string;
  showStats: boolean;
  showTestimonials: boolean;
  showFaq: boolean;
  showHowItWorks: boolean;
  footerText: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  city: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  googleAnalyticsId: string;
  facebookPixelId: string;
}

/* ─── Defaults ─── */
export const DEFAULT_SERVICES: ServiceConfig[] = [
  { key:'procedures', nameAr:'المساطر الإدارية',  nameFr:'Procédures Administratives', icon:'🏛️', enabled:true, visible:true, freeAccess:true,  freeUses:0, color:'#dc2626' },
  { key:'scanner',    nameAr:'Scan Studio',        nameFr:'Scanner CIN',                icon:'🪪', enabled:true, visible:true, freeAccess:true,  freeUses:4, color:'#d97706' },
  { key:'writer',     nameAr:'الكاتب العمومي',     nameFr:'Rédacteur Public',           icon:'✍️', enabled:true, visible:true, freeAccess:false, freeUses:0, color:'#2563a8' },
  { key:'cv',         nameAr:'مولّد السيرة',        nameFr:'Générateur de CV',           icon:'📄', enabled:true, visible:true, freeAccess:false, freeUses:0, color:'#059669' },
  { key:'letters',    nameAr:'الرسائل الفرنسية',   nameFr:'Lettres Françaises',         icon:'📝', enabled:true, visible:true, freeAccess:false, freeUses:0, color:'#7c3aed' },
  { key:'invoices',   nameAr:'الفواتير والحسابات', nameFr:'Factures & Devis',           icon:'🧾', enabled:true, visible:true, freeAccess:false, freeUses:0, color:'#059669' },
];

export const DEFAULT_SITE: SiteSettings = {
  siteName: 'مكتب الخدمات',
  siteNameFr: 'Bureau de Services',
  slogan: 'خدماتكم الإدارية بسهولة وسرعة',
  sloganFr: 'Vos services administratifs, simples et rapides',
  logo: '⚜️',
  primaryColor: '#0f2744',
  accentColor: '#c8962c',
  heroTitle: 'مكتب الخدمات الإدارية',
  heroSubtitle: 'خدماتكم الإدارية بسهولة وسرعة',
  heroTitleFr: 'Bureau de Services Numériques Marocain',
  showStats: true,
  showTestimonials: true,
  showFaq: true,
  showHowItWorks: true,
  footerText: 'جميع الحقوق محفوظة © 2025 مكتب الخدمات',
  contactEmail: '',
  contactPhone: '',
  address: '',
  city: 'الرباط',
  maintenanceMode: false,
  maintenanceMessage: 'الموقع في وضع الصيانة، سنعود قريباً',
  googleAnalyticsId: '',
  facebookPixelId: '',
};

/* ─── Scan counter key ─── */
export const SCAN_COUNT_KEY = 'moas_scan_count';

export function getScanCount(): number {
  return parseInt(localStorage.getItem(SCAN_COUNT_KEY) || '0', 10);
}
export function incrementScanCount(): number {
  const n = getScanCount() + 1;
  localStorage.setItem(SCAN_COUNT_KEY, String(n));
  return n;
}
export function resetScanCount() {
  localStorage.removeItem(SCAN_COUNT_KEY);
}

/* ─── Check if scanner is accessible without login ─── */
export function isScannerFreeNow(): { allowed: boolean; usesLeft: number; freeUses: number; requiresLogin: boolean } {
  const cfg = getServiceCfg('scanner');
  if (!cfg.enabled)     return { allowed: false, usesLeft: 0, freeUses: 0, requiresLogin: true };
  if (!cfg.freeAccess)  return { allowed: false, usesLeft: 0, freeUses: cfg.freeUses, requiresLogin: true };
  const used    = getScanCount();
  const max     = cfg.freeUses ?? 4;
  const usesLeft = Math.max(0, max - used);
  return { allowed: usesLeft > 0, usesLeft, freeUses: max, requiresLogin: false };
}

/* private helper used before loadServices is defined */
function getServiceCfg(key: string): ServiceConfig {
  try {
    const raw = localStorage.getItem(SERVICES_KEY);
    if (!raw) return DEFAULT_SERVICES.find(s => s.key === key)!;
    const parsed = JSON.parse(raw) as ServiceConfig[];
    const saved  = parsed.find(p => p.key === key);
    const def    = DEFAULT_SERVICES.find(s => s.key === key)!;
    return saved ? { ...def, ...saved } : def;
  } catch { return DEFAULT_SERVICES.find(s => s.key === key)!; }
}

/* ─── Load/Save helpers ─── */
export function loadServices(): ServiceConfig[] {
  try {
    const raw = localStorage.getItem(SERVICES_KEY);
    if (!raw) return DEFAULT_SERVICES;
    const parsed = JSON.parse(raw) as ServiceConfig[];
    // Merge with defaults to add any new keys
    return DEFAULT_SERVICES.map(def => {
      const saved = parsed.find(p => p.key === def.key);
      return saved ? { ...def, ...saved } : def;
    });
  } catch { return DEFAULT_SERVICES; }
}

export function saveServices(s: ServiceConfig[]) {
  localStorage.setItem(SERVICES_KEY, JSON.stringify(s));
  notifyChange('services');
}

export function loadAds(): AdItem[] {
  try {
    const raw = localStorage.getItem(ADS_KEY);
    return raw ? (JSON.parse(raw) as AdItem[]) : [];
  } catch { return []; }
}

export function saveAds(a: AdItem[]) {
  localStorage.setItem(ADS_KEY, JSON.stringify(a));
  notifyChange('ads');
}

export function loadSite(): SiteSettings {
  try {
    const raw = localStorage.getItem(SITE_KEY);
    return raw ? { ...DEFAULT_SITE, ...JSON.parse(raw) } as SiteSettings : DEFAULT_SITE;
  } catch { return DEFAULT_SITE; }
}

export function saveSite(s: SiteSettings) {
  localStorage.setItem(SITE_KEY, JSON.stringify(s));
  notifyChange('site');
}

/* ─── Helper: get single service config (public) ─── */
export function getService(key: string): ServiceConfig {
  return getServiceCfg(key);
}

/* ─── Notify all listeners in the same tab ─── */
function notifyChange(type: string) {
  window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: { type } }));
}

/* ─── Hook-like subscription helper ─── */
export function onSettingsChange(fn: (type: string) => void): () => void {
  const handler = (e: Event) => fn((e as CustomEvent).detail.type);
  window.addEventListener(SETTINGS_EVENT, handler);
  return () => window.removeEventListener(SETTINGS_EVENT, handler);
}
