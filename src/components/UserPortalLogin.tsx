/* ═══════════════════════════════════════════════════════════════════════
   USER PORTAL LOGIN — Email-only, 3 tabs: Login | Register | Forgot
   All sub-forms defined at MODULE level to prevent remount on re-render
   ═══════════════════════════════════════════════════════════════════════ */
import React, { useState, useEffect, useCallback } from 'react';
import { authService, ActiveSession } from '../utils/authService';
import { sendPasswordResetEmail, sendRegistrationReceivedEmail } from '../utils/emailService';

export type LoginTab = 'login' | 'register' | 'forgot';

interface UserPortalLoginProps {
  onLogin: (session: ActiveSession) => void;
  onGoToAdmin: () => void;
  onGoHome?: () => void;
  defaultTab?: LoginTab;
}

/* ─── Helpers ─── */
const S = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg,#071425 0%,#0f2744 40%,#1a3a5c 70%,#0f1f35 100%)',
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
    fontFamily: "'Cairo', sans-serif", position: 'relative' as const, overflowX: 'hidden' as const,
  },
  card: {
    background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)',
    borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)',
    padding: 24, boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
  },
  input: (focused: boolean, error: boolean): React.CSSProperties => ({
    width: '100%', padding: '11px 38px 11px 13px',
    background: 'rgba(255,255,255,0.07)',
    border: `1.5px solid ${error ? 'rgba(248,113,113,0.6)' : focused ? '#c8962c' : 'rgba(255,255,255,0.1)'}`,
    borderRadius: 10, color: 'white', fontSize: 13,
    fontFamily: "'Cairo', sans-serif", outline: 'none',
    boxSizing: 'border-box' as const, transition: 'border-color 0.2s',
  }),
  label: { fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', display: 'block' as const, marginBottom: 5 },
  btn: (active = true): React.CSSProperties => ({
    padding: '13px', borderRadius: 11, border: 'none', width: '100%',
    background: active ? 'linear-gradient(135deg,#c8962c,#e8b84b)' : 'rgba(200,150,44,0.35)',
    color: '#0f2744', fontSize: 14, fontWeight: 800,
    cursor: active ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 9, opacity: active ? 1 : 0.7, transition: 'all 0.2s',
  }),
  err: { marginTop: 5, fontSize: 11, color: '#fca5a5', fontWeight: 600 },
  alert: (type: 'error'|'success'|'info'): React.CSSProperties => ({
    background: type==='error' ? 'rgba(220,38,38,0.12)' : type==='success' ? 'rgba(16,185,129,0.12)' : 'rgba(59,130,246,0.12)',
    border: `1px solid ${type==='error' ? 'rgba(220,38,38,0.3)' : type==='success' ? 'rgba(16,185,129,0.3)' : 'rgba(59,130,246,0.3)'}`,
    borderRadius: 9, padding: '10px 14px',
    color: type==='error' ? '#fca5a5' : type==='success' ? '#6ee7b7' : '#93c5fd',
    fontSize: 12, fontWeight: 600, textAlign: 'center' as const,
    display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
  }),
};

function Spinner() {
  return <div style={{ width:14, height:14, border:'2px solid rgba(0,0,0,0.15)', borderTop:'2px solid #0f2744', borderRadius:'50%', animation:'spin 0.7s linear infinite', flexShrink:0 }} />;
}

