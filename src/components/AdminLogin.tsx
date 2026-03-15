/* ═══════════════════════════════════════════════════════════════════════
   ADMIN LOGIN — Hidden Secure Route: /#/control-center
   Email-only admin authentication (no Google OAuth)
   Real password reset via Resend API
   ═══════════════════════════════════════════════════════════════════════ */
import { useState, useEffect, useCallback } from 'react';
import { authService, ActiveSession, checkRateLimit } from '../utils/authService';
import { sendPasswordResetEmail } from '../utils/emailService';

interface Props {
  onLogin: (session: ActiveSession) => void;
  onGoToUser: () => void;
  onGoHome?: () => void;
}

function SecureBg() {
  return (
    <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.04, pointerEvents:'none' }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#ef4444" strokeWidth="0.5"/>
        </pattern>
        <pattern id="hex" width="80" height="90" patternUnits="userSpaceOnUse">
          <polygon points="40,5 75,22 75,68 40,85 5,68 5,22" fill="none" stroke="#dc2626" strokeWidth="0.8"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)"/>
      <rect width="100%" height="100%" fill="url(#hex)" opacity="0.5"/>
    </svg>
  );
}

/* ── Forgot Password Modal with real Resend email ── */
function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form'|'sent'|'reset'>('form');
  const [resetUrl, setResetUrl] = useState('');
  const [token, setToken] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [strength, setStrength] = useState(0);
  const [emailStatus, setEmailStatus] = useState<'idle'|'sending'|'sent'|'failed'>('idle');

  function calcStrength(p: string) {
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    setStrength(s);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('');
    await new Promise(r => setTimeout(r, 500));
    const res = authService.requestPasswordReset(email.trim());
    setLoading(false);
    if (!res.success) { setError(res.error ?? 'حدث خطأ'); return; }
    if (res.resetUrl) setResetUrl(res.resetUrl);
    setStep('sent');

    // Send real email via Resend
    if (res.resetUrl) {
      setEmailStatus('sending');
      const user = (authService as unknown as { getUserByEmailPublic?: (e:string) => {name:string}|null }).getUserByEmailPublic?.(email.trim());
      sendPasswordResetEmail({
        to: email.trim(),
        name: user?.name ?? 'المدير',
        resetUrl: res.resetUrl,
        expiryMins: 15,
      }).then(r => setEmailStatus(r.success ? 'sent' : 'failed')).catch(() => setEmailStatus('failed'));
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault(); setError('');
    if (newPwd.length < 8) { setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل'); return; }
    if (newPwd !== confirmPwd) { setError('كلمتا المرور غير متطابقتان'); return; }
    if (strength < 2) { setError('كلمة المرور ضعيفة جداً'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 500));
    const res = authService.resetPasswordWithToken(token.trim(), email.trim(), newPwd);
    setLoading(false);
    if (res.success) setDone(true);
    else setError(res.error ?? 'رمز غير صالح أو منتهي الصلاحية');
  }

  const strengthColors = ['#e2e8f0','#dc2626','#f59e0b','#10b981','#22c55e'];
  const strengthLabels = ['','ضعيفة جداً','ضعيفة','جيدة','قوية'];

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', backdropFilter:'blur(12px)', zIndex:9998, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ width:440, background:'#fff', borderRadius:20, padding:28, boxShadow:'0 32px 80px rgba(0,0,0,0.5)', position:'relative' }}>
        <button onClick={onClose} style={{ position:'absolute', top:14, left:14, background:'none', border:'none', fontSize:18, cursor:'pointer', color:'#9ca3af', padding:4, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>

        <div style={{ textAlign:'center', marginBottom:22 }}>
          <div style={{ width:52, height:52, background: done ? '#d1fae5' : '#fee2e2', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, margin:'0 auto 10px' }}>
            {done ? '✅' : step === 'sent' ? '📧' : step === 'reset' ? '🔑' : '🔒'}
          </div>
          <div style={{ fontSize:16, fontWeight:800, color:'#111827', marginBottom:3 }}>
            {done ? 'تمت إعادة التعيين!' : step === 'sent' ? 'تحقق من بريدك' : step === 'reset' ? 'كلمة مرور جديدة' : 'نسيت كلمة المرور؟'}
          </div>
          <div style={{ fontSize:11, color:'#6b7280' }}>
            {done ? 'يمكنك الآن تسجيل الدخول' :
             step === 'sent' ? `تم إرسال رابط إعادة التعيين إلى ${email}` :
             step === 'reset' ? 'أدخل رمز الإعادة وكلمة مرورك الجديدة' :
             'أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين'}
          </div>
        </div>

        {step === 'form' && (
          <form onSubmit={handleSend} style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:5 }}>البريد الإلكتروني للمدير</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="admin@bureau.ma" dir="ltr"
                style={{ width:'100%', padding:'11px 12px', border:'1.5px solid #e5e7eb', borderRadius:9, fontSize:13, fontFamily:'Inter, monospace', outline:'none', boxSizing:'border-box' }}
                onFocus={e => { e.target.style.borderColor='#dc2626'; }} onBlur={e => { e.target.style.borderColor='#e5e7eb'; }} />
            </div>
            {error && <div style={{ background:'#fee2e2', color:'#dc2626', padding:'8px 12px', borderRadius:8, fontSize:12, fontWeight:600 }}>⚠ {error}</div>}
            <button type="submit" disabled={loading}
              style={{ padding:'12px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#dc2626,#b91c1c)', color:'white', fontSize:14, fontWeight:800, cursor:loading?'not-allowed':'pointer', fontFamily:'inherit', opacity:loading?0.7:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              {loading ? <><Spinner />جاري الإرسال...</> : '📤 إرسال رابط إعادة التعيين'}
            </button>
          </form>
        )}

        {step === 'sent' && !done && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {/* Email status */}
            <div style={{ background:'#d1fae5', border:'1px solid #6ee7b7', borderRadius:10, padding:'12px 14px' }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#065f46', marginBottom:4 }}>
                {emailStatus === 'sending' && '⏳ جاري إرسال البريد...'}
                {emailStatus === 'sent' && '✅ تم إرسال البريد بنجاح'}
                {emailStatus === 'failed' && '⚠️ تعذّر الإرسال — استخدم الرمز من السجل'}
                {emailStatus === 'idle' && '✅ جاهز للإرسال'}
              </div>
              <div style={{ fontSize:11, color:'#374151', lineHeight:1.7 }}>
                تحقق من صندوق الوارد (Inbox) وكذلك Spam.<br/>
                الرابط صالح لمدة <strong>15 دقيقة فقط</strong>.
              </div>
            </div>
            {resetUrl && (
              <div style={{ background:'#fef3c7', border:'1px solid #fcd34d', borderRadius:9, padding:'10px 12px' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'#92400e', marginBottom:4 }}>🔗 رابط إعادة التعيين (وضع تجريبي):</div>
                <div style={{ fontSize:10, color:'#374151', fontFamily:'monospace', wordBreak:'break-all', direction:'ltr', lineHeight:1.5 }}>{resetUrl}</div>
              </div>
            )}
            <button onClick={() => setStep('reset')}
              style={{ padding:'11px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#0f2744,#1e3a5f)', color:'white', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              لدي رمز التأكيد →
            </button>
          </div>
        )}

        {step === 'reset' && !done && (
          <form onSubmit={handleReset} style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:5 }}>رمز إعادة التعيين</label>
              <input value={token} onChange={e => setToken(e.target.value)} required placeholder="الرمز المُستلم..." dir="ltr"
                style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #e5e7eb', borderRadius:9, fontSize:12, fontFamily:'monospace', outline:'none', boxSizing:'border-box' }}
                onFocus={e => { e.target.style.borderColor='#dc2626'; }} onBlur={e => { e.target.style.borderColor='#e5e7eb'; }} />
            </div>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:5 }}>كلمة المرور الجديدة</label>
              <input type="password" value={newPwd} onChange={e => { setNewPwd(e.target.value); calcStrength(e.target.value); }} required placeholder="••••••••" dir="ltr"
                style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #e5e7eb', borderRadius:9, fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}
                onFocus={e => { e.target.style.borderColor='#dc2626'; }} onBlur={e => { e.target.style.borderColor='#e5e7eb'; }} />
              {newPwd && (
                <div style={{ marginTop:6 }}>
                  <div style={{ display:'flex', gap:3, marginBottom:3 }}>
                    {[1,2,3,4].map(i => (
                      <div key={i} style={{ flex:1, height:3, borderRadius:2, background: strength >= i ? strengthColors[strength] : '#e5e7eb', transition:'background 0.3s' }} />
                    ))}
                  </div>
                  <div style={{ fontSize:10, color: strengthColors[strength], fontWeight:600 }}>{strengthLabels[strength]}</div>
                </div>
              )}
            </div>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:5 }}>تأكيد كلمة المرور</label>
              <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} required placeholder="••••••••" dir="ltr"
                style={{ width:'100%', padding:'10px 12px', border:`1.5px solid ${confirmPwd && confirmPwd !== newPwd ? '#dc2626' : '#e5e7eb'}`, borderRadius:9, fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}
                onFocus={e => { e.target.style.borderColor='#dc2626'; }} onBlur={e => { e.target.style.borderColor = confirmPwd && confirmPwd !== newPwd ? '#dc2626' : '#e5e7eb'; }} />
            </div>
            {error && <div style={{ background:'#fee2e2', color:'#dc2626', padding:'8px 12px', borderRadius:8, fontSize:12, fontWeight:600 }}>⚠ {error}</div>}
            <button type="submit" disabled={loading}
              style={{ padding:'12px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#dc2626,#b91c1c)', color:'white', fontSize:14, fontWeight:800, cursor:loading?'not-allowed':'pointer', fontFamily:'inherit', opacity:loading?0.7:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              {loading ? <><Spinner />جاري التعيين...</> : '🔑 تعيين كلمة المرور الجديدة'}
            </button>
          </form>
        )}

        {done && (
          <button onClick={onClose}
            style={{ width:'100%', padding:'12px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#065f46,#10b981)', color:'white', fontSize:14, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
            ← العودة لتسجيل الدخول
          </button>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return <div style={{ width:14, height:14, border:'2.5px solid rgba(255,255,255,0.3)', borderTop:'2.5px solid white', borderRadius:'50%', animation:'spin 0.7s linear infinite', flexShrink:0 }} />;
}

function LockoutTimer({ lockedForMs }: { lockedForMs: number }) {
  const [remaining, setRemaining] = useState(Math.ceil(lockedForMs / 1000));
  useEffect(() => {
    if (remaining <= 0) return;
    const t = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, [remaining]);
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  return (
    <div style={{ background:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.25)', borderRadius:12, padding:'18px 16px', textAlign:'center' }}>
      <div style={{ fontSize:28, marginBottom:8 }}>⛔</div>
      <div style={{ fontSize:13, fontWeight:800, color:'#fca5a5', marginBottom:4 }}>الحساب مؤمَّن مؤقتاً</div>
      <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginBottom:10 }}>تم تجاوز 5 محاولات فاشلة</div>
      <div style={{ fontSize:24, fontFamily:'monospace', fontWeight:900, color:'#ef4444' }}>
        {String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}
      </div>
      <div style={{ fontSize:10, color:'rgba(255,255,255,0.25)', marginTop:4 }}>يرجى الانتظار قبل المحاولة مجدداً</div>
    </div>
  );
}

/* ════════════════════════════════════
   MAIN ADMIN LOGIN
   ════════════════════════════════════ */
export default function AdminLogin({ onLogin, onGoToUser, onGoHome }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [shake, setShake] = useState(false);
  const [lockedForMs, setLockedForMs] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState(5);

  useEffect(() => {
    const rl = checkRateLimit(`login_admin`);
    if (!rl.allowed && rl.lockedForMs) setLockedForMs(rl.lockedForMs);
  }, []);

  const triggerError = useCallback((msg: string) => {
    setError(msg); setShake(true); setTimeout(() => setShake(false), 600);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (lockedForMs > 0) return;
    setError(''); setLoading(true);
    await new Promise(r => setTimeout(r, 450));
    const res = authService.login(username.trim(), password, true);
    setLoading(false);
    if (res.success && res.session) {
      onLogin(res.session);
    } else {
      if (res.lockedForMs) setLockedForMs(res.lockedForMs);
      if (res.remainingAttempts !== undefined) setRemainingAttempts(res.remainingAttempts);
      triggerError(res.error ?? 'بيانات الدخول غير صحيحة');
    }
  }

  // no quick access

  return (
    <div style={{
      minHeight:'100vh',
      background:'linear-gradient(135deg, #0a0a0f 0%, #150a0a 30%, #200a0a 60%, #0d0d1a 100%)',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontFamily:"'Cairo', 'Inter', sans-serif", position:'relative', overflow:'hidden',
    }}>
      <SecureBg />

      <div style={{ position:'absolute', width:700, height:700, background:'radial-gradient(circle, rgba(220,38,38,0.07) 0%, transparent 65%)', top:'-20%', right:'-10%', pointerEvents:'none' }} />
      <div style={{ position:'absolute', width:500, height:500, background:'radial-gradient(circle, rgba(59,130,246,0.04) 0%, transparent 65%)', bottom:'0', left:'-10%', pointerEvents:'none' }} />

      {/* Control center badge */}
      <div style={{ position:'fixed', top:12, right:12, display:'flex', alignItems:'center', gap:7, background:'rgba(220,38,38,0.1)', border:'1px solid rgba(220,38,38,0.2)', borderRadius:20, padding:'5px 12px', backdropFilter:'blur(10px)' }}>
        <span style={{ width:6, height:6, borderRadius:'50%', background:'#ef4444', display:'inline-block', boxShadow:'0 0 8px #ef4444' }} />
        <span style={{ fontSize:9, color:'rgba(239,68,68,0.8)', fontFamily:'Inter, monospace', fontWeight:700, letterSpacing:1.5 }}>CONTROL CENTER</span>
      </div>

      {/* Top-left actions */}
      <div style={{ position:'fixed', top:12, left:12, display:'flex', flexDirection:'column', gap:6, zIndex:200 }}>
        {/* Back to home */}
        <button onClick={onGoHome ?? onGoToUser}
          style={{ display:'flex', alignItems:'center', gap:6, fontSize:10, color:'rgba(255,255,255,0.45)', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:16, padding:'6px 13px', cursor:'pointer', fontFamily:'Cairo, sans-serif', transition:'all 0.2s', fontWeight:700 }}
          onMouseEnter={e => { const b=e.currentTarget as HTMLButtonElement; b.style.background='rgba(200,150,44,0.15)'; b.style.color='#e8b84b'; b.style.borderColor='rgba(200,150,44,0.3)'; }}
          onMouseLeave={e => { const b=e.currentTarget as HTMLButtonElement; b.style.background='rgba(255,255,255,0.06)'; b.style.color='rgba(255,255,255,0.45)'; b.style.borderColor='rgba(255,255,255,0.12)'; }}>
          🏠 الرئيسية
        </button>
        {/* Back to user portal */}
        <button onClick={onGoToUser}
          style={{ fontSize:10, color:'rgba(255,255,255,0.2)', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:'5px 11px', cursor:'pointer', fontFamily:'Inter, sans-serif', transition:'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.color='rgba(255,255,255,0.5)'; }}
          onMouseLeave={e => { e.currentTarget.style.color='rgba(255,255,255,0.2)'; }}>
          ← بوابة المستخدمين
        </button>
      </div>

      <div style={{ position:'relative', zIndex:1, width:'100%', maxWidth:420, padding:'0 20px' }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:26 }}>
          <div style={{ position:'relative', width:70, height:70, margin:'0 auto 14px' }}>
            <div style={{ width:70, height:70, borderRadius:18, background:'linear-gradient(135deg,#dc2626,#7f1d1d)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:30, boxShadow:'0 8px 32px rgba(220,38,38,0.45)' }}>
              🔐
            </div>
            <div style={{ position:'absolute', inset:-3, borderRadius:21, border:'1px solid rgba(220,38,38,0.25)' }} />
          </div>
          <h1 style={{ color:'white', fontSize:18, fontWeight:900, margin:'0 0 4px' }}>لوحة إدارة النظام</h1>
          <p style={{ color:'rgba(255,255,255,0.25)', fontSize:10, margin:'0 0 10px', fontFamily:'Inter, sans-serif' }}>
            System Administration Panel — Email Authentication Only
          </p>
          <div style={{ display:'inline-flex', alignItems:'center', gap:5, background:'rgba(220,38,38,0.1)', borderRadius:14, padding:'3px 10px', border:'1px solid rgba(220,38,38,0.2)' }}>
            <span style={{ fontSize:9 }}>⚠️</span>
            <span style={{ color:'rgba(252,165,165,0.8)', fontSize:9, fontFamily:'Inter, sans-serif', fontWeight:600 }}>مخصص للمدراء والمشرفين فقط</span>
          </div>
        </div>

        {/* Card */}
        <div style={{
          background:'rgba(255,255,255,0.03)', backdropFilter:'blur(24px)',
          borderRadius:20, border:'1px solid rgba(255,255,255,0.06)',
          padding:'24px 22px', boxShadow:'0 32px 80px rgba(0,0,0,0.6)',
          animation: shake ? 'shake 0.5s ease' : 'none',
        }}>

          {lockedForMs > 0 ? (
            <LockoutTimer lockedForMs={lockedForMs} />
          ) : (
            <>
              <div style={{ textAlign:'center', marginBottom:18 }}>
                <div style={{ fontSize:13, fontWeight:800, color:'white', marginBottom:3 }}>🔑 دخول المدراء</div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.2)', fontFamily:'Inter, sans-serif' }}>Email + Password — Accès réservé aux administrateurs</div>
              </div>

              <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div>
                  <label style={{ display:'block', color:'rgba(255,255,255,0.35)', fontSize:10, fontWeight:700, marginBottom:5, letterSpacing:0.5 }}>
                    اسم المستخدم أو البريد الإلكتروني
                  </label>
                  <div style={{ position:'relative' }}>
                    <span style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)', fontSize:13, opacity:0.3 }}>👤</span>
                    <input type="text" value={username} onChange={e => { setUsername(e.target.value); setError(''); }} placeholder="admin" dir="ltr" autoComplete="username" required
                      style={{ width:'100%', padding:'10px 34px 10px 12px', background:'rgba(255,255,255,0.05)', border:`1.5px solid ${error ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)'}`, borderRadius:9, color:'white', fontSize:13, fontFamily:'Inter, monospace', outline:'none', boxSizing:'border-box', transition:'border-color 0.2s' }}
                      onFocus={e => { e.target.style.borderColor='rgba(239,68,68,0.6)'; }}
                      onBlur={e => { e.target.style.borderColor=error?'rgba(239,68,68,0.5)':'rgba(255,255,255,0.08)'; }} />
                  </div>
                </div>

                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                    <label style={{ color:'rgba(255,255,255,0.35)', fontSize:10, fontWeight:700, letterSpacing:0.5 }}>كلمة المرور</label>
                    <button type="button" onClick={() => setShowForgot(true)}
                      style={{ background:'none', border:'none', color:'rgba(239,68,68,0.7)', fontSize:10, cursor:'pointer', fontFamily:'inherit', textDecoration:'underline', textUnderlineOffset:2, padding:0 }}>
                      نسيت كلمة المرور؟
                    </button>
                  </div>
                  <div style={{ position:'relative' }}>
                    <span style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)', fontSize:13, opacity:0.3 }}>🔑</span>
                    <input type={showPass ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); setError(''); }} placeholder="••••••••" dir="ltr" autoComplete="current-password" required
                      style={{ width:'100%', padding:'10px 34px 10px 34px', background:'rgba(255,255,255,0.05)', border:`1.5px solid ${error ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)'}`, borderRadius:9, color:'white', fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box', transition:'border-color 0.2s' }}
                      onFocus={e => { e.target.style.borderColor='rgba(239,68,68,0.6)'; }}
                      onBlur={e => { e.target.style.borderColor=error?'rgba(239,68,68,0.5)':'rgba(255,255,255,0.08)'; }} />
                    <button type="button" onClick={() => setShowPass(p => !p)}
                      style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:12, opacity:0.3, color:'white', padding:0 }}>
                      {showPass ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                {remainingAttempts < 5 && remainingAttempts > 0 && (
                  <div style={{ background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:8, padding:'7px 12px', display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:13 }}>⚠️</span>
                    <span style={{ fontSize:11, color:'#fbbf24', fontWeight:600 }}>
                      {remainingAttempts} محاولة متبقية قبل القفل لمدة 15 دقيقة
                    </span>
                  </div>
                )}

                {error && (
                  <div style={{ background:'rgba(220,38,38,0.1)', border:'1px solid rgba(220,38,38,0.25)', borderRadius:9, padding:'9px 12px', color:'#fca5a5', fontSize:12, fontWeight:600, textAlign:'center', whiteSpace:'pre-line' }}>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  style={{ padding:'12px', borderRadius:10, border:'none', background:loading?'rgba(220,38,38,0.35)':'linear-gradient(135deg,#dc2626,#b91c1c)', color:'white', fontSize:14, fontWeight:800, cursor:loading?'not-allowed':'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:9, boxShadow:loading?'none':'0 4px 20px rgba(220,38,38,0.4)', opacity:loading?0.7:1, marginTop:2 }}>
                  {loading ? <><Spinner />جاري التحقق...</> : '🔓 دخول لوحة الإدارة'}
                </button>
              </form>

              {/* secure — no quick access */}
            </>
          )}
        </div>

        {/* Security badges */}
        <div style={{ textAlign:'center', marginTop:14, display:'flex', alignItems:'center', justifyContent:'center', gap:14, flexWrap:'wrap' }}>
          {['🔒 Email Auth Only', '⚡ Rate Limited', '🛡️ 5 Attempts Max'].map(t => (
            <span key={t} style={{ fontSize:9, color:'rgba(255,255,255,0.15)', fontFamily:'Inter, sans-serif' }}>{t}</span>
          ))}
        </div>
      </div>

      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
    </div>
  );
}
