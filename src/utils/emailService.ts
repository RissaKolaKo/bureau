/* ═══════════════════════════════════════════════════════════════════════
   EMAIL SERVICE — Resend API Integration
   Real email sending for: registration, password reset, approval/rejection
   API Key: re_aPFpkrXx_NRpTP8ASH2t9PPJxpebAkfNN
   ═══════════════════════════════════════════════════════════════════════ */

const RESEND_API_KEY = 're_aPFpkrXx_NRpTP8ASH2t9PPJxpebAkfNN';
const FROM_EMAIL = 'onboarding@resend.dev'; // Use verified domain in production
const APP_NAME = 'مكتب الخدمات الإدارية';
const APP_NAME_FR = 'Bureau de Services Administratifs — Maroc';

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/* ══════════════════════════════════════
   HTML EMAIL TEMPLATES
   ══════════════════════════════════════ */

function baseTemplate(content: string, title: string): string {
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f1f5f9; direction: rtl; }
  .wrapper { max-width: 600px; margin: 0 auto; padding: 32px 16px; }
  .card { background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
  .header { background: linear-gradient(135deg, #0f2744 0%, #1a3a5c 100%); padding: 32px 36px; text-align: center; }
  .header-icon { font-size: 48px; margin-bottom: 12px; display: block; }
  .header-title { color: #e8b84b; font-size: 22px; font-weight: 800; margin-bottom: 4px; }
  .header-sub { color: rgba(255,255,255,0.5); font-size: 12px; font-family: 'Inter', Arial, sans-serif; direction: ltr; }
  .body { padding: 32px 36px; }
  .greeting { font-size: 17px; font-weight: 700; color: #0f2744; margin-bottom: 16px; }
  .text { font-size: 14px; color: #4b5563; line-height: 1.8; margin-bottom: 16px; }
  .btn { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #c8962c, #e8b84b); color: #0f2744; font-size: 15px; font-weight: 800; text-decoration: none; border-radius: 10px; margin: 20px 0; box-shadow: 0 4px 16px rgba(200,150,44,0.35); }
  .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-right: 4px solid #c8962c; border-radius: 8px; padding: 16px 18px; margin: 16px 0; }
  .info-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
  .info-row:last-child { border-bottom: none; }
  .info-label { color: #94a3b8; }
  .info-value { color: #0f2744; font-weight: 700; font-family: monospace; direction: ltr; }
  .warning-box { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 14px 16px; margin: 16px 0; font-size: 13px; color: #92400e; }
  .success-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 16px; margin: 16px 0; font-size: 13px; color: #065f46; }
  .error-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 14px 16px; margin: 16px 0; font-size: 13px; color: #991b1b; }
  .divider { height: 1px; background: #f1f5f9; margin: 24px 0; }
  .url-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; font-size: 11px; color: #64748b; font-family: monospace; word-break: break-all; direction: ltr; text-align: left; margin: 12px 0; }
  .footer { padding: 20px 36px; background: #f8fafc; text-align: center; border-top: 1px solid #e2e8f0; }
  .footer-text { font-size: 11px; color: #94a3b8; line-height: 1.6; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
  .badge-pending { background: #fef3c7; color: #92400e; }
  .badge-approved { background: #d1fae5; color: #065f46; }
  .badge-rejected { background: #fee2e2; color: #991b1b; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="card">
    <div class="header">
      <span class="header-icon">⚜️</span>
      <div class="header-title">${APP_NAME}</div>
      <div class="header-sub">${APP_NAME_FR}</div>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <div class="footer-text">
        هذا البريد أُرسل تلقائياً من نظام مكتب الخدمات الإدارية المغربي.<br />
        Ce courriel est envoyé automatiquement — Ne pas répondre.<br />
        <strong style="color: #c8962c;">© ${new Date().getFullYear()} Bureau de Services Administratifs — Maroc</strong>
      </div>
    </div>
  </div>
</div>
</body>
</html>`;
}

/* ── Password Reset Email ── */
function passwordResetHTML(name: string, resetUrl: string, expiryMins: number): string {
  return baseTemplate(`
    <div class="greeting">مرحباً ${name}،</div>
    <p class="text">
      تلقينا طلباً لإعادة تعيين كلمة مرور حسابك في نظام مكتب الخدمات الإدارية.
      إذا لم تطلب هذا، يمكنك تجاهل هذا البريد بأمان — حسابك آمن.
    </p>
    <div class="warning-box">
      ⏰ <strong>مهم:</strong> هذا الرابط صالح لمدة ${expiryMins} دقيقة فقط ولاستخدام واحد فقط.
    </div>
    <div style="text-align: center;">
      <a href="${resetUrl}" class="btn">🔑 إعادة تعيين كلمة المرور</a>
    </div>
    <div class="url-box">${resetUrl}</div>
    <div class="divider"></div>
    <p class="text" style="font-size: 12px; color: #94a3b8;">
      إذا لم تطلب إعادة تعيين كلمة المرور، فقد يكون شخص ما يحاول الوصول إلى حسابك.
      يُنصح بمراجعة المدير إذا تكررت هذه الرسائل.
    </p>
  `, 'إعادة تعيين كلمة المرور');
}

/* ── Registration Received Email ── */
function registrationReceivedHTML(name: string, username: string, requestId: string): string {
  return baseTemplate(`
    <div class="greeting">مرحباً ${name}،</div>
    <p class="text">
      شكراً لتسجيلك في نظام مكتب الخدمات الإدارية المغربي.
      تم استلام طلبك بنجاح وهو الآن قيد المراجعة من طرف المدير المسؤول.
    </p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">🆔 رقم الطلب</span>
        <span class="info-value">${requestId}</span>
      </div>
      <div class="info-row">
        <span class="info-label">👤 اسم المستخدم</span>
        <span class="info-value">${username}</span>
      </div>
      <div class="info-row">
        <span class="info-label">📅 تاريخ الطلب</span>
        <span class="info-value">${new Date().toLocaleDateString('ar-MA', { year:'numeric', month:'long', day:'numeric' })}</span>
      </div>
      <div class="info-row">
        <span class="info-label">📊 الحالة</span>
        <span class="badge badge-pending">⏳ قيد المراجعة</span>
      </div>
    </div>
    <div class="warning-box">
      ⏳ <strong>ملاحظة:</strong> لن تتمكن من الدخول للنظام حتى يوافق المدير على طلبك.
      سيتم إخطارك بالبريد الإلكتروني فور اتخاذ القرار.
    </div>
    <p class="text" style="font-size: 12px; color: #94a3b8;">
      إذا لم تتلقَّ رداً خلال 48 ساعة، يرجى التواصل مع المدير مباشرةً.
    </p>
  `, 'تم استلام طلب التسجيل');
}

/* ── Registration Approved Email ── */
function registrationApprovedHTML(name: string, username: string, role: string, loginUrl: string): string {
  const roleAr: Record<string, string> = {
    editor: 'محرر', viewer: 'مشاهد', admin: 'مدير', superadmin: 'مدير عام',
  };
  return baseTemplate(`
    <div class="greeting">مرحباً ${name}،</div>
    <div class="success-box">
      ✅ <strong>تهانينا!</strong> تمت الموافقة على طلب تسجيلك في نظام مكتب الخدمات الإدارية.
    </div>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">👤 اسم المستخدم</span>
        <span class="info-value">${username}</span>
      </div>
      <div class="info-row">
        <span class="info-label">🎭 الدور المُعيَّن</span>
        <span class="badge badge-approved">${roleAr[role] ?? role}</span>
      </div>
      <div class="info-row">
        <span class="info-label">📅 تاريخ القبول</span>
        <span class="info-value">${new Date().toLocaleDateString('ar-MA', { year:'numeric', month:'long', day:'numeric' })}</span>
      </div>
    </div>
    <p class="text">يمكنك الآن تسجيل الدخول باستخدام اسم المستخدم وكلمة المرور التي اخترتها عند التسجيل.</p>
    <div style="text-align: center;">
      <a href="${loginUrl}" class="btn">🔓 تسجيل الدخول الآن</a>
    </div>
  `, 'تمت الموافقة على حسابك');
}

/* ── Registration Rejected Email ── */
function registrationRejectedHTML(name: string, reason: string): string {
  return baseTemplate(`
    <div class="greeting">مرحباً ${name}،</div>
    <div class="error-box">
      ❌ نأسف لإعلامك بأنه تم رفض طلب تسجيلك في نظام مكتب الخدمات الإدارية.
    </div>
    ${reason ? `
    <div class="info-box">
      <div style="font-size: 13px; color: #4b5563;">
        <strong style="color: #0f2744;">📋 سبب الرفض:</strong><br/>
        <span style="margin-top: 6px; display: block;">${reason}</span>
      </div>
    </div>` : ''}
    <p class="text">
      إذا كنت تعتقد أن هذا القرار غير صحيح، يمكنك التواصل مع المدير المسؤول لمزيد من المعلومات.
    </p>
    <p class="text" style="font-size: 12px; color: #94a3b8;">
      يمكنك إعادة تقديم طلب جديد بعد مراجعة الأسباب المذكورة أعلاه.
    </p>
  `, 'بخصوص طلب التسجيل');
}

/* ══════════════════════════════════════
   RESEND API SENDER
   ══════════════════════════════════════ */

async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<EmailResult> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${APP_NAME} <${FROM_EMAIL}>`,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
      }),
    });

    const data = await response.json() as { id?: string; error?: { message?: string }; message?: string };

    if (!response.ok) {
      const errMsg = data?.error?.message ?? data?.message ?? `HTTP ${response.status}`;
      console.warn('[EmailService] Resend API error:', errMsg);
      return { success: false, error: errMsg };
    }

    return { success: true, messageId: data.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error';
    console.warn('[EmailService] Send failed:', msg);
    return { success: false, error: msg };
  }
}

/* ══════════════════════════════════════
   PUBLIC API
   ══════════════════════════════════════ */

/** Send password reset email */
export async function sendPasswordResetEmail(opts: {
  to: string;
  name: string;
  resetUrl: string;
  expiryMins?: number;
}): Promise<EmailResult> {
  return sendEmail({
    to: opts.to,
    subject: `🔑 إعادة تعيين كلمة المرور — ${APP_NAME}`,
    html: passwordResetHTML(opts.name, opts.resetUrl, opts.expiryMins ?? 15),
  });
}

/** Send registration confirmation to user */
export async function sendRegistrationReceivedEmail(opts: {
  to: string;
  name: string;
  username: string;
  requestId: string;
}): Promise<EmailResult> {
  return sendEmail({
    to: opts.to,
    subject: `📝 تم استلام طلب التسجيل — ${APP_NAME}`,
    html: registrationReceivedHTML(opts.name, opts.username, opts.requestId),
  });
}

/** Send approval notification to user */
export async function sendApprovalEmail(opts: {
  to: string;
  name: string;
  username: string;
  role: string;
  loginUrl: string;
}): Promise<EmailResult> {
  return sendEmail({
    to: opts.to,
    subject: `✅ تمت الموافقة على حسابك — ${APP_NAME}`,
    html: registrationApprovedHTML(opts.name, opts.username, opts.role, opts.loginUrl),
  });
}

/** Send rejection notification to user */
export async function sendRejectionEmail(opts: {
  to: string;
  name: string;
  reason?: string;
}): Promise<EmailResult> {
  return sendEmail({
    to: opts.to,
    subject: `❌ بخصوص طلب التسجيل — ${APP_NAME}`,
    html: registrationRejectedHTML(opts.name, opts.reason ?? ''),
  });
}