/* ══════════════════════════════
   LOGIN FORM  (module-level)
══════════════════════════════ */
const LoginForm = React.memo(function LoginForm({ onLogin, onForgot }: {
  onLogin: (s: ActiveSession) => void;
  onForgot: () => void;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [focU, setFocU] = useState(false);
  const [focP, setFocP] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) { setError('أدخل اسم المستخدم أو البريد الإلكتروني'); return; }
    if (!password) { setError('أدخل كلمة المرور'); return; }
    setLoading(true); setError('');
    await new Promise(r => setTimeout(r, 400));
    const res = authService.login(username.trim(), password, false);
    setLoading(false);
    if (res.success && res.session) onLogin(res.session);
    else setError(res.error ?? 'بيانات الدخول غير صحيحة');
  }, [username, password, onLogin]);

  return (
    <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {/* Username */}
      <div>
        <label style={S.label}>اسم المستخدم أو البريد <span style={{color:'#f87171'}}>*</span></label>
        <div style={{ position:'relative' }}>
          <span style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)', fontSize:14, opacity:0.35, pointerEvents:'none' }}>👤</span>
          <input
            type="text" value={username} onChange={e => { setUsername(e.target.value); setError(''); }}
            placeholder="username أو email@domain.com"
            style={{ ...S.input(focU, false), paddingRight: 38 }}
            onFocus={() => setFocU(true)} onBlur={() => setFocU(false)}
            autoComplete="username"
          />
        </div>
      </div>
      {/* Password */}
      <div>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
          <label style={{ ...S.label, marginBottom:0 }}>كلمة المرور <span style={{color:'#f87171'}}>*</span></label>
          <button type="button" onClick={onForgot} style={{ background:'none', border:'none', color:'#e8b84b', fontSize:10, cursor:'pointer', fontFamily:'inherit', textDecoration:'underline' }}>
            نسيت كلمة المرور؟
          </button>
        </div>
        <div style={{ position:'relative' }}>
          <span style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)', fontSize:14, opacity:0.35, pointerEvents:'none' }}>🔑</span>
          <input
            type={showPwd ? 'text' : 'password'} value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            placeholder="••••••••"
            style={{ ...S.input(focP, false), paddingRight: 38, paddingLeft: 38 }}
            onFocus={() => setFocP(true)} onBlur={() => setFocP(false)}
            autoComplete="current-password"
          />
          <button type="button" onClick={() => setShowPwd(p => !p)}
            style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:14, opacity:0.5, padding:0, color:'white' }}>
            {showPwd ? '🙈' : '👁️'}
          </button>
        </div>
      </div>
      {error && <div style={S.alert('error')}><span>⚠</span>{error}</div>}
      <button type="submit" disabled={loading} style={S.btn(!loading)}>
        {loading ? <><Spinner />جاري التحقق...</> : '🔓 تسجيل الدخول'}
      </button>
    </form>
  );
});

