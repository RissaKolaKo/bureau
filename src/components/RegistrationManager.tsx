import { useState, useEffect, useCallback } from 'react';
import { authService as userDB, RegistrationRequest, RegistrationStatus, UserRole, ActiveSession } from '../utils/authService';
import { sendApprovalEmail, sendRejectionEmail } from '../utils/emailService';

/* ── Role options ── superadmin NEVER appears ── */
const ALL_ROLE_OPTIONS: { value: UserRole; label: string; icon: string; color: string; bg: string }[] = [
  { value:'viewer', label:'مشاهد — Lecteur',       icon:'👁️', color:'#374151', bg:'#f3f4f6' },
  { value:'editor', label:'كاتب — Éditeur',        icon:'✍️', color:'#065f46', bg:'#d1fae5' },
  { value:'admin',  label:'مدير — Administrateur', icon:'🏛️', color:'#1e40af', bg:'#dbeafe' },
  /* superadmin is intentionally excluded from this list — cannot be assigned to anyone */
];

/** Returns allowed role options based on who is approving */
function getRoleOptions(approverRole: string) {
  if (approverRole === 'superadmin') {
    // superadmin can assign: viewer, editor, admin (but NOT superadmin)
    return ALL_ROLE_OPTIONS;
  }
  if (approverRole === 'admin') {
    // admin can assign: viewer, editor, admin (but NOT superadmin)
    return ALL_ROLE_OPTIONS;
  }
  // fallback — only viewer/editor
  return ALL_ROLE_OPTIONS.filter(r => r.value === 'viewer' || r.value === 'editor');
}

const STATUS_CONF: Record<RegistrationStatus, { label: string; ar: string; color: string; bg: string; dot: string; icon: string }> = {
  pending:  { label:'Pending',  ar:'قيد المراجعة', color:'#b45309', bg:'#fef3c7', dot:'#f59e0b', icon:'⏳' },
  approved: { label:'Approved', ar:'مقبول',         color:'#065f46', bg:'#d1fae5', dot:'#10b981', icon:'✅' },
  rejected: { label:'Rejected', ar:'مرفوض',         color:'#9f1239', bg:'#ffe4e6', dot:'#f43f5e', icon:'❌' },
};

const PROVIDER_CONF: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  local:       { label:'Email + Password', icon:'📧', color:'#1e40af', bg:'#dbeafe' },
  google:      { label:'Google',           icon:'🔴', color:'#dc2626', bg:'#fee2e2' },
  'email-link':{ label:'Email Link',       icon:'🔗', color:'#7c3aed', bg:'#ede9fe' },
};

/* ── Badge ── */
function Badge({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 9px', borderRadius:20, background:bg, color, fontSize:10, fontWeight:700, whiteSpace:'nowrap' }}>
      {children}
    </span>
  );
}

