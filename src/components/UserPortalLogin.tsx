/* ═══════════════════════════════════════════════════════════════════════
   USER PORTAL LOGIN — Email-only authentication
   Supports: Login tab | Register tab | Forgot password
   External tab control via defaultTab prop
   ═══════════════════════════════════════════════════════════════════════ */
import { useState, useEffect } from 'react';
import { authService, ActiveSession } from '../utils/authService';
import { sendPasswordResetEmail, sendRegistrationReceivedEmail } from '../utils/emailService';

export type LoginTab = 'login' | 'register' | 'forgot';

interface UserPortalLoginProps {
  onLogin: (session: ActiveSession) => void;
  onGoToAdmin: () => void;
  onGoHome?: () => void;
  defaultTab?: LoginTab;
}

/* ── Moroccan geometric background ── */
function MoroccanBg() {
  return (
    <div style={{ position:'absolute', inset:0, opacity:0.04, pointerEvents:'none', overflow:'hidden' }}>
      {Array.from({ length:7 }).map((_, r) =>
        Array.from({ length:10 }).map((_, c) => (
          <div key={`${r}-${c}`} style={{
            position:'absolute', left: c*140 - 50, top: r*140 - 50,
            width:90, height:90, border:'1.5px solid #c8962c',
            transform:'rotate(45deg)', borderRadius:3,
          }} />
        ))
      )}
    </div>
  );
}

/* ── Spinner ── */
function Spinner({ dark=false }: { dark?: boolean }) {
  return (
    <div style={{
      width:14, height:14,
      border:`2px solid ${dark ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)'}`,
      borderTop:`2px solid ${dark ? '#0f2744' : 'white'}`,
      borderRadius:'50%', animation:'spin 0.7s linear infinite', flexShrink:0,
    }} />
  );
}

/* ── Input field ── */
function Input({
  label, value, onChange, type='text', placeholder='', required=false,
  dir='ltr', icon='', error='', disabled=false, onForgot,
}: {
  label: string; value: string; onChange: (v:string)=>void;
  type?: string; placeholder?: string; required?: boolean;
  dir?: string; icon?: string; error?: string;
  disabled?: boolean; onForgot?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const isPassword = type === 'password';
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
        <label style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.5)', display:'block' }}>
          {label} {required && <span style={{ color:'#f87171' }}>*</span>}
        </label>
        {onForgot && (
          <button type="button" onClick={onForgot}
            style={{ background:'none', border:'none', color:'#e8b84b', fontSize:10, cursor:'pointer', fontFamily:'inherit', textDecoration:'underline' }}>
            نسيت كلمة المرور؟
          </button>
        )}
      </div>
      <div style={{ position:'relative' }}>
        {icon && (
          <span style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)', fontSize:14, opacity:0.35, pointerEvents:'none' }}>
            {icon}
          </span>
        )}
        <input
          type={isPassword && showPwd ? 'text' : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          dir={dir}
          disabled={disabled}
          autoComplete={isPassword ? 'current-password' : 'off'}
          style={{
            width:'100%',
            padding:`11px ${icon ? '38px' : '13px'} 11px ${isPassword ? '38px' : '13px'}`,
            background: disabled ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)',
            border:`1.5px solid ${error ? 'rgba(248,113,113,0.6)' : focused ? '#c8962c' : 'rgba(255,255,255,0.1)'}`,
            borderRadius:10, color: disabled ? 'rgba(255,255,255,0.3)' : 'white',
            fontSize:13, fontFamily: dir === 'ltr' ? 'Inter, monospace' : 'inherit',
            outline:'none', boxSizing:'border-box', transition:'border-color 0.2s',
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {isPassword && (
          <button type="button" onClick={() => setShowPwd(p => !p)}
            style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:14, opacity:0.5, padding:0, color:'white' }}>
            {showPwd ? '🙈' : '👁️'}
          </button>
        )}
      </div>
      {error && (
        <div style={{ marginTop:5, fontSize:11, color:'#fca5a5', fontWeight:600 }}>⚠ {error}</div>
      )}
    </div>
  );
}

/* ── Tab Button ── */
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex:1, padding:'11px 8px', borderRadius:10, border:'none',
        background: active ? 'linear-gradient(135deg,#c8962c,#e8b84b)' : 'rgba(255,255,255,0.05)',
        color: active ? '#0f2744' : 'rgba(255,255,255,0.45)',
        fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit',
        transition:'all 0.2s', boxShadow: active ? '0 4px 16px rgba(200,150,44,0.3)' : 'none',
      }}>
      {children}
    </button>
  );
}

