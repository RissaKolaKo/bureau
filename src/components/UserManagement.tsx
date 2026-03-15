import { useState, useEffect, useCallback } from 'react';
import {
  authService as userDB,
  AppUser, UserRole, UserStatus, Permission,
  AuditLog, ActiveSession,
  defaultPermissions,
} from '../utils/authService';

/* ══════════════════════════════════════════════════════════
   CONSTANTS — superadmin NEVER shown in role dropdown or list
   ══════════════════════════════════════════════════════════ */

// Roles available in the dropdown — superadmin excluded forever
const MANAGEABLE_ROLES: UserRole[] = ['admin', 'editor', 'viewer'];

const ROLE_LABELS: Record<UserRole, { ar: string; fr: string; color: string; bg: string; icon: string }> = {
  superadmin: { ar: 'مدير عام',  fr: 'Super Admin',      color: '#92400e', bg: '#fef3c7', icon: '👑' },
  admin:      { ar: 'مدير',      fr: 'Administrateur',    color: '#1e40af', bg: '#dbeafe', icon: '🏛️' },
  editor:     { ar: 'كاتب',      fr: 'Éditeur',           color: '#065f46', bg: '#d1fae5', icon: '✍️' },
  viewer:     { ar: 'مشاهد',     fr: 'Lecteur',           color: '#374151', bg: '#f3f4f6', icon: '👁️' },
};

const STATUS_LABELS: Record<UserStatus, { ar: string; color: string; bg: string; dot: string }> = {
  active:    { ar: 'نشط',   color: '#065f46', bg: '#d1fae5', dot: '#10b981' },
  suspended: { ar: 'معطّل', color: '#92400e', bg: '#fef3c7', dot: '#f59e0b' },
  pending:   { ar: 'معلّق', color: '#1e40af', bg: '#dbeafe', dot: '#3b82f6' },
  banned:    { ar: 'محظور', color: '#7c3aed', bg: '#ede9fe', dot: '#8b5cf6' },
};

const ALL_PERMISSIONS: { key: Permission; ar: string; fr: string; icon: string }[] = [
  { key: 'public-writer',    ar: 'الكاتب العمومي',       fr: 'Rédacteur Public',    icon: '✍️' },
  { key: 'cv-generator',     ar: 'مولّد السيرة الذاتية', fr: 'Générateur CV',        icon: '📄' },
  { key: 'cin-scanner',      ar: 'Scan Studio',           fr: 'Scanner CIN',          icon: '🪪' },
  { key: 'french-letters',   ar: 'الرسائل الفرنسية',     fr: 'Lettres Françaises',   icon: '📝' },
  { key: 'admin-procedures', ar: 'المساطر الإدارية',     fr: 'Procédures Admin',     icon: '🏛️' },
  { key: 'user-management',  ar: 'إدارة المستخدمين',     fr: 'Gestion Utilisateurs', icon: '👥' },
  { key: 'view-history',     ar: 'عرض السجل',             fr: 'Voir Historique',      icon: '📋' },
  { key: 'export-pdf',       ar: 'تصدير PDF',             fr: 'Export PDF',           icon: '📑' },
  { key: 'export-docx',      ar: 'تصدير Word',            fr: 'Export Word',          icon: '📃' },
  { key: 'template-editor',  ar: 'محرر النماذج',          fr: 'Éditeur Templates',    icon: '🗂️' },
  { key: 'system-settings',  ar: 'إعدادات النظام',        fr: 'Paramètres Système',   icon: '⚙️' },
];

const AVATARS = ['👤','🏛️','✍️','👁️','🧑‍💼','👩‍💼','🧑‍🔧','👩‍🔧','🧑‍⚕️','👩‍⚕️','🧑‍🏫','👩‍🏫','🧑‍💻','👩‍💻','🧑‍🎨','👮','🕵️','🎓','🌟','⭐'];

/* ══════════════════════════════════════════════════════
   PERMISSION HELPERS — strict role hierarchy
   ══════════════════════════════════════════════════════ */
/** Can actor perform full management on target? (superadmin only) */

/** Only superadmin can delete/edit roles/change passwords/manage permissions */
function canManageFully(actor: ActiveSession | null): boolean {
  return actor?.role === 'superadmin';
}

/** Admin can only toggle active⟷suspended for editors/viewers */
function canToggleStatus(actor: ActiveSession | null, target: AppUser): boolean {
  if (!actor) return false;
  if (target.role === 'superadmin') return false;
  if (actor.role === 'superadmin') return true;
  if (actor.role === 'admin' && (target.role === 'editor' || target.role === 'viewer')) return true;
  return false;
}

/* ═══════════════════════════════
   HELPER COMPONENTS
   ═══════════════════════════════ */
function Badge({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 9px', borderRadius:20, background:bg, color, fontSize:11, fontWeight:700, whiteSpace:'nowrap' }}>
      {children}
    </span>
  );
}