/* ── Approve Modal ── */
function ApproveModal({ req, session, onDone, onClose }: {
  req: RegistrationRequest; session: ActiveSession; onDone: () => void; onClose: () => void;
}) {
  const [role, setRole] = useState<UserRole>('editor');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleApprove() {
    setLoading(true);
    await new Promise(r => setTimeout(r, 500));
    const result = userDB.approveRegistration(req.id, session.username, role);
    if (!result.success) { setLoading(false); setError(result.error || 'خطأ'); return; }
    // Send real approval email
    sendApprovalEmail({
      to: req.email,
      name: req.name,
      username: req.username,
      role,
      loginUrl: window.location.origin + window.location.pathname,
    }).catch(() => {/* silent */});
    setLoading(false);
    onDone();
  }

  return (
    <Overlay onClose={onClose}>
      <div style={{ width:460, borderRadius:18, background:'white', padding:28 }}>
        <div style={{ textAlign:'center', marginBottom:20 }}>
          <div style={{ fontSize:44, marginBottom:10 }}>✅</div>
          <h3 style={{ fontSize:16, fontWeight:800, color:'#065f46', margin:'0 0 6px' }}>قبول طلب التسجيل</h3>
          <p style={{ fontSize:12, color:'#64748b', margin:0 }}>Approuver la demande d'inscription</p>
        </div>

        {/* Request summary */}
        <div style={{ background:'#f8fafc', borderRadius:12, padding:'14px 16px', marginBottom:18 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {[
              ['👤 الاسم', req.name],
              ['📧 البريد', req.email],
              ['🔖 المستخدم', `@${req.username}`],
              ['🔗 المزود', PROVIDER_CONF[req.provider]?.label || req.provider],
            ].map(([k, v]) => (
              <div key={k} style={{ fontSize:11 }}>
                <span style={{ color:'#94a3b8' }}>{k}: </span>
                <span style={{ fontWeight:700, color:'#0f1f35' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Role assignment */}
        <div style={{ marginBottom:18 }}>
          <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:10 }}>
            تعيين الدور / Rôle à assigner:
          </label>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {getRoleOptions(session.role).map((r: typeof ALL_ROLE_OPTIONS[number]) => (
              <button key={r.value} onClick={() => setRole(r.value)}
                style={{
                  padding:'10px 12px', borderRadius:10, border:`2px solid ${role === r.value ? r.color : '#e2e8f0'}`,
                  background: role === r.value ? r.bg : 'white',
                  cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:8,
                  transition:'all 0.15s',
                }}>
                <span style={{ fontSize:18 }}>{r.icon}</span>
                <span style={{ fontSize:11, fontWeight:700, color: role === r.value ? r.color : '#374151' }}>{r.label}</span>
              </button>
            ))}
          </div>
        </div>

        {error && <div style={{ background:'#fee2e2', color:'#dc2626', padding:'8px 12px', borderRadius:8, fontSize:12, marginBottom:12, fontWeight:600 }}>⚠ {error}</div>}

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={cancelBtn}>إلغاء</button>
          <button onClick={handleApprove} disabled={loading}
            style={{ ...actionBtn, background:'linear-gradient(135deg,#065f46,#10b981)', opacity: loading ? 0.7 : 1 }}>
            {loading ? '⏳ جاري القبول...' : '✅ قبول وإنشاء الحساب'}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

/* ── Reject Modal ── */
function RejectModal({ req, session, onDone, onClose }: {
  req: RegistrationRequest; session: ActiveSession; onDone: () => void; onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const QUICK_REASONS = [
    'المعلومات المقدمة غير كاملة أو غير صحيحة',
    'لا تتوفر صلاحية الوصول لهذا النظام',
    'البريد الإلكتروني المستخدم غير مؤسسي',
    'يرجى التواصل مع الإدارة لمزيد من المعلومات',
  ];

  async function handleReject() {
    if (!reason.trim()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    userDB.rejectRegistration(req.id, session.username, reason);
    // Send real rejection email
    sendRejectionEmail({
      to: req.email,
      name: req.name,
      reason,
    }).catch(() => {/* silent */});
    setLoading(false);
    onDone();
  }

  return (
    <Overlay onClose={onClose}>
      <div style={{ width:460, borderRadius:18, background:'white', padding:28 }}>
        <div style={{ textAlign:'center', marginBottom:20 }}>
          <div style={{ fontSize:44, marginBottom:10 }}>❌</div>
          <h3 style={{ fontSize:16, fontWeight:800, color:'#dc2626', margin:'0 0 6px' }}>رفض طلب التسجيل</h3>
          <p style={{ fontSize:12, color:'#64748b', margin:0 }}>Rejeter la demande d'inscription</p>
        </div>

        <div style={{ background:'#fef2f2', borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:12, color:'#7f1d1d' }}>
          طلب من: <strong>{req.name}</strong> ({req.email})
        </div>

        <div style={{ marginBottom:12 }}>
          <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:8 }}>
            أسباب سريعة:
          </label>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {QUICK_REASONS.map(r => (
              <button key={r} onClick={() => setReason(r)}
                style={{ padding:'8px 12px', borderRadius:8, border:`1.5px solid ${reason === r ? '#dc2626' : '#e2e8f0'}`, background: reason === r ? '#fee2e2' : 'white', cursor:'pointer', fontFamily:'inherit', fontSize:11, textAlign:'right', color: reason === r ? '#dc2626' : '#374151', transition:'all 0.15s' }}>
                {r}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom:16 }}>
          <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:6 }}>أو اكتب سبباً مخصصاً:</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="سبب رفض الطلب..."
            style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:9, fontSize:12, fontFamily:'inherit', resize:'vertical', outline:'none', boxSizing:'border-box' }} />
        </div>

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={cancelBtn}>إلغاء</button>
          <button onClick={handleReject} disabled={loading || !reason.trim()}
            style={{ ...actionBtn, background:'linear-gradient(135deg,#dc2626,#ef4444)', opacity: (loading || !reason.trim()) ? 0.5 : 1, cursor: (!reason.trim() || loading) ? 'not-allowed' : 'pointer' }}>
            {loading ? '⏳ جاري الرفض...' : '❌ رفض الطلب'}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

/* ── Request Card ── */
function RequestCard({ req, session, onRefresh }: { req: RegistrationRequest; session: ActiveSession; onRefresh: () => void }) {
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const statusConf = STATUS_CONF[req.status];
  const providerConf = PROVIDER_CONF[req.provider] || PROVIDER_CONF.local;

  return (
    <>
      <div style={{
        background:'white', borderRadius:14, border:`1.5px solid ${req.status === 'pending' ? '#f59e0b40' : '#e2e8f0'}`,
        padding:'18px 20px', boxShadow: req.status === 'pending' ? '0 0 0 2px rgba(245,158,11,0.1)' : '0 1px 4px rgba(0,0,0,0.05)',
        transition:'box-shadow 0.2s',
      }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:12 }}>
          {/* Avatar */}
          <div style={{ width:46, height:46, borderRadius:12, background:'linear-gradient(135deg,#f8fafc,#e2e8f0)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0, border:'2px solid #e2e8f0' }}>
            {req.googlePicture
              ? <img src={req.googlePicture} alt="" style={{ width:'100%', height:'100%', borderRadius:10, objectFit:'cover' }} />
              : '👤'}
          </div>

          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:800, color:'#0f1f35', marginBottom:2 }}>{req.name}</div>
            <div style={{ fontSize:11, color:'#94a3b8', direction:'ltr', fontFamily:'monospace', marginBottom:4 }}>{req.email}</div>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
              <Badge color={statusConf.color} bg={statusConf.bg}>
                <span style={{ width:5, height:5, borderRadius:'50%', background:statusConf.dot, display:'inline-block' }} />
                {statusConf.ar}
              </Badge>
              <Badge color={providerConf.color} bg={providerConf.bg}>{providerConf.icon} {providerConf.label}</Badge>
              <Badge color='#374151' bg='#f3f4f6'>🔖 @{req.username}</Badge>
            </div>
          </div>

          <div style={{ textAlign:'left', fontSize:10, color:'#94a3b8', fontFamily:'monospace', whiteSpace:'nowrap' }}>
            {new Date(req.requestedAt).toLocaleDateString('ar-MA')}<br />
            {new Date(req.requestedAt).toLocaleTimeString('ar-MA', { hour:'2-digit', minute:'2-digit' })}
          </div>
        </div>

        {/* Notes */}
        {req.notes && (
          <div style={{ background:'#f8fafc', borderRadius:8, padding:'8px 12px', marginBottom:10, fontSize:11, color:'#374151' }}>
            💬 {req.notes}
          </div>
        )}

        {/* Expanded details */}
        {expanded && (
          <div style={{ background:'#f8fafc', borderRadius:8, padding:'10px 12px', marginBottom:10, display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, fontSize:11 }}>
            <div><span style={{ color:'#94a3b8' }}>📞 الهاتف: </span><span style={{ fontWeight:700 }}>{req.phone || '—'}</span></div>
            <div><span style={{ color:'#94a3b8' }}>🌐 المتصفح: </span><span style={{ fontWeight:700, fontSize:9 }}>{req.userAgent.substring(0,40)}...</span></div>
            <div><span style={{ color:'#94a3b8' }}>🆔 رقم الطلب: </span><span style={{ fontWeight:700, fontFamily:'monospace', fontSize:9 }}>{req.id}</span></div>
            {req.reviewedAt && <div><span style={{ color:'#94a3b8' }}>📅 تاريخ المراجعة: </span><span style={{ fontWeight:700 }}>{new Date(req.reviewedAt).toLocaleDateString('ar-MA')}</span></div>}
            {req.reviewedBy && <div><span style={{ color:'#94a3b8' }}>👮 راجعه: </span><span style={{ fontWeight:700 }}>@{req.reviewedBy}</span></div>}
            {req.rejectionReason && <div style={{ gridColumn:'1/-1', color:'#dc2626' }}>❌ سبب الرفض: {req.rejectionReason}</div>}
          </div>
        )}

        {/* Actions */}
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {req.status === 'pending' && (
            <>
              <button onClick={() => setShowApprove(true)}
                style={{ padding:'8px 16px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#065f46,#10b981)', color:'white', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:5 }}>
                ✅ قبول
              </button>
              <button onClick={() => setShowReject(true)}
                style={{ padding:'8px 16px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#dc2626,#ef4444)', color:'white', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:5 }}>
                ❌ رفض
              </button>
            </>
          )}
          <button onClick={() => setExpanded(e => !e)}
            style={{ padding:'7px 12px', borderRadius:8, border:'1.5px solid #e2e8f0', background:'white', color:'#64748b', fontSize:11, cursor:'pointer', fontFamily:'inherit', marginRight:'auto' }}>
            {expanded ? '▲ إخفاء التفاصيل' : '▼ عرض التفاصيل'}
          </button>
        </div>
      </div>

      {showApprove && <ApproveModal req={req} session={session} onDone={() => { onRefresh(); setShowApprove(false); }} onClose={() => setShowApprove(false)} />}
      {showReject && <RejectModal req={req} session={session} onDone={() => { onRefresh(); setShowReject(false); }} onClose={() => setShowReject(false)} />}
    </>
  );
}

/* ── Stats row ── */
function StatsRow({ regs }: { regs: RegistrationRequest[] }) {
  const stats = {
    total: regs.length,
    pending: regs.filter(r => r.status === 'pending').length,
    approved: regs.filter(r => r.status === 'approved').length,
    rejected: regs.filter(r => r.status === 'rejected').length,
    google: regs.filter(r => r.provider === 'google').length,
    local: regs.filter(r => r.provider === 'local').length,
  };
  const items = [
    { label:'إجمالي الطلبات', value:stats.total, icon:'📋', color:'#1e40af', bg:'#dbeafe' },
    { label:'قيد المراجعة',   value:stats.pending, icon:'⏳', color:'#b45309', bg:'#fef3c7' },
    { label:'مقبولة',          value:stats.approved, icon:'✅', color:'#065f46', bg:'#d1fae5' },
    { label:'مرفوضة',          value:stats.rejected, icon:'❌', color:'#9f1239', bg:'#ffe4e6' },
    { label:'عبر Google',      value:stats.google,   icon:'🔴', color:'#dc2626', bg:'#fee2e2' },
    { label:'بريد إلكتروني',   value:stats.local,    icon:'📧', color:'#374151', bg:'#f3f4f6' },
  ];
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:10, marginBottom:22 }}>
      {items.map(item => (
        <div key={item.label} style={{ background:item.bg, borderRadius:11, padding:'12px 14px', border:`1px solid ${item.color}22` }}>
          <div style={{ fontSize:18, marginBottom:3 }}>{item.icon}</div>
          <div style={{ fontSize:22, fontWeight:900, color:item.color }}>{item.value}</div>
          <div style={{ fontSize:9, color:item.color, opacity:0.8, fontWeight:600 }}>{item.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN REGISTRATION MANAGER COMPONENT
   ═══════════════════════════════════════════ */
interface RegistrationManagerProps {
  session: ActiveSession;
}

export default function RegistrationManager({ session }: RegistrationManagerProps) {
  const [regs, setRegs] = useState<RegistrationRequest[]>([]);
  const [filterStatus, setFilterStatus] = useState<RegistrationStatus | 'all'>('all');
  const [filterProvider, setFilterProvider] = useState<'all' | 'local' | 'google'>('all');
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const refresh = useCallback(() => {
    setRegs(userDB.getRegistrations());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const displayed = regs
    .filter(r => {
      const q = search.toLowerCase();
      const matchQ = !q || r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || r.username.includes(q);
      const matchStatus = filterStatus === 'all' || r.status === filterStatus;
      const matchProvider = filterProvider === 'all' || r.provider === filterProvider;
      return matchQ && matchStatus && matchProvider;
    })
    .sort((a, b) => {
      const ta = new Date(a.requestedAt).getTime();
      const tb = new Date(b.requestedAt).getTime();
      return sortOrder === 'newest' ? tb - ta : ta - tb;
    });

  const pendingCount = regs.filter(r => r.status === 'pending').length;

  return (
    <div style={{ padding:'28px 32px', maxWidth:1200, margin:'0 auto' }}>
      {/* Page header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:900, color:'#0f1f35', margin:'0 0 4px', display:'flex', alignItems:'center', gap:10 }}>
            📬 إدارة طلبات التسجيل
            {pendingCount > 0 && (
              <span style={{ background:'#dc2626', color:'white', fontSize:12, fontWeight:900, padding:'2px 10px', borderRadius:20, marginRight:6 }}>
                {pendingCount} جديد
              </span>
            )}
          </h1>
          <p style={{ fontSize:12, color:'#94a3b8', margin:0 }}>
            Gestion des demandes d'inscription — Approbation des nouveaux comptes
          </p>
        </div>
        <button onClick={refresh}
          style={{ padding:'9px 18px', borderRadius:9, border:'1.5px solid #e2e8f0', background:'white', color:'#374151', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6 }}>
          🔄 تحديث
        </button>
      </div>

      {/* Stats */}
      <StatsRow regs={regs} />

      {/* Filters */}
      <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap', alignItems:'center', padding:'14px 16px', background:'white', borderRadius:12, border:'1px solid #e2e8f0' }}>
        <div style={{ position:'relative', flex:1, minWidth:200 }}>
          <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', fontSize:14, opacity:0.4 }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم، البريد، المستخدم..."
            style={{ width:'100%', padding:'8px 32px 8px 10px', border:'1.5px solid #e2e8f0', borderRadius:9, fontSize:12, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}
            onFocus={e => { e.target.style.borderColor='#0f2744'; }} onBlur={e => { e.target.style.borderColor='#e2e8f0'; }} />
        </div>

        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as RegistrationStatus | 'all')}
          style={{ padding:'8px 12px', border:'1.5px solid #e2e8f0', borderRadius:9, fontSize:12, background:'white', fontFamily:'inherit', cursor:'pointer', outline:'none' }}>
          <option value="all">📋 كل الحالات</option>
          <option value="pending">⏳ قيد المراجعة</option>
          <option value="approved">✅ مقبولة</option>
          <option value="rejected">❌ مرفوضة</option>
        </select>

        <select value={filterProvider} onChange={e => setFilterProvider(e.target.value as typeof filterProvider)}
          style={{ padding:'8px 12px', border:'1.5px solid #e2e8f0', borderRadius:9, fontSize:12, background:'white', fontFamily:'inherit', cursor:'pointer', outline:'none' }}>
          <option value="all">🔗 كل المزودين</option>
          <option value="local">📧 Email + Password</option>
          <option value="google">🔴 Google</option>
        </select>

        <select value={sortOrder} onChange={e => setSortOrder(e.target.value as typeof sortOrder)}
          style={{ padding:'8px 12px', border:'1.5px solid #e2e8f0', borderRadius:9, fontSize:12, background:'white', fontFamily:'inherit', cursor:'pointer', outline:'none' }}>
          <option value="newest">⬇ الأحدث أولاً</option>
          <option value="oldest">⬆ الأقدم أولاً</option>
        </select>

        <span style={{ fontSize:11, color:'#94a3b8', whiteSpace:'nowrap' }}>{displayed.length} طلب</span>
      </div>

      {/* Pending alert */}
      {pendingCount > 0 && filterStatus !== 'approved' && filterStatus !== 'rejected' && (
        <div style={{ background:'linear-gradient(135deg,#fef3c7,#fffbeb)', border:'1.5px solid #f59e0b40', borderRadius:12, padding:'14px 18px', marginBottom:18, display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:24 }}>⏳</span>
          <div>
            <div style={{ fontSize:13, fontWeight:800, color:'#92400e' }}>
              {pendingCount} طلب تسجيل ينتظر المراجعة
            </div>
            <div style={{ fontSize:11, color:'#b45309' }}>
              يرجى مراجعة الطلبات وقبول أو رفض كل طلب.
              {pendingCount > 1 && ` الطلبات الأقدم تعود إلى ${new Date(regs.filter(r=>r.status==='pending').sort((a,b)=>new Date(a.requestedAt).getTime()-new Date(b.requestedAt).getTime())[0]?.requestedAt || '').toLocaleDateString('ar-MA')}.`}
            </div>
          </div>
        </div>
      )}

      {/* Requests list */}
      {displayed.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 20px', color:'#94a3b8' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📭</div>
          <div style={{ fontSize:15, fontWeight:700, marginBottom:6 }}>
            {regs.length === 0 ? 'لا توجد طلبات تسجيل بعد' : 'لا توجد نتائج مطابقة'}
          </div>
          <div style={{ fontSize:12 }}>
            {regs.length === 0 ? 'ستظهر هنا طلبات التسجيل عند استلامها' : 'جرب تغيير معايير البحث والفلترة'}
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {displayed.map(req => (
            <RequestCard key={req.id} req={req} session={session} onRefresh={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Helpers ── */
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      {children}
    </div>
  );
}

const cancelBtn: React.CSSProperties = {
  padding:'9px 20px', borderRadius:9, border:'1.5px solid #e2e8f0',
  background:'white', color:'#374151', fontSize:13, fontWeight:700,
  cursor:'pointer', fontFamily:'inherit',
};

const actionBtn: React.CSSProperties = {
  padding:'9px 24px', borderRadius:9, border:'none',
  color:'white', fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit',
};