/* ── Alert ── */
function Alert({ type, msg }: { type: 'error' | 'success' | 'info'; msg: string }) {
  const cfg = {
    error:   { bg:'rgba(220,38,38,0.12)',  border:'rgba(220,38,38,0.3)',  color:'#fca5a5', icon:'⚠' },
    success: { bg:'rgba(16,185,129,0.12)', border:'rgba(16,185,129,0.3)', color:'#6ee7b7', icon:'✅' },
    info:    { bg:'rgba(59,130,246,0.12)', border:'rgba(59,130,246,0.3)', color:'#93c5fd', icon:'ℹ️' },
  }[type];
  return (
    <div style={{ background:cfg.bg, border:`1px solid ${cfg.border}`, borderRadius:9, padding:'10px 14px', color:cfg.color, fontSize:12, fontWeight:600, textAlign:'center', display:'flex', alignItems:'center', gap:8, justifyContent:'center' }}>
      <span>{cfg.icon}</span> {msg}
    </div>
  );
}

/* ════════════════════════════════════════════
   LOGIN FORM
════════════════════════════════════════════ */
function LoginForm({ onLogin, onForgot }: {
  onLogin: (s: ActiveSession) => void;
  onForgot: () => void;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!username.trim()) { setError('أدخل اسم المستخدم أو البريد الإلكتروني'); return; }
    if (!password) { setError('أدخل كلمة المرور'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    const result = authService.login(username.trim(), password, false);
    setLoading(false);
    if (result.success && result.session) {
      onLogin(result.session);
    } else {
      setError(result.error ?? 'بيانات الدخول غير صحيحة');
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <Input
        label="اسم المستخدم أو البريد الإلكتروني"
        value={username}
        onChange={v => { setUsername(v); setError(''); }}
        placeholder="username أو email@domain.com"
        icon="👤"
        required
      />
      <Input
        label="كلمة المرور"
        value={password}
        onChange={v => { setPassword(v); setError(''); }}
        type="password"
        placeholder="••••••••"
        icon="🔑"
        required
        onForgot={onForgot}
      />
      {error && <Alert type="error" msg={error} />}
      <button type="submit" disabled={loading} style={{
        padding:'13px', borderRadius:11, border:'none',
        background: loading ? 'rgba(200,150,44,0.35)' : 'linear-gradient(135deg,#c8962c,#e8b84b)',
        color:'#0f2744', fontSize:14, fontWeight:800,
        cursor: loading ? 'not-allowed' : 'pointer',
        fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center',
        gap:9, boxShadow: loading ? 'none' : '0 4px 20px rgba(200,150,44,0.35)',
        marginTop:2, opacity: loading ? 0.7 : 1, transition:'all 0.2s',
      }}>
        {loading ? <><Spinner dark />جاري التحقق...</> : '🔓 تسجيل الدخول'}
      </button>
    </form>
  );
}

/* ════════════════════════════════════════════
   REGISTER FORM
════════════════════════════════════════════ */
function RegisterForm({ onSuccess }: { onSuccess: (msg: string) => void }) {
  const [form, setForm] = useState({
    fullName:'', username:'', email:'', phone:'', city:'', password:'', confirmPassword:'',
  });
  const [errors, setErrors] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle'|'sending'|'sent'|'failed'>('idle');

  const set = (k: keyof typeof form) => (v: string) => {
    setForm(f => ({ ...f, [k]:v }));
    setErrors(e => ({ ...e, [k]:'' }));
  };

  function validate() {
    const e: Record<string,string> = {};
    if (!form.fullName.trim())    e.fullName    = 'الاسم الكامل مطلوب';
    if (!form.username.trim())    e.username    = 'اسم المستخدم مطلوب';
    if (form.username.length < 3) e.username    = 'اسم المستخدم 3 أحرف على الأقل';
    if (!form.email.trim())       e.email       = 'البريد الإلكتروني مطلوب';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'بريد إلكتروني غير صالح';
    if (!form.password)           e.password    = 'كلمة المرور مطلوبة';
    if (form.password.length < 6) e.password    = 'كلمة المرور 6 أحرف على الأقل';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'كلمتا المرور غير متطابقتين';
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 500));
    const result = authService.submitRegistration({
      username: form.username.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
      name: form.fullName.trim(),
      phone: form.phone.trim(),
      provider: 'local',
    });
    if (!result.success) {
      setErrors({ username: result.error ?? 'خطأ في التسجيل' });
      setLoading(false);
      return;
    }
    // Send confirmation email
    setEmailStatus('sending');
    try {
      await sendRegistrationReceivedEmail({
        to: form.email.trim(),
        name: form.fullName.trim(),
        username: form.username.trim(),
        requestId: result.requestId ?? 'REG-000',
      });
      setEmailStatus('sent');
    } catch {
      setEmailStatus('failed');
    }
    setLoading(false);
    onSuccess('تم إرسال طلبك بنجاح! سيتم مراجعته من قبل المدير وإعلامك عبر البريد الإلكتروني.');
  }

  return (
    <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <Input label="الاسم الكامل" value={form.fullName} onChange={set('fullName')} icon="👤" required error={errors.fullName} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <Input label="اسم المستخدم" value={form.username} onChange={set('username')} icon="🔖" required error={errors.username} />
        <Input label="المدينة" value={form.city} onChange={set('city')} icon="🏙️" />
      </div>
      <Input label="البريد الإلكتروني" value={form.email} onChange={set('email')} type="email" placeholder="email@example.com" icon="📧" required error={errors.email} />
      <Input label="رقم الهاتف" value={form.phone} onChange={set('phone')} type="tel" placeholder="+212 6XX XXX XXX" icon="📱" />
      <Input label="كلمة المرور" value={form.password} onChange={set('password')} type="password" icon="🔑" required error={errors.password} />
      <Input label="تأكيد كلمة المرور" value={form.confirmPassword} onChange={set('confirmPassword')} type="password" icon="🔒" required error={errors.confirmPassword} />

      {emailStatus === 'sending' && <Alert type="info" msg="⏳ جاري إرسال بريد التأكيد..." />}
      {emailStatus === 'sent'    && <Alert type="success" msg="📧 تم إرسال بريد التأكيد!" />}
      {emailStatus === 'failed'  && <Alert type="info" msg="⚠️ تم التسجيل — تحقق من بريدك لاحقاً" />}

      {/* Pending notice */}
      <div style={{ background:'rgba(234,179,8,0.1)', border:'1px solid rgba(234,179,8,0.2)', borderRadius:9, padding:'9px 13px', display:'flex', gap:8, alignItems:'flex-start' }}>
        <span style={{ fontSize:14, flexShrink:0 }}>⏳</span>
        <span style={{ fontSize:11, color:'rgba(255,255,255,0.55)', lineHeight:1.6 }}>
          سيبقى حسابك في انتظار موافقة المدير. ستتلقى إشعاراً عبر البريد الإلكتروني عند التفعيل.
        </span>
      </div>

      <button type="submit" disabled={loading} style={{
        padding:'13px', borderRadius:11, border:'none',
        background: loading ? 'rgba(200,150,44,0.35)' : 'linear-gradient(135deg,#c8962c,#e8b84b)',
        color:'#0f2744', fontSize:13, fontWeight:800,
        cursor: loading ? 'not-allowed' : 'pointer',
        fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center',
        gap:8, marginTop:2, opacity: loading ? 0.7 : 1,
      }}>
        {loading ? <><Spinner dark />جاري الإرسال...</> : '📤 إرسال طلب التسجيل'}
      </button>
    </form>
  );
}

