/* ═══════════════════════════════════════════════════════════════════════
   REGISTER PAGE — Email + Password only (no Google OAuth)
   Real confirmation email sent via Resend API
   ═══════════════════════════════════════════════════════════════════════ */
import { useState } from 'react';
import { authService } from '../utils/authService';
import { sendRegistrationReceivedEmail } from '../utils/emailService';

interface RegisterPageProps {
  onBack: () => void;
  onSuccess: () => void;
  prefillEmail?: string;
  prefillName?: string;
}

function MoroccanBg() {
  return (
    <div style={{ position:'absolute', inset:0, opacity:0.04, pointerEvents:'none', overflow:'hidden' }}>
      {Array.from({ length:7 }).map((_, r) =>
        Array.from({ length:9 }).map((_, c) => (
          <div key={`${r}-${c}`} style={{
            position:'absolute', left: c*130 - 40, top: r*130 - 40,
            width:90, height:90, border:'1.5px solid #c8962c',
            transform:'rotate(45deg)', borderRadius:3,
          }} />
        ))
      )}
    </div>
  );
}

function Field({ label, value, onChange, type='text', placeholder='', required=false, dir='rtl', icon='', error='', hint='' }:
  { label:string; value:string; onChange:(v:string)=>void; type?:string; placeholder?:string; required?:boolean; dir?:string; icon?:string; error?:string; hint?:string }) {
  const [focused, setFocused] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const isPassword = type === 'password';
  return (
    <div>
      <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#cbd5e1', marginBottom:5 }}>
        {label} {required && <span style={{ color:'#f87171' }}>*</span>}
      </label>
      <div style={{ position:'relative' }}>
        {icon && <span style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)', fontSize:15, opacity:0.5 }}>{icon}</span>}
        <input
          type={isPassword && showPwd ? 'text' : type}
          value={value} dir={dir}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width:'100%', padding:`10px ${icon ? '36px' : '12px'} 10px ${isPassword ? '36px' : '12px'}`,
            background:'rgba(255,255,255,0.07)',
            border:`1.5px solid ${error ? '#f87171' : focused ? '#c8962c' : 'rgba(255,255,255,0.12)'}`,
            borderRadius:9, color:'white', fontSize:13, fontFamily:'inherit',
            outline:'none', boxSizing:'border-box', transition:'border-color 0.2s',
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {isPassword && (
          <button type="button" onClick={() => setShowPwd(p => !p)}
            style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:13, opacity:0.35, color:'white', padding:0 }}>
            {showPwd ? '🙈' : '👁️'}
          </button>
        )}
      </div>
      {error && <div style={{ fontSize:10, color:'#f87171', marginTop:4, fontWeight:600 }}>⚠ {error}</div>}
      {hint && !error && <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', marginTop:3 }}>{hint}</div>}
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label:'8 أحرف على الأقل', ok: password.length >= 8 },
    { label:'حرف كبير', ok: /[A-Z]/.test(password) },
    { label:'رقم', ok: /[0-9]/.test(password) },
    { label:'رمز خاص', ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const colors = ['#ef4444','#f59e0b','#3b82f6','#10b981'];
  const labels = ['ضعيفة','مقبولة','جيدة','قوية جداً'];
  if (!password) return null;
  return (
    <div style={{ marginTop:6 }}>
      <div style={{ display:'flex', gap:3, marginBottom:6 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ flex:1, height:3, borderRadius:2, background: i < score ? colors[score-1] : 'rgba(255,255,255,0.1)', transition:'background 0.3s' }} />
        ))}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {checks.map(c => (
            <span key={c.label} style={{ fontSize:9, color: c.ok ? '#86efac' : '#94a3b8', display:'flex', alignItems:'center', gap:3 }}>
              {c.ok ? '✓' : '○'} {c.label}
            </span>
          ))}
        </div>
        {score > 0 && <span style={{ fontSize:10, fontWeight:700, color: colors[score-1] }}>{labels[score-1]}</span>}
      </div>
    </div>
  );
}

