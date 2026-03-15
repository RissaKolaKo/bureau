import { useState, useCallback, useEffect } from 'react';
import { Module, DocRecord } from './types';
import { getHistory } from './utils/storage';
import { authService, ActiveSession } from './utils/authService';
import {
  loadServices, loadAds, loadSite, onSettingsChange,
  ServiceConfig, AdItem, SiteSettings,
  isScannerFreeNow, incrementScanCount,
} from './utils/siteSettings';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PublicWriter from './components/PublicWriter';
import CVGenerator from './components/CVGenerator';
import CINScanner from './components/CINScanner';
import FrenchLetters from './components/FrenchLetters';
import AdminProcedures from './components/AdminProcedures';
import HistoryPanel from './components/HistoryPanel';
import UserManagement from './components/UserManagement';
import RegistrationManager from './components/RegistrationManager';
import AdminLogin from './components/AdminLogin';
import UserPortalLogin from './components/UserPortalLogin';
import InvoiceGenerator from './components/InvoiceGenerator';
import HomePage from './components/HomePage';
import ServicePage from './pages/ServicePage';
import GeneralSettings from './components/GeneralSettings';
import { applySEO, SEO_PAGES } from './seo/SEOHead';
import { recordVisit } from './utils/analytics';

type ServiceKey = 'procedures' | 'scanner' | 'writer' | 'cv' | 'letters' | 'invoices';
type AppRoute = 'home' | 'admin' | 'user' | 'admin-login' | 'user-login' | 'service-page';
type PublicModule = 'admin-procedures' | 'cin-scanner';

/* Scan helpers now come from siteSettings.ts — dynamic admin config */

function getInitialRoute(): AppRoute {
  const hash = window.location.hash;
  if (hash === '#/control-center' || hash.startsWith('#/control-center')) return 'admin-login';
  const serviceRoutes = ['#/procedures','#/scanner','#/writer','#/cv','#/letters','#/invoices'];
  if (serviceRoutes.some(r => hash === r || hash.startsWith(r + '/'))) return 'service-page';
  return 'home';
}

function getServiceFromHash(): ServiceKey {
  const hash = window.location.hash;
  if (hash.includes('/procedures')) return 'procedures';
  if (hash.includes('/scanner'))    return 'scanner';
  if (hash.includes('/writer'))     return 'writer';
  if (hash.includes('/cv'))         return 'cv';
  if (hash.includes('/letters'))    return 'letters';
  if (hash.includes('/invoices'))   return 'invoices';
  return 'procedures';
}

const BOTTOM_NAV: { id: Module; icon: string; label: string }[] = [
  { id: 'dashboard',         icon: '🏠', label: 'الرئيسية' },
  { id: 'public-writer',     icon: '✍️', label: 'كاتب عمومي' },
  { id: 'cin-scanner',       icon: '🪪', label: 'Scan' },
  { id: 'invoice-generator', icon: '🧾', label: 'فواتير' },
  { id: 'admin-procedures',  icon: '🏛️', label: 'مساطر' },
];