function Inp({ label, value, onChange, type='text', placeholder='', required=false, dir='rtl', disabled=false }: {
  label:string; value:string; onChange:(v:string)=>void; type?:string;
  placeholder?:string; required?:boolean; dir?:string; disabled?:boolean;
}) {
  return (
    <div>
      <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#374151', marginBottom:4 }}>
        {label} {required && <span style={{ color:'#dc2626' }}>*</span>}
      </label>
      <input
        type={type} value={value} dir={dir} disabled={disabled}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width:'100%', padding:'8px 10px', border:'1.5px solid #d1d5db', borderRadius:8,
          fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box',
          background: disabled ? '#f1f5f9' : 'white', color: disabled ? '#94a3b8' : '#0f1f35',
          cursor: disabled ? 'not-allowed' : 'text',
        }}
        onFocus={e => { if (!disabled) e.target.style.borderColor='#0f2744'; }}
        onBlur={e => { e.target.style.borderColor='#d1d5db'; }}
      />
    </div>
  );
}

function Sel({ label, value, onChange, options, disabled=false }: {
  label:string; value:string; onChange:(v:string)=>void;
  options: { value:string; label:string }[]; disabled?: boolean;
}) {
  return (
    <div>
      <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#374151', marginBottom:4 }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
        style={{ width:'100%', padding:'8px 10px', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:13, fontFamily:'inherit', outline:'none', background: disabled ? '#f1f5f9' : 'white', cursor: disabled ? 'not-allowed' : 'pointer' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function SectionTitle({ title, subtitle, icon }: { title:string; subtitle?:string; icon:string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
      <div style={{ width:34, height:34, borderRadius:8, background:'linear-gradient(135deg,#0f2744,#1e3a5f)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{icon}</div>
      <div>
        <div style={{ fontSize:14, fontWeight:800, color:'#0f1f35' }}>{title}</div>
        {subtitle && <div style={{ fontSize:11, color:'#94a3b8' }}>{subtitle}</div>}
      </div>
    </div>
  );
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(4px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      {children}
    </div>
  );
}

function Btn({ children, onClick, color='#0f2744', disabled=false, size='sm' }: {
  children: React.ReactNode; onClick?: () => void; color?: string; disabled?: boolean; size?: 'sm'|'md';
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: size === 'md' ? '8px 18px' : '5px 10px',
      borderRadius:7, border:'none', background: disabled ? '#e2e8f0' : color,
      color: disabled ? '#94a3b8' : 'white',
      fontSize: size === 'md' ? 13 : 11, fontWeight:700, cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily:'inherit', display:'flex', alignItems:'center', gap:4, transition:'opacity 0.15s',
    }}>
      {children}
    </button>
  );
}

/* ═══════════════════════════════
   STATS BAR
   ═══════════════════════════════ */
function StatsBar() {
  const users = userDB.getUsers().filter(u => u.role !== 'superadmin');
  const items = [
    { label:'إجمالي الأعضاء', value: users.length, icon:'👥', color:'#1e40af', bg:'#dbeafe' },
    { label:'نشطون', value: users.filter(u=>u.status==='active').length, icon:'✅', color:'#065f46', bg:'#d1fae5' },
    { label:'معطّلون', value: users.filter(u=>u.status==='suspended').length, icon:'⛔', color:'#92400e', bg:'#fef3c7' },
    { label:'في الانتظار', value: users.filter(u=>u.status==='pending').length, icon:'⏳', color:'#374151', bg:'#f3f4f6' },
    { label:'مديرون', value: users.filter(u=>u.role==='admin').length, icon:'🏛️', color:'#1e40af', bg:'#ede9fe' },
  ];
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:24 }}>
      {items.map(item => (
        <div key={item.label} style={{ background:item.bg, borderRadius:12, padding:'14px 16px', border:`1px solid ${item.color}22` }}>
          <div style={{ fontSize:20, marginBottom:4 }}>{item.icon}</div>
          <div style={{ fontSize:22, fontWeight:900, color:item.color }}>{item.value}</div>
          <div style={{ fontSize:10, color:item.color, opacity:0.8, fontWeight:600 }}>{item.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════
   USER CARD
   ═══════════════════════════════ */
function UserCard({ user, currentSession, onEdit, onDelete, onToggle, onResetPwd, onPermissions }: {
  user:AppUser; currentSession:ActiveSession|null;
  onEdit:(u:AppUser)=>void; onDelete:(u:AppUser)=>void;
  onToggle:(u:AppUser)=>void; onResetPwd:(u:AppUser)=>void;
  onPermissions:(u:AppUser)=>void;
}) {
  const role   = ROLE_LABELS[user.role];
  const status = STATUS_LABELS[user.status];
  const isMe   = currentSession?.userId === user.id;
  const isSA   = currentSession?.role === 'superadmin';

  // What current user can do to this card's user
  const canToggle = canToggleStatus(currentSession, user) && !isMe;
  const canFull   = canManageFully(currentSession) && !isMe;

  return (
    <div style={{
      background:'white', borderRadius:14, border:'1.5px solid #e2e8f0',
      padding:'20px', transition:'box-shadow 0.2s, border-color 0.2s',
      boxShadow: isMe ? '0 0 0 2px #0f2744' : '0 1px 4px rgba(0,0,0,0.05)',
      borderColor: isMe ? '#0f2744' : '#e2e8f0', position:'relative',
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow='0 4px 20px rgba(0,0,0,0.1)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = isMe ? '0 0 0 2px #0f2744' : '0 1px 4px rgba(0,0,0,0.05)'; }}
    >
      {isMe && (
        <div style={{ position:'absolute', top:10, left:10, background:'#0f2744', color:'white', fontSize:9, padding:'2px 7px', borderRadius:10, fontWeight:700 }}>أنت</div>
      )}

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
        <div style={{ width:48, height:48, borderRadius:12, background:'linear-gradient(135deg,#f8fafc,#e2e8f0)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, border:'2px solid #e2e8f0', flexShrink:0 }}>
          {user.avatar}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:800, color:'#0f1f35', marginBottom:2 }}>{user.name}</div>
          <div style={{ fontSize:11, color:'#94a3b8', fontFamily:'Inter,monospace', direction:'ltr' }}>@{user.username}</div>
          <div style={{ fontSize:10, color:'#94a3b8' }}>{user.nameFr}</div>
        </div>
      </div>

      {/* Badges */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
        <Badge color={role.color} bg={role.bg}>{role.icon} {role.ar}</Badge>
        <Badge color={status.color} bg={status.bg}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:status.dot, display:'inline-block' }} />
          {status.ar}
        </Badge>
      </div>

      {/* Info */}
      <div style={{ fontSize:11, color:'#64748b', marginBottom:12, display:'grid', gridTemplateColumns:'1fr 1fr', gap:4 }}>
        <div>📧 {user.email || '—'}</div>
        <div>📞 {user.phone || '—'}</div>
        <div>🔐 {user.loginCount || 0} دخول</div>
        <div>🕐 {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('ar-MA') : 'لم يدخل بعد'}</div>
      </div>

      {/* Permissions preview */}
      <div style={{ display:'flex', gap:3, flexWrap:'wrap', marginBottom:14 }}>
        {user.permissions.slice(0, 6).map(p => {
          const pInfo = ALL_PERMISSIONS.find(pp => pp.key === p);
          return pInfo ? <span key={p} title={pInfo.ar} style={{ fontSize:14, cursor:'default' }}>{pInfo.icon}</span> : null;
        })}
        {user.permissions.length > 6 && <span style={{ fontSize:10, color:'#94a3b8', alignSelf:'center' }}>+{user.permissions.length - 6}</span>}
      </div>

      {/* Actions — strictly role-gated */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>

        {/* Superadmin only: edit full profile */}
        {canFull && (
          <Btn onClick={() => onEdit(user)} color="#0f2744">✏️ تعديل</Btn>
        )}

        {/* Superadmin only: manage permissions */}
        {isSA && !isMe && (
          <Btn onClick={() => onPermissions(user)} color="#4338ca">🔑 صلاحيات</Btn>
        )}

        {/* Superadmin only: reset password */}
        {canFull && (
          <Btn onClick={() => onResetPwd(user)} color="#d97706">🔒 كلمة المرور</Btn>
        )}

        {/* Admin + superadmin: toggle status (admin can only toggle editors/viewers) */}
        {canToggle && (
          <Btn onClick={() => onToggle(user)} color={user.status === 'active' ? '#92400e' : '#065f46'}>
            {user.status === 'active' ? '⛔ تعطيل' : '✅ تفعيل'}
          </Btn>
        )}

        {/* Superadmin only: delete */}
        {canFull && (
          <Btn onClick={() => onDelete(user)} color="#dc2626">🗑️ حذف</Btn>
        )}

        {/* Admin sees but can't act on other admins */}
        {currentSession?.role === 'admin' && user.role === 'admin' && !isMe && (
          <span style={{ fontSize:10, color:'#94a3b8', alignSelf:'center', padding:'4px 8px', background:'#f1f5f9', borderRadius:6 }}>
            🛡️ صلاحيات المدير العام فقط
          </span>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════
   USER FORM MODAL — superadmin role excluded from dropdown
   ═══════════════════════════════ */
function UserFormModal({ user, onSave, onClose }: {
  user: AppUser | null; onSave: () => void; onClose: () => void;
}) {
  const isEdit = !!user;
  const [form, setForm] = useState({
    username:       user?.username || '',
    name:           user?.name || '',
    nameFr:         user?.nameFr || '',
    email:          user?.email || '',
    phone:          user?.phone || '',
    role:           ((user?.role === 'superadmin' ? 'admin' : user?.role) || 'editor') as UserRole,
    avatar:         user?.avatar || '👤',
    notes:          user?.notes || '',
    sessionTimeout: String(user?.sessionTimeout || 120),
    password:       '',
    confirmPassword:'',
  });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); setError(''); }

  async function handleSave() {
    setError('');
    if (!form.username.trim()) return setError('اسم المستخدم مطلوب');
    if (!form.name.trim())     return setError('الاسم مطلوب');
    if (!isEdit && !form.password)                    return setError('كلمة المرور مطلوبة');
    if (form.password && form.password !== form.confirmPassword) return setError('كلمتا المرور غير متطابقتان');
    if (form.password && form.password.length < 6)    return setError('كلمة المرور 6 أحرف على الأقل');

    // Extra guard: block superadmin role assignment
    if ((form.role as string) === 'superadmin') return setError('لا يمكن تعيين دور المدير العام');

    setLoading(true);
    await new Promise(r => setTimeout(r, 300));

    if (isEdit) {
      const res = userDB.updateUser(user!.id, {
        username: form.username.trim(),
        name: form.name, nameFr: form.nameFr,
        email: form.email, phone: form.phone,
        role: form.role, avatar: form.avatar,
        notes: form.notes,
        sessionTimeout: parseInt(form.sessionTimeout) || 120,
        permissions: defaultPermissions(form.role),
      });
      if (!res.success) { setError(res.error || 'خطأ'); setLoading(false); return; }
    } else {
      const res = userDB.createUser({
        username: form.username.trim(), password: form.password,
        role: form.role, name: form.name, nameFr: form.nameFr,
        email: form.email, phone: form.phone, avatar: form.avatar,
        notes: form.notes, sessionTimeout: parseInt(form.sessionTimeout) || 120,
      });
      if (!res.success) { setError(res.error || 'خطأ'); setLoading(false); return; }
    }
    setLoading(false);
    onSave();
  }

  // Role options — superadmin NEVER in list
  const roleOptions = MANAGEABLE_ROLES.map(r => ({
    value: r,
    label: `${ROLE_LABELS[r].icon} ${ROLE_LABELS[r].ar} — ${ROLE_LABELS[r].fr}`,
  }));

  return (
    <Overlay onClose={onClose}>
      <div style={{ width:560, maxHeight:'90vh', overflow:'auto', borderRadius:18, background:'white', padding:28 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
          <SectionTitle title={isEdit ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'} subtitle={isEdit ? `@${user?.username}` : 'Nouveau compte'} icon={isEdit ? '✏️' : '➕'} />
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#94a3b8', padding:4 }}>✕</button>
        </div>

        {/* Avatar picker */}
        <div style={{ marginBottom:16 }}>
          <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#374151', marginBottom:6 }}>الرمز التعبيري (Avatar)</label>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', padding:10, background:'#f8fafc', borderRadius:10, border:'1px solid #e2e8f0' }}>
            {AVATARS.map(a => (
              <button key={a} onClick={() => set('avatar', a)}
                style={{ width:32, height:32, borderRadius:8, border:`2px solid ${form.avatar === a ? '#0f2744' : 'transparent'}`, background:form.avatar === a ? '#dbeafe' : 'transparent', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                {a}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
          <Inp label="اسم المستخدم (username)" value={form.username} onChange={v => set('username', v)} placeholder="username" dir="ltr" required />
          <Sel label="الدور (Role)" value={form.role} onChange={v => set('role', v)} options={roleOptions} />
          <Inp label="الاسم بالعربية" value={form.name} onChange={v => set('name', v)} placeholder="محمد العلوي" required />
          <Inp label="Nom en Français" value={form.nameFr} onChange={v => set('nameFr', v)} placeholder="Mohammed Alaoui" dir="ltr" />
          <Inp label="البريد الإلكتروني" value={form.email} onChange={v => set('email', v)} type="email" placeholder="exemple@bureau.ma" dir="ltr" />
          <Inp label="الهاتف" value={form.phone} onChange={v => set('phone', v)} placeholder="06XXXXXXXX" dir="ltr" />
          <Inp label="مدة الجلسة (دقائق)" value={form.sessionTimeout} onChange={v => set('sessionTimeout', v)} type="number" placeholder="120" dir="ltr" />
        </div>

        {/* Password */}
        <div style={{ padding:14, background:'#fef3c7', borderRadius:10, border:'1px solid #f59e0b33', marginBottom:12 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#92400e', marginBottom:10 }}>
            🔑 {isEdit ? 'تغيير كلمة المرور (اتركها فارغة للإبقاء على القديمة)' : 'كلمة المرور *'}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Inp label="كلمة المرور الجديدة" value={form.password} onChange={v => set('password', v)} type="password" placeholder="••••••••" dir="ltr" />
            <Inp label="تأكيد كلمة المرور" value={form.confirmPassword} onChange={v => set('confirmPassword', v)} type="password" placeholder="••••••••" dir="ltr" />
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom:16 }}>
          <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#374151', marginBottom:4 }}>ملاحظات</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
            style={{ width:'100%', padding:'8px 10px', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:12, fontFamily:'inherit', resize:'vertical', outline:'none', boxSizing:'border-box' }} />
        </div>

        {error && <div style={{ background:'#fee2e2', color:'#dc2626', padding:'8px 12px', borderRadius:8, fontSize:12, marginBottom:12, fontWeight:600 }}>⚠ {error}</div>}

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'9px 20px', borderRadius:9, border:'1.5px solid #e2e8f0', background:'white', color:'#374151', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>إلغاء</button>
          <button onClick={handleSave} disabled={loading}
            style={{ padding:'9px 24px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#0f2744,#1e3a5f)', color:'white', fontSize:13, fontWeight:800, cursor:loading?'not-allowed':'pointer', fontFamily:'inherit', opacity:loading?0.7:1 }}>
            {loading ? '⏳ جاري الحفظ...' : `💾 ${isEdit ? 'حفظ التعديلات' : 'إنشاء المستخدم'}`}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

/* ═══════════════════════════════
   PERMISSIONS MODAL — superadmin role excluded from quick presets
   ═══════════════════════════════ */
function PermissionsModal({ user, onSave, onClose }: { user:AppUser; onSave:()=>void; onClose:()=>void }) {
  const [perms, setPerms]   = useState<Permission[]>([...user.permissions]);
  const [saved, setSaved]   = useState(false);

  function toggle(p: Permission) {
    setPerms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  }
  function applyRole(role: UserRole) { setPerms(defaultPermissions(role)); }

  function handleSave() {
    userDB.updatePermissions(user.id, perms);
    setSaved(true);
    setTimeout(() => { setSaved(false); onSave(); }, 1000);
  }

  return (
    <Overlay onClose={onClose}>
      <div style={{ width:520, borderRadius:18, background:'white', padding:28, maxHeight:'90vh', overflow:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
          <SectionTitle title={`صلاحيات: ${user.name}`} subtitle={`@${user.username} — ${ROLE_LABELS[user.role].fr}`} icon="🔑" />
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#94a3b8', padding:4 }}>✕</button>
        </div>

        {/* Quick role presets — superadmin excluded */}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, color:'#64748b', fontWeight:600, marginBottom:8 }}>تعيين سريع حسب الدور:</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {MANAGEABLE_ROLES.map(r => {
              const rl = ROLE_LABELS[r];
              return (
                <button key={r} onClick={() => applyRole(r)}
                  style={{ padding:'5px 12px', borderRadius:7, border:`1.5px solid ${rl.color}`, background:rl.bg, color:rl.color, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  {rl.icon} {rl.ar}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:20 }}>
          {ALL_PERMISSIONS.map(p => {
            const active = perms.includes(p.key);
            return (
              <button key={p.key} onClick={() => toggle(p.key)}
                style={{
                  display:'flex', alignItems:'center', gap:8, padding:'10px 12px',
                  borderRadius:10, border:`1.5px solid ${active ? '#0f2744' : '#e2e8f0'}`,
                  background: active ? '#0f274410' : '#f8fafc',
                  cursor:'pointer', fontFamily:'inherit', textAlign:'right', transition:'all 0.15s',
                }}>
                <div style={{ width:20, height:20, borderRadius:5, border:`2px solid ${active ? '#0f2744' : '#d1d5db'}`, background:active ? '#0f2744' : 'white', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  {active && <span style={{ color:'white', fontSize:12, lineHeight:1 }}>✓</span>}
                </div>
                <span style={{ fontSize:16 }}>{p.icon}</span>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:'#0f1f35' }}>{p.ar}</div>
                  <div style={{ fontSize:9, color:'#94a3b8', fontFamily:'Inter,sans-serif' }}>{p.fr}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ fontSize:12, color:'#64748b', background:'#f8fafc', padding:'8px 12px', borderRadius:8, marginBottom:16 }}>
          ✅ {perms.length} صلاحية محددة من أصل {ALL_PERMISSIONS.length}
        </div>

        {saved && (
          <div style={{ background:'#d1fae5', color:'#065f46', padding:'8px 12px', borderRadius:8, fontSize:12, marginBottom:12, fontWeight:700, textAlign:'center' }}>
            ✅ تم حفظ الصلاحيات بنجاح
          </div>
        )}

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'9px 20px', borderRadius:9, border:'1.5px solid #e2e8f0', background:'white', color:'#374151', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>إلغاء</button>
          <button onClick={handleSave} style={{ padding:'9px 24px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#4338ca,#6366f1)', color:'white', fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
            💾 حفظ الصلاحيات
          </button>
        </div>
      </div>
    </Overlay>
  );
}

/* ═══════════════════════════════
   RESET PASSWORD MODAL
   ═══════════════════════════════ */
function ResetPasswordModal({ user, onSave, onClose }: { user:AppUser; onSave:()=>void; onClose:()=>void }) {
  const [pw, setPw]   = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk]   = useState(false);

  function handleSave() {
    if (!pw) return setErr('أدخل كلمة المرور الجديدة');
    if (pw.length < 6) return setErr('6 أحرف على الأقل');
    if (pw !== pw2) return setErr('كلمتا المرور غير متطابقتان');
    userDB.adminResetPassword(user.id, pw, 'admin');
    setOk(true);
    setTimeout(() => { setOk(false); onSave(); }, 1200);
  }

  return (
    <Overlay onClose={onClose}>
      <div style={{ width:400, borderRadius:18, background:'white', padding:28 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
          <SectionTitle title="تغيير كلمة المرور" subtitle={`@${user.username}`} icon="🔒" />
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#94a3b8', padding:4 }}>✕</button>
        </div>
        <div style={{ display:'grid', gap:12, marginBottom:16 }}>
          <Inp label="كلمة المرور الجديدة" value={pw} onChange={setPw} type="password" placeholder="••••••••" dir="ltr" />
          <Inp label="تأكيد كلمة المرور" value={pw2} onChange={setPw2} type="password" placeholder="••••••••" dir="ltr" />
        </div>
        {err && <div style={{ background:'#fee2e2', color:'#dc2626', padding:'8px 12px', borderRadius:8, fontSize:12, marginBottom:12, fontWeight:600 }}>⚠ {err}</div>}
        {ok  && <div style={{ background:'#d1fae5', color:'#065f46', padding:'8px 12px', borderRadius:8, fontSize:12, marginBottom:12, fontWeight:700 }}>✅ تم تغيير كلمة المرور بنجاح</div>}
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'9px 20px', borderRadius:9, border:'1.5px solid #e2e8f0', background:'white', color:'#374151', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>إلغاء</button>
          <button onClick={handleSave} style={{ padding:'9px 24px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#d97706,#f59e0b)', color:'white', fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
            🔒 تغيير كلمة المرور
          </button>
        </div>
      </div>
    </Overlay>
  );
}

/* ═══════════════════════════════
   DELETE CONFIRM MODAL
   ═══════════════════════════════ */
function DeleteModal({ user, onConfirm, onClose }: { user:AppUser; onConfirm:()=>void; onClose:()=>void }) {
  return (
    <Overlay onClose={onClose}>
      <div style={{ width:380, borderRadius:18, background:'white', padding:28, textAlign:'center' }}>
        <div style={{ fontSize:48, marginBottom:12 }}>⚠️</div>
        <div style={{ fontSize:16, fontWeight:800, color:'#0f1f35', marginBottom:8 }}>تأكيد الحذف</div>
        <div style={{ fontSize:13, color:'#64748b', marginBottom:20 }}>
          هل أنت متأكد من حذف حساب <strong>{user.name}</strong> (@{user.username})؟<br />
          <span style={{ color:'#dc2626', fontSize:11 }}>هذا الإجراء لا يمكن التراجع عنه.</span>
        </div>
        <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
          <button onClick={onClose} style={{ padding:'9px 20px', borderRadius:9, border:'1.5px solid #e2e8f0', background:'white', color:'#374151', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>إلغاء</button>
          <button onClick={onConfirm} style={{ padding:'9px 24px', borderRadius:9, border:'none', background:'#dc2626', color:'white', fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
            🗑️ حذف نهائي
          </button>
        </div>
      </div>
    </Overlay>
  );
}

/* ═══════════════════════════════
   AUDIT LOG TAB
   ═══════════════════════════════ */
function AuditLogTab() {
  const [logs, setLogs]       = useState<AuditLog[]>([]);
  const [search, setSearch]   = useState('');

  useEffect(() => { setLogs(userDB.getLogs()); }, []);

  const filtered = logs.filter(l =>
    l.action.includes(search) || l.username.includes(search) || l.detail?.includes(search)
  );

  const actionColor = (a: string) => {
    if (a.includes('login'))  return { bg:'#d1fae5', color:'#065f46' };
    if (a.includes('logout')) return { bg:'#f3f4f6', color:'#374151' };
    if (a.includes('create')) return { bg:'#dbeafe', color:'#1e40af' };
    if (a.includes('delete')) return { bg:'#fee2e2', color:'#dc2626' };
    if (a.includes('update')) return { bg:'#fef3c7', color:'#92400e' };
    return { bg:'#f3f4f6', color:'#374151' };
  };

  return (
    <div>
      <SectionTitle title="سجل المراقبة" subtitle="Audit Log — جميع العمليات" icon="📋" />
      <div style={{ display:'flex', gap:10, marginBottom:16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 بحث في السجل..."
          style={{ flex:1, padding:'8px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13, fontFamily:'inherit', outline:'none' }} />
        <button onClick={() => setLogs(userDB.getLogs())}
          style={{ padding:'8px 14px', borderRadius:8, border:'1.5px solid #e2e8f0', background:'white', cursor:'pointer', fontSize:13, fontFamily:'inherit' }}>
          🔄 تحديث
        </button>
        <button onClick={() => { localStorage.removeItem('moas_audit'); setLogs([]); }}
          style={{ padding:'8px 14px', borderRadius:8, border:'none', background:'#fee2e2', color:'#dc2626', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'inherit' }}>
          🗑️ مسح
        </button>
      </div>
      <div style={{ background:'white', borderRadius:12, border:'1px solid #e2e8f0', overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
          <thead>
            <tr style={{ background:'#f8fafc' }}>
              {['الوقت','المستخدم','العملية','التفاصيل'].map(h => (
                <th key={h} style={{ padding:'10px 12px', textAlign:'right', fontWeight:700, color:'#374151', borderBottom:'1px solid #e2e8f0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0,100).map((log,i) => {
              const ac = actionColor(log.action);
              return (
                <tr key={log.id} style={{ background: i%2===0 ? 'white' : '#fafafa' }}>
                  <td style={{ padding:'8px 12px', color:'#64748b', whiteSpace:'nowrap' }}>{new Date(log.timestamp).toLocaleString('ar-MA')}</td>
                  <td style={{ padding:'8px 12px', fontWeight:600, color:'#0f1f35' }}>{log.username}</td>
                  <td style={{ padding:'8px 12px' }}>
                    <span style={{ padding:'2px 8px', borderRadius:10, background:ac.bg, color:ac.color, fontWeight:700 }}>{log.action}</span>
                  </td>
                  <td style={{ padding:'8px 12px', color:'#64748b', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{log.detail || '—'}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={4} style={{ padding:'24px', textAlign:'center', color:'#94a3b8' }}>لا توجد سجلات</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════
   MY ACCOUNT TAB
   ═══════════════════════════════ */
function MyAccountTab({ session }: { session: ActiveSession }) {
  const user = userDB.getUsers().find(u => u.id === session.userId);
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPw2, setNewPw2] = useState('');
  const [msg, setMsg] = useState<{type:'ok'|'err'; text:string}|null>(null);

  if (!user) return null;

  function handleChangePw() {
    if (!oldPw || !newPw) return setMsg({type:'err', text:'يرجى ملء جميع الحقول'});
    if (newPw.length < 6) return setMsg({type:'err', text:'كلمة المرور 6 أحرف على الأقل'});
    if (newPw !== newPw2) return setMsg({type:'err', text:'كلمتا المرور غير متطابقتان'});
    const res = userDB.changePassword(session.userId, oldPw, newPw);
    if (res.success) {
      setMsg({type:'ok', text:'✅ تم تغيير كلمة المرور بنجاح'});
      setOldPw(''); setNewPw(''); setNewPw2('');
    } else {
      setMsg({type:'err', text: res.error || 'خطأ في كلمة المرور القديمة'});
    }
    setTimeout(() => setMsg(null), 3000);
  }

  const role = ROLE_LABELS[user.role];

  return (
    <div style={{ maxWidth:500 }}>
      <SectionTitle title="معلومات حسابي" subtitle="Mon Compte" icon="👤" />
      <div style={{ background:'white', borderRadius:14, border:'1.5px solid #e2e8f0', padding:24, marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:16 }}>
          <div style={{ width:60, height:60, borderRadius:14, background:'linear-gradient(135deg,#0f2744,#1e3a5f)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:30 }}>{user.avatar}</div>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:'#0f1f35' }}>{user.name}</div>
            <div style={{ fontSize:12, color:'#94a3b8', direction:'ltr' }}>@{user.username}</div>
            <Badge color={role.color} bg={role.bg}>{role.icon} {role.ar}</Badge>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, fontSize:12, color:'#64748b' }}>
          <div>📧 {user.email || '—'}</div>
          <div>📞 {user.phone || '—'}</div>
          <div>🔐 {user.loginCount || 0} دخول</div>
          <div>🕐 {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('ar-MA') : '—'}</div>
        </div>
      </div>

      <div style={{ background:'white', borderRadius:14, border:'1.5px solid #e2e8f0', padding:24 }}>
        <div style={{ fontSize:13, fontWeight:700, color:'#0f1f35', marginBottom:14 }}>🔒 تغيير كلمة المرور</div>
        <div style={{ display:'grid', gap:12 }}>
          <Inp label="كلمة المرور الحالية" value={oldPw} onChange={setOldPw} type="password" placeholder="••••••••" dir="ltr" />
          <Inp label="كلمة المرور الجديدة" value={newPw} onChange={setNewPw} type="password" placeholder="••••••••" dir="ltr" />
          <Inp label="تأكيد كلمة المرور الجديدة" value={newPw2} onChange={setNewPw2} type="password" placeholder="••••••••" dir="ltr" />
        </div>
        {msg && <div style={{ background: msg.type==='ok' ? '#d1fae5' : '#fee2e2', color: msg.type==='ok' ? '#065f46' : '#dc2626', padding:'8px 12px', borderRadius:8, fontSize:12, marginTop:10, fontWeight:600 }}>{msg.text}</div>}
        <button onClick={handleChangePw} style={{ marginTop:14, padding:'10px 24px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#0f2744,#1e3a5f)', color:'white', fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
          🔒 تحديث كلمة المرور
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════ */
export default function UserManagement({ session }: { session: ActiveSession | null }) {
  const [tab, setTab]               = useState<'users'|'log'|'me'>('users');
  const [users, setUsers]           = useState<AppUser[]>([]);
  const [search, setSearch]         = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy]         = useState<string>('name');

  // Modals
  const [editUser, setEditUser]         = useState<AppUser|null>(null);
  const [showNewUser, setShowNewUser]   = useState(false);
  const [permUser, setPermUser]         = useState<AppUser|null>(null);
  const [pwUser, setPwUser]             = useState<AppUser|null>(null);
  const [deleteUser, setDeleteUser]     = useState<AppUser|null>(null);

  const isSA    = session?.role === 'superadmin';
  const isAdmin = session?.role === 'admin' || isSA;

  const refresh = useCallback(() => {
    // superadmin NEVER appears in the list — filtered out at source
    const all = userDB.getUsers().filter(u => u.role !== 'superadmin');
    setUsers(all);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Apply filters + sort
  const filtered = users
    .filter(u => {
      if (filterRole !== 'all' && u.role !== filterRole) return false;
      if (filterStatus !== 'all' && u.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        return u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name')  return a.name.localeCompare(b.name);
      if (sortBy === 'login') return (b.loginCount||0) - (a.loginCount||0);
      if (sortBy === 'date')  return Number(b.lastLogin||0) - Number(a.lastLogin||0);
      return 0;
    });

  function handleToggle(u: AppUser) {
    if (!canToggleStatus(session, u)) return;
    const newStatus: UserStatus = u.status === 'active' ? 'suspended' : 'active';
    userDB.updateUser(u.id, { status: newStatus });
    refresh();
  }

  function handleDelete(u: AppUser) {
    if (!canManageFully(session)) return;
    userDB.deleteUser(u.id);
    setDeleteUser(null);
    refresh();
  }

  const tabs: { key:'users'|'log'|'me'; label:string; icon:string; show:boolean }[] = [
    { key:'users', label:'المستخدمون', icon:'👥', show: isAdmin },
    { key:'log',   label:'سجل المراقبة', icon:'📋', show: isSA },
    { key:'me',    label:'حسابي', icon:'👤', show: true },
  ];

  return (
    <div style={{ padding:'24px', maxWidth:1200, margin:'0 auto', fontFamily:'Cairo,sans-serif', direction:'rtl' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:900, color:'#0f1f35', margin:0, display:'flex', alignItems:'center', gap:10 }}>
            👥 إدارة المستخدمين
          </h1>
          <p style={{ fontSize:12, color:'#94a3b8', margin:'4px 0 0', fontFamily:'Inter,sans-serif' }}>
            Gestion des utilisateurs — {isSA ? 'Super Admin' : 'Administrateur'}
          </p>
        </div>
        {isSA && (
          <button onClick={() => setShowNewUser(true)}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#0f2744,#1e3a5f)', color:'white', fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
            ➕ إضافة مستخدم
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, background:'#f1f5f9', padding:4, borderRadius:12, marginBottom:24, width:'fit-content' }}>
        {tabs.filter(t => t.show).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding:'8px 18px', borderRadius:9, border:'none', cursor:'pointer', fontFamily:'inherit',
              fontSize:13, fontWeight:700, transition:'all 0.2s',
              background: tab === t.key ? 'white' : 'transparent',
              color: tab === t.key ? '#0f2744' : '#64748b',
              boxShadow: tab === t.key ? '0 1px 6px rgba(0,0,0,0.1)' : 'none',
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* USERS TAB */}
      {tab === 'users' && isAdmin && (
        <div>
          <StatsBar />

          {/* Notice for admin (non-superadmin) */}
          {!isSA && (
            <div style={{ background:'#fef3c7', border:'1px solid #f59e0b33', borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:12, color:'#92400e', display:'flex', alignItems:'center', gap:8 }}>
              🛡️ <span>صلاحياتك كمدير: يمكنك <strong>تعطيل/تفعيل</strong> حسابات الأعضاء العاديين فقط. إدارة المديرين وتعيين الصلاحيات من اختصاص المدير العام.</span>
            </div>
          )}

          {/* Filters */}
          <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 بحث بالاسم أو البريد..."
              style={{ flex:1, minWidth:180, padding:'8px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13, fontFamily:'inherit', outline:'none' }} />
            <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
              style={{ padding:'8px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13, fontFamily:'inherit', outline:'none', background:'white' }}>
              <option value="all">كل الأدوار</option>
              {MANAGEABLE_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r].icon} {ROLE_LABELS[r].ar}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              style={{ padding:'8px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13, fontFamily:'inherit', outline:'none', background:'white' }}>
              <option value="all">كل الحالات</option>
              {(Object.entries(STATUS_LABELS) as [UserStatus, typeof STATUS_LABELS[UserStatus]][]).map(([k,v]) => (
                <option key={k} value={k}>{v.ar}</option>
              ))}
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              style={{ padding:'8px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13, fontFamily:'inherit', outline:'none', background:'white' }}>
              <option value="name">ترتيب: الاسم</option>
              <option value="login">ترتيب: الدخول</option>
              <option value="date">ترتيب: آخر دخول</option>
            </select>
          </div>

          {/* User cards grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:16 }}>
            {filtered.map(u => (
              <UserCard
                key={u.id}
                user={u}
                currentSession={session}
                onEdit={setEditUser}
                onDelete={setDeleteUser}
                onToggle={handleToggle}
                onResetPwd={setPwUser}
                onPermissions={setPermUser}
              />
            ))}
            {filtered.length === 0 && (
              <div style={{ gridColumn:'1/-1', textAlign:'center', padding:48, color:'#94a3b8' }}>
                <div style={{ fontSize:40, marginBottom:12 }}>👤</div>
                <div style={{ fontSize:16, fontWeight:700 }}>لا توجد نتائج</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AUDIT LOG TAB */}
      {tab === 'log' && isSA && <AuditLogTab />}

      {/* MY ACCOUNT TAB */}
      {tab === 'me' && session && <MyAccountTab session={session} />}

      {/* MODALS */}
      {showNewUser && (
        <UserFormModal user={null} onSave={() => { setShowNewUser(false); refresh(); }} onClose={() => setShowNewUser(false)} />
      )}
      {editUser && (
        <UserFormModal user={editUser} onSave={() => { setEditUser(null); refresh(); }} onClose={() => setEditUser(null)} />
      )}
      {permUser && isSA && (
        <PermissionsModal user={permUser} onSave={() => { setPermUser(null); refresh(); }} onClose={() => setPermUser(null)} />
      )}
      {pwUser && isSA && (
        <ResetPasswordModal user={pwUser} onSave={() => { setPwUser(null); refresh(); }} onClose={() => setPwUser(null)} />
      )}
      {deleteUser && isSA && (
        <DeleteModal user={deleteUser} onConfirm={() => handleDelete(deleteUser)} onClose={() => setDeleteUser(null)} />
      )}
    </div>
  );
}
