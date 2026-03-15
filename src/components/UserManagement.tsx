import { useState, useEffect, useCallback } from 'react';
import {
  authService as userDB,
  AppUser, UserRole, UserStatus, Permission,
  AuditLog, ActiveSession,
  defaultPermissions,
} from '../utils/authService';

/* ══════════════════════════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════════════════════════ */
const ROLE_LABELS: Record<UserRole, { ar: string; fr: string; color: string; bg: string; icon: string }> = {
  superadmin: { ar: 'مدير عام',   fr: 'Super Admin', color: '#92400e', bg: '#fef3c7', icon: '👑' },
  admin:       { ar: 'مدير',       fr: 'Administrateur', color: '#1e40af', bg: '#dbeafe', icon: '🏛️' },
  editor:      { ar: 'كاتب',       fr: 'Éditeur',     color: '#065f46', bg: '#d1fae5', icon: '✍️' },
  viewer:      { ar: 'مشاهد',      fr: 'Lecteur',     color: '#374151', bg: '#f3f4f6', icon: '👁️' },
};

const STATUS_LABELS: Record<UserStatus, { ar: string; color: string; bg: string; dot: string }> = {
  active:    { ar: 'نشط',    color: '#065f46', bg: '#d1fae5', dot: '#10b981' },
  suspended: { ar: 'معطّل',  color: '#92400e', bg: '#fef3c7', dot: '#f59e0b' },
  pending:   { ar: 'معلّق',  color: '#1e40af', bg: '#dbeafe', dot: '#3b82f6' },
  banned:    { ar: 'محظور',  color: '#7c3aed', bg: '#ede9fe', dot: '#8b5cf6' },
};

const ALL_PERMISSIONS: { key: Permission; ar: string; fr: string; icon: string }[] = [
  { key: 'public-writer',    ar: 'الكاتب العمومي',       fr: 'Rédacteur Public',      icon: '✍️' },
  { key: 'cv-generator',     ar: 'مولّد السيرة الذاتية', fr: 'Générateur CV',          icon: '📄' },
  { key: 'cin-scanner',      ar: 'Scan Studio',           fr: 'Scanner CIN',            icon: '🪪' },
  { key: 'french-letters',   ar: 'الرسائل الفرنسية',     fr: 'Lettres Françaises',     icon: '📝' },
  { key: 'admin-procedures', ar: 'المساطر الإدارية',     fr: 'Procédures Admin',       icon: '🏛️' },
  { key: 'user-management',  ar: 'إدارة المستخدمين',     fr: 'Gestion Utilisateurs',   icon: '👥' },
  { key: 'view-history',     ar: 'عرض السجل',            fr: 'Voir Historique',         icon: '📋' },
  { key: 'export-pdf',       ar: 'تصدير PDF',             fr: 'Export PDF',              icon: '📑' },
  { key: 'export-docx',      ar: 'تصدير Word',            fr: 'Export Word',             icon: '📃' },
  { key: 'template-editor',  ar: 'محرر النماذج',          fr: 'Éditeur Templates',       icon: '🗂️' },
  { key: 'system-settings',  ar: 'إعدادات النظام',        fr: 'Paramètres Système',     icon: '⚙️' },
];

const AVATARS = ['👤','👑','🏛️','✍️','👁️','🧑‍💼','👩‍💼','🧑‍🔧','👩‍🔧','🧑‍⚕️','👩‍⚕️','🧑‍🏫','👩‍🏫','🧑‍💻','👩‍💻','🧑‍🎨','👮','🕵️','🎓','🌟'];

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

function Input({ label, value, onChange, type='text', placeholder='', required=false, dir='rtl' }:
  { label:string; value:string; onChange:(v:string)=>void; type?:string; placeholder?:string; required?:boolean; dir?:string }) {
  return (
    <div>
      <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#374151', marginBottom:4 }}>
        {label} {required && <span style={{ color:'#dc2626' }}>*</span>}
      </label>
      <input
        type={type} value={value} dir={dir}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required={required}
        style={{
          width:'100%', padding:'8px 10px', border:'1.5px solid #d1d5db', borderRadius:8,
          fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box',
          transition:'border-color 0.2s',
        }}
        onFocus={e => { e.target.style.borderColor='#0f2744'; }}
        onBlur={e => { e.target.style.borderColor='#d1d5db'; }}
      />
    </div>
  );
}