/* ══════════════════════════════
   REGISTER FORM (module-level)
══════════════════════════════ */
const RegisterForm = React.memo(function RegisterForm({ onSuccess }: { onSuccess: (msg: string) => void }) {
  const [fullName, setFullName]               = useState('');
  const [username, setUsername]               = useState('');
  const [email, setEmail]                     = useState('');
  const [phone, setPhone]                     = useState('');
  const [city, setCity]                       = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd]                 = useState(false);
  const [focMap, setFocMap]                   = useState<Record<string,boolean>>({});
  const [errors, setErrors]                   = useState<Record<string,string>>({});
  const [loading, setLoading]                 = useState(false);
  const [emailStatus, setEmailStatus]         = useState<'idle'|'sending'|'sent'|'failed'>('idle');

  const foc  = (k:string) => () => setFocMap(m => ({ ...m, [k]:true }));
  const blur = (k:string) => () => setFocMap(m => ({ ...m, [k]:false }));
  const clrErr = (k:string) => setErrors(e => ({ ...e, [k]:'' }));

  function validate() {
    const e: Record<string,string> = {};
    if (!fullName.trim())          e.fullName = 'الاسم الكامل مطلوب';
    if (!username.trim())          e.username = 'اسم المستخدم مطلوب';
    if (username.length < 3)       e.username = 'اسم المستخدم 3 أحرف على الأقل';
    if (!email.trim())             e.email = 'البريد الإلكتروني مطلوب';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'بريد إلكتروني غير صالح';
    if (!password)                 e.password = 'كلمة المرور مطلوبة';
    if (password.length < 6)       e.password = 'كلمة المرور 6 أحرف على الأقل';
    if (password !== confirmPassword) e.confirmPassword = 'كلمتا المرور غير متطابقتين';
    return e;
  }

  const submit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 500));
    const result = authService.submitRegistration({
      username: username.trim(), email: email.trim().toLowerCase(),
      password, name: fullName.trim(), phone: phone.trim(), provider: 'local',
    });
    if (!result.success) {
      setErrors({ username: result.error ?? 'خطأ في التسجيل' });
      setLoading(false); return;
    }
    setEmailStatus('sending');
    try {
      await sendRegistrationReceivedEmail({
        to: email.trim(), name: fullName.trim(),
        username: username.trim(), requestId: result.requestId ?? 'REG-000',
      });
      setEmailStatus('sent');
    } catch { setEmailStatus('failed'); }
    setLoading(false);
    onSuccess('تم إرسال طلبك بنجاح! سيتم مراجعته من قبل المدير وإعلامك عبر البريد الإلكتروني.');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullName, username, email, phone, password, confirmPassword, onSuccess]);

  const inp = (_k:string, focused:boolean, hasErr:boolean): React.CSSProperties => ({
    ...S.input(focused, hasErr), paddingRight: 38,
  });

  return (
    <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:11 }}>
      {/* Full name */}
      <div>
        <label style={S.label}>الاسم الكامل *</label>
        <div style={{ position:'relative' }}>
          <span style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)', fontSize:14, opacity:0.35, pointerEvents:'none' }}>👤</span>
          <input value={fullName} onChange={e => { setFullName(e.target.value); clrErr('fullName'); }}
            style={inp('fullName', !!focMap.fullName, !!errors.fullName)}
            onFocus={foc('fullName')} onBlur={blur('fullName')} autoComplete="name" />
        </div>
        {errors.fullName && <div style={S.err}>⚠ {errors.fullName}</div>}
      </div>

      {/* Username + City row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <div>
          <label style={S.label}>اسم المستخدم *</label>
          <div style={{ position:'relative' }}>
            <span style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)', fontSize:14, opacity:0.35, pointerEvents:'none' }}>🔖</span>
            <input value={username} onChange={e => { setUsername(e.target.value); clrErr('username'); }}
              style={inp('username', !!focMap.username, !!errors.username)}
              onFocus={foc('username')} onBlur={blur('username')} autoComplete="username" />
          </div>
          {errors.username && <div style={S.err}>⚠ {errors.username}</div>}
        </div>
        <div>
          <label style={S.label}>المدينة</label>
          <div style={{ position:'relative' }}>
            <span style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)', fontSize:14, opacity:0.35, pointerEvents:'none' }}>🏙️</span>
            <input value={city} onChange={e => setCity(e.target.value)}
              style={inp('city', !!focMap.city, false)}
              onFocus={foc('city')} onBlur={blur('city')} />
          </div>
        </div>
      </div>

      {/* Email */}
      <div>
        <label style={S.label}>البريد الإلكتروني *</label>
        <div style={{ position:'relative' }}>
          <span style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)', fontSize:14, opacity:0.35, pointerEvents:'none' }}>📧</span>
          <input type="email" value={email} onChange={e => { setEmail(e.target.value); clrErr('email'); }}
            placeholder="email@example.com"
            style={inp('email', !!focMap.email, !!errors.email)}
            onFocus={foc('email')} onBlur={blur('email')} autoComplete="email" />
        </div>
        {errors.email && <div style={S.err}>⚠ {errors.email}</div>}
      </div>

      {/* Phone */}
      <div>
        <label style={S.label}>رقم الهاتف</label>
        <div style={{ position:'relative' }}>
          <span style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)', fontSize:14, opacity:0.35, pointerEvents:'none' }}>📱</span>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="+212 6XX XXX XXX"
            style={inp('phone', !!focMap.phone, false)}
            onFocus={foc('phone')} onBlur={blur('phone')} />
        </div>
      </div>

      {/* Password */}
      <div>
        <label style={S.label}>كلمة المرور *</label>
        <div style={{ position:'relative' }}>
          <span style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)', fontSize:14, opacity:0.35, pointerEvents:'none' }}>🔑</span>
          <input type={showPwd ? 'text' : 'password'} value={password}
            onChange={e => { setPassword(e.target.value); clrErr('password'); }}
            style={{ ...inp('password', !!focMap.password, !!errors.password), paddingLeft:38 }}
            onFocus={foc('password')} onBlur={blur('password')} autoComplete="new-password" />
          <button type="button" onClick={() => setShowPwd(p => !p)}
            style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:13, opacity:0.5, padding:0, color:'white' }}>
            {showPwd ? '🙈' : '👁️'}
          </button>
        </div>
        {errors.password && <div style={S.err}>⚠ {errors.password}</div>}
      </div>

      {/* Confirm password */}
      <div>
        <label style={S.label}>تأكيد كلمة المرور *</label>
        <div style={{ position:'relative' }}>
          <span style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)', fontSize:14, opacity:0.35, pointerEvents:'none' }}>🔒</span>
          <input type={showPwd ? 'text' : 'password'} value={confirmPassword}
            onChange={e => { setConfirmPassword(e.target.value); clrErr('confirmPassword'); }}
            style={{ ...inp('confirmPassword', !!focMap.confirmPassword, !!errors.confirmPassword), paddingLeft:38 }}
            onFocus={foc('confirmPassword')} onBlur={blur('confirmPassword')} autoComplete="new-password" />
        </div>
        {errors.confirmPassword && <div style={S.err}>⚠ {errors.confirmPassword}</div>}
      </div>

      {emailStatus === 'sending' && <div style={S.alert('info')}><span>⏳</span>جاري إرسال بريد التأكيد...</div>}
      {emailStatus === 'sent'    && <div style={S.alert('success')}><span>📧</span>تم إرسال بريد التأكيد!</div>}

      <div style={{ background:'rgba(234,179,8,0.1)', border:'1px solid rgba(234,179,8,0.2)', borderRadius:9, padding:'9px 13px', display:'flex', gap:8, alignItems:'flex-start' }}>
        <span style={{ fontSize:14, flexShrink:0 }}>⏳</span>
        <span style={{ fontSize:11, color:'rgba(255,255,255,0.55)', lineHeight:1.6 }}>
          سيبقى حسابك في انتظار موافقة المدير. ستتلقى إشعاراً عبر البريد الإلكتروني عند التفعيل.
        </span>
      </div>

      <button type="submit" disabled={loading} style={{ ...S.btn(!loading), marginTop:2 }}>
        {loading ? <><Spinner />جاري الإرسال...</> : '📤 إرسال طلب التسجيل'}
      </button>
    </form>
  );
});