/* ── Public wrapper (no auth needed) ── */
function PublicWrapper({ module, onLogin, onRegister, scanUsesLeft, freeMax, onScanUpload, onGoHome }: {
  module: PublicModule;
  onLogin: () => void;
  onRegister: () => void;
  scanUsesLeft: number;
  freeMax: number;
  onScanUpload: () => boolean;
  onGoHome: () => void;
}) {
  return (
    <div style={{ minHeight: '100vh', background: module === 'cin-scanner' ? '#070d1a' : '#f4f6fa', direction: 'rtl', fontFamily: "'Cairo', sans-serif" }}>
      <header style={{
        background: 'linear-gradient(135deg,#0f2744,#1a3a5c)',
        padding: '0 16px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 2px 12px rgba(0,0,0,0.2)', gap: 8,
      }}>
        <button onClick={onGoHome} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#c8962c,#e8b84b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⚜️</div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'white', fontWeight: 800, fontSize: 12, lineHeight: 1.2 }}>مكتب الخدمات</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 8, fontFamily: 'Inter, sans-serif' }}>Bureau de Services</div>
          </div>
        </button>

        {module === 'cin-scanner' && (
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <div style={{
              background: scanUsesLeft > 0 ? 'rgba(34,211,238,0.15)' : 'rgba(220,38,38,0.2)',
              border: `1px solid ${scanUsesLeft > 0 ? 'rgba(34,211,238,0.3)' : 'rgba(220,38,38,0.4)'}`,
              borderRadius: 20, padding: '4px 14px',
              fontSize: 11, fontWeight: 700, fontFamily: 'Inter, sans-serif',
              color: scanUsesLeft > 0 ? '#22d3ee' : '#f87171',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: scanUsesLeft > 0 ? '#22d3ee' : '#ef4444', flexShrink: 0 }} />
              {scanUsesLeft > 0 ? `${scanUsesLeft} / ${freeMax} استخدامات متبقية مجاناً` : 'انتهت الاستخدامات المجانية'}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <button onClick={onGoHome} style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>🏠 الرئيسية</button>
          <button onClick={onLogin} style={{ padding: '5px 12px', borderRadius: 7, border: '1.5px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'white', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>دخول</button>
          <button onClick={onRegister} style={{ padding: '5px 12px', borderRadius: 7, border: 'none', background: 'linear-gradient(135deg,#c8962c,#e8b84b)', color: '#0f2744', fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>تسجيل</button>
        </div>
      </header>
      <div>
        {module === 'admin-procedures' && <AdminProcedures />}
        {module === 'cin-scanner' && (
          <CINScanner
            onSave={() => {}}
            onUploadAttempt={onScanUpload}
            onRequestLogin={onLogin}
            onRequestRegister={onRegister}
            scanUsesLeft={scanUsesLeft}
            isPublic={true}
          />
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   MAIN APP
════════════════════════════════════════════ */
export function App() {
  const [route, setRoute]               = useState<AppRoute>(getInitialRoute);
  const [adminSession, setAdminSession] = useState<ActiveSession | null>(() => authService.getAdminSession());
  const [userSession,  setUserSession]  = useState<ActiveSession | null>(() => authService.getUserSession());
  const [activeModule, setActiveModule] = useState<Module>('dashboard');
  const [history, setHistory]           = useState<DocRecord[]>(() => getHistory());
  const [pendingCount, setPendingCount] = useState(0);
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [scanUsesLeft, setScanUsesLeft] = useState(() => isScannerFreeNow().usesLeft);
  const [loginDefaultTab, setLoginDefaultTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [publicModule, setPublicModule] = useState<PublicModule | null>(null);
  const [activeSvcPage, setActiveSvcPage] = useState<ServiceKey>(() => getServiceFromHash());

  /* ── GLOBAL SETTINGS STATE (single source of truth) ── */
  const [serviceConfigs, setServiceConfigs] = useState<ServiceConfig[]>(() => loadServices());
  const [siteAds, setSiteAds]               = useState<AdItem[]>(() => loadAds());
  const [siteData, setSiteData]             = useState<SiteSettings>(() => loadSite());

  /* ── Listen for settings changes from GeneralSettings ── */
  /* App.tsx stays mounted always → this listener is always active ── */
  useEffect(() => {
    const unsub = onSettingsChange((type) => {
      if (type === 'services') {
        setServiceConfigs(loadServices());
        // Refresh scan uses left based on new admin config
        setScanUsesLeft(isScannerFreeNow().usesLeft);
      }
      if (type === 'ads')  setSiteAds(loadAds());
      if (type === 'site') setSiteData(loadSite());
    });
    return unsub;
  }, []);

  const session = route === 'admin' ? adminSession : userSession;

  /* Apply SEO on mount */
  useEffect(() => { applySEO(SEO_PAGES.home); }, []);

  /* Auto-refresh session */
  useEffect(() => {
    if (!session) return;
    const iv = setInterval(() => {
      authService.refreshSession(session);
      const cur = route === 'admin' ? authService.getAdminSession() : authService.getUserSession();
      if (!cur) {
        if (route === 'admin') setAdminSession(null); else setUserSession(null);
        return;
      }
      if (cur.role === 'admin' || cur.role === 'superadmin') {
        setPendingCount(authService.getPendingRegistrations().length);
      }
    }, 60_000);
    if (session.role === 'admin' || session.role === 'superadmin') {
      setPendingCount(authService.getPendingRegistrations().length);
    }
    return () => clearInterval(iv);
  }, [session, route]);

  useEffect(() => {
    if (!session) return;
    if (session.role !== 'admin' && session.role !== 'superadmin') return;
    const t = setInterval(() => setPendingCount(authService.getPendingRegistrations().length), 10_000);
    return () => clearInterval(t);
  }, [session]);

  useEffect(() => {
    function onResize() { if (window.innerWidth > 768) setSidebarOpen(false); }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => { recordVisit(); }, []);

  /* ── Auto-redirect authenticated users ── */
  useEffect(() => {
    if (userSession && (route === 'user-login' || route === 'home')) {
      setRoute('user');
    }
  }, [userSession, route]);

  useEffect(() => {
    if (adminSession && route === 'admin-login') {
      setRoute('admin');
    }
  }, [adminSession, route]);

  const refreshHistory = useCallback(() => setHistory(getHistory()), []);
  const navigate = useCallback((m: Module) => { setActiveModule(m); setSidebarOpen(false); setPublicModule(null); }, []);

  function handleAdminLogin(s: ActiveSession) {
    setAdminSession(s); setRoute('admin');
    setPublicModule(null);
    setPendingCount(authService.getPendingRegistrations().length);
  }
  function handleUserLogin(s: ActiveSession) {
    setUserSession(s); setRoute('user');
    setPublicModule(null);
  }
  function handleLogout() {
    authService.logout(session);
    if (route === 'admin') setAdminSession(null); else setUserSession(null);
    setActiveModule('dashboard');
    setRoute('home');
  }

  function handlePublicProcedures() {
    setPublicModule('admin-procedures');
    setRoute('home');
  }

  function handlePublicScan() {
    const { allowed, requiresLogin } = isScannerFreeNow();
    // If admin disabled free access → redirect to login immediately
    if (requiresLogin || !allowed) {
      setPublicModule(null);
      setLoginDefaultTab('register');
      setRoute('user-login');
      return;
    }
    setPublicModule('cin-scanner');
    setRoute('home');
  }

  function handleScanUploadAttempt(): boolean {
    const { allowed } = isScannerFreeNow();
    if (!allowed) return false;
    incrementScanCount();
    // Re-read from siteSettings (uses admin-configured freeUses)
    setScanUsesLeft(isScannerFreeNow().usesLeft);
    return true;
  }

  function goToLogin() {
    setPublicModule(null);
    setLoginDefaultTab('login');
    setRoute('user-login');
  }
  function goToRegister() {
    setPublicModule(null);
    setLoginDefaultTab('register');
    setRoute('user-login');
  }
  function goToHome() {
    setPublicModule(null);
    setRoute('home');
    window.location.hash = '#/';
    applySEO(SEO_PAGES.home);
  }

  function goToServicePage(key: ServiceKey) {
    setActiveSvcPage(key);
    setPublicModule(null);
    setRoute('service-page');
    window.location.hash = `#/${key}`;
    applySEO(SEO_PAGES[key]);
  }

  function launchServiceTool(key: ServiceKey) {
    // Check if service is enabled at all
    const cfg = serviceConfigs.find(s => s.key === key);
    if (cfg && !cfg.enabled) return; // service disabled by admin — do nothing

    if (key === 'procedures') {
      // Check if procedures requires login
      if (cfg && !cfg.freeAccess) { goToRegister(); return; }
      handlePublicProcedures(); return;
    }
    if (key === 'scanner') { handlePublicScan(); return; }
    goToRegister();
  }

  /* ── ROUTING ── */

  if ((route === 'admin-login' || route === 'admin') && !adminSession)
    return <AdminLogin onLogin={handleAdminLogin} onGoToUser={() => setRoute('home')} onGoHome={goToHome} />;

  if (route === 'user-login' && !userSession)
    return <UserPortalLogin
      onLogin={handleUserLogin}
      onGoToAdmin={() => setRoute('admin-login')}
      onGoHome={goToHome}
      defaultTab={loginDefaultTab}
    />;

  if (route === 'admin' && adminSession) {
    return <AuthenticatedApp
      session={adminSession} route="admin"
      activeModule={activeModule} navigate={navigate}
      history={history} refreshHistory={refreshHistory}
      pendingCount={pendingCount} sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen} onLogout={handleLogout}
      onSwitchToUser={() => setRoute('user')}
      onGoHome={goToHome}
      siteData={siteData}
    />;
  }

  if (route === 'user' && userSession) {
    return <AuthenticatedApp
      session={userSession} route="user"
      activeModule={activeModule} navigate={navigate}
      history={history} refreshHistory={refreshHistory}
      pendingCount={pendingCount} sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen} onLogout={handleLogout}
      onSwitchToUser={() => {}}
      onGoHome={goToHome}
      siteData={siteData}
    />;
  }

  if (publicModule) {
    const scanCfg = isScannerFreeNow();
    return <PublicWrapper
      module={publicModule}
      onLogin={goToLogin}
      onRegister={goToRegister}
      scanUsesLeft={scanUsesLeft}
      freeMax={scanCfg.freeUses}
      onScanUpload={handleScanUploadAttempt}
      onGoHome={goToHome}
    />;
  }

  if (route === 'service-page') {
    return (
      <ServicePage
        service={activeSvcPage}
        onLogin={goToLogin}
        onRegister={goToRegister}
        onGoHome={goToHome}
        onLaunch={() => launchServiceTool(activeSvcPage)}
        scanUsesLeft={scanUsesLeft}
      />
    );
  }

  // Homepage (default) — receives live settings from App state
  return <HomePage
    onLogin={goToLogin}
    onRegister={goToRegister}
    onProcedures={handlePublicProcedures}
    onScanStudio={handlePublicScan}
    scanUsesLeft={scanUsesLeft}
    onServicePage={goToServicePage}
    serviceConfigs={serviceConfigs}
    ads={siteAds}
    site={siteData}
  />;
}

/* ════════════════════════════════════════════
   AUTHENTICATED APP SHELL
════════════════════════════════════════════ */
interface AuthAppProps {
  session: ActiveSession;
  route: 'admin' | 'user';
  activeModule: Module;
  navigate: (m: Module) => void;
  history: DocRecord[];
  refreshHistory: () => void;
  pendingCount: number;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean | ((v: boolean) => boolean)) => void;
  onLogout: () => void;
  onSwitchToUser: () => void;
  onGoHome?: () => void;
  siteData: SiteSettings;
}

function AuthenticatedApp({
  session, route, activeModule, navigate, history, refreshHistory,
  pendingCount, sidebarOpen, setSidebarOpen, onLogout, onSwitchToUser, onGoHome,
}: AuthAppProps) {
  const isAdmin = session.role === 'admin' || session.role === 'superadmin';

  return (
    <div dir="rtl" className="app-shell" style={{ fontFamily: 'var(--font-arabic)' }}>
      <Sidebar
        active={activeModule} onNavigate={navigate}
        session={session} pendingCount={pendingCount}
        open={sidebarOpen} onClose={() => setSidebarOpen(false)}
      />
      <main className="app-main">
        {/* TOP BAR */}
        <header style={{
          background: 'white', borderBottom: '1px solid var(--border)',
          padding: '0 16px', height: 'var(--topbar-h)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 100,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="hamburger-btn no-print" onClick={() => setSidebarOpen(v => !v)} aria-label="القائمة">
              <span />
            </button>
            <ModuleBreadcrumb module={activeModule} />
          </div>

          <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={onGoHome}
              title="الصفحة الرئيسية"
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 8,
                background: 'rgba(200,150,44,0.08)',
                border: '1px solid rgba(200,150,44,0.2)',
                color: '#c8962c', fontSize: 11, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background='rgba(200,150,44,0.18)'; b.style.borderColor='rgba(200,150,44,0.4)'; }}
              onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background='rgba(200,150,44,0.08)'; b.style.borderColor='rgba(200,150,44,0.2)'; }}
            >
              <span style={{ fontSize: 14 }}>🏠</span>
              <span className="topbar-title">الرئيسية</span>
            </button>

            <SessionTimer session={session} onExpire={onLogout} />

            <div className="topbar-status" style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px',
              borderRadius: 20, fontSize: 9, fontWeight: 700, fontFamily: 'Inter,monospace', letterSpacing: 0.5,
              background: route === 'admin' ? '#fee2e2' : '#dbeafe',
              color: route === 'admin' ? '#dc2626' : '#1e40af',
              border: `1px solid ${route === 'admin' ? '#fca5a5' : '#93c5fd'}`,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: route === 'admin' ? '#dc2626' : '#3b82f6', display: 'inline-block' }} />
              {route === 'admin' ? 'ADMIN' : 'USER'}
            </div>

            <div className="topbar-docs" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7, padding: '3px 9px', fontSize: 10, color: '#475569', fontFamily: 'Inter,sans-serif' }}>
              📋 {history.length}
            </div>

            {isAdmin && (
              <button onClick={() => navigate('registration-manager')} title="طلبات التسجيل"
                style={{ position: 'relative', padding: '5px 8px', background: pendingCount > 0 ? '#fef3c7' : '#f8fafc', border: `1px solid ${pendingCount > 0 ? '#f59e0b40' : '#e2e8f0'}`, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 15 }}>🔔</span>
                {pendingCount > 0 && (
                  <span style={{ position: 'absolute', top: -4, left: -4, background: '#dc2626', color: 'white', fontSize: 9, fontWeight: 900, width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>
                    {pendingCount}
                  </span>
                )}
              </button>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 9, padding: '4px 10px' }}>
              <span style={{ fontSize: 14 }}>{session.avatar}</span>
              <div className="topbar-title">
                <div style={{ fontSize: 11, fontWeight: 700, color: '#0f2744', lineHeight: 1.2 }}>{session.name}</div>
                <div style={{ fontSize: 9, color: '#94a3b8', fontFamily: 'Inter,sans-serif' }}>{session.role}</div>
              </div>
              {isAdmin && (
                <button onClick={() => navigate('user-management')} title="إدارة المستخدمين"
                  style={{ padding: '3px 7px', background: '#dbeafe', color: '#1e40af', border: 'none', borderRadius: 5, fontSize: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
                  👥
                </button>
              )}
              <button onClick={onLogout}
                style={{ padding: '3px 8px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 5, fontSize: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
                خروج
              </button>
            </div>

            {isAdmin && (
              <button onClick={onSwitchToUser} className="topbar-status"
                style={{ padding: '4px 10px', background: route === 'admin' ? '#dbeafe' : '#fee2e2', border: 'none', borderRadius: 7, fontSize: 9, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter,sans-serif', color: route === 'admin' ? '#1e40af' : '#dc2626', display: 'flex' }}>
                ← مستخدمون
              </button>
            )}
          </div>
        </header>

        {/* PAGE CONTENT */}
        <div style={{ flex: 1 }}>
          {activeModule === 'dashboard'            && <Dashboard onNavigate={navigate} history={history} session={session} pendingCount={pendingCount} />}
          {activeModule === 'public-writer'        && <PublicWriter onSave={refreshHistory} />}
          {activeModule === 'cv-generator'         && <CVGenerator onSave={refreshHistory} />}
          {activeModule === 'cin-scanner'          && <CINScanner onSave={refreshHistory} />}
          {activeModule === 'french-letters'       && <FrenchLetters onSave={refreshHistory} />}
          {activeModule === 'admin-procedures'     && <AdminProcedures />}
          {activeModule === 'invoice-generator'    && <InvoiceGenerator />}
          {activeModule === 'user-management'      && isAdmin && <UserManagement session={session} />}
          {activeModule === 'registration-manager' && isAdmin && <RegistrationManager session={session} />}
          {activeModule === 'general-settings'     && isAdmin && <GeneralSettings />}
        </div>

        {activeModule !== 'dashboard' &&
          activeModule !== 'user-management' &&
          activeModule !== 'registration-manager' &&
          activeModule !== 'homepage-control' &&
          activeModule !== 'general-settings' &&
          activeModule !== 'invoice-generator' && (
          <HistoryPanel history={history} onRefresh={refreshHistory} activeModule={activeModule} />
        )}

        <footer className="no-print" style={{ background: 'white', borderTop: '1px solid var(--border)', padding: '7px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
          <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'Inter,sans-serif' }}>مكتب الخدمات الإدارية — v4.0.0</div>
          <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'Inter,sans-serif' }}>🇲🇦 Bureau de Services — Usage Interne</div>
        </footer>
      </main>

      {/* MOBILE BOTTOM NAV */}
      <nav className="mobile-bottom-nav no-print" dir="rtl">
        {BOTTOM_NAV.map(item => (
          <button key={item.id} className={activeModule === item.id ? 'active' : ''} onClick={() => navigate(item.id)}>
            <span className="bnav-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
        <button onClick={() => setSidebarOpen(true)}>
          <span className="bnav-icon">☰</span>
          المزيد
        </button>
      </nav>
    </div>
  );
}

/* Session countdown */
function SessionTimer({ session, onExpire }: { session: ActiveSession; onExpire: () => void }) {
  const [remaining, setRemaining] = useState('');
  useEffect(() => {
    function calc() {
      const diff = new Date(session.expiresAt).getTime() - Date.now();
      if (diff <= 0) { onExpire(); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${m}:${String(s).padStart(2, '0')}`);
    }
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [session.expiresAt, onExpire]);

  const diff = new Date(session.expiresAt).getTime() - Date.now();
  const urgent = diff < 5 * 60 * 1000;
  return (
    <div title="وقت انتهاء الجلسة" style={{
      fontSize: 9, fontFamily: 'Inter,monospace', fontWeight: 700,
      color: urgent ? '#dc2626' : '#94a3b8',
      background: urgent ? '#fee2e2' : 'transparent',
      padding: urgent ? '2px 6px' : '0', borderRadius: 5,
    }}>⏱ {remaining}</div>
  );
}

/* Breadcrumb */
function ModuleBreadcrumb({ module }: { module: Module }) {
  const map: Record<Module, { ar: string; fr: string; icon: string }> = {
    'dashboard':            { ar: 'لوحة التحكم',         fr: 'Tableau de Bord',            icon: '🏠' },
    'public-writer':        { ar: 'الكاتب العمومي',       fr: 'Rédacteur Public',           icon: '✍️' },
    'cv-generator':         { ar: 'مولّد السيرة الذاتية', fr: 'Générateur de CV',           icon: '📄' },
    'cin-scanner':          { ar: 'Scan Studio',          fr: 'Scanner CIN',                icon: '🪪' },
    'french-letters':       { ar: 'الرسائل الفرنسية',     fr: 'Lettres Françaises',         icon: '📝' },
    'admin-procedures':     { ar: 'المساطر الإدارية',     fr: 'Procédures Administratives', icon: '🏛️' },
    'user-management':      { ar: 'إدارة المستخدمين',     fr: 'Gestion Utilisateurs',       icon: '👥' },
    'registration-manager': { ar: 'طلبات التسجيل',        fr: "Demandes d'inscription",     icon: '📬' },
    'invoice-generator':    { ar: 'الفواتير والحسابات',   fr: 'Factures & Devis',           icon: '🧾' },
    'homepage-control':     { ar: 'الصفحة الرئيسية',      fr: 'Contrôle Homepage',          icon: '🏠' },
    'general-settings':     { ar: 'الإعدادات العامة',      fr: 'Paramètres Généraux',        icon: '⚙️' },
  };
  const info = map[module];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 10, color: '#94a3b8' }} className="topbar-title">مكتب الخدمات</span>
      <span style={{ color: '#cbd5e1', fontSize: 11 }} className="topbar-title">›</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ fontSize: 16 }}>{info.icon}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#0f2744' }}>{info.ar}</span>
        <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'Inter,sans-serif' }} className="topbar-title">— {info.fr}</span>
      </div>
    </div>
  );
}
