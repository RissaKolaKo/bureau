import { Module } from '../types';
import { ActiveSession } from '../utils/authService';

interface NavItem {
  id: Module;
  icon: string;
  labelAr: string;
  labelFr: string;
  color: string;
  adminOnly?: boolean;
  badge?: boolean;
}

const navItems: NavItem[] = [
  { id:'dashboard',            icon:'🏠', labelAr:'الرئيسية',          labelFr:'Tableau de Bord',         color:'#94a3b8' },
  { id:'public-writer',        icon:'✍️', labelAr:'كاتب عمومي',         labelFr:'Rédacteur Public',        color:'#60a5fa' },
  { id:'cv-generator',         icon:'📄', labelAr:'مولّد السيرة',        labelFr:'Générateur CV',           color:'#34d399' },
  { id:'cin-scanner',          icon:'🪪', labelAr:'Scan Studio',        labelFr:'Scanner CIN',             color:'#f59e0b' },
  { id:'french-letters',       icon:'📝', labelAr:'رسائل فرنسية',       labelFr:'Lettres Françaises',      color:'#a78bfa' },
  { id:'admin-procedures',     icon:'🏛️', labelAr:'المساطر الإدارية',   labelFr:'Procédures Admin',        color:'#f87171' },
  { id:'invoice-generator',    icon:'🧾', labelAr:'الفواتير والحسابات', labelFr:'Factures & Devis',        color:'#10b981' },
  { id:'user-management',      icon:'👥', labelAr:'إدارة المستخدمين',   labelFr:'Gestion Utilisateurs',    color:'#38bdf8', adminOnly:true },
  { id:'registration-manager', icon:'📬', labelAr:'طلبات التسجيل',      labelFr:"Demandes d'inscription",  color:'#fb923c', adminOnly:true, badge:true },
  { id:'general-settings',     icon:'⚙️', labelAr:'الإعدادات العامة',   labelFr:'Paramètres Généraux',     color:'#c8962c', adminOnly:true },
];