/* ══════════════════════════════
   FORGOT PASSWORD (module-level)
══════════════════════════════ */
const ForgotForm = React.memo(function ForgotForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail]   = useState('');
  const [foc, setFoc]       = useState(false);
  const [status, setStatus] = useState<'idle'|'sending'|'sent'|'error'>('idle');
  const [error, setError]   = useState('');

  const submit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('أدخل بريداً إلكترونياً صالحاً'); return;
    }
    setStatus('sending'); setError('');
    try {
      await sendPasswordResetEmail({ to: email.trim(), name: email.trim(), resetUrl: `${window.location.origin}${window.location.pathname}#/reset-password`, expiryMins: 15 });
      setStatus('sent');
    } catch { setStatus('error'); setError('تعذر إرسال البريد. حاول مرة أخرى.'); }
  }, [email]);

  if (status === 'sent') return (
    <div style={{ textAlign:'center', padding:'20px 0' }}>
      <div style={{ fontSize:48, marginBottom:12 }}>📧</div>
      <div style={{ color:'#6ee7b7', fontSize:15, fontWeight:800, marginBottom:8 }}>تم إرسال رابط الاستعادة!</div>
      <div style={{ color:'rgba(255,255,255,0.45)', fontSize:12, marginBottom:20, lineHeight:1.7 }}>
        تحقق من بريدك <strong style={{ color:'#e8b84b' }}>{email}</strong><br/>
        الرابط صالح لمدة <strong style={{ color:'#e8b84b' }}>15 دقيقة</strong>
      </div>
      <button onClick={onBack} style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:10, padding:'10px 24px', color:'white', fontSize:13, cursor:'pointer', fontFamily:'inherit', fontWeight:700 }}>
        ← العودة لتسجيل الدخول
      </button>
    </div>
  );

  return (
    <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ textAlign:'center', marginBottom:4 }}>
        <div style={{ fontSize:36, marginBottom:8 }}>🔑</div>
        <div style={{ color:'white', fontSize:14, fontWeight:800, marginBottom:4 }}>استعادة كلمة المرور</div>
        <div style={{ color:'rgba(255,255,255,0.35)', fontSize:11 }}>أدخل بريدك لإرسال رابط الاستعادة</div>
      </div>
      <div>
        <label style={S.label}>البريد الإلكتروني *</label>
        <div style={{ position:'relative' }}>
          <span style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)', fontSize:14, opacity:0.35, pointerEvents:'none' }}>📧</span>
          <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
            placeholder="email@example.com"
            style={{ ...S.input(foc, !!error), paddingRight:38 }}
            onFocus={() => setFoc(true)} onBlur={() => setFoc(false)} />
        </div>
        {error && <div style={S.err}>⚠ {error}</div>}
      </div>
      {status === 'error' && <div style={S.alert('error')}><span>⚠</span>{error}</div>}
      <button type="submit" disabled={status==='sending'} style={S.btn(status!=='sending')}>
        {status === 'sending' ? <><Spinner />جاري الإرسال...</> : '📨 إرسال رابط الاستعادة'}
      </button>
      <button type="button" onClick={onBack} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.35)', fontSize:11, cursor:'pointer', fontFamily:'inherit', textDecoration:'underline', textAlign:'center' }}>
        ← العودة لتسجيل الدخول
      </button>
    </form>
  );
});