function Select({ label, value, onChange, options }: {
  label:string; value:string; onChange:(v:string)=>void;
  options: { value:string; label:string }[];
}) {
  return (
    <div>
      <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#374151', marginBottom:4 }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width:'100%', padding:'8px 10px', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:13, fontFamily:'inherit', outline:'none', background:'white', cursor:'pointer' }}>
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

/* ═══════════════════════════════
   STATS BAR
   ═══════════════════════════════ */
function StatsBar() {
  const stats = userDB.getStats();
  const items = [
    { label:'إجمالي المستخدمين', value:stats.totalUsers, icon:'👥', color:'#1e40af', bg:'#dbeafe' },
    { label:'نشطون',             value:stats.activeUsers, icon:'✅', color:'#065f46', bg:'#d1fae5' },
    { label:'معطّلون',           value:stats.suspendedUsers, icon:'⛔', color:'#92400e', bg:'#fef3c7' },
    { label:'دخول اليوم',        value:stats.todayLogins, icon:'🔐', color:'#374151', bg:'#f3f4f6' },
    { label:'محاولات فاشلة',     value:stats.failedLogins, icon:'⚠️', color:'#9f1239', bg:'#ffe4e6' },
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
function UserCard({ user, currentSession, onEdit, onDelete, onToggle, onResetPwd, onPermissions }:
  { user:AppUser; currentSession:ActiveSession|null; onEdit:(u:AppUser)=>void; onDelete:(u:AppUser)=>void; onToggle:(u:AppUser)=>void; onResetPwd:(u:AppUser)=>void; onPermissions:(u:AppUser)=>void; }) {

  const role = ROLE_LABELS[user.role];
  const status = STATUS_LABELS[user.status];
  const isMe = currentSession?.userId === user.id;
  const isProtected = user.id === 'U_SUPERADMIN';

  return (
    <div style={{
      background:'white', borderRadius:14, border:'1.5px solid #e2e8f0',
      padding:'20px', transition:'box-shadow 0.2s, border-color 0.2s',
      boxShadow: isMe ? '0 0 0 2px #0f2744' : '0 1px 4px rgba(0,0,0,0.05)',
      borderColor: isMe ? '#0f2744' : '#e2e8f0',
      position:'relative',
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
        <div style={{ gridColumn:'1/-1' }}>⏱️ انتهاء الجلسة: {user.sessionTimeout} دقيقة</div>
      </div>

      {/* Permissions preview */}
      <div style={{ display:'flex', gap:3, flexWrap:'wrap', marginBottom:14 }}>
        {user.permissions.slice(0, 6).map(p => {
          const pInfo = ALL_PERMISSIONS.find(pp => pp.key === p);
          return pInfo ? (
            <span key={p} title={pInfo.ar} style={{ fontSize:14, cursor:'default' }}>{pInfo.icon}</span>
          ) : null;
        })}
        {user.permissions.length > 6 && <span style={{ fontSize:10, color:'#94a3b8', alignSelf:'center' }}>+{user.permissions.length - 6}</span>}
      </div>

      {/* Actions */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
        <button onClick={() => onEdit(user)} style={btnStyle('#0f2744','white')}>✏️ تعديل</button>
        <button onClick={() => onPermissions(user)} style={btnStyle('#4338ca','white')}>🔑 صلاحيات</button>
        <button onClick={() => onResetPwd(user)} style={btnStyle('#d97706','white')}>🔒 كلمة المرور</button>
        {!isProtected && (
          <>
            <button onClick={() => onToggle(user)} style={btnStyle(user.status === 'active' ? '#92400e' : '#065f46', 'white')}>
              {user.status === 'active' ? '⛔ تعطيل' : '✅ تفعيل'}
            </button>
            {!isMe && <button onClick={() => onDelete(user)} style={btnStyle('#dc2626','white')}>🗑️ حذف</button>}
          </>
        )}
      </div>
    </div>
  );
}

function btnStyle(bg: string, color: string) {
  return {
    padding:'5px 10px', borderRadius:7, border:'none', background:bg, color, fontSize:11,
    fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:4,
    transition:'opacity 0.15s',
  } as React.CSSProperties;
}

/* ═══════════════════════════════
   USER FORM MODAL
   ═══════════════════════════════ */
function UserFormModal({ user, onSave, onClose }: {
  user: AppUser | null;
  onSave: () => void;
  onClose: () => void;
}) {
  const isEdit = !!user;
  const [form, setForm] = useState({
    username: user?.username || '',
    name: user?.name || '',
    nameFr: user?.nameFr || '',
    email: user?.email || '',
    phone: user?.phone || '',
    role: (user?.role || 'editor') as UserRole,
    avatar: user?.avatar || '👤',
    notes: user?.notes || '',
    sessionTimeout: String(user?.sessionTimeout || 120),
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); setError(''); }

  async function handleSave() {
    setError('');
    if (!form.username.trim()) return setError('اسم المستخدم مطلوب');
    if (!form.name.trim()) return setError('الاسم مطلوب');
    if (!isEdit && !form.password) return setError('كلمة المرور مطلوبة');
    if (form.password && form.password !== form.confirmPassword) return setError('كلمتا المرور غير متطابقتان');
    if (form.password && form.password.length < 6) return setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');

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
          <Input label="اسم المستخدم (username)" value={form.username} onChange={v => set('username', v)} placeholder="username" dir="ltr" required />
          <Select label="الدور (Role)" value={form.role} onChange={v => set('role', v as UserRole)}
            options={Object.entries(ROLE_LABELS).map(([k,v]) => ({ value:k, label:`${v.icon} ${v.ar} — ${v.fr}` }))} />
          <Input label="الاسم بالعربية" value={form.name} onChange={v => set('name', v)} placeholder="محمد العلوي" required />
          <Input label="Nom en Français" value={form.nameFr} onChange={v => set('nameFr', v)} placeholder="Mohammed Alaoui" dir="ltr" />
          <Input label="البريد الإلكتروني" value={form.email} onChange={v => set('email', v)} type="email" placeholder="exemple@bureau.ma" dir="ltr" />
          <Input label="الهاتف" value={form.phone} onChange={v => set('phone', v)} placeholder="06XXXXXXXX" dir="ltr" />
          <Input label="مدة الجلسة (دقائق)" value={form.sessionTimeout} onChange={v => set('sessionTimeout', v)} type="number" placeholder="120" dir="ltr" />
        </div>

        {/* Password fields */}
        <div style={{ padding:14, background:'#fef3c7', borderRadius:10, border:'1px solid #f59e0b33', marginBottom:12 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#92400e', marginBottom:10 }}>
            🔑 {isEdit ? 'تغيير كلمة المرور (اتركها فارغة للإبقاء على القديمة)' : 'كلمة المرور *'}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Input label="كلمة المرور الجديدة" value={form.password} onChange={v => set('password', v)} type="password" placeholder="••••••••" dir="ltr" />
            <Input label="تأكيد كلمة المرور" value={form.confirmPassword} onChange={v => set('confirmPassword', v)} type="password" placeholder="••••••••" dir="ltr" />
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
   PERMISSIONS MODAL
   ═══════════════════════════════ */
function PermissionsModal({ user, onSave, onClose }: { user:AppUser; onSave:()=>void; onClose:()=>void }) {
  const [perms, setPerms] = useState<Permission[]>([...user.permissions]);

  function toggle(p: Permission) {
    setPerms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  }

  function applyRole(role: UserRole) { setPerms(defaultPermissions(role)); }

  function handleSave() {
    userDB.updatePermissions(user.id, perms);
    onSave();
  }

  return (
    <Overlay onClose={onClose}>
      <div style={{ width:520, borderRadius:18, background:'white', padding:28 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
          <SectionTitle title={`صلاحيات: ${user.name}`} subtitle={`@${user.username} — ${ROLE_LABELS[user.role].fr}`} icon="🔑" />
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#94a3b8', padding:4 }}>✕</button>
        </div>

        {/* Quick role presets */}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, color:'#64748b', fontWeight:600, marginBottom:8 }}>تعيين سريع حسب الدور:</div>
          <div style={{ display:'flex', gap:8 }}>
            {(Object.keys(ROLE_LABELS) as UserRole[]).map(r => {
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
  const [newPwd, setNewPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  function handleReset() {
    if (newPwd.length < 6) return setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    if (newPwd !== confirm) return setError('كلمتا المرور غير متطابقتان');
    const res = userDB.adminResetPassword(user.id, newPwd, 'admin');
    if (!res.success) return setError(res.error || 'خطأ');
    setDone(true);
    setTimeout(() => { onSave(); }, 1000);
  }

  return (
    <Overlay onClose={onClose}>
      <div style={{ width:400, borderRadius:18, background:'white', padding:28 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
          <SectionTitle title="إعادة تعيين كلمة المرور" subtitle={`@${user.username}`} icon="🔒" />
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#94a3b8', padding:4 }}>✕</button>
        </div>

        {done ? (
          <div style={{ textAlign:'center', padding:24, color:'#065f46' }}>
            <div style={{ fontSize:40, marginBottom:10 }}>✅</div>
            <div style={{ fontSize:14, fontWeight:700 }}>تم تغيير كلمة المرور بنجاح</div>
          </div>
        ) : (
          <>
            <div style={{ background:'#fef3c7', borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:12, color:'#92400e', fontWeight:600 }}>
              ⚠️ سيتم تغيير كلمة مرور المستخدم {user.name} مباشرةً بدون الحاجة لكلمة المرور القديمة.
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:16 }}>
              <Input label="كلمة المرور الجديدة" value={newPwd} onChange={setNewPwd} type="password" placeholder="••••••••" dir="ltr" />
              <Input label="تأكيد كلمة المرور" value={confirm} onChange={setConfirm} type="password" placeholder="••••••••" dir="ltr" />
            </div>
            {error && <div style={{ background:'#fee2e2', color:'#dc2626', padding:'8px 12px', borderRadius:8, fontSize:12, marginBottom:12, fontWeight:600 }}>⚠ {error}</div>}
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={onClose} style={{ padding:'9px 20px', borderRadius:9, border:'1.5px solid #e2e8f0', background:'white', color:'#374151', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>إلغاء</button>
              <button onClick={handleReset} style={{ padding:'9px 24px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#d97706,#f59e0b)', color:'white', fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
                🔒 إعادة التعيين
              </button>
            </div>
          </>
        )}
      </div>
    </Overlay>
  );
}

/* ═══════════════════════════════
   DELETE CONFIRM MODAL
   ═══════════════════════════════ */
function DeleteConfirmModal({ user, onConfirm, onClose }: { user:AppUser; onConfirm:()=>void; onClose:()=>void }) {
  const [typed, setTyped] = useState('');
  return (
    <Overlay onClose={onClose}>
      <div style={{ width:420, borderRadius:18, background:'white', padding:28 }}>
        <div style={{ textAlign:'center', marginBottom:20 }}>
          <div style={{ fontSize:50, marginBottom:10 }}>🗑️</div>
          <div style={{ fontSize:16, fontWeight:800, color:'#dc2626', marginBottom:6 }}>حذف المستخدم نهائياً</div>
          <div style={{ fontSize:13, color:'#64748b' }}>هذا الإجراء لا يمكن التراجع عنه.</div>
        </div>
        <div style={{ background:'#fee2e2', borderRadius:10, padding:'12px 16px', marginBottom:16, fontSize:13, color:'#7f1d1d' }}>
          سيتم حذف حساب <strong>{user.name}</strong> (@{user.username}) نهائياً مع كل سجلاته.
        </div>
        <div style={{ marginBottom:16 }}>
          <label style={{ display:'block', fontSize:12, color:'#374151', fontWeight:600, marginBottom:6 }}>
            اكتب <strong>{user.username}</strong> للتأكيد:
          </label>
          <input value={typed} onChange={e => setTyped(e.target.value)} dir="ltr"
            style={{ width:'100%', padding:'8px 10px', border:'1.5px solid #fca5a5', borderRadius:8, fontSize:13, fontFamily:'monospace', outline:'none', boxSizing:'border-box' }} />
        </div>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'9px 20px', borderRadius:9, border:'1.5px solid #e2e8f0', background:'white', color:'#374151', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>إلغاء</button>
          <button onClick={onConfirm} disabled={typed !== user.username}
            style={{ padding:'9px 24px', borderRadius:9, border:'none', background:typed === user.username ? 'linear-gradient(135deg,#dc2626,#ef4444)' : '#e2e8f0', color:typed === user.username ? 'white' : '#94a3b8', fontSize:13, fontWeight:800, cursor:typed === user.username ? 'pointer' : 'not-allowed', fontFamily:'inherit' }}>
            🗑️ حذف نهائي
          </button>
        </div>
      </div>
    </Overlay>
  );
}

/* ═══════════════════════════════
   AUDIT LOG TABLE
   ═══════════════════════════════ */
function AuditLogPanel() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filter, setFilter] = useState('');

  useEffect(() => { setLogs(userDB.getLogs(200)); }, []);

  function refresh() { setLogs(userDB.getLogs(200)); }

  function clearAll() {
    if (confirm('هل تريد حذف كل سجلات المراقبة؟')) {
      userDB.clearLogs();
      setLogs([]);
    }
  }

  const ACTION_COLORS: Record<string, string> = {
    LOGIN_SUCCESS: '#065f46', LOGIN_FAIL: '#dc2626', LOGIN_BLOCKED: '#d97706',
    LOGOUT: '#374151', CREATE_USER: '#1d4ed8', UPDATE_USER: '#0891b2',
    DELETE_USER: '#dc2626', TOGGLE_STATUS: '#9333ea', CHANGE_PASSWORD: '#c2410c',
    ADMIN_RESET_PASSWORD: '#c2410c', RESET_DB: '#dc2626', UPDATE_PERMISSIONS: '#4338ca',
  };

  const filtered = filter
    ? logs.filter(l => l.username.includes(filter) || l.action.includes(filter) || l.detail.includes(filter))
    : logs;

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <SectionTitle title="سجل المراقبة والتدقيق" subtitle={`${filtered.length} سجل`} icon="📋" />
        <div style={{ display:'flex', gap:8 }}>
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="🔍 بحث..."
            style={{ padding:'7px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:12, outline:'none', fontFamily:'inherit', width:200 }} />
          <button onClick={refresh} style={{ padding:'7px 14px', borderRadius:8, border:'1.5px solid #e2e8f0', background:'white', cursor:'pointer', fontSize:12, fontFamily:'inherit', fontWeight:600, color:'#374151' }}>🔄 تحديث</button>
          <button onClick={clearAll} style={{ padding:'7px 14px', borderRadius:8, border:'none', background:'#fee2e2', cursor:'pointer', fontSize:12, fontFamily:'inherit', fontWeight:600, color:'#dc2626' }}>🗑️ مسح الكل</button>
        </div>
      </div>

      <div style={{ background:'white', borderRadius:12, border:'1px solid #e2e8f0', overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#f8fafc', borderBottom:'2px solid #e2e8f0' }}>
                {['الوقت','المستخدم','الإجراء','التفاصيل','الحالة'].map(h => (
                  <th key={h} style={{ padding:'10px 12px', textAlign:'right', fontSize:11, fontWeight:700, color:'#374151', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign:'center', padding:32, color:'#94a3b8', fontSize:13 }}>لا توجد سجلات</td></tr>
              ) : filtered.map(log => (
                <tr key={log.id} style={{ borderBottom:'1px solid #f1f5f9', transition:'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background='#f8fafc')}
                  onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
                  <td style={{ padding:'9px 12px', fontSize:10, color:'#64748b', fontFamily:'monospace', whiteSpace:'nowrap' }}>
                    {new Date(log.timestamp).toLocaleString('ar-MA')}
                  </td>
                  <td style={{ padding:'9px 12px', fontSize:12, fontWeight:700, color:'#0f1f35', fontFamily:'monospace' }}>
                    @{log.username}
                  </td>
                  <td style={{ padding:'9px 12px' }}>
                    <span style={{ fontSize:10, fontWeight:700, fontFamily:'monospace', color:ACTION_COLORS[log.action] || '#374151', background:`${ACTION_COLORS[log.action] || '#374151'}15`, padding:'2px 7px', borderRadius:4 }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ padding:'9px 12px', fontSize:11, color:'#374151', maxWidth:280 }}>{log.detail}</td>
                  <td style={{ padding:'9px 12px' }}>
                    <span style={{ fontSize:11, fontWeight:700, color:log.success ? '#065f46' : '#dc2626' }}>
                      {log.success ? '✅' : '❌'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════
   CHANGE MY PASSWORD MODAL
   ═══════════════════════════════ */
function ChangeMyPasswordModal({ session, onClose }: { session:ActiveSession; onClose:()=>void }) {
  const [old, setOld] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  function handleSave() {
    if (!old) return setError('أدخل كلمة المرور الحالية');
    if (newPwd.length < 6) return setError('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
    if (newPwd !== confirm) return setError('كلمتا المرور غير متطابقتان');
    const res = userDB.changePassword(session.userId, old, newPwd);
    if (!res.success) return setError(res.error || 'خطأ');
    setDone(true);
  }

  return (
    <Overlay onClose={onClose}>
      <div style={{ width:380, borderRadius:18, background:'white', padding:28 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
          <SectionTitle title="تغيير كلمة مروري" subtitle={`@${session.username}`} icon="🔐" />
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#94a3b8', padding:4 }}>✕</button>
        </div>
        {done ? (
          <div style={{ textAlign:'center', padding:24 }}>
            <div style={{ fontSize:40, marginBottom:10 }}>✅</div>
            <div style={{ fontSize:14, fontWeight:700, color:'#065f46' }}>تم تغيير كلمة المرور بنجاح</div>
          </div>
        ) : (
          <>
            <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:14 }}>
              <Input label="كلمة المرور الحالية" value={old} onChange={setOld} type="password" dir="ltr" />
              <Input label="كلمة المرور الجديدة" value={newPwd} onChange={setNewPwd} type="password" dir="ltr" />
              <Input label="تأكيد كلمة المرور الجديدة" value={confirm} onChange={setConfirm} type="password" dir="ltr" />
            </div>
            {error && <div style={{ background:'#fee2e2', color:'#dc2626', padding:'8px 12px', borderRadius:8, fontSize:12, marginBottom:12, fontWeight:600 }}>⚠ {error}</div>}
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={onClose} style={{ padding:'9px 20px', borderRadius:9, border:'1.5px solid #e2e8f0', background:'white', color:'#374151', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>إلغاء</button>
              <button onClick={handleSave} style={{ padding:'9px 24px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#0f2744,#1e3a5f)', color:'white', fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
                💾 حفظ
              </button>
            </div>
          </>
        )}
      </div>
    </Overlay>
  );
}

/* ═══════════════════════════════
   SYSTEM SETTINGS PANEL
   ═══════════════════════════════ */
function SystemSettingsPanel({ session }: { session:ActiveSession }) {
  const [showReset, setShowReset] = useState(false);
  const stats = userDB.getStats();

  function exportUsers() {
    const data = userDB.exportUsers();
    const blob = new Blob([data], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `users_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  }

  function resetDB() {
    if (confirm('⚠️ هذا سيحذف جميع المستخدمين ويعيد التعيين للإعدادات الافتراضية. هل أنت متأكد؟')) {
      userDB.resetToDefaults();
      sessionStorage.removeItem('mosa_session');
      window.location.reload();
    }
  }

  return (
    <div>
      <SectionTitle title="إعدادات النظام" subtitle="System Settings" icon="⚙️" />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

        {/* System info */}
        <div style={{ background:'white', borderRadius:12, border:'1px solid #e2e8f0', padding:20 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#0f1f35', marginBottom:14 }}>📊 معلومات النظام</div>
          {[
            ['إجمالي المستخدمين', stats.totalUsers],
            ['المستخدمون النشطون', stats.activeUsers],
            ['مجموع الدخولات', stats.totalLogins],
            ['الإصدار', 'v2.1.0'],
            ['قاعدة البيانات', 'localStorage'],
            ['المستخدم الحالي', `${session.name} (${session.role})`],
          ].map(([k, v]) => (
            <div key={String(k)} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #f1f5f9', fontSize:12 }}>
              <span style={{ color:'#64748b' }}>{k}</span>
              <span style={{ fontWeight:700, color:'#0f1f35' }}>{String(v)}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ background:'white', borderRadius:12, border:'1px solid #e2e8f0', padding:20 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#0f1f35', marginBottom:14 }}>🛠️ إجراءات</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <button onClick={exportUsers} style={{ padding:'11px 16px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#0f2744,#1e3a5f)', color:'white', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', textAlign:'right' }}>
              📤 تصدير قائمة المستخدمين (JSON)
            </button>
            <button onClick={() => setShowReset(true)} style={{ padding:'11px 16px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#dc2626,#ef4444)', color:'white', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', textAlign:'right' }}>
              ♻️ إعادة تعيين قاعدة البيانات
            </button>
            <div style={{ background:'#fef3c7', borderRadius:8, padding:'10px 12px', fontSize:11, color:'#92400e', fontWeight:600 }}>
              ⚠️ إعادة التعيين ستحذف جميع المستخدمين المُضافين وتُعيد الإعدادات الافتراضية.
            </div>
          </div>
        </div>

        {/* Default credentials */}
        <div style={{ background:'white', borderRadius:12, border:'1px solid #e2e8f0', padding:20, gridColumn:'1/-1' }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#0f1f35', marginBottom:14 }}>🔑 بيانات الدخول الافتراضية</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
            {[
              { user:'superadmin', pwd:'Admin@2024', role:'Super Admin', icon:'👑', color:'#92400e', bg:'#fef3c7' },
              { user:'admin',      pwd:'admin123',  role:'Admin',       icon:'🏛️', color:'#1e40af', bg:'#dbeafe' },
              { user:'editor',     pwd:'editor123', role:'Editor',      icon:'✍️', color:'#065f46', bg:'#d1fae5' },
            ].map(u => (
              <div key={u.user} style={{ background:u.bg, borderRadius:10, padding:'12px 14px', border:`1px solid ${u.color}22` }}>
                <div style={{ fontSize:16, marginBottom:4 }}>{u.icon}</div>
                <div style={{ fontSize:12, fontWeight:700, color:u.color }}>{u.role}</div>
                <div style={{ fontSize:11, color:'#374151', fontFamily:'monospace', marginTop:4 }}>
                  👤 {u.user}<br />🔑 {u.pwd}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showReset && (
        <Overlay onClose={() => setShowReset(false)}>
          <div style={{ width:380, borderRadius:18, background:'white', padding:28, textAlign:'center' }}>
            <div style={{ fontSize:50, marginBottom:10 }}>♻️</div>
            <div style={{ fontSize:16, fontWeight:800, color:'#dc2626', marginBottom:8 }}>إعادة تعيين قاعدة البيانات</div>
            <div style={{ fontSize:13, color:'#64748b', marginBottom:20 }}>سيتم حذف جميع المستخدمين المُضافين وإعادة الإعدادات الافتراضية. سيتم إعادة تشغيل الجلسة.</div>
            <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
              <button onClick={() => setShowReset(false)} style={{ padding:'9px 20px', borderRadius:9, border:'1.5px solid #e2e8f0', background:'white', color:'#374151', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>إلغاء</button>
              <button onClick={resetDB} style={{ padding:'9px 24px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#dc2626,#ef4444)', color:'white', fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>♻️ إعادة التعيين</button>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  );
}

/* ═══════════════════════════════
   OVERLAY
   ═══════════════════════════════ */
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      {children}
    </div>
  );
}

/* ═══════════════════════════════
   MAIN USER MANAGEMENT COMPONENT
   ═══════════════════════════════ */
interface UserManagementProps {
  session: ActiveSession;
}

type Tab = 'users' | 'logs' | 'settings' | 'my-account';

export default function UserManagement({ session }: UserManagementProps) {
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<UserStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'role' | 'lastLogin' | 'loginCount'>('name');

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [showPermissions, setShowPermissions] = useState<AppUser | null>(null);
  const [showResetPwd, setShowResetPwd] = useState<AppUser | null>(null);
  const [showDelete, setShowDelete] = useState<AppUser | null>(null);
  const [showChangeMyPwd, setShowChangeMyPwd] = useState(false);

  const refresh = useCallback(() => { setUsers(userDB.getUsers()); }, []);
  useEffect(() => { refresh(); }, [refresh]);

  /* Filtering + sorting */
  const displayUsers = users
    .filter(u => {
      const q = search.toLowerCase();
      const matchQ = !q || u.name.includes(q) || u.username.includes(q) || u.email.toLowerCase().includes(q);
      const matchRole = filterRole === 'all' || u.role === filterRole;
      const matchStatus = filterStatus === 'all' || u.status === filterStatus;
      return matchQ && matchRole && matchStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'role') return a.role.localeCompare(b.role);
      if (sortBy === 'loginCount') return (b.loginCount || 0) - (a.loginCount || 0);
      if (sortBy === 'lastLogin') return (b.lastLogin || '').localeCompare(a.lastLogin || '');
      return 0;
    });

  const isSuperAdmin = session.role === 'superadmin';
  const isAdmin = session.role === 'admin' || isSuperAdmin;

  const TABS: { key: Tab; label: string; icon: string; adminOnly?: boolean }[] = [
    { key:'users',      label:'المستخدمون',        icon:'👥' },
    { key:'logs',       label:'سجل المراقبة',      icon:'📋', adminOnly:true },
    { key:'settings',   label:'إعدادات النظام',    icon:'⚙️', adminOnly:true },
    { key:'my-account', label:'حسابي',             icon:'🙋' },
  ];

  return (
    <div style={{ padding:'28px 32px', maxWidth:1300, margin:'0 auto' }}>

      {/* Page header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:900, color:'#0f1f35', margin:'0 0 4px' }}>
            👥 إدارة المستخدمين والحسابات
          </h1>
          <p style={{ fontSize:12, color:'#94a3b8', margin:0 }}>
            Gestion des comptes utilisateurs — Système de contrôle d'accès
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => { setEditUser(null); setShowForm(true); }}
            style={{ padding:'11px 22px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#0f2744,#1e3a5f)', color:'white', fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:8, boxShadow:'0 4px 16px rgba(15,39,68,0.25)' }}>
            ➕ إضافة مستخدم جديد
          </button>
        )}
      </div>

      {/* Stats */}
      <StatsBar />

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:24, background:'#f8fafc', borderRadius:12, padding:4, border:'1px solid #e2e8f0', width:'fit-content' }}>
        {TABS.filter(t => !t.adminOnly || isAdmin).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{
              padding:'9px 18px', borderRadius:9, border:'none', fontFamily:'inherit',
              fontSize:12, fontWeight:700, cursor:'pointer', transition:'all 0.2s',
              background: activeTab === tab.key ? 'linear-gradient(135deg,#0f2744,#1e3a5f)' : 'transparent',
              color: activeTab === tab.key ? 'white' : '#64748b',
              boxShadow: activeTab === tab.key ? '0 2px 8px rgba(15,39,68,0.2)' : 'none',
              display:'flex', alignItems:'center', gap:6,
            }}>
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* USERS TAB */}
      {activeTab === 'users' && (
        <div>
          {/* Filter bar */}
          <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
            <div style={{ position:'relative', flex:1, minWidth:200 }}>
              <span style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)', fontSize:14, opacity:0.4 }}>🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو المستخدم أو البريد..."
                style={{ width:'100%', padding:'9px 34px 9px 10px', border:'1.5px solid #e2e8f0', borderRadius:9, fontSize:12, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}
                onFocus={e => { e.target.style.borderColor='#0f2744'; }} onBlur={e => { e.target.style.borderColor='#e2e8f0'; }} />
            </div>
            <select value={filterRole} onChange={e => setFilterRole(e.target.value as UserRole | 'all')}
              style={{ padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:9, fontSize:12, background:'white', fontFamily:'inherit', cursor:'pointer', outline:'none' }}>
              <option value="all">كل الأدوار</option>
              {(Object.keys(ROLE_LABELS) as UserRole[]).map(r => <option key={r} value={r}>{ROLE_LABELS[r].icon} {ROLE_LABELS[r].ar}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as UserStatus | 'all')}
              style={{ padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:9, fontSize:12, background:'white', fontFamily:'inherit', cursor:'pointer', outline:'none' }}>
              <option value="all">كل الحالات</option>
              {(Object.keys(STATUS_LABELS) as UserStatus[]).map(s => <option key={s} value={s}>{STATUS_LABELS[s].ar}</option>)}
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
              style={{ padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:9, fontSize:12, background:'white', fontFamily:'inherit', cursor:'pointer', outline:'none' }}>
              <option value="name">ترتيب: الاسم</option>
              <option value="role">ترتيب: الدور</option>
              <option value="loginCount">ترتيب: الدخولات</option>
              <option value="lastLogin">ترتيب: آخر دخول</option>
            </select>
            <div style={{ fontSize:12, color:'#94a3b8', whiteSpace:'nowrap' }}>{displayUsers.length} مستخدم</div>
          </div>

          {/* User grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:16 }}>
            {displayUsers.map(user => (
              <UserCard key={user.id} user={user} currentSession={session}
                onEdit={u => { setEditUser(u); setShowForm(true); }}
                onDelete={u => setShowDelete(u)}
                onToggle={u => { userDB.toggleStatus(u.id); refresh(); }}
                onResetPwd={u => setShowResetPwd(u)}
                onPermissions={u => setShowPermissions(u)} />
            ))}
            {displayUsers.length === 0 && (
              <div style={{ gridColumn:'1/-1', textAlign:'center', padding:40, color:'#94a3b8', fontSize:14 }}>
                لا توجد نتائج مطابقة للبحث
              </div>
            )}
          </div>
        </div>
      )}

      {/* LOGS TAB */}
      {activeTab === 'logs' && isAdmin && <AuditLogPanel />}

      {/* SETTINGS TAB */}
      {activeTab === 'settings' && isSuperAdmin && <SystemSettingsPanel session={session} />}
      {activeTab === 'settings' && !isSuperAdmin && isAdmin && (
        <div style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>
          <div style={{ fontSize:40, marginBottom:10 }}>🔒</div>
          <div style={{ fontSize:14, fontWeight:700 }}>إعدادات النظام متاحة للمدير العام فقط</div>
        </div>
      )}

      {/* MY ACCOUNT TAB */}
      {activeTab === 'my-account' && (
        <div style={{ maxWidth:600 }}>
          <SectionTitle title="معلومات حسابي" subtitle="Informations de mon compte" icon="🙋" />
          {(() => {
            const me = userDB.getUserById(session.userId);
            if (!me) return null;
            const role = ROLE_LABELS[me.role];
            const status = STATUS_LABELS[me.status];
            return (
              <div style={{ background:'white', borderRadius:16, border:'1.5px solid #e2e8f0', padding:24 }}>
                <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:20, paddingBottom:20, borderBottom:'1px solid #f1f5f9' }}>
                  <div style={{ width:64, height:64, borderRadius:16, background:'linear-gradient(135deg,#f8fafc,#e2e8f0)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, border:'2px solid #e2e8f0' }}>{me.avatar}</div>
                  <div>
                    <div style={{ fontSize:18, fontWeight:800, color:'#0f1f35' }}>{me.name}</div>
                    <div style={{ fontSize:12, color:'#94a3b8', fontFamily:'monospace' }}>@{me.username}</div>
                    <div style={{ display:'flex', gap:8, marginTop:6 }}>
                      <Badge color={role.color} bg={role.bg}>{role.icon} {role.ar}</Badge>
                      <Badge color={status.color} bg={status.bg}>{status.ar}</Badge>
                    </div>
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
                  {[
                    ['البريد الإلكتروني', me.email || '—'],
                    ['الهاتف', me.phone || '—'],
                    ['عدد الدخولات', String(me.loginCount || 0)],
                    ['آخر دخول', me.lastLogin ? new Date(me.lastLogin).toLocaleString('ar-MA') : 'أول مرة'],
                    ['مدة انتهاء الجلسة', `${me.sessionTimeout} دقيقة`],
                    ['تاريخ الإنشاء', new Date(me.createdAt).toLocaleDateString('ar-MA')],
                  ].map(([k, v]) => (
                    <div key={k} style={{ padding:'10px 12px', background:'#f8fafc', borderRadius:9, border:'1px solid #e2e8f0' }}>
                      <div style={{ fontSize:10, color:'#94a3b8', fontWeight:600, marginBottom:3 }}>{k}</div>
                      <div style={{ fontSize:13, fontWeight:700, color:'#0f1f35' }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:10 }}>🔑 صلاحياتي</div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {me.permissions.map(p => {
                      const pInfo = ALL_PERMISSIONS.find(pp => pp.key === p);
                      return pInfo ? (
                        <span key={p} style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', background:'#dbeafe', color:'#1e40af', borderRadius:20, fontSize:11, fontWeight:700 }}>
                          {pInfo.icon} {pInfo.ar}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
                <button onClick={() => setShowChangeMyPwd(true)} style={{ padding:'11px 22px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#0f2744,#1e3a5f)', color:'white', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  🔐 تغيير كلمة المرور
                </button>
              </div>
            );
          })()}
        </div>
      )}

      {/* MODALS */}
      {showForm && <UserFormModal user={editUser} onSave={() => { refresh(); setShowForm(false); setEditUser(null); }} onClose={() => { setShowForm(false); setEditUser(null); }} />}
      {showPermissions && <PermissionsModal user={showPermissions} onSave={() => { refresh(); setShowPermissions(null); }} onClose={() => setShowPermissions(null)} />}
      {showResetPwd && <ResetPasswordModal user={showResetPwd} onSave={() => { setShowResetPwd(null); }} onClose={() => setShowResetPwd(null)} />}
      {showDelete && <DeleteConfirmModal user={showDelete} onConfirm={() => { userDB.deleteUser(showDelete.id); refresh(); setShowDelete(null); }} onClose={() => setShowDelete(null)} />}
      {showChangeMyPwd && <ChangeMyPasswordModal session={session} onClose={() => setShowChangeMyPwd(false)} />}
    </div>
  );
}