/* ════════════════════════════════════════════
   FORGOT PASSWORD FORM
════════════════════════════════════════════ */
function ForgotForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle'|'sending'|'sent'|'error'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('أدخل بريداً إلكترونياً صالحاً'); return;
    }
    setStatus('sending'); setError('');
    try {
      await sendPasswordResetEmail({ to: email.trim(), name: email.trim(), resetUrl: `${window.location.origin}${window.location.pathname}#/reset-password`, expiryMins: 15 });
      setStatus('sent');
    } catch {
      setStatus('error');
      setError('تعذر إرسال البريد. حاول مرة أخرى.');
    }
  }

  if (status === 'sent') {
    return (
      <div style={{ textAlign:'center', padding:'20px 0' }}>
        <div style={{ fontSize:48, marginBottom:12 }}>📧</div>
        <div style={{ color:'#6ee7b7', fontSize:15, fontWeight:800, marginBottom:8 }}>تم إرسال رابط الاستعادة!</div>
        <div style={{ color:'rgba(255,255,255,0.45)', fontSize:12, marginBottom:20, lineHeight:1.7 }}>
          تحقق من بريدك الإلكتروني <strong style={{ color:'#e8b84b' }}>{email}</strong><br/>
          الرابط صالح لمدة <strong style={{ color:'#e8b84b' }}>15 دقيقة</strong>
        </div>
        <button onClick={onBack} style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:10, padding:'10px 24px', color:'white', fontSize:13, cursor:'pointer', fontFamily:'inherit', fontWeight:700 }}>
          ← العودة لتسجيل الدخول
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ textAlign:'center', marginBottom:4 }}>
        <div style={{ fontSize:36, marginBottom:8 }}>🔑</div>
        <div style={{ color:'white', fontSize:14, fontWeight:800, marginBottom:4 }}>استعادة كلمة المرور</div>
        <div style={{ color:'rgba(255,255,255,0.35)', fontSize:11 }}>أدخل بريدك لإرسال رابط الاستعادة</div>
      </div>
      <Input
        label="البريد الإلكتروني"
        value={email}
        onChange={v => { setEmail(v); setError(''); }}
        type="email"
        placeholder="email@example.com"
        icon="📧"
        required
        error={error}
      />
      {status === 'error' && <Alert type="error" msg={error} />}
      <button type="submit" disabled={status === 'sending'} style={{
        padding:'12px', borderRadius:11, border:'none',
        background: status === 'sending' ? 'rgba(200,150,44,0.35)' : 'linear-gradient(135deg,#c8962c,#e8b84b)',
        color:'#0f2744', fontSize:13, fontWeight:800,
        cursor: status === 'sending' ? 'not-allowed' : 'pointer',
        fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8,
      }}>
        {status === 'sending' ? <><Spinner dark />جاري الإرسال...</> : '📨 إرسال رابط الاستعادة'}
      </button>
      <button type="button" onClick={onBack} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.35)', fontSize:11, cursor:'pointer', fontFamily:'inherit', textDecoration:'underline', textAlign:'center' }}>
        ← العودة لتسجيل الدخول
      </button>
    </form>
  );
}