/* ══════════════════════════════════════════════════════
   TAB BUTTON
══════════════════════════════════════════════════════ */
function TabBtn({ active, onClick, children }: { active:boolean; onClick:()=>void; children:React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={{
      flex:1, padding:'11px 8px', borderRadius:10, border:'none',
      background: active ? 'linear-gradient(135deg,#c8962c,#e8b84b)' : 'rgba(255,255,255,0.05)',
      color: active ? '#0f2744' : 'rgba(255,255,255,0.45)',
      fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit',
      transition:'all 0.2s', boxShadow: active ? '0 4px 16px rgba(200,150,44,0.3)' : 'none',
    }}>{children}</button>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN PORTAL LOGIN
══════════════════════════════════════════════════════ */
export default function UserPortalLogin({ onLogin, onGoToAdmin, onGoHome, defaultTab = 'login' }: UserPortalLoginProps) {
  const [tab, setTab]           = useState<LoginTab>(defaultTab);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => { setTab(defaultTab); setSuccessMsg(''); }, [defaultTab]);

  const goHome = useCallback(() => {
    if (onGoHome) { onGoHome(); return; }
    window.location.hash = '#/';
  }, [onGoHome]);

  const handleLogin = useCallback((s: ActiveSession) => { onLogin(s); }, [onLogin]);
  const handleForgot = useCallback(() => { setTab('forgot'); setSuccessMsg(''); }, []);
  const handleBack   = useCallback(() => setTab('login'), []);
  const handleRegOk  = useCallback((msg: string) => { setSuccessMsg(msg); setTab('login'); }, []);

  return (
    <div style={S.page}>
      {/* Moroccan geometric BG */}
      <div style={{ position:'absolute', inset:0, opacity:0.04, pointerEvents:'none', overflow:'hidden' }}>
        {Array.from({ length:5 }).map((_,r) => Array.from({ length:8 }).map((_,c) => (
          <div key={`${r}-${c}`} style={{ position:'absolute', left:c*140-50, top:r*140-50, width:90, height:90, border:'1.5px solid #c8962c', transform:'rotate(45deg)', borderRadius:3 }} />
        )))}
      </div>
      {/* Glow orbs */}
      <div style={{ position:'absolute', width:500, height:500, background:'radial-gradient(circle,rgba(200,150,44,0.09) 0%,transparent 70%)', top:'5%', right:'-5%', pointerEvents:'none' }} />
      <div style={{ position:'absolute', width:400, height:400, background:'radial-gradient(circle,rgba(59,130,246,0.06) 0%,transparent 70%)', bottom:'5%', left:'-5%', pointerEvents:'none' }} />

      {/* ── STICKY HEADER ── */}
      <header style={{
        position:'fixed', top:0, left:0, right:0, zIndex:200,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 20px', height:54,
        background:'rgba(7,20,37,0.8)', backdropFilter:'blur(16px)',
        borderBottom:'1px solid rgba(255,255,255,0.06)',
      }}>
        <button onClick={goHome} style={{ display:'flex', alignItems:'center', gap:9, background:'none', border:'none', cursor:'pointer', padding:'4px 8px', borderRadius:10 }}>
          <div style={{ width:32, height:32, borderRadius:9, background:'linear-gradient(135deg,#c8962c,#e8b84b)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>⚜️</div>
          <div style={{ textAlign:'right' }}>
            <div style={{ color:'white', fontWeight:800, fontSize:12, lineHeight:1.2 }}>مكتب الخدمات</div>
            <div style={{ color:'rgba(255,255,255,0.3)', fontSize:9, fontFamily:'Inter,sans-serif' }}>← الرئيسية</div>
          </div>
        </button>

        <div style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(200,150,44,0.1)', border:'1px solid rgba(200,150,44,0.2)', borderRadius:24, padding:'3px 12px' }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:'#e8b84b', display:'inline-block' }} />
          <span style={{ fontSize:9, color:'#e8b84b', fontFamily:'Inter,monospace', fontWeight:700, letterSpacing:1 }}>PORTAIL UTILISATEUR</span>
        </div>

        <button onClick={onGoToAdmin}
          style={{ fontSize:10, color:'rgba(255,255,255,0.15)', background:'none', border:'1px solid rgba(255,255,255,0.07)', borderRadius:20, padding:'4px 12px', cursor:'pointer', fontFamily:'Inter,sans-serif' }}
          onMouseEnter={e => (e.currentTarget.style.color='rgba(220,38,38,0.5)')}
          onMouseLeave={e => (e.currentTarget.style.color='rgba(255,255,255,0.15)')}>
          Admin
        </button>
      </header>

      {/* ── MAIN CONTENT ── */}
      <div style={{ position:'relative', zIndex:1, width:'100%', maxWidth:460, padding:'80px 20px 40px', display:'flex', flexDirection:'column' }}>
        {/* Logo + title */}
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <button onClick={goHome} style={{ background:'none', border:'none', cursor:'pointer', padding:0 }}>
            <div style={{ width:76, height:76, borderRadius:20, background:'linear-gradient(135deg,#c8962c,#e8b84b)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:34, margin:'0 auto 14px', boxShadow:'0 8px 32px rgba(200,150,44,0.35)' }}>⚜️</div>
          </button>
          <h1 style={{ color:'white', fontSize:20, fontWeight:900, margin:'0 0 4px' }}>مكتب الخدمات الإدارية</h1>
          <p style={{ color:'rgba(255,255,255,0.3)', fontSize:11, margin:0, fontFamily:'Inter,sans-serif' }}>Bureau de Services Administratifs — Maroc 🇲🇦</p>
        </div>

        {/* Success message */}
        {successMsg && (
          <div style={{ ...S.alert('success'), marginBottom:14 }}><span>✅</span>{successMsg}</div>
        )}

        {/* Card */}
        <div style={S.card}>
          {/* Tab switcher */}
          {tab !== 'forgot' && (
            <div style={{ display:'flex', gap:8, marginBottom:22 }}>
              <TabBtn active={tab==='login'} onClick={() => { setTab('login'); setSuccessMsg(''); }}>🔓 تسجيل الدخول</TabBtn>
              <TabBtn active={tab==='register'} onClick={() => { setTab('register'); setSuccessMsg(''); }}>📝 حساب جديد</TabBtn>
            </div>
          )}

          {/* Forms — key forces remount only on tab change, not parent re-render */}
          {tab === 'login'    && <LoginForm    key="login"    onLogin={handleLogin}  onForgot={handleForgot} />}
          {tab === 'register' && <RegisterForm key="register" onSuccess={handleRegOk} />}
          {tab === 'forgot'   && <ForgotForm   key="forgot"   onBack={handleBack}    />}
        </div>

        {/* Back to home */}
        <div style={{ textAlign:'center', marginTop:18 }}>
          <button onClick={goHome} style={{
            display:'inline-flex', alignItems:'center', gap:8,
            background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)',
            borderRadius:12, padding:'10px 22px', cursor:'pointer',
            color:'rgba(255,255,255,0.45)', fontSize:12, fontFamily:'inherit', fontWeight:600, transition:'all 0.25s',
          }}
            onMouseEnter={e => { const b=e.currentTarget; b.style.background='rgba(200,150,44,0.12)'; b.style.borderColor='rgba(200,150,44,0.35)'; b.style.color='#e8b84b'; }}
            onMouseLeave={e => { const b=e.currentTarget; b.style.background='rgba(255,255,255,0.05)'; b.style.borderColor='rgba(255,255,255,0.1)'; b.style.color='rgba(255,255,255,0.45)'; }}>
            <span>🏠</span>
            <span>العودة للصفحة الرئيسية</span>
            <span style={{ fontSize:10, opacity:0.5, fontFamily:'Inter,sans-serif' }}>← Retour à l'accueil</span>
          </button>
        </div>

        <div style={{ textAlign:'center', marginTop:12, color:'rgba(255,255,255,0.1)', fontSize:9, fontFamily:'Inter,sans-serif' }}>
          🔒 Connexion sécurisée — Bureau de Services Administratifs
        </div>
      </div>
    </div>
  );
}
