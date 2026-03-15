/* ═══════════════════════════════════════════════════════════════════════
   LOGIN PAGE — Email-only authentication (no Google OAuth)
   ═══════════════════════════════════════════════════════════════════════ */
import { useState } from 'react';
import { authService, ActiveSession } from '../utils/authService';
import RegisterPage from './RegisterPage';

interface LoginPageProps {
  onLogin: (session: ActiveSession) => void;
}

type View = 'login' | 'register';

function MoroccanBg() {
  return (
    <div style={{ position:'absolute', inset:0, opacity:0.04, pointerEvents:'none', overflow:'hidden' }}>
      {Array.from({ length:8 }).map((_, r) =>
        Array.from({ length:10 }).map((_, c) => (
          <div key={`${r}-${c}`} style={{
            position:'absolute', left: c*130 - 40, top: r*130 - 40,
            width:100, height:100, border:'1.5px solid #c8962c',
            transform:'rotate(45deg)', borderRadius:4,
          }} />
        ))
      )}
    </div>
  );
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [view, setView] = useState<View>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (view === 'register') {
    return (
      <RegisterPage
        onBack={() => setView('login')}
        prefillEmail=""
        prefillName=""
      />
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccessMsg('');
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

  const QUICK = [
    { u:'superadmin', p:'Admin@2024',  label:'Super Admin', icon:'👑', color:'#92400e', bg:'#fef3c7' },
    { u:'admin',      p:'admin123',    label:'Admin',       icon:'🏛️', color:'#1e40af', bg:'#dbeafe' },
    { u:'editor',     p:'editor123',   label:'Éditeur',     icon:'✍️', color:'#065f46', bg:'#d1fae5' },
  ];

  return (
    <div style={{
      minHeight:'100vh',
      background:'linear-gradient(135deg, #071425 0%, #0f2744 40%, #1a3a5c 70%, #0f1f35 100%)',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontFamily:"'Cairo', sans-serif", position:'relative', overflow:'hidden',
    }}>
      <MoroccanBg />
      <div style={{ position:'absolute', width:500, height:500, background:'radial-gradient(circle, rgba(200,150,44,0.1) 0%, transparent 70%)', top:'10%', right:'-5%', pointerEvents:'none' }} />
      <div style={{ position:'absolute', width:400, height:400, background:'radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)', bottom:'5%', left:'-5%', pointerEvents:'none' }} />

      <div style={{ position:'relative', zIndex:1, width:'100%', maxWidth:440, padding:'0 20px' }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ width:82, height:82, borderRadius:22, background:'linear-gradient(135deg,#c8962c,#e8b84b)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:40, margin:'0 auto 14px', boxShadow:'0 8px 32px rgba(200,150,44,0.35)' }}>⚜️</div>
          <h1 style={{ color:'white', fontSize:22, fontWeight:900, margin:'0 0 4px' }}>مكتب الخدمات الإدارية</h1>
          <p style={{ color:'rgba(255,255,255,0.35)', fontSize:11, margin:'0 0 10px', fontFamily:'Inter, sans-serif' }}>Bureau de Services Administratifs — Maroc</p>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(200,150,44,0.1)', borderRadius:20, padding:'3px 12px', border:'1px solid rgba(200,150,44,0.2)' }}>
            <span style={{ fontSize:13 }}>🇲🇦</span>
            <span style={{ color:'#e8b84b', fontSize:10, fontFamily:'Inter, sans-serif', fontWeight:600 }}>Système d'Usage Interne Uniquement</span>
          </div>
        </div>

        {successMsg && (
          <div style={{ background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:10, padding:'10px 14px', marginBottom:14, color:'#6ee7b7', fontSize:12, fontWeight:600, textAlign:'center' }}>
            ✅ {successMsg}
          </div>
        )}

        {/* Card */}
        <div style={{ background:'rgba(255,255,255,0.04)', backdropFilter:'blur(20px)', borderRadius:20, border:'1px solid rgba(255,255,255,0.08)', padding:'28px 24px', boxShadow:'0 24px 64px rgba(0,0,0,0.4)' }}>

          <div style={{ textAlign:'center', marginBottom:22 }}>
            <div style={{ fontSize:14, fontWeight:800, color:'white', marginBottom:3 }}>🔐 تسجيل الدخول</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.25)', fontFamily:'Inter, sans-serif' }}>Authentification par email — Accès sécurisé</div>
          </div>

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:13 }}>
            <div>
              <label style={{ display:'block', color:'rgba(255,255,255,0.45)', fontSize:10, fontWeight:700, marginBottom:5 }}>اسم المستخدم أو البريد الإلكتروني</label>
              <div style={{ position:'relative' }}>
                <span style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)', fontSize:14, opacity:0.35 }}>👤</span>
                <input type="text" value={username} onChange={e => { setUsername(e.target.value); setError(''); }}
                  placeholder="username / email@domain.com" dir="ltr" autoComplete="username" required
                  style={{ width:'100%', padding:'11px 36px 11px 12px', background:'rgba(255,255,255,0.07)', border:`1.5px solid ${error ? 'rgba(248,113,113,0.6)' : 'rgba(255,255,255,0.1)'}`, borderRadius:9, color:'white', fontSize:13, fontFamily:'Inter, monospace', outline:'none', boxSizing:'border-box' }}
                  onFocus={e => { e.target.style.borderColor='#c8962c'; }} onBlur={e => { e.target.style.borderColor=error?'rgba(248,113,113,0.6)':'rgba(255,255,255,0.1)'; }} />
              </div>
            </div>

            <div>
              <label style={{ display:'block', color:'rgba(255,255,255,0.45)', fontSize:10, fontWeight:700, marginBottom:5 }}>كلمة المرور</label>
              <div style={{ position:'relative' }}>
                <span style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)', fontSize:14, opacity:0.35 }}>🔑</span>
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="••••••••" dir="ltr" autoComplete="current-password" required
                  style={{ width:'100%', padding:'11px 36px 11px 36px', background:'rgba(255,255,255,0.07)', border:`1.5px solid ${error ? 'rgba(248,113,113,0.6)' : 'rgba(255,255,255,0.1)'}`, borderRadius:9, color:'white', fontSize:13, fontFamily:'Inter, monospace', outline:'none', boxSizing:'border-box' }}
                  onFocus={e => { e.target.style.borderColor='#c8962c'; }} onBlur={e => { e.target.style.borderColor=error?'rgba(248,113,113,0.6)':'rgba(255,255,255,0.1)'; }} />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:12, opacity:0.35, color:'white', padding:0 }}>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background:'rgba(220,38,38,0.1)', border:'1px solid rgba(220,38,38,0.25)', borderRadius:8, padding:'8px 12px', color:'#fca5a5', fontSize:12, fontWeight:600, textAlign:'center' }}>
                ⚠ {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ padding:'13px', borderRadius:10, border:'none', background:loading?'rgba(200,150,44,0.35)':'linear-gradient(135deg,#c8962c,#e8b84b)', color:'#0f2744', fontSize:14, fontWeight:800, cursor:loading?'not-allowed':'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:9, boxShadow:loading?'none':'0 4px 20px rgba(200,150,44,0.3)', marginTop:2, opacity:loading?0.7:1 }}>
              {loading
                ? <><div style={{ width:15, height:15, border:'2.5px solid rgba(0,0,0,0.2)', borderTop:'2.5px solid #0f2744', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />جاري التحقق...</>
                : '🔓 تسجيل الدخول'}
            </button>
          </form>

          {/* Quick login */}
          <div style={{ marginTop:14, padding:'10px 12px', background:'rgba(255,255,255,0.02)', borderRadius:9, border:'1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.2)', marginBottom:7, fontWeight:700 }}>💡 حسابات تجريبية:</div>
            <div style={{ display:'flex', gap:6 }}>
              {QUICK.map(acc => (
                <button key={acc.u} onClick={() => { setUsername(acc.u); setPassword(acc.p); setError(''); setSuccessMsg(''); }}
                  style={{ flex:1, padding:'7px 8px', background:acc.bg, border:`1px solid ${acc.color}33`, borderRadius:8, cursor:'pointer', fontFamily:'inherit', textAlign:'center' }}>
                  <div style={{ fontSize:16, marginBottom:2 }}>{acc.icon}</div>
                  <div style={{ color:acc.color, fontSize:10, fontWeight:700 }}>{acc.label}</div>
                  <div style={{ color:'rgba(100,116,139,0.8)', fontSize:9, fontFamily:'monospace' }}>{acc.u}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Register */}
          <div style={{ marginTop:16, textAlign:'center', paddingTop:12, borderTop:'1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize:11, color:'rgba(255,255,255,0.2)' }}>ليس لديك حساب؟ </span>
            <button onClick={() => { setView('register'); setError(''); setSuccessMsg(''); }}
              style={{ background:'none', border:'none', color:'#e8b84b', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', textDecoration:'underline', textUnderlineOffset:3 }}>
              طلب التسجيل
            </button>
          </div>
        </div>

        <div style={{ textAlign:'center', marginTop:12, color:'rgba(255,255,255,0.12)', fontSize:10, fontFamily:'Inter, sans-serif' }}>
          🔒 Authentification Email uniquement — v4.1 — Usage Interne
        </div>
      </div>
    </div>
  );
}