/* ════════════════════════════════════════════
   MAIN USER PORTAL LOGIN
════════════════════════════════════════════ */
export default function UserPortalLogin({ onLogin, onGoToAdmin, onGoHome, defaultTab = 'login' }: UserPortalLoginProps) {
  const [tab, setTab] = useState<LoginTab>(defaultTab);
  const [successMsg, setSuccessMsg] = useState('');

  // Sync tab when defaultTab changes (e.g. homepage "Register" button)
  useEffect(() => {
    setTab(defaultTab);
    setSuccessMsg('');
  }, [defaultTab]);

  function goHome() {
    if (onGoHome) { onGoHome(); return; }
    window.location.hash = '#/';
    window.location.reload();
  }

  return (
    <div style={{
      minHeight:'100vh',
      background:'linear-gradient(135deg, #071425 0%, #0f2744 40%, #1a3a5c 70%, #0f1f35 100%)',
      display:'flex', flexDirection:'column', alignItems:'center',
      fontFamily:"'Cairo', sans-serif", position:'relative', overflow:'hidden',
    }}>
      <MoroccanBg />
      {/* Glow orbs */}
      <div style={{ position:'absolute', width:500, height:500, background:'radial-gradient(circle,rgba(200,150,44,0.09) 0%,transparent 70%)', top:'5%', right:'-5%', pointerEvents:'none' }} />
      <div style={{ position:'absolute', width:400, height:400, background:'radial-gradient(circle,rgba(59,130,246,0.06) 0%,transparent 70%)', bottom:'5%', left:'-5%', pointerEvents:'none' }} />

      {/* ── STICKY TOP BAR ── */}
      <header style={{
        position:'fixed', top:0, left:0, right:0, zIndex:200,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 20px', height:54,
        background:'rgba(7,20,37,0.75)', backdropFilter:'blur(16px)',
        borderBottom:'1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Logo → home */}
        <button onClick={goHome} style={{ display:'flex', alignItems:'center', gap:9, background:'none', border:'none', cursor:'pointer', padding:'4px 8px', borderRadius:10 }}
          title="العودة للرئيسية">
          <div style={{ width:32, height:32, borderRadius:9, background:'linear-gradient(135deg,#c8962c,#e8b84b)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>⚜️</div>
          <div style={{ textAlign:'right' }}>
            <div style={{ color:'white', fontWeight:800, fontSize:12, lineHeight:1.2 }}>مكتب الخدمات الإدارية</div>
            <div style={{ color:'rgba(255,255,255,0.3)', fontSize:9, fontFamily:'Inter,sans-serif' }}>← العودة للرئيسية</div>
          </div>
        </button>

        {/* Center badge */}
        <div style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(200,150,44,0.1)', border:'1px solid rgba(200,150,44,0.2)', borderRadius:24, padding:'3px 12px' }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:'#e8b84b', display:'inline-block' }} />
          <span style={{ fontSize:9, color:'#e8b84b', fontFamily:'Inter,monospace', fontWeight:700, letterSpacing:1 }}>PORTAIL UTILISATEUR</span>
        </div>

        {/* Admin link (discreet) */}
        <button onClick={onGoToAdmin}
          style={{ fontSize:10, color:'rgba(255,255,255,0.15)', background:'none', border:'1px solid rgba(255,255,255,0.07)', borderRadius:20, padding:'4px 12px', cursor:'pointer', fontFamily:'Inter,sans-serif', transition:'all 0.2s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color='rgba(220,38,38,0.5)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color='rgba(255,255,255,0.15)'; }}>
          Admin
        </button>
      </header>

      {/* ── CARD ── */}
      <div style={{ position:'relative', zIndex:1, width:'100%', maxWidth:460, padding:'80px 20px 40px', display:'flex', flexDirection:'column', gap:0 }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <button onClick={goHome} style={{ background:'none', border:'none', cursor:'pointer', padding:0 }} title="الرئيسية">
            <div style={{
              width:76, height:76, borderRadius:20,
              background:'linear-gradient(135deg,#c8962c,#e8b84b)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:34, margin:'0 auto 14px',
              boxShadow:'0 8px 32px rgba(200,150,44,0.35)',
              transition:'transform 0.2s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform='scale(1.07)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform='scale(1)'; }}>⚜️</div>
          </button>
          <h1 style={{ color:'white', fontSize:20, fontWeight:900, margin:'0 0 4px' }}>مكتب الخدمات الإدارية</h1>
          <p style={{ color:'rgba(255,255,255,0.3)', fontSize:11, margin:0, fontFamily:'Inter,sans-serif' }}>Bureau de Services Administratifs — Maroc 🇲🇦</p>
        </div>

        {/* Success message */}
        {successMsg && (
          <div style={{ marginBottom:14 }}>
            <Alert type="success" msg={successMsg} />
          </div>
        )}

        {/* Main card */}
        <div style={{
          background:'rgba(255,255,255,0.04)',
          backdropFilter:'blur(20px)',
          borderRadius:20, border:'1px solid rgba(255,255,255,0.08)',
          padding:'24px', boxShadow:'0 24px 64px rgba(0,0,0,0.4)',
        }}>

          {/* Tab switcher (only for login/register) */}
          {tab !== 'forgot' && (
            <div style={{ display:'flex', gap:8, marginBottom:22 }}>
              <TabBtn active={tab === 'login'} onClick={() => { setTab('login'); setSuccessMsg(''); }}>
                🔓 تسجيل الدخول
              </TabBtn>
              <TabBtn active={tab === 'register'} onClick={() => { setTab('register'); setSuccessMsg(''); }}>
                📝 حساب جديد
              </TabBtn>
            </div>
          )}

          {/* Forms */}
          {tab === 'login'    && <LoginForm onLogin={onLogin} onForgot={() => setTab('forgot')} />}
          {tab === 'register' && <RegisterForm onSuccess={msg => { setSuccessMsg(msg); setTab('login'); }} />}
          {tab === 'forgot'   && <ForgotForm onBack={() => setTab('login')} />}
        </div>

        {/* Back to home */}
        <div style={{ textAlign:'center', marginTop:18 }}>
          <button
            onClick={goHome}
            style={{
              display:'inline-flex', alignItems:'center', gap:8,
              background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)',
              borderRadius:12, padding:'10px 22px', cursor:'pointer',
              color:'rgba(255,255,255,0.45)', fontSize:12, fontFamily:'inherit', fontWeight:600,
              transition:'all 0.25s',
            }}
            onMouseEnter={e => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.background='rgba(200,150,44,0.12)';
              b.style.borderColor='rgba(200,150,44,0.35)';
              b.style.color='#e8b84b';
            }}
            onMouseLeave={e => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.background='rgba(255,255,255,0.05)';
              b.style.borderColor='rgba(255,255,255,0.1)';
              b.style.color='rgba(255,255,255,0.45)';
            }}>
            <span>🏠</span>
            <span>العودة للصفحة الرئيسية</span>
            <span style={{ fontSize:10, opacity:0.5, fontFamily:'Inter,sans-serif' }}>← Retour à l'accueil</span>
          </button>
        </div>

        {/* Footer */}
        <div style={{ textAlign:'center', marginTop:12, color:'rgba(255,255,255,0.1)', fontSize:9, fontFamily:'Inter,sans-serif' }}>
          🔒 Connexion sécurisée — Bureau de Services Administratifs
        </div>
      </div>
    </div>
  );
}