export default function RegisterPage({ onBack, prefillEmail='', prefillName='' }: Omit<RegisterPageProps, 'onSuccess'>) {
  const [step, setStep] = useState<'form'|'success'>('form');
  const [form, setForm] = useState({
    name: prefillName,
    nameFr: '',
    email: prefillEmail,
    phone: '',
    username: '',
    password: '',
    confirmPassword: '',
    notes: '',
  });
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(false);
  const [requestId, setRequestId] = useState('');
  const [emailStatus, setEmailStatus] = useState<'idle'|'sending'|'sent'|'failed'>('idle');

  function set(k: string, v: string) {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => { const n={...e}; delete n[k]; return n; });
  }

  function validate(): boolean {
    const e: Record<string,string> = {};
    if (!form.name.trim()) e.name = 'الاسم الكامل مطلوب';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'بريد إلكتروني غير صالح';
    if (!form.username.trim() || form.username.length < 3) e.username = 'اسم المستخدم 3 أحرف على الأقل';
    if (!/^[a-z0-9_]+$/.test(form.username)) e.username = 'حروف إنجليزية صغيرة، أرقام، شرطة سفلية فقط';
    if (!form.password) e.password = 'كلمة المرور مطلوبة';
    else if (form.password.length < 8) e.password = 'كلمة المرور 8 أحرف على الأقل';
    else if (form.password !== form.confirmPassword) e.confirmPassword = 'كلمتا المرور غير متطابقتان';
    if (!agree) e.agree = 'يجب الموافقة على الشروط';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 500));

    const result = authService.submitRegistration({
      username: form.username.trim().toLowerCase(),
      password: form.password,
      name: form.name.trim(),
      nameFr: form.nameFr.trim() || form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      provider: 'local',
      notes: form.notes,
    });

    setLoading(false);
    if (!result.success) { setErrors({ submit: result.error ?? 'حدث خطأ. حاول مرة أخرى.' }); return; }

    setRequestId(result.requestId ?? '');
    setStep('success');

    // Send real confirmation email
    setEmailStatus('sending');
    sendRegistrationReceivedEmail({
      to: form.email.trim(),
      name: form.name.trim(),
      username: form.username.trim(),
      requestId: result.requestId ?? '',
    }).then(r => setEmailStatus(r.success ? 'sent' : 'failed')).catch(() => setEmailStatus('failed'));
  }

  /* ── SUCCESS ── */
  if (step === 'success') {
    return (
      <div style={{
        minHeight:'100vh',
        background:'linear-gradient(135deg, #071425 0%, #0f2744 40%, #1a3a5c 70%, #0f1f35 100%)',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontFamily:"'Cairo', sans-serif", position:'relative', overflow:'hidden',
      }}>
        <MoroccanBg />
        <div style={{ position:'relative', zIndex:1, width:'100%', maxWidth:460, padding:'0 20px', textAlign:'center' }}>
          <div style={{ width:100, height:100, borderRadius:'50%', background:'linear-gradient(135deg,#065f46,#10b981)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:48, margin:'0 auto 24px', boxShadow:'0 0 0 16px rgba(16,185,129,0.1)' }}>✅</div>

          <div style={{ background:'rgba(255,255,255,0.04)', backdropFilter:'blur(20px)', borderRadius:20, border:'1px solid rgba(255,255,255,0.1)', padding:'28px 24px' }}>
            <h2 style={{ color:'white', fontSize:20, fontWeight:900, margin:'0 0 6px' }}>تم إرسال طلبك بنجاح!</h2>
            <p style={{ color:'rgba(255,255,255,0.45)', fontSize:12, margin:'0 0 22px' }}>Votre demande d'inscription a été soumise avec succès</p>

            {/* Email status */}
            <div style={{ marginBottom:16, padding:'10px 14px', borderRadius:9, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.03)', display:'flex', alignItems:'center', gap:10, fontSize:12 }}>
              <span style={{ fontSize:16 }}>
                {emailStatus === 'sending' ? '⏳' : emailStatus === 'sent' ? '📧' : emailStatus === 'failed' ? '⚠️' : '📧'}
              </span>
              <span style={{ color: emailStatus === 'sent' ? '#6ee7b7' : emailStatus === 'failed' ? '#fca5a5' : 'rgba(255,255,255,0.5)' }}>
                {emailStatus === 'sending' && 'جاري إرسال بريد التأكيد...'}
                {emailStatus === 'sent' && `تم إرسال بريد التأكيد إلى ${form.email}`}
                {emailStatus === 'failed' && 'تعذّر إرسال بريد التأكيد — تواصل مع المدير'}
                {emailStatus === 'idle' && `سيتم إرسال بريد التأكيد إلى ${form.email}`}
              </span>
            </div>

            {/* Request info */}
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
              {[
                { icon:'🆔', label:'رقم الطلب', value:requestId, mono:true },
                { icon:'👤', label:'اسم المستخدم', value:`@${form.username}`, mono:true },
                { icon:'📧', label:'البريد الإلكتروني', value:form.email, mono:true },
                { icon:'🔒', label:'طريقة التسجيل', value:'Email + Password', mono:true },
              ].map(item => (
                <div key={item.label} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'rgba(255,255,255,0.04)', borderRadius:8 }}>
                  <span style={{ fontSize:14 }}>{item.icon}</span>
                  <span style={{ fontSize:11, color:'rgba(255,255,255,0.4)', flex:1 }}>{item.label}</span>
                  <span style={{ fontSize:11, fontWeight:700, color:'white', fontFamily: item.mono ? 'monospace' : 'inherit', direction:'ltr' }}>{item.value}</span>
                </div>
              ))}
            </div>

            {/* Timeline */}
            <div style={{ background:'rgba(200,150,44,0.06)', borderRadius:12, border:'1px solid rgba(200,150,44,0.15)', padding:'14px 16px', textAlign:'right', marginBottom:20 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#e8b84b', marginBottom:10 }}>⏳ مراحل معالجة الطلب:</div>
              {[
                { step:'1', label:'تم استلام طلبك', done:true },
                { step:'2', label:'مراجعة البيانات من طرف المدير', pending:true },
                { step:'3', label:'إخطارك بالقرار عبر البريد الإلكتروني', waiting:true },
                { step:'4', label:'الدخول للنظام بعد الموافقة', waiting:true },
              ].map(item => (
                <div key={item.step} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:7 }}>
                  <div style={{ width:20, height:20, borderRadius:'50%', background: item.done ? '#10b981' : item.pending ? '#f59e0b' : 'rgba(100,116,139,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:900, color:'white', flexShrink:0 }}>
                    {item.done ? '✓' : item.step}
                  </div>
                  <span style={{ fontSize:11, color: item.done ? '#86efac' : item.pending ? '#fcd34d' : 'rgba(255,255,255,0.3)' }}>{item.label}</span>
                </div>
              ))}
            </div>

            <button onClick={onBack}
              style={{ width:'100%', padding:'12px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#c8962c,#e8b84b)', color:'#0f2744', fontSize:14, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
              ← العودة لصفحة الدخول
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── FORM ── */
  return (
    <div style={{
      minHeight:'100vh',
      background:'linear-gradient(135deg, #071425 0%, #0f2744 40%, #1a3a5c 70%, #0f1f35 100%)',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontFamily:"'Cairo', sans-serif", position:'relative', overflow:'hidden', padding:'20px',
    }}>
      <MoroccanBg />

      <div style={{ position:'relative', zIndex:1, width:'100%', maxWidth:560 }}>
        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:22 }}>
          <div style={{ width:64, height:64, borderRadius:16, background:'linear-gradient(135deg,#c8962c,#e8b84b)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:30, margin:'0 auto 12px', boxShadow:'0 6px 24px rgba(200,150,44,0.3)' }}>📧</div>
          <h1 style={{ color:'white', fontSize:19, fontWeight:900, margin:'0 0 4px' }}>إنشاء حساب جديد</h1>
          <p style={{ color:'rgba(255,255,255,0.35)', fontSize:11, margin:0, fontFamily:'Inter, sans-serif' }}>
            Inscription par email — Bureau de Services Administratifs
          </p>
        </div>

        {/* Notice */}
        <div style={{ background:'rgba(200,150,44,0.08)', border:'1px solid rgba(200,150,44,0.2)', borderRadius:12, padding:'12px 16px', marginBottom:18, display:'flex', alignItems:'flex-start', gap:10 }}>
          <span style={{ fontSize:18 }}>⏳</span>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)', lineHeight:1.7 }}>
            <strong style={{ color:'#e8b84b' }}>ملاحظة مهمة:</strong> سيتم إرسال طلبك إلى المدير للموافقة عليه.
            لن تتمكن من الدخول حتى يوافق المدير على حسابك.
            ستتلقى بريداً إلكترونياً عند اتخاذ القرار.
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ background:'rgba(255,255,255,0.04)', backdropFilter:'blur(20px)', borderRadius:20, border:'1px solid rgba(255,255,255,0.1)', padding:'24px 22px', boxShadow:'0 24px 64px rgba(0,0,0,0.4)', display:'flex', flexDirection:'column', gap:14 }}>

            {/* Section: Personal info */}
            <SectionLabel label="👤 المعلومات الشخصية" />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Field label="الاسم الكامل (عربي)" value={form.name} onChange={v => set('name', v)} placeholder="محمد العلوي" required error={errors.name} />
              <Field label="Nom complet (Français)" value={form.nameFr} onChange={v => set('nameFr', v)} placeholder="Mohammed Alaoui" dir="ltr" />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Field label="البريد الإلكتروني" value={form.email} onChange={v => set('email', v)} type="email" placeholder="exemple@gmail.com" required dir="ltr" icon="📧" error={errors.email} />
              <Field label="الهاتف (اختياري)" value={form.phone} onChange={v => set('phone', v)} placeholder="06XXXXXXXX" dir="ltr" icon="📞" />
            </div>
            <Field label="اسم المستخدم (username)" value={form.username} onChange={v => set('username', v.toLowerCase().replace(/[^a-z0-9_]/g,''))}
              placeholder="mohammed_alaoui" required dir="ltr" icon="🔖" error={errors.username}
              hint="حروف إنجليزية صغيرة، أرقام، وشرطة سفلية فقط" />

            {/* Section: Password */}
            <SectionLabel label="🔑 كلمة المرور" />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Field label="كلمة المرور" value={form.password} onChange={v => set('password', v)} type="password" placeholder="••••••••" required dir="ltr" icon="🔒" error={errors.password} />
              <Field label="تأكيد كلمة المرور" value={form.confirmPassword} onChange={v => set('confirmPassword', v)} type="password" placeholder="••••••••" required dir="ltr" icon="🔒" error={errors.confirmPassword} />
            </div>
            <PasswordStrength password={form.password} />

            {/* Section: Notes */}
            <SectionLabel label="📋 ملاحظات (اختياري)" />
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
              placeholder="سبب طلب الانضمام، المنصب، الجهة..."
              style={{ width:'100%', padding:'9px 12px', background:'rgba(255,255,255,0.07)', border:'1.5px solid rgba(255,255,255,0.12)', borderRadius:9, color:'white', fontSize:12, fontFamily:'inherit', resize:'vertical', outline:'none', boxSizing:'border-box' }} />

            {/* Terms */}
            <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 12px', background:'rgba(200,150,44,0.06)', borderRadius:9, border:'1px solid rgba(200,150,44,0.15)' }}>
              <input type="checkbox" id="terms-reg" checked={agree} onChange={e => setAgree(e.target.checked)}
                style={{ marginTop:2, width:16, height:16, cursor:'pointer', accentColor:'#c8962c', flexShrink:0 }} />
              <label htmlFor="terms-reg" style={{ fontSize:11, color:'rgba(255,255,255,0.45)', lineHeight:1.7, cursor:'pointer' }}>
                أوافق على أن هذا النظام للاستخدام الداخلي فقط، وأن بياناتي ستُراجع من قِبل المدير.
                <span style={{ color:'#e8b84b' }}> طلبي سيبقى معلقاً حتى الموافقة عليه.</span>
              </label>
            </div>
            {errors.agree && <ErrMsg msg={errors.agree} />}
            {errors.submit && <ErrMsg msg={errors.submit} />}

            <button type="submit" disabled={loading}
              style={{ padding:'13px', borderRadius:10, border:'none', background:loading?'rgba(200,150,44,0.35)':'linear-gradient(135deg,#c8962c,#e8b84b)', color:'#0f2744', fontSize:14, fontWeight:800, cursor:loading?'not-allowed':'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow:loading?'none':'0 4px 20px rgba(200,150,44,0.3)', marginTop:4, opacity:loading?0.7:1 }}>
              {loading
                ? <><div style={{ width:15, height:15, border:'2.5px solid rgba(0,0,0,0.2)', borderTop:'2.5px solid #0f2744', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} /> جاري إرسال الطلب...</>
                : '📤 إرسال طلب التسجيل'}
            </button>
          </div>
        </form>

        <div style={{ textAlign:'center', marginTop:14 }}>
          <button onClick={onBack} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.35)', fontSize:12, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6, margin:'0 auto' }}>
            ← العودة لتسجيل الدخول
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{ fontSize:11, fontWeight:700, color:'#c8962c', borderBottom:'1px solid rgba(200,150,44,0.2)', paddingBottom:6, marginTop:4 }}>
      {label}
    </div>
  );
}

function ErrMsg({ msg }: { msg: string }) {
  return (
    <div style={{ background:'rgba(220,38,38,0.1)', border:'1px solid rgba(220,38,38,0.3)', borderRadius:7, padding:'7px 11px', color:'#fca5a5', fontSize:11, fontWeight:600 }}>
      ⚠ {msg}
    </div>
  );
}