interface SidebarProps {
  active: Module;
  onNavigate: (m: Module) => void;
  session: ActiveSession;
  pendingCount?: number;
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ active, onNavigate, session, pendingCount = 0, open, onClose }: SidebarProps) {
  const isAdmin = session.role === 'admin' || session.role === 'superadmin';
  const visibleItems = navItems.filter(item => !item.adminOnly || isAdmin);

  function handleNav(id: Module) {
    onNavigate(id);
    onClose(); // close drawer on mobile after tap
  }

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${open ? 'open' : ''}`}
        onClick={onClose}
      />

      <aside className={`app-sidebar ${open ? 'open' : ''}`}>
        {/* Logo */}
        <div style={{ padding:'22px 16px 16px', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
          {/* Mobile close button */}
          <button onClick={onClose} style={{
            display:'none', position:'absolute', top:12, left:12,
            background:'rgba(255,255,255,0.1)', border:'none', borderRadius:8,
            color:'white', fontSize:18, width:34, height:34,
            alignItems:'center', justifyContent:'center', cursor:'pointer',
          }} className="mobile-show" aria-label="إغلاق">✕</button>

          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
            <div style={{ width:40, height:40, borderRadius:10, background:'linear-gradient(135deg,#c8962c,#e8b84b)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>⚜️</div>
            <div>
              <div style={{ color:'#fff', fontWeight:800, fontSize:13, lineHeight:1.2 }}>مكتب الخدمات</div>
              <div style={{ color:'#94a3b8', fontSize:10, fontFamily:'Inter,sans-serif' }}>Bureau de Services</div>
            </div>
          </div>

          <div style={{ background:'rgba(200,150,44,0.15)', borderRadius:6, padding:'4px 8px', color:'#e8b84b', fontSize:10, textAlign:'center', fontFamily:'Inter,sans-serif' }}>
            🇲🇦 Système Marocain v3.0
          </div>

          {/* User mini card */}
          <div style={{ marginTop:12, background:'rgba(255,255,255,0.06)', borderRadius:9, padding:'8px 10px', display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:18 }}>{getRoleIcon(session.role)}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ color:'white', fontSize:11, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{session.name}</div>
              <div style={{ color:'#64748b', fontSize:9, fontFamily:'Inter,sans-serif' }}>{getRoleLabel(session.role)}</div>
            </div>
            <div style={{ width:7, height:7, borderRadius:'50%', background:'#10b981', flexShrink:0 }} />
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding:'12px 10px', flex:1, overflowY:'auto' }}>
          {/* Regular modules */}
          <div style={{ color:'#475569', fontSize:9, fontWeight:700, padding:'0 8px 8px', letterSpacing:'0.08em' }}>
            الوحدات — MODULES
          </div>
          {visibleItems.filter(i => !i.adminOnly).map(item => {
            const isActive = active === item.id;
            return (
              <button key={item.id} onClick={() => handleNav(item.id)}
                className={`nav-item ${isActive ? 'active' : ''}`}
                style={{ width:'100%', textAlign:'right', marginBottom:2, border:'none', fontFamily:'inherit', justifyContent:'flex-start', position:'relative' }}>
                <span style={{ fontSize:17, flexShrink:0 }}>{item.icon}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600 }}>{item.labelAr}</div>
                  <div style={{ fontSize:9, opacity:0.6, fontFamily:'Inter,sans-serif' }}>{item.labelFr}</div>
                </div>
                {isActive && <span style={{ width:4, height:26, background:'#c8962c', borderRadius:4, flexShrink:0 }} />}
              </button>
            );
          })}

          {/* Admin section */}
          {isAdmin && (
            <>
              <div style={{ color:'#c8962c', fontSize:9, fontWeight:800, padding:'14px 8px 8px', letterSpacing:'0.08em', borderTop:'1px solid rgba(255,255,255,0.06)', marginTop:8 }}>
                ⚙️ الإدارة — ADMIN
              </div>
              {visibleItems.filter(i => i.adminOnly && i.id !== 'general-settings').map(item => {
                const showBadge = item.badge && pendingCount > 0;
                const isActive = active === item.id;
                return (
                  <button key={item.id} onClick={() => handleNav(item.id)}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    style={{ width:'100%', textAlign:'right', marginBottom:2, border:'none', fontFamily:'inherit', justifyContent:'flex-start', position:'relative' }}>
                    <span style={{ fontSize:17, flexShrink:0, position:'relative' }}>
                      {item.icon}
                      {showBadge && (
                        <span style={{ position:'absolute', top:-4, right:-4, background:'#dc2626', color:'white', fontSize:8, fontWeight:900, width:14, height:14, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', border:'1.5px solid #1a3a5c' }}>
                          {pendingCount > 9 ? '9+' : pendingCount}
                        </span>
                      )}
                    </span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:5 }}>
                        {item.labelAr}
                        {showBadge && <span style={{ background:'#dc2626', color:'white', fontSize:9, fontWeight:900, padding:'0 5px', borderRadius:8 }}>{pendingCount}</span>}
                      </div>
                      <div style={{ fontSize:9, opacity:0.6, fontFamily:'Inter,sans-serif' }}>{item.labelFr}</div>
                    </div>
                    {isActive && <span style={{ width:4, height:26, background:'#c8962c', borderRadius:4, flexShrink:0 }} />}
                  </button>
                );
              })}

              {/* General Settings — special gold button */}
              <button onClick={() => handleNav('general-settings')}
                style={{
                  width:'100%', marginTop:10, padding:'11px 12px', borderRadius:10, cursor:'pointer',
                  background: active === 'general-settings'
                    ? 'linear-gradient(135deg,#c8962c,#e8b84b)'
                    : 'linear-gradient(135deg,rgba(200,150,44,0.15),rgba(200,150,44,0.08))',
                  display:'flex', alignItems:'center', gap:10, fontFamily:'inherit',
                  border: active === 'general-settings' ? '1px solid transparent' : '1px solid rgba(200,150,44,0.3)',
                  transition:'all .2s',
                }}>
                <span style={{ fontSize:20 }}>⚙️</span>
                <div style={{ flex:1, textAlign:'right' }}>
                  <div style={{ fontSize:12, fontWeight:800, color: active === 'general-settings' ? '#fff' : '#c8962c' }}>الإعدادات العامة</div>
                  <div style={{ fontSize:9, color: active === 'general-settings' ? 'rgba(255,255,255,0.75)' : '#94a3b8', fontFamily:'Inter,sans-serif' }}>Paramètres Généraux</div>
                </div>
              </button>
            </>
          )}
        </nav>

        {/* Footer */}
        <div style={{ padding:'12px 18px 0', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ color:'#334155', fontSize:10, textAlign:'center', fontFamily:'Inter,sans-serif' }}>
            v3.0.0 — Usage Interne
          </div>
        </div>
      </aside>
    </>
  );
}

function getRoleIcon(role: string): string {
  if (role === 'superadmin') return '👑';
  if (role === 'admin') return '🏛️';
  if (role === 'editor') return '✍️';
  return '👁️';
}
function getRoleLabel(role: string): string {
  if (role === 'superadmin') return 'Super Admin';
  if (role === 'admin') return 'Administrateur';
  if (role === 'editor') return 'Éditeur';
  return 'Lecteur';
}
