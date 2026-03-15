import { Module } from '../types';
import { ActiveSession } from '../utils/authService';
import { NAV_ITEMS, roleHas, canAccessGeneralSettings, isAdminRole, type AppRole, type Permission } from '../utils/permissions';

interface SidebarProps {
  active: Module;
  onNavigate: (m: Module) => void;
  session: ActiveSession;
  pendingCount?: number;
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ active, onNavigate, session, pendingCount = 0, open, onClose }: SidebarProps) {
  const role = session.role as AppRole;
  const _isAdmin       = isAdminRole(role);
  const isSuperAdmin   = role === 'superadmin';

  /** Check if current user can see a nav item */
  function canSee(item: typeof NAV_ITEMS[0]): boolean {
    if (!item.requiredPermission) return true;
    // Check user-level permissions first (if set by admin per user)
    if (session.permissions && session.permissions.length > 0) {
      // For admin-section items, always use role-level check
      if (item.section === 'admin' || item.section === 'superadmin') {
        return roleHas(role, item.requiredPermission as Permission);
      }
      // For modules, check user-level permissions
      const permMap: Record<string, string> = {
        'public-writer':     'كاتب عمومي',
        'cv-generator':      'سيرة ذاتية',
        'cin-scanner':       'Scan Studio',
        'french-letters':    'رسائل فرنسية',
        'admin-procedures':  'مساطر إدارية',
        'invoice-generator': 'فواتير',
      };
      const label = permMap[item.id];
      if (label) return (session.permissions as string[]).includes(label);
    }
    return roleHas(role, item.requiredPermission as Permission);
  }

  const moduleItems    = NAV_ITEMS.filter(i => i.section === 'modules' && canSee(i));
  const adminItems     = NAV_ITEMS.filter(i => i.section === 'admin'   && canSee(i));
  const showAdminSec   = _isAdmin  && adminItems.length > 0;
  const showSuperSec   = isSuperAdmin && canAccessGeneralSettings(role);

  function handleNav(id: string) {
    onNavigate(id as Module);
    onClose();
  }

  return (
    <>
      {/* Mobile overlay */}
      <div className={`sidebar-overlay ${open ? 'open' : ''}`} onClick={onClose} />

      <aside className={`app-sidebar ${open ? 'open' : ''}`}>
        {/* ── Logo ── */}
        <div style={{ padding:'22px 16px 16px', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
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
            <span style={{ fontSize:18 }}>{getRoleIcon(role)}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ color:'white', fontSize:11, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{session.name}</div>
              <div style={{ color:'#64748b', fontSize:9, fontFamily:'Inter,sans-serif' }}>{getRoleLabel(role)}</div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3 }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:'#10b981' }} />
              <RoleBadge role={role} />
            </div>
          </div>
        </div>

        {/* ── Navigation ── */}
        <nav style={{ padding:'12px 10px', flex:1, overflowY:'auto' }}>

          {/* MODULES section */}
          <SectionLabel>الوحدات — MODULES</SectionLabel>
          {moduleItems.map(item => (
            <NavBtn key={item.id} item={item} active={active === item.id} onClick={() => handleNav(item.id)} />
          ))}

          {/* ADMIN section — admin + superadmin */}
          {showAdminSec && (
            <>
              <div style={{ marginTop:14, marginBottom:8, borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:12 }}>
                <SectionLabel gold>الإدارة — ADMINISTRATION</SectionLabel>
              </div>
              {adminItems.map(item => {
                const showBadge = item.badge && pendingCount > 0;
                return (
                  <NavBtn
                    key={item.id}
                    item={item}
                    active={active === item.id}
                    onClick={() => handleNav(item.id)}
                    badge={showBadge ? pendingCount : undefined}
                  />
                );
              })}
            </>
          )}

          {/* SUPERADMIN ONLY section */}
          {showSuperSec && (
            <>
              <div style={{ marginTop:10 }}>
                <button
                  onClick={() => handleNav('general-settings')}
                  style={{
                    width:'100%', marginTop:4, padding:'11px 12px', borderRadius:10, cursor:'pointer',
                    background: active === 'general-settings'
                      ? 'linear-gradient(135deg,#c8962c,#e8b84b)'
                      : 'linear-gradient(135deg,rgba(200,150,44,0.15),rgba(200,150,44,0.08))',
                    display:'flex', alignItems:'center', gap:10, fontFamily:'inherit',
                    border: active === 'general-settings'
                      ? '1.5px solid rgba(200,150,44,0.6)'
                      : '1.5px solid rgba(200,150,44,0.25)',
                    transition:'all .2s',
                  }}
                >
                  <span style={{ fontSize:20 }}>⚙️</span>
                  <div style={{ flex:1, textAlign:'right' }}>
                    <div style={{ fontSize:12, fontWeight:800, color: active === 'general-settings' ? '#fff' : '#c8962c' }}>
                      الإعدادات العامة
                    </div>
                    <div style={{ fontSize:9, color: active === 'general-settings' ? 'rgba(255,255,255,0.75)' : '#94a3b8', fontFamily:'Inter,sans-serif' }}>
                      Paramètres Généraux — Superadmin
                    </div>
                  </div>
                  <span style={{ fontSize:10, color: active === 'general-settings' ? 'rgba(255,255,255,0.8)' : '#c8962c' }}>👑</span>
                </button>
              </div>
            </>
          )}
        </nav>

        {/* Footer */}
        <div style={{ padding:'12px 18px 16px', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ color:'#334155', fontSize:10, textAlign:'center', fontFamily:'Inter,sans-serif' }}>
            v3.0.0 — Usage Interne Uniquement
          </div>
        </div>
      </aside>
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionLabel({ children, gold }: { children: React.ReactNode; gold?: boolean }) {
  return (
    <div style={{
      color: gold ? '#c8962c' : '#475569',
      fontSize:9, fontWeight:800, padding:'0 8px 8px', letterSpacing:'0.09em',
    }}>
      {children}
    </div>
  );
}

function NavBtn({
  item, active, onClick, badge,
}: {
  item: typeof NAV_ITEMS[0];
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`nav-item ${active ? 'active' : ''}`}
      style={{ width:'100%', textAlign:'right', marginBottom:2, border:'none', fontFamily:'inherit', justifyContent:'flex-start', position:'relative' }}
    >
      <span style={{ fontSize:17, flexShrink:0, position:'relative' }}>
        {item.icon}
        {badge !== undefined && badge > 0 && (
          <span style={{
            position:'absolute', top:-4, right:-4, background:'#dc2626',
            color:'white', fontSize:8, fontWeight:900, width:14, height:14,
            borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
            border:'1.5px solid #1a3a5c',
          }}>
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </span>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:5 }}>
          {item.labelAr}
          {badge !== undefined && badge > 0 && (
            <span style={{ background:'#dc2626', color:'white', fontSize:9, fontWeight:900, padding:'0 5px', borderRadius:8 }}>
              {badge}
            </span>
          )}
        </div>
        <div style={{ fontSize:9, opacity:0.6, fontFamily:'Inter,sans-serif' }}>{item.labelFr}</div>
      </div>
      {active && <span style={{ width:4, height:26, background:'#c8962c', borderRadius:4, flexShrink:0 }} />}
    </button>
  );
}

function RoleBadge({ role }: { role: AppRole }) {
  const colors: Record<AppRole, string> = {
    superadmin: '#c8962c',
    admin:      '#3b82f6',
    editor:     '#10b981',
    user:       '#64748b',
  };
  const labels: Record<AppRole, string> = {
    superadmin: '👑 SA',
    admin:      '🏛️ ADM',
    editor:     '✍️ ED',
    user:       '👤 USR',
  };
  return (
    <span style={{
      fontSize:8, fontWeight:800, color: colors[role],
      fontFamily:'Inter,sans-serif', letterSpacing:'0.03em',
    }}>
      {labels[role]}
    </span>
  );
}

function getRoleIcon(role: AppRole): string {
  if (role === 'superadmin') return '👑';
  if (role === 'admin')      return '🏛️';
  if (role === 'editor')     return '✍️';
  return '👤';
}
function getRoleLabel(role: AppRole): string {
  if (role === 'superadmin') return 'Super Admin — Accès Total';
  if (role === 'admin')      return 'Administrateur — Gestion';
  if (role === 'editor')     return 'Éditeur';
  return 'Utilisateur';
}
