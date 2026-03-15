import { useState, useRef, forwardRef, useCallback, useEffect } from 'react';
import { PublicWriterForm, PublicDocType, PersonBlock, CustomClause, FormError } from '../types';
import { getDocTypeLabel, getTodayMoroccan, getTodayISO } from '../utils/documentTemplates';
import { exportArabicDocToDocx } from '../utils/exportDocx';
import { saveToHistory } from '../utils/storage';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/* ══════════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════════ */
export interface TemplateDef {
  id: string;
  docType: PublicDocType | string;
  icon: string;
  color: string;
  nameAr: string;
  nameFr: string;
  category: 'single-party' | 'two-parties';
  showAmount?: boolean;
  showDuration?: boolean;
  showProperty?: boolean;
  showDebt?: boolean;
  showSubject?: boolean;
  enabled: boolean;
  bodyTemplate: string;
  isCustom?: boolean;
}

export interface DocHeaderConfig {
  showTitle: boolean;
  titleText: string;
  titleFontSize: number;
  titleAlign: 'right' | 'center' | 'left';
  titleColor: string;
  titleBold: boolean;
  showDivider: boolean;
  dividerColor: string;
  showDate: boolean;
  showCity: boolean;
  showOrnament: boolean;
  ornamentChar: string;
  pageMarginTop: number;
  pageMarginSide: number;
  bodyFontSize: number;
  bodyLineHeight: number;
  signatureStyle: 'simple' | 'formal' | 'double-line';
}

const defaultHeaderConfig = (): DocHeaderConfig => ({
  showTitle: true,
  titleText: '',
  titleFontSize: 20,
  titleAlign: 'center',
  titleColor: '#0f2744',
  titleBold: true,
  showDivider: true,
  dividerColor: '#0f2744',
  showDate: true,
  showCity: true,
  showOrnament: true,
  ornamentChar: '◈ ◈ ◈',
  pageMarginTop: 52,
  pageMarginSide: 60,
  bodyFontSize: 14,
  bodyLineHeight: 2.5,
  signatureStyle: 'formal',
});

/* ══════════════════════════════════════════════════════════════
   DEFAULT TEMPLATES
══════════════════════════════════════════════════════════════ */
const DEFAULT_TEMPLATES: TemplateDef[] = [
  {
    id: 'tpl-declaration',
    docType: 'declaration-honneur',
    icon: '🤲', color: '#0891b2',
    nameAr: 'تصريح بالشرف', nameFr: "Déclaration sur l'Honneur",
    category: 'single-party',
    enabled: true,
    bodyTemplate: `أنا الموقع/ة أدناه، {{party1_name}}، الحامل/ة لبطاقة التعريف الوطنية رقم {{party1_cin}}، المزداد/ة بتاريخ {{party1_dob}}، المقيم/ة بـ {{party1_address}}، {{party1_city}}، هاتف: {{party1_phone}}.

أُصرّح على شرفي وأُقرّ، بكامل أهليتي القانونية والمدنية، وبصفة رسمية أمام الجهات المختصة، بما يلي:

{{details}}

أُقرّ بأن جميع المعلومات الواردة في هذا التصريح صحيحة وصادقة ومطابقة للواقع، وأتحمل كامل المسؤولية القانونية عن أي معلومة مغلوطة.

هذا التصريح حُرِّر بمحض إرادتي الحرة، ودون أي إكراه أو ضغط.

حُرِّر هذا التصريح بناءً على طلب من يلزمه وسُلِّم له ليُستعان به لدى من يلزم.

في {{city}}، بتاريخ {{date}}.`,
  },
  {
    id: 'tpl-procuration',
    docType: 'procuration',
    icon: '🔑', color: '#7c3aed',
    nameAr: 'وكالة خاصة', nameFr: 'Procuration / Mandat Spécial',
    category: 'two-parties',
    showDuration: true,
    enabled: true,
    bodyTemplate: `أنا الموقع/ة أدناه (الموكِّل):

الاسم الكامل: {{party1_name}}
رقم ب.ت.و: {{party1_cin}}
تاريخ الازدياد: {{party1_dob}}
العنوان: {{party1_address}}، {{party1_city}}
الهاتف: {{party1_phone}}

أُفوِّض وأُنيب، بموجب هذه الوكالة الخاصة وبصريح إرادتي، السيد/ة (الوكيل):

الاسم الكامل: {{party2_name}}
رقم ب.ت.و: {{party2_cin}}
تاريخ الازدياد: {{party2_dob}}
العنوان: {{party2_address}}، {{party2_city}}
الهاتف: {{party2_phone}}

للقيام بدلاً عني ونيابةً عني في الأمور التالية:

{{details}}

شروط الوكالة:
• هذه الوكالة خاصة ومحدودة بالصلاحيات المذكورة أعلاه فقط.
• مدة سريان هذه الوكالة: {{duration}}.
• يُمكن إلغاء هذه الوكالة في أي وقت بإشعار كتابي مسبق.

حُرِّرت هذه الوكالة في {{city}}، بتاريخ {{date}}، في نسختين أصليتين.`,
  },
  {
    id: 'tpl-contrat',
    docType: 'contrat-deux-parties',
    icon: '🤝', color: '#b45309',
    nameAr: 'عقد بين طرفين', nameFr: 'Contrat entre Deux Parties',
    category: 'two-parties',
    showAmount: true,
    showDuration: true,
    showSubject: true,
    enabled: true,
    bodyTemplate: `بعد التراضي والتدبر الكافيين، اتُّفق بين الطرفين الموقعَين أدناه على إبرام هذا العقد:

الطرف الأول:
الاسم الكامل: {{party1_name}}
رقم ب.ت.و: {{party1_cin}}
تاريخ الازدياد: {{party1_dob}}
العنوان: {{party1_address}}، {{party1_city}}
الهاتف: {{party1_phone}}

الطرف الثاني:
الاسم الكامل: {{party2_name}}
رقم ب.ت.و: {{party2_cin}}
تاريخ الازدياد: {{party2_dob}}
العنوان: {{party2_address}}، {{party2_city}}
الهاتف: {{party2_phone}}

موضوع العقد:
{{subject}}

{{details}}

الشروط المالية:
• المبلغ المتفق عليه: {{amount}} درهم مغربي.
• مدة العقد: {{duration}}.

• يلتزم الطرفان بالتنفيذ الكامل لجميع بنود هذا العقد.
• يُعدّ هذا العقد حجةً على الطرفين وهو قابل للتنفيذ بمجرد التوقيع.

حُرِّر هذا العقد في نسختين أصليتين، في {{city}}، بتاريخ {{date}}.`,
  },
  {
    id: 'tpl-engagement',
    docType: 'engagement-ecrit',
    icon: '✍️', color: '#059669',
    nameAr: 'التزام كتابي', nameFr: 'Engagement Écrit',
    category: 'single-party',
    showAmount: true,
    showDuration: true,
    enabled: true,
    bodyTemplate: `أنا الموقع/ة أدناه:

الاسم الكامل: {{party1_name}}
رقم ب.ت.و: {{party1_cin}}
تاريخ الازدياد: {{party1_dob}}
العنوان: {{party1_address}}، {{party1_city}}
الهاتف: {{party1_phone}}

أُقرّ بمحض إرادتي الحرة ودون أي إكراه، بكامل أهليتي القانونية، بالالتزامات التالية:

{{details}}

• المبلغ المالي المُلتزَم به: {{amount}} درهم مغربي.
• مدة الالتزام: {{duration}}.

• هذا الالتزام الكتابي مُبرَم وملزِم من تاريخ التوقيع.
• في حالة الإخلال، أقبل تحمّل كامل المسؤولية القانونية والمدنية.

في {{city}}، بتاريخ {{date}}.`,
  },
  {
    id: 'tpl-dette',
    docType: 'reconnaissance-dette',
    icon: '💰', color: '#dc2626',
    nameAr: 'إقرار بدين', nameFr: 'Reconnaissance de Dette',
    category: 'two-parties',
    showAmount: true,
    showDebt: true,
    enabled: true,
    bodyTemplate: `أنا الموقع/ة أدناه (المدين):

الاسم الكامل: {{party1_name}}
رقم ب.ت.و: {{party1_cin}}
تاريخ الازدياد: {{party1_dob}}
العنوان: {{party1_address}}، {{party1_city}}
الهاتف: {{party1_phone}}

أُقرّ صراحةً وبكامل الأهلية بأنني مدين/ة للسيد/ة (الدائن):

الاسم الكامل: {{party2_name}}
رقم ب.ت.و: {{party2_cin}}
تاريخ الازدياد: {{party2_dob}}
العنوان: {{party2_address}}، {{party2_city}}
الهاتف: {{party2_phone}}

المبلغ الإجمالي: {{amount}} درهم مغربي

أصل الدين وسببه:
{{debt_description}}

تاريخ السداد المتفق عليه: {{repayment_date}}

• أتعهد بأداء هذا الدين كاملاً في التاريخ المتفق عليه.
• هذا الإقرار يُعدّ سنداً قانونياً في مواجهتي.

في {{city}}، بتاريخ {{date}}.`,
  },
  {
    id: 'tpl-location',
    docType: 'contrat-location',
    icon: '🏠', color: '#1d4ed8',
    nameAr: 'عقد كراء', nameFr: 'Contrat de Location',
    category: 'two-parties',
    showAmount: true,
    showDuration: true,
    showProperty: true,
    showSubject: true,
    enabled: true,
    bodyTemplate: `أُبرِم هذا العقد بين:

المكري (المالك):
الاسم الكامل: {{party1_name}}
رقم ب.ت.و: {{party1_cin}}
تاريخ الازدياد: {{party1_dob}}
العنوان: {{party1_address}}، {{party1_city}}
الهاتف: {{party1_phone}}

المكتري (المستأجر):
الاسم الكامل: {{party2_name}}
رقم ب.ت.و: {{party2_cin}}
تاريخ الازدياد: {{party2_dob}}
العنوان: {{party2_address}}، {{party2_city}}
الهاتف: {{party2_phone}}

العقار المُكرى: {{property_address}}
نوع العقار: {{subject}}

الشروط المالية:
• مبلغ الكراء الشهري: {{monthly_rent}} درهم مغربي.
• مبلغ الضمانة: {{deposit}} درهم مغربي.
• مدة الكراء: {{duration}}، ابتداءً من تاريخ {{date}}.

الالتزامات:
• تسليم العقار في حالة جيدة وصالحة للاستعمال.
• أداء مبلغ الكراء في مواعيده دون تأخير.
• الحفاظ على سلامة العقار واستعماله حسب وجهته المتفق عليها.
• إعادة العقار في حالته الأصلية عند انتهاء مدة الكراء.

{{details}}

في {{city}}، بتاريخ {{date}}، في نسختين أصليتين.`,
  },
  {
    id: 'tpl-admin',
    docType: 'administrative-request',
    icon: '📋', color: '#475569',
    nameAr: 'طلب إداري', nameFr: 'Demande Administrative',
    category: 'single-party',
    showSubject: true,
    enabled: true,
    bodyTemplate: `يشرّفني أن أتقدم إلى سيادتكم الموقّرة بهذا الطلب الإداري.

أنا الموقع أدناه:
الاسم الكامل: {{party1_name}}
رقم ب.ت.و: {{party1_cin}}
تاريخ الازدياد: {{party1_dob}}
العنوان: {{party1_address}}، {{party1_city}}
الهاتف: {{party1_phone}}

الموضوع: {{subject}}

{{details}}

لذا، أرجو من سيادتكم التكرُّم بالنظر في هذا الطلب وإفادتي بالجواب اللازم في أقرب الآجال الممكنة.

تفضلوا، سيادتكم، بقبول فائق الاحترام والتقدير.

في {{city}}، بتاريخ {{date}}.`,
  },
  {
    id: 'tpl-letter-ar',
    docType: 'official-letter-ar',
    icon: '✉️', color: '#1e40af',
    nameAr: 'مراسلة رسمية عربية', nameFr: 'Lettre Officielle Arabe',
    category: 'single-party',
    showSubject: true,
    enabled: true,
    bodyTemplate: `يشرّفني أن أتقدم إلى سيادتكم بهذه المراسلة الرسمية.

أنا الموقع أدناه:
الاسم الكامل: {{party1_name}}
رقم ب.ت.و: {{party1_cin}}
العنوان: {{party1_address}}، {{party1_city}}
الهاتف: {{party1_phone}}

الموضوع: {{subject}}

{{details}}

وتفضلوا، سيادتكم، بقبول فائق الاحترام والتقدير.

في {{city}}، بتاريخ {{date}}.`,
  },
  {
    id: 'tpl-letter-fr',
    docType: 'official-letter-fr',
    icon: '🇫🇷', color: '#15803d',
    nameAr: 'مراسلة رسمية فرنسية', nameFr: 'Lettre Officielle Française',
    category: 'single-party',
    showSubject: true,
    enabled: true,
    bodyTemplate: `J'ai l'honneur de vous adresser la présente lettre officielle concernant : {{subject}}

{{details}}

Veuillez agréer, l'expression de mes sincères salutations.

{{city}}, le {{date}}.`,
  },
];

/* ── Placeholder resolution ── */
function applyTemplate(tpl: string, form: PublicWriterForm): string {
  const p1 = form.party1, p2 = form.party2;
  const arabicDate = form.date
    ? new Date(form.date).toLocaleDateString('ar-MA', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('ar-MA', { year: 'numeric', month: 'long', day: 'numeric' });
  const fmtDob = (d: string) => d ? new Date(d).toLocaleDateString('ar-MA', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

  return tpl
    .replace(/{{party1_name}}/g,    p1.fullName    || '...')
    .replace(/{{party1_cin}}/g,     p1.cin         || '...')
    .replace(/{{party1_dob}}/g,     fmtDob(p1.dateOfBirth))
    .replace(/{{party1_address}}/g, p1.address     || '...')
    .replace(/{{party1_city}}/g,    p1.city        || '...')
    .replace(/{{party1_phone}}/g,   p1.phone       || '—')
    .replace(/{{party2_name}}/g,    p2.fullName    || '...')
    .replace(/{{party2_cin}}/g,     p2.cin         || '...')
    .replace(/{{party2_dob}}/g,     fmtDob(p2.dateOfBirth))
    .replace(/{{party2_address}}/g, p2.address     || '...')
    .replace(/{{party2_city}}/g,    p2.city        || '...')
    .replace(/{{party2_phone}}/g,   p2.phone       || '—')
    .replace(/{{subject}}/g,        form.subject   || '...')
    .replace(/{{details}}/g,        form.details   || '...')
    .replace(/{{amount}}/g,         form.amount    || '...')
    .replace(/{{duration}}/g,       form.duration  || '...')
    .replace(/{{city}}/g,           form.city || p1.city || '...')
    .replace(/{{date}}/g,           arabicDate)
    .replace(/{{property_address}}/g, form.propertyAddress || '...')
    .replace(/{{monthly_rent}}/g,   form.monthlyRent  || '...')
    .replace(/{{deposit}}/g,        form.depositAmount || '...')
    .replace(/{{debt_description}}/g, form.debtDescription || '...')
    .replace(/{{repayment_date}}/g, form.repaymentDate
      ? new Date(form.repaymentDate).toLocaleDateString('ar-MA', { year: 'numeric', month: 'long', day: 'numeric' })
      : '...');
}

const emptyPerson = (): PersonBlock => ({ fullName: '', cin: '', address: '', city: '', dateOfBirth: '', phone: '' });
const defaultForm = (): PublicWriterForm => ({
  docType: 'declaration-honneur', language: 'ar',
  party1: emptyPerson(), party2: emptyPerson(),
  subject: '', amount: '', duration: '', customClauses: [],
  date: getTodayISO(), city: '', recipient: '', recipientTitle: '', details: '',
  propertyAddress: '', monthlyRent: '', depositAmount: '', debtDescription: '', repaymentDate: '',
});

function validateForm(form: PublicWriterForm, tpl: TemplateDef): FormError[] {
  const errors: FormError[] = [];
  const r = (field: string, msg: string) => errors.push({ field, message: msg });
  if (!form.party1.fullName.trim()) r('party1.fullName', 'الاسم الكامل مطلوب');
  if (!form.party1.cin.trim())      r('party1.cin',      'رقم بطاقة التعريف مطلوب');
  if (!form.party1.address.trim())  r('party1.address',  'العنوان مطلوب');
  if (!form.party1.city.trim())     r('party1.city',     'المدينة مطلوبة');
  if (tpl.category === 'two-parties') {
    if (!form.party2.fullName.trim()) r('party2.fullName', 'اسم الطرف الثاني مطلوب');
    if (!form.party2.cin.trim())      r('party2.cin',      'رقم بطاقة الطرف الثاني مطلوب');
  }
  return errors;
}

/* ═══════════════════════════════════════════════════════════
   WYSIWYG RICH TEXT EDITOR
═══════════════════════════════════════════════════════════ */
interface WYSIWYGProps {
  value: string;
  onChange: (html: string) => void;
  dir?: 'rtl' | 'ltr';
  minHeight?: number;
}

function WYSIWYGEditor({ value, onChange, dir = 'rtl', minHeight = 320 }: WYSIWYGProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalUpdate = useRef(false);
  const [fontSize, setFontSize] = useState('14px');
  const [fontColor, setFontColor] = useState('#1e293b');

  useEffect(() => {
    if (!editorRef.current) return;
    if (!isInternalUpdate.current) {
      editorRef.current.innerHTML = value.replace(/\n/g, '<br/>');
    }
    isInternalUpdate.current = false;
  }, [value]);

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
    syncOut();
  };

  const syncOut = () => {
    isInternalUpdate.current = true;
    onChange(editorRef.current?.innerHTML || '');
  };

  const applyFontSize = (sz: string) => {
    setFontSize(sz);
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('fontSize', false, '7');
    const spans = editorRef.current?.querySelectorAll('font[size="7"]');
    spans?.forEach(span => {
      const el = span as HTMLElement;
      el.removeAttribute('size');
      el.style.fontSize = sz;
    });
    editorRef.current?.focus();
    syncOut();
  };

  const applyColor = (c: string) => {
    setFontColor(c);
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('foreColor', false, c);
    editorRef.current?.focus();
    syncOut();
  };

  const FONT_SIZES = ['10px','11px','12px','13px','14px','15px','16px','18px','20px','22px','24px','28px','32px'];
  const COLORS = ['#1e293b','#0f2744','#dc2626','#059669','#d97706','#7c3aed','#0891b2','#475569','#000000','#4b5563'];

  const btn = (active = false): React.CSSProperties => ({
    padding: '4px 8px', borderRadius: 5,
    border: active ? '2px solid #3b82f6' : '1px solid #e2e8f0',
    background: active ? '#eff6ff' : 'white', cursor: 'pointer', fontSize: 12, fontWeight: 700,
    color: active ? '#3b82f6' : '#475569', minWidth: 28,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  });
  const sep: React.CSSProperties = { width: 1, height: 22, background: '#e2e8f0', margin: '0 3px', flexShrink: 0 };

  return (
    <div style={{ border: '1.5px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', background: 'white' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '8px 10px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', alignItems: 'center' }}>
        <select value={fontSize} onChange={e => applyFontSize(e.target.value)}
          style={{ padding: '3px 6px', borderRadius: 5, border: '1px solid #e2e8f0', fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', background: 'white', color: '#1e293b' }}>
          {FONT_SIZES.map(s => <option key={s} value={s}>{s.replace('px', 'pt')}</option>)}
        </select>
        <div style={sep} />
        <button style={btn()} onClick={() => exec('bold')}><b>B</b></button>
        <button style={{ ...btn(), fontStyle: 'italic' }} onClick={() => exec('italic')}><i>I</i></button>
        <button style={{ ...btn(), textDecoration: 'underline' }} onClick={() => exec('underline')}><u>U</u></button>
        <button style={{ ...btn(), textDecoration: 'line-through' }} onClick={() => exec('strikeThrough')}><s>S</s></button>
        <div style={sep} />
        <button style={btn()} onClick={() => exec('justifyRight')}>⬛◀</button>
        <button style={btn()} onClick={() => exec('justifyCenter')}>▐▌▌</button>
        <button style={btn()} onClick={() => exec('justifyLeft')}>▶⬛</button>
        <button style={btn()} onClick={() => exec('justifyFull')}>▐▌▌▌▌▐</button>
        <div style={sep} />
        <button style={btn()} onClick={() => exec('insertUnorderedList')}>• ≡</button>
        <button style={btn()} onClick={() => exec('insertOrderedList')}>1. ≡</button>
        <div style={sep} />
        <button style={btn()} onClick={() => exec('indent')}>→</button>
        <button style={btn()} onClick={() => exec('outdent')}>←</button>
        <div style={sep} />
        {COLORS.map(c => (
          <button key={c} onClick={() => applyColor(c)}
            style={{ width: 18, height: 18, borderRadius: 3, background: c, border: fontColor === c ? '2px solid #3b82f6' : '1.5px solid #cbd5e1', cursor: 'pointer', flexShrink: 0 }} />
        ))}
        <input type="color" value={fontColor} onChange={e => applyColor(e.target.value)}
          style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid #e2e8f0', cursor: 'pointer', padding: 1 }} />
        <div style={sep} />
        <button style={btn()} onClick={() => exec('removeFormat')}>✗ تنسيق</button>
        <button style={btn()} onClick={() => exec('insertHTML', '<hr style="border:none;border-top:1.5px solid #94a3b8;margin:12px 0"/>')}>— خط</button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        dir={dir}
        onInput={syncOut}
        onKeyDown={() => { isInternalUpdate.current = true; }}
        style={{
          minHeight, padding: '14px 16px', outline: 'none',
          fontSize: 14, fontFamily: "'Cairo', serif",
          lineHeight: 2.2, color: '#1e293b',
          direction: dir, textAlign: dir === 'rtl' ? 'right' : 'left',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TEMPLATE BODY TEXTAREA EDITOR
═══════════════════════════════════════════════════════════ */
const PLACEHOLDERS = [
  '{{party1_name}}', '{{party1_cin}}', '{{party1_dob}}', '{{party1_address}}', '{{party1_city}}', '{{party1_phone}}',
  '{{party2_name}}', '{{party2_cin}}', '{{party2_dob}}', '{{party2_address}}', '{{party2_city}}', '{{party2_phone}}',
  '{{subject}}', '{{details}}', '{{amount}}', '{{duration}}', '{{city}}', '{{date}}',
  '{{property_address}}', '{{monthly_rent}}', '{{deposit}}', '{{debt_description}}', '{{repayment_date}}',
];

function TemplateBodyEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [tplFontSize, setTplFontSize] = useState('13');

  const insertPh = (ph: string) => {
    const ta = taRef.current;
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const next = value.slice(0, s) + ph + value.slice(e);
    onChange(next);
    setTimeout(() => { ta.setSelectionRange(s + ph.length, s + ph.length); ta.focus(); }, 0);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, color: '#475569', fontWeight: 700 }}>حجم الخط:</span>
        <select value={tplFontSize} onChange={e => setTplFontSize(e.target.value)}
          style={{ padding: '2px 6px', borderRadius: 5, border: '1px solid #e2e8f0', fontSize: 11, cursor: 'pointer' }}>
          {['11','12','13','14','15','16','18','20','24'].map(s => <option key={s} value={s}>{s}pt</option>)}
        </select>
      </div>
      <div style={{ background: '#f8fafc', borderRadius: 8, padding: '7px 10px', marginBottom: 6, border: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', marginBottom: 4 }}>انقر لإدراج متغير:</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {PLACEHOLDERS.map(ph => (
            <span key={ph} onClick={() => insertPh(ph)}
              style={{ background: '#0f274410', color: '#0f2744', borderRadius: 4, padding: '2px 7px', fontSize: 9.5, fontFamily: 'monospace', cursor: 'pointer', border: '1px solid #0f274420', userSelect: 'none' }}>
              {ph}
            </span>
          ))}
        </div>
      </div>
      <textarea
        ref={taRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={18}
        dir="rtl"
        placeholder="اكتب متن الوثيقة هنا باستخدام المتغيرات..."
        style={{
          width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8,
          fontSize: Number(tplFontSize), fontFamily: "'Cairo', monospace", resize: 'vertical', outline: 'none',
          lineHeight: 1.9, background: '#fafbfc', boxSizing: 'border-box', color: '#1e293b',
        }}
        onFocus={e => { e.target.style.borderColor = '#3b82f6'; }}
        onBlur={e => { e.target.style.borderColor = '#e2e8f0'; }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   EDIT PANEL — module level, never remounts
═══════════════════════════════════════════════════════════ */
const TPLMGR_ICONS = ['📄','✍️','🤝','🏠','💰','📋','✉️','🔑','🤲','🇫🇷','⚖️','🧾','📑','🗂️','🏷️','📜','🖊️','🗃️','📂','💼','🏛️','🔏','📃','🗒️'];
const TPLMGR_COLORS = ['#0891b2','#7c3aed','#b45309','#059669','#dc2626','#1d4ed8','#475569','#1e40af','#15803d','#d97706','#be185d','#0f766e','#92400e','#065f46','#1e3a5f'];

function EditPanel({ t, onUpdate }: { t: TemplateDef; onUpdate: (p: Partial<TemplateDef>) => void }) {
  const [editorTab, setEditorTab] = useState<'meta' | 'body'>('meta');

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[
          { id: 'meta' as const, label: '⚙️ الإعدادات الأساسية' },
          { id: 'body' as const, label: '📝 تحرير المتن' },
        ].map(tb => (
          <button key={tb.id} onClick={() => setEditorTab(tb.id)}
            style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
              background: editorTab === tb.id ? '#0f2744' : '#f1f5f9', color: editorTab === tb.id ? 'white' : '#475569' }}>
            {tb.label}
          </button>
        ))}
      </div>

      {editorTab === 'meta' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>الاسم بالعربية *</label>
              <input value={t.nameAr} onChange={e => onUpdate({ nameAr: e.target.value })} dir="rtl"
                style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Nom français</label>
              <input value={t.nameFr} onChange={e => onUpdate({ nameFr: e.target.value })} dir="ltr"
                style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 12, fontFamily: 'Inter,sans-serif', boxSizing: 'border-box', outline: 'none' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>الفئة</label>
              <select value={t.category} onChange={e => onUpdate({ category: e.target.value as 'single-party' | 'two-parties' })}
                style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 11, fontFamily: 'inherit', outline: 'none', background: 'white' }}>
                <option value="single-party">👤 طرف واحد</option>
                <option value="two-parties">👥 طرفان</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>الحالة</label>
              <select value={t.enabled ? 'on' : 'off'} onChange={e => onUpdate({ enabled: e.target.value === 'on' })}
                style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 11, fontFamily: 'inherit', outline: 'none', background: 'white' }}>
                <option value="on">✓ مفعّل</option>
                <option value="off">✗ معطّل</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 6 }}>الأيقونة</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {TPLMGR_ICONS.map(ic => (
                <button key={ic} onClick={() => onUpdate({ icon: ic })}
                  style={{ width: 34, height: 34, borderRadius: 7, border: t.icon === ic ? '2px solid #3b82f6' : '1.5px solid #e2e8f0', background: t.icon === ic ? '#eff6ff' : 'white', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 6 }}>اللون</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {TPLMGR_COLORS.map(col => (
                <button key={col} onClick={() => onUpdate({ color: col })}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: col, border: t.color === col ? '3px solid #1e293b' : '2px solid transparent', cursor: 'pointer', outline: 'none' }} />
              ))}
              <input type="color" value={t.color} onChange={e => onUpdate({ color: e.target.value })}
                style={{ width: 32, height: 32, borderRadius: 6, border: '1.5px solid #e2e8f0', cursor: 'pointer', padding: 2 }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 6 }}>الحقول الاختيارية</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {([
                { key: 'showAmount', label: '💰 مبلغ' },
                { key: 'showDuration', label: '⏱️ مدة' },
                { key: 'showProperty', label: '🏠 عقار' },
                { key: 'showDebt', label: '🧾 دين' },
                { key: 'showSubject', label: '📌 موضوع' },
              ] as { key: keyof TemplateDef; label: string }[]).map(({ key, label }) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#475569', background: '#f8fafc', padding: '5px 10px', borderRadius: 7, border: '1px solid #e2e8f0' }}>
                  <input type="checkbox" checked={!!(t[key])} onChange={e => onUpdate({ [key]: e.target.checked })}
                    style={{ accentColor: t.color }} />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {editorTab === 'body' && (
        <div>
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 11, color: '#92400e' }}>
            💡 يمكنك الكتابة مباشرة في مربع النص أدناه. انقر على أي متغير لإدراجه في مكان المؤشر.
          </div>
          <TemplateBodyEditor value={t.bodyTemplate} onChange={v => onUpdate({ bodyTemplate: v })} />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   NEW DOCUMENT WIZARD — multi-step creation
═══════════════════════════════════════════════════════════ */
function NewDocumentWizard({ onSave, onClose }: { onSave: (t: TemplateDef) => void; onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<TemplateDef>({
    id: `custom-${Date.now()}`,
    docType: `custom-${Date.now()}`,
    icon: '📄',
    color: '#0891b2',
    nameAr: '',
    nameFr: '',
    category: 'single-party',
    showAmount: false,
    showDuration: false,
    showProperty: false,
    showDebt: false,
    showSubject: true,
    enabled: true,
    isCustom: true,
    bodyTemplate: '',
  });

  const upd = (patch: Partial<TemplateDef>) => setDraft(d => ({ ...d, ...patch }));

  const STEPS = [
    { n: 1, title: 'المعلومات الأساسية', icon: '📝' },
    { n: 2, title: 'الشكل والمظهر', icon: '🎨' },
    { n: 3, title: 'الحقول والخيارات', icon: '⚙️' },
    { n: 4, title: 'متن الوثيقة', icon: '📄' },
    { n: 5, title: 'مراجعة وحفظ', icon: '✅' },
  ];

  const canNext = () => {
    if (step === 1) return draft.nameAr.trim().length > 0;
    if (step === 4) return draft.bodyTemplate.trim().length > 0;
    return true;
  };

  const handleSave = () => {
    if (!draft.nameAr.trim()) return;
    // Generate unique docType ID from name
    const customId = `custom-${draft.nameAr.replace(/\s+/g, '-')}-${Date.now()}`;
    onSave({ ...draft, id: customId, docType: customId });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8,
    fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', color: '#1e293b',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%' }}>
      {/* Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 24, padding: '0 4px' }}>
        {STEPS.map((s, i) => (
          <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: step > s.n ? 16 : 14,
                background: step > s.n ? '#059669' : step === s.n ? '#0f2744' : '#e2e8f0',
                color: step >= s.n ? 'white' : '#94a3b8',
                fontWeight: 800, cursor: step < s.n ? 'not-allowed' : 'pointer',
                border: step === s.n ? '3px solid #c8962c' : '3px solid transparent',
                transition: 'all 0.2s',
              }} onClick={() => step > s.n && setStep(s.n)}>
                {step > s.n ? '✓' : s.icon}
              </div>
              <span style={{ fontSize: 9, color: step === s.n ? '#0f2744' : '#94a3b8', fontWeight: step === s.n ? 800 : 400, whiteSpace: 'nowrap', maxWidth: 70, textAlign: 'center', lineHeight: 1.3 }}>
                {s.title}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: step > s.n ? '#059669' : '#e2e8f0', margin: '0 4px', marginBottom: 20, transition: 'background 0.2s' }} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'linear-gradient(135deg, #0f274410, #0891b210)', borderRadius: 12, padding: '16px 18px', border: '1.5px solid #0891b230', marginBottom: 8 }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#0f2744', marginBottom: 4 }}>🆕 إنشاء نوع وثيقة جديد</div>
              <div style={{ fontSize: 12, color: '#64748b', fontFamily: 'Inter, sans-serif' }}>
                أدخل معلومات النموذج الجديد — سيُضاف إلى قائمة أنواع الوثائق المتاحة
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0f2744', marginBottom: 6 }}>
                اسم الوثيقة بالعربية <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                value={draft.nameAr}
                onChange={e => upd({ nameAr: e.target.value })}
                placeholder="مثال: عقد شراكة، تعهد صرف، إقرار سكن..."
                dir="rtl"
                autoFocus
                style={{ ...inputStyle, fontSize: 15, fontWeight: 700 }}
                onFocus={e => { e.target.style.borderColor = '#0891b2'; }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; }}
              />
              {draft.nameAr.trim().length === 0 && (
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>⚠ هذا الحقل إلزامي لإنشاء النموذج</div>
              )}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                Nom du document en français
              </label>
              <input
                value={draft.nameFr}
                onChange={e => upd({ nameFr: e.target.value })}
                placeholder="Ex: Contrat de partenariat, Engagement..."
                dir="ltr"
                style={{ ...inputStyle, fontFamily: 'Inter, sans-serif' }}
                onFocus={e => { e.target.style.borderColor = '#0891b2'; }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                نوع الأطراف — Configuration des parties
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { v: 'single-party', label: 'طرف واحد', sub: 'Partie unique', icon: '👤', desc: 'تصريح، التزام، طلب...' },
                  { v: 'two-parties', label: 'طرفان', sub: 'Deux parties', icon: '👥', desc: 'عقد، وكالة، إقرار...' },
                ].map(opt => (
                  <div key={opt.v} onClick={() => upd({ category: opt.v as 'single-party' | 'two-parties' })}
                    style={{
                      padding: '14px 16px', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                      border: draft.category === opt.v ? '2.5px solid #0891b2' : '2px solid #e2e8f0',
                      background: draft.category === opt.v ? '#f0f9ff' : 'white',
                      transition: 'all 0.15s',
                    }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>{opt.icon}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', marginBottom: 2 }}>{opt.label}</div>
                    <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'Inter, sans-serif', marginBottom: 6 }}>{opt.sub}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>{opt.desc}</div>
                    {draft.category === opt.v && (
                      <div style={{ marginTop: 8, background: '#0891b2', color: 'white', borderRadius: 20, padding: '2px 10px', fontSize: 10, fontWeight: 700 }}>✓ محدد</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Appearance */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0f2744', marginBottom: 10 }}>
                اختر أيقونة الوثيقة
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {TPLMGR_ICONS.map(ic => (
                  <button key={ic} onClick={() => upd({ icon: ic })}
                    style={{
                      width: 44, height: 44, borderRadius: 10, fontSize: 22, cursor: 'pointer',
                      border: draft.icon === ic ? '2.5px solid #0891b2' : '1.5px solid #e2e8f0',
                      background: draft.icon === ic ? '#f0f9ff' : 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0f2744', marginBottom: 10 }}>
                لون النموذج
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
                {TPLMGR_COLORS.map(col => (
                  <button key={col} onClick={() => upd({ color: col })}
                    style={{
                      width: 34, height: 34, borderRadius: 8, background: col, cursor: 'pointer',
                      border: draft.color === col ? '3px solid #1e293b' : '2px solid rgba(0,0,0,0.1)',
                      outline: draft.color === col ? '2px solid white' : 'none',
                      outlineOffset: '-4px',
                      transition: 'all 0.15s',
                    }} />
                ))}
                <input type="color" value={draft.color} onChange={e => upd({ color: e.target.value })}
                  title="اختر لوناً مخصصاً"
                  style={{ width: 40, height: 36, borderRadius: 8, border: '1.5px solid #e2e8f0', cursor: 'pointer', padding: 2 }} />
              </div>
              {/* Live Preview Card */}
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8, fontWeight: 600 }}>معاينة بطاقة الوثيقة:</div>
                <div style={{
                  display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  padding: '12px 16px', borderRadius: 10, cursor: 'default',
                  border: `2px solid ${draft.color}`,
                  background: `${draft.color}10`,
                  minWidth: 100, textAlign: 'center',
                }}>
                  <span style={{ fontSize: 28 }}>{draft.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: draft.color }}>{draft.nameAr || 'اسم الوثيقة'}</span>
                  <span style={{ fontSize: 9, opacity: 0.6 }}>{draft.category === 'two-parties' ? '👥' : '👤'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Fields */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#f0f9ff', borderRadius: 10, padding: '12px 14px', border: '1px solid #bae6fd', marginBottom: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0369a1' }}>⚙️ الحقول الاختيارية</div>
              <div style={{ fontSize: 11, color: '#0369a1', marginTop: 4 }}>
                حدّد الحقول التي تظهر في نموذج إدخال البيانات لهذه الوثيقة
              </div>
            </div>
            {([
              { key: 'showSubject', label: '📌 الموضوع / Objet', desc: 'خانة موضوع الوثيقة أو الطلب', recommended: true },
              { key: 'showAmount', label: '💰 المبلغ المالي / Montant', desc: 'مبلغ مالي بالدرهم (اختياري)' },
              { key: 'showDuration', label: '⏱️ المدة / الأجل / Durée', desc: 'مدة الصلاحية أو مدة العقد' },
              { key: 'showProperty', label: '🏠 بيانات العقار / Bien immobilier', desc: 'عنوان العقار، الكراء الشهري، الضمانة' },
              { key: 'showDebt', label: '🧾 بيانات الدين / Dette', desc: 'وصف الدين وتاريخ السداد' },
            ] as { key: keyof TemplateDef; label: string; desc: string; recommended?: boolean }[]).map(({ key, label, desc, recommended }) => (
              <div key={key}
                onClick={() => upd({ [key]: !draft[key] })}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
                  border: draft[key] ? `2px solid ${draft.color}` : '2px solid #e2e8f0',
                  background: draft[key] ? `${draft.color}08` : 'white',
                  transition: 'all 0.15s',
                }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
                  background: draft[key] ? draft.color : '#e2e8f0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: 13, fontWeight: 900,
                  transition: 'all 0.15s',
                }}>
                  {draft[key] ? '✓' : ''}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {label}
                    {recommended && <span style={{ background: '#dcfce7', color: '#15803d', borderRadius: 20, padding: '1px 7px', fontSize: 9, fontWeight: 700 }}>موصى به</span>}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{desc}</div>
                </div>
              </div>
            ))}

            <div style={{ marginTop: 8, background: '#fafbfc', borderRadius: 10, padding: '12px 14px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>ℹ️ الحقول الثابتة (تظهر دائماً):</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {['الاسم الكامل', 'رقم ب.ت.و', 'تاريخ الازدياد', 'العنوان', 'المدينة', 'الهاتف', 'تفاصيل إضافية', 'التاريخ', 'المدينة'].map(f => (
                  <span key={f} style={{ background: '#f1f5f9', color: '#475569', borderRadius: 6, padding: '3px 8px', fontSize: 10, border: '1px solid #e2e8f0' }}>
                    ✓ {f}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Body Template */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: '#fffbeb', borderRadius: 10, padding: '12px 14px', border: '1px solid #fde68a' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>
                📝 اكتب متن الوثيقة — Corps du document
              </div>
              <div style={{ fontSize: 11, color: '#a16207' }}>
                استخدم المتغيرات كـ <code style={{ background: '#fef3c7', padding: '1px 4px', borderRadius: 3 }}>{'{{party1_name}}'}</code> لإدراج البيانات تلقائياً عند التوليد.
              </div>
            </div>
            <TemplateBodyEditor value={draft.bodyTemplate} onChange={v => upd({ bodyTemplate: v })} />
            {draft.bodyTemplate.trim().length === 0 && (
              <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#dc2626' }}>
                ⚠ متن الوثيقة مطلوب — لا يمكن حفظ النموذج بدونه
              </div>
            )}
          </div>
        )}

        {/* Step 5: Review */}
        {step === 5 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: 'linear-gradient(135deg, #dcfce7, #f0fdf4)', borderRadius: 12, padding: '18px 20px', border: '2px solid #86efac', textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>{draft.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#15803d', marginBottom: 4 }}>{draft.nameAr}</div>
              {draft.nameFr && <div style={{ fontSize: 13, color: '#16a34a', fontFamily: 'Inter, sans-serif' }}>{draft.nameFr}</div>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'الأيقونة', value: draft.icon },
                { label: 'اللون', value: <span style={{ display: 'inline-block', width: 20, height: 20, borderRadius: 4, background: draft.color, verticalAlign: 'middle' }} /> },
                { label: 'نوع الأطراف', value: draft.category === 'two-parties' ? '👥 طرفان' : '👤 طرف واحد' },
                { label: 'الموضوع', value: draft.showSubject ? '✅ نعم' : '❌ لا' },
                { label: 'المبلغ', value: draft.showAmount ? '✅ نعم' : '❌ لا' },
                { label: 'المدة', value: draft.showDuration ? '✅ نعم' : '❌ لا' },
                { label: 'العقار', value: draft.showProperty ? '✅ نعم' : '❌ لا' },
                { label: 'الدين', value: draft.showDebt ? '✅ نعم' : '❌ لا' },
              ].map(item => (
                <div key={item.label} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 3 }}>{item.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{item.value}</div>
                </div>
              ))}
            </div>

            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 6 }}>📝 معاينة المتن (الأول 200 حرف):</div>
              <div style={{ fontSize: 12, color: '#1e293b', fontFamily: "'Cairo', serif", lineHeight: 1.8, direction: 'rtl', textAlign: 'right' }}>
                {draft.bodyTemplate.slice(0, 200)}{draft.bodyTemplate.length > 200 ? '...' : ''}
              </div>
            </div>

            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 14px', fontSize: 11, color: '#92400e', lineHeight: 1.8 }}>
              ✅ سيُضاف النموذج الجديد إلى قائمة أنواع الوثائق.<br/>
              📋 يمكنك تعديله أو حذفه لاحقاً من <strong>إدارة النماذج</strong>.<br/>
              🖊️ يمكن تحرير المتن مباشرة بعد توليد الوثيقة.
            </div>
          </div>
        )}
      </div>

      {/* Wizard Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, marginTop: 16, borderTop: '1.5px solid #e2e8f0', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose}
            style={{ padding: '9px 16px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700 }}>
            ✕ إلغاء
          </button>
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)}
              style={{ padding: '9px 16px', background: '#e2e8f0', color: '#374151', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700 }}>
              ← السابق
            </button>
          )}
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>خطوة {step} من {STEPS.length}</div>
        <div>
          {step < STEPS.length ? (
            <button
              onClick={() => canNext() && setStep(s => s + 1)}
              disabled={!canNext()}
              style={{
                padding: '10px 20px', background: canNext() ? '#0891b2' : '#cbd5e1',
                color: 'white', border: 'none', borderRadius: 8,
                cursor: canNext() ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit', fontSize: 13, fontWeight: 800,
              }}>
              التالي →
            </button>
          ) : (
            <button onClick={handleSave}
              style={{ padding: '10px 22px', background: '#059669', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 800 }}>
              💾 حفظ النموذج الجديد
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PDF HEADER EDITOR
═══════════════════════════════════════════════════════════ */
function PDFHeaderEditor({ config, onChange }: { config: DocHeaderConfig; onChange: (c: DocHeaderConfig) => void }) {
  const upd = (patch: Partial<DocHeaderConfig>) => onChange({ ...config, ...patch });

  const row = (children: React.ReactNode) => (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
      {children}
    </div>
  );
  const lbl = (text: string) => (
    <span style={{ fontSize: 10, fontWeight: 700, color: '#475569', minWidth: 80, textAlign: 'right', flexShrink: 0 }}>{text}</span>
  );
  const numInput = (val: number, setter: (v: number) => void, min = 0, max = 100, step = 1) => (
    <input type="number" value={val} min={min} max={max} step={step} onChange={e => setter(Number(e.target.value))}
      style={{ width: 60, padding: '4px 6px', border: '1.5px solid #e2e8f0', borderRadius: 6, fontSize: 12, outline: 'none', textAlign: 'center' }} />
  );
  const toggle = (val: boolean, setter: (v: boolean) => void, label: string) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 11, color: '#475569', fontWeight: 600 }}>
      <input type="checkbox" checked={val} onChange={e => setter(e.target.checked)}
        style={{ accentColor: '#3b82f6', width: 14, height: 14 }} />
      {label}
    </label>
  );

  const sectionStyle = { background: '#f8fafc', borderRadius: 8, padding: '12px 14px', marginBottom: 10, border: '1px solid #e2e8f0' };
  const sectionTitle = (t: string) => (
    <div style={{ fontSize: 11, fontWeight: 800, color: '#0f2744', marginBottom: 10, borderBottom: '1px solid #e2e8f0', paddingBottom: 5 }}>{t}</div>
  );

  return (
    <div>
      <div style={sectionStyle}>
        {sectionTitle('📌 عنوان الوثيقة — Titre')}
        {row(<>{toggle(config.showTitle, v => upd({ showTitle: v }), 'إظهار العنوان')}{toggle(config.titleBold, v => upd({ titleBold: v }), 'عريض')}</>)}
        {config.showTitle && <>
          {row(<>{lbl('النص:')}<input value={config.titleText} onChange={e => upd({ titleText: e.target.value })} placeholder="اتركه فارغاً لاستخدام اسم النموذج" dir="rtl" style={{ flex: 1, padding: '5px 9px', border: '1.5px solid #e2e8f0', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', outline: 'none', minWidth: 120 }} /></>)}
          {row(<>{lbl('حجم الخط:')}{numInput(config.titleFontSize, v => upd({ titleFontSize: v }), 12, 36)}{lbl('اللون:')}<input type="color" value={config.titleColor} onChange={e => upd({ titleColor: e.target.value })} style={{ width: 32, height: 28, borderRadius: 5, border: '1px solid #e2e8f0', cursor: 'pointer', padding: 2 }} />{lbl('المحاذاة:')}<select value={config.titleAlign} onChange={e => upd({ titleAlign: e.target.value as 'right' | 'center' | 'left' })} style={{ padding: '4px 8px', border: '1.5px solid #e2e8f0', borderRadius: 6, fontSize: 11, cursor: 'pointer', background: 'white' }}><option value="center">وسط</option><option value="right">يمين</option><option value="left">يسار</option></select></>)}
        </>}
      </div>
      <div style={sectionStyle}>
        {sectionTitle('🎨 العناصر الزخرفية')}
        {row(<>{toggle(config.showDivider, v => upd({ showDivider: v }), 'خط فاصل')}{config.showDivider && <>{lbl('لون الخط:')}<input type="color" value={config.dividerColor} onChange={e => upd({ dividerColor: e.target.value })} style={{ width: 28, height: 24, borderRadius: 4, border: '1px solid #e2e8f0', cursor: 'pointer', padding: 2 }} /></>}</>)}
        {row(<>{toggle(config.showOrnament, v => upd({ showOrnament: v }), 'زخرفة')}{config.showOrnament && <>{lbl('رمز:')}<select value={config.ornamentChar} onChange={e => upd({ ornamentChar: e.target.value })} style={{ padding: '3px 7px', border: '1px solid #e2e8f0', borderRadius: 5, fontSize: 14, cursor: 'pointer' }}>{['◈ ◈ ◈','✦ ✦ ✦','❋ ❋ ❋','— — —','· · ·','⁕ ⁕ ⁕','★ ★ ★','❖ ❖ ❖'].map(o => <option key={o} value={o}>{o}</option>)}</select></> }</>)}
      </div>
      <div style={sectionStyle}>
        {sectionTitle('📐 تخطيط الصفحة — Mise en Page')}
        {row(<>{lbl('هامش أعلى:')}{numInput(config.pageMarginTop, v => upd({ pageMarginTop: v }), 10, 120)}<span style={{ fontSize: 10, color: '#94a3b8' }}>px</span>{lbl('هامش جانبي:')}{numInput(config.pageMarginSide, v => upd({ pageMarginSide: v }), 10, 120)}<span style={{ fontSize: 10, color: '#94a3b8' }}>px</span></>)}
        {row(<>{lbl('حجم نص المتن:')}{numInput(config.bodyFontSize, v => upd({ bodyFontSize: v }), 10, 24)}<span style={{ fontSize: 10, color: '#94a3b8' }}>pt</span>{lbl('ارتفاع السطر:')}<input type="number" value={config.bodyLineHeight} min={1} max={4} step={0.1} onChange={e => upd({ bodyLineHeight: Number(e.target.value) })} style={{ width: 60, padding: '4px 6px', border: '1.5px solid #e2e8f0', borderRadius: 6, fontSize: 12, outline: 'none', textAlign: 'center' }} /></>)}
      </div>
      <div style={sectionStyle}>
        {sectionTitle('🖊️ التاريخ والتوقيع')}
        {row(<>{toggle(config.showDate, v => upd({ showDate: v }), 'إظهار التاريخ')}{toggle(config.showCity, v => upd({ showCity: v }), 'إظهار المدينة')}</>)}
        {row(<>{lbl('نمط التوقيع:')}<select value={config.signatureStyle} onChange={e => upd({ signatureStyle: e.target.value as 'simple' | 'formal' | 'double-line' })} style={{ padding: '4px 8px', border: '1.5px solid #e2e8f0', borderRadius: 6, fontSize: 11, cursor: 'pointer', background: 'white' }}><option value="simple">بسيط</option><option value="formal">رسمي (خط وتاريخ)</option><option value="double-line">مزدوج (طرفان)</option></select></>)}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TEMPLATE EDITOR MODAL
═══════════════════════════════════════════════════════════ */
function TemplateEditorModal({ templates, onSave, onClose }: {
  templates: TemplateDef[];
  onSave: (t: TemplateDef[]) => void;
  onClose: () => void;
}) {
  const [localTpls, setLocalTpls] = useState<TemplateDef[]>(templates);
  const [tab, setTab] = useState<'list' | 'edit' | 'new'>('list');
  const [editTpl, setEditTpl] = useState<TemplateDef | null>(null);

  function updateTpl(id: string, patch: Partial<TemplateDef>) {
    setLocalTpls(ts => ts.map(t => t.id === id ? { ...t, ...patch } : t));
    if (editTpl?.id === id) setEditTpl(e => e ? { ...e, ...patch } : e);
  }

  function startEdit(t: TemplateDef) { setEditTpl({ ...t }); setTab('edit'); }
  function saveEdit() {
    if (!editTpl) return;
    setLocalTpls(ts => ts.map(t => t.id === editTpl.id ? editTpl : t));
    setTab('list'); setEditTpl(null);
  }

  function handleNewDocSave(newTpl: TemplateDef) {
    setLocalTpls(ts => [...ts, newTpl]);
    setTab('list');
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 960, maxHeight: '92vh', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column' }}>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', borderBottom: '1.5px solid #e2e8f0', background: '#f8fafc', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>⚙️</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#0f2744' }}>إدارة النماذج — Gestion des Modèles</div>
              <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'Inter,sans-serif' }}>تخصيص شامل لشكل ومضمون كل وثيقة • إضافة أنواع جديدة</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '7px 13px', cursor: 'pointer', fontSize: 16, color: '#64748b' }}>✕</button>
        </div>

        {/* Modal Tabs */}
        <div style={{ display: 'flex', gap: 8, padding: '10px 22px', borderBottom: '1px solid #e2e8f0', flexShrink: 0, background: 'white', alignItems: 'center' }}>
          {([
            { id: 'list', label: '📋 قائمة النماذج' },
            { id: 'edit', label: '✏️ تعديل النموذج', disabled: tab !== 'edit' },
          ] as { id: 'list'|'edit'; label: string; disabled?: boolean }[]).map(item => (
            <button key={item.id} onClick={() => !item.disabled && setTab(item.id)}
              style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: item.disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, opacity: item.disabled ? 0.4 : 1,
                background: tab === item.id ? '#0f2744' : '#f1f5f9', color: tab === item.id ? 'white' : '#475569' }}>
              {item.label}
            </button>
          ))}
          <button onClick={() => setTab('new')}
            style={{ marginRight: 'auto', padding: '8px 16px', borderRadius: 9, border: '2px solid #059669', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 800, background: tab === 'new' ? '#059669' : '#dcfce7', color: tab === 'new' ? 'white' : '#15803d', display: 'flex', alignItems: 'center', gap: 6 }}>
            🆕 إضافة وثيقة جديدة
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '18px 22px' }}>
          {tab === 'list' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Custom docs section */}
              {localTpls.some(t => t.isCustom) && (
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '8px 12px', marginBottom: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', marginBottom: 2 }}>🆕 الوثائق المخصصة</div>
                  <div style={{ fontSize: 10, color: '#16a34a' }}>تم إنشاؤها بواسطتك — يمكن تعديلها أو حذفها</div>
                </div>
              )}
              {localTpls.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px', background: t.isCustom ? '#f0fdf4' : '#f8fafc', borderRadius: 10, border: t.isCustom ? '1.5px solid #86efac' : '1.5px solid #e2e8f0' }}>
                  <div style={{ width: 36, height: 36, background: `${t.color}15`, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, border: `2px solid ${t.color}30`, flexShrink: 0 }}>{t.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 13, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {t.nameAr}
                      {t.isCustom && <span style={{ background: '#dcfce7', color: '#15803d', borderRadius: 20, padding: '1px 7px', fontSize: 9, fontWeight: 700 }}>مخصص</span>}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'Inter,sans-serif' }}>{t.nameFr}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
                    <span style={{ background: t.category === 'two-parties' ? '#ede9fe' : '#f0f9ff', color: t.category === 'two-parties' ? '#7c3aed' : '#0891b2', borderRadius: 20, padding: '2px 8px', fontSize: 10 }}>
                      {t.category === 'two-parties' ? '👥' : '👤'}
                    </span>
                    <span style={{ background: t.enabled ? '#dcfce7' : '#fee2e2', color: t.enabled ? '#15803d' : '#dc2626', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>
                      {t.enabled ? '✓' : '✗'}
                    </span>
                    <button onClick={() => startEdit(t)} style={{ padding: '5px 10px', background: '#0891b210', color: '#0891b2', border: '1px solid #0891b240', borderRadius: 7, fontSize: 11, cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}>✏️ تعديل</button>
                    <button onClick={() => updateTpl(t.id, { enabled: !t.enabled })} style={{ padding: '5px 9px', background: t.enabled ? '#fef3c720' : '#dcfce720', color: t.enabled ? '#d97706' : '#15803d', border: `1px solid ${t.enabled ? '#fde68a' : '#86efac'}`, borderRadius: 7, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {t.enabled ? 'تعطيل' : 'تفعيل'}
                    </button>
                    {t.isCustom && (
                      <button onClick={() => { if(confirm('حذف النموذج المخصص؟')) setLocalTpls(ts => ts.filter(x => x.id !== t.id)); }} style={{ padding: '5px 9px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 7, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>🗑️</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'edit' && editTpl && (
            <EditPanel t={editTpl} onUpdate={p => setEditTpl(e => e ? { ...e, ...p } : e)} />
          )}
          {tab === 'new' && (
            <NewDocumentWizard onSave={handleNewDocSave} onClose={() => setTab('list')} />
          )}
        </div>

        {/* Modal Footer */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '12px 22px', borderTop: '1.5px solid #e2e8f0', flexShrink: 0, background: '#f8fafc' }}>
          {tab === 'edit' && <>
            <button onClick={() => { setTab('list'); setEditTpl(null); }} style={{ padding: '9px 18px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700 }}>إلغاء</button>
            <button onClick={saveEdit} style={{ padding: '9px 18px', background: '#059669', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700 }}>💾 حفظ التعديلات</button>
          </>}
          {tab === 'list' && <>
            <button onClick={onClose} style={{ padding: '9px 18px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700 }}>إغلاق بدون حفظ</button>
            <button onClick={() => { onSave(localTpls); onClose(); }} style={{ padding: '9px 18px', background: '#0f2744', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700 }}>💾 حفظ جميع النماذج</button>
          </>}
          {tab === 'new' && (
            <button onClick={() => setTab('list')} style={{ padding: '9px 18px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700 }}>← العودة للقائمة</button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   FORM COMPONENTS
═══════════════════════════════════════════════════════════ */
function FInput({ label, labelFr, value, onChange, placeholder, type = 'text', dir = 'rtl', mono = false, error, required = false }: {
  label: string; labelFr?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; dir?: string; mono?: boolean; error?: boolean; required?: boolean;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: error ? '#dc2626' : '#475569', marginBottom: 3 }}>
        {label}
        {labelFr && <span style={{ color: '#94a3b8', fontWeight: 400, marginRight: 4, fontSize: 9 }}>({labelFr})</span>}
        {required && <span style={{ color: '#dc2626', marginRight: 2 }}>*</span>}
      </label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} dir={dir}
        style={{ width: '100%', padding: '8px 11px', borderRadius: 7, outline: 'none', border: `1.5px solid ${error ? '#dc2626' : '#e2e8f0'}`, fontSize: 12, fontFamily: mono ? 'Inter,monospace' : 'inherit', background: error ? '#fff5f5' : 'white', color: '#1e293b', boxSizing: 'border-box' }}
        onFocus={e => { e.target.style.borderColor = error ? '#dc2626' : '#3b82f6'; }}
        onBlur={e => { e.target.style.borderColor = error ? '#dc2626' : '#e2e8f0'; }}
      />
      {error && <div style={{ fontSize: 10, color: '#dc2626', marginTop: 2, fontWeight: 600 }}>⚠ هذا الحقل مطلوب</div>}
    </div>
  );
}

function PersonForm({ title, data, onChange, errors, prefix, color = '#0f2744' }: {
  title: string; data: PersonBlock; onChange: (f: keyof PersonBlock, v: string) => void;
  errors: FormError[]; prefix: string; color?: string;
}) {
  const hasErr = (f: string) => errors.some(e => e.field === `${prefix}.${f}`);
  return (
    <div style={{ background: `${color}06`, border: `1.5px solid ${color}20`, borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ background: color, color: 'white', borderRadius: '50%', width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>👤</span>
        {title}
      </div>
      <FInput label="الاسم الكامل" labelFr="Nom Complet" value={data.fullName} onChange={v => onChange('fullName', v)} placeholder="الاسم بالعربية أو الفرنسية" required error={hasErr('fullName')} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <FInput label="رقم ب.ت.و" labelFr="CIN" value={data.cin} onChange={v => onChange('cin', v)} placeholder="A123456" dir="ltr" mono required error={hasErr('cin')} />
        <FInput label="تاريخ الازدياد" labelFr="Naissance" value={data.dateOfBirth} onChange={v => onChange('dateOfBirth', v)} type="date" dir="ltr" />
      </div>
      <FInput label="العنوان الكامل" labelFr="Adresse" value={data.address} onChange={v => onChange('address', v)} placeholder="الشارع والحي" required error={hasErr('address')} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <FInput label="المدينة" labelFr="Ville" value={data.city} onChange={v => onChange('city', v)} placeholder="المدينة" required error={hasErr('city')} />
        <FInput label="الهاتف" labelFr="Téléphone" value={data.phone} onChange={v => onChange('phone', v)} placeholder="0600000000" dir="ltr" mono />
      </div>
    </div>
  );
}

function ClausesEditor({ clauses, onChange, color }: { clauses: CustomClause[]; onChange: (c: CustomClause[]) => void; color: string }) {
  const add = () => onChange([...clauses, { id: Date.now().toString(), text: '' }]);
  const remove = (id: string) => onChange(clauses.filter(c => c.id !== id));
  const update = (id: string, text: string) => onChange(clauses.map(c => c.id === id ? { ...c, text } : c));
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>📝 بنود إضافية</label>
        <button onClick={add} style={{ padding: '3px 9px', background: `${color}15`, color, border: `1px solid ${color}40`, borderRadius: 5, fontSize: 11, cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}>+ إضافة بند</button>
      </div>
      {clauses.map((c, i) => (
        <div key={c.id} style={{ display: 'flex', gap: 5, marginBottom: 5, alignItems: 'flex-start' }}>
          <span style={{ background: color, color: 'white', borderRadius: 4, width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0, marginTop: 7 }}>{i + 1}</span>
          <textarea value={c.text} onChange={e => update(c.id, e.target.value)} placeholder={`البند ${i + 1}...`} rows={2} dir="rtl"
            style={{ flex: 1, padding: '6px 9px', borderRadius: 6, border: '1.5px solid #e2e8f0', fontSize: 11, fontFamily: 'inherit', resize: 'vertical', outline: 'none', lineHeight: 1.6 }} />
          <button onClick={() => remove(c.id)} style={{ padding: '5px 7px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 11, flexShrink: 0, marginTop: 5 }}>✕</button>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function PublicWriter({ onSave }: { onSave: () => void }) {
  const [form, setForm] = useState<PublicWriterForm>(defaultForm());
  const [templates, setTemplates] = useState<TemplateDef[]>(DEFAULT_TEMPLATES);
  const [headerConfig, setHeaderConfig] = useState<DocHeaderConfig>(defaultHeaderConfig());
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState('');
  const [errors, setErrors] = useState<FormError[]>([]);
  const [showTplManager, setShowTplManager] = useState(false);
  const [showHeaderEditor, setShowHeaderEditor] = useState(false);
  const [richBody, setRichBody] = useState('');
  const previewRef = useRef<HTMLDivElement>(null);

  const tpl = templates.find(t => t.docType === form.docType && t.enabled) || templates.find(t => t.enabled)!;
  const isFrench = form.docType === 'official-letter-fr';
  const isTwoParty = tpl?.category === 'two-parties';

  const setField = useCallback(<K extends keyof PublicWriterForm>(k: K, v: PublicWriterForm[K]) =>
    setForm(f => ({ ...f, [k]: v })), []);
  const setParty1 = useCallback((field: keyof PersonBlock, v: string) =>
    setForm(f => ({ ...f, party1: { ...f.party1, [field]: v } })), []);
  const setParty2 = useCallback((field: keyof PersonBlock, v: string) =>
    setForm(f => ({ ...f, party2: { ...f.party2, [field]: v } })), []);

  useEffect(() => {
    if (tpl) {
      const resolved = applyTemplate(tpl.bodyTemplate, form);
      setRichBody(resolved.replace(/\n/g, '<br/>'));
    }
  }, [tpl?.id]);

  const displayDate = form.date
    ? new Date(form.date).toLocaleDateString('fr-MA', { year: 'numeric', month: 'long', day: 'numeric' })
    : getTodayMoroccan();
  const arabicDate = form.date
    ? new Date(form.date).toLocaleDateString('ar-MA', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('ar-MA', { year: 'numeric', month: 'long', day: 'numeric' });
  const docTitle = (headerConfig.titleText.trim() || tpl?.nameAr) || '';

  function getResolvedBody(): string {
    return applyTemplate(richBody.replace(/<br\s*\/?>/g, '\n'), form);
  }

  function handleGenerate() {
    if (!tpl) return;
    const errs = validateForm(form, tpl);
    if (errs.length > 0) { setErrors(errs); return; }
    setErrors([]);
    const resolved = applyTemplate(tpl.bodyTemplate, form);
    setRichBody(resolved.replace(/\n/g, '<br/>'));
    setPreview(true);
  }

  async function handleExportPDF() {
    if (!tpl) return;
    const errs = validateForm(form, tpl);
    if (errs.length > 0) { setErrors(errs); return; }
    setErrors([]);

    if (!preview) {
      handleGenerate();
      await new Promise(r => setTimeout(r, 800));
    }

    setLoading('pdf');
    await new Promise(r => setTimeout(r, 300));

    if (!previewRef.current) { setLoading(''); return; }

    try {
      const sourceNode = previewRef.current;
      const SOURCE_W = sourceNode.scrollWidth || 794;
      const SCALE = 3;
      const PAGE_W_MM = 210;
      const PAGE_H_MM = 297;

      const overlay = document.createElement('div');
      overlay.style.cssText = [
        'position:fixed', 'top:0', 'left:0', 'z-index:2147483647',
        `width:${SOURCE_W}px`, 'overflow:visible', 'pointer-events:none',
        'opacity:1', 'visibility:visible', 'background:#ffffff',
      ].join(';');

      const clone = sourceNode.cloneNode(true) as HTMLElement;
      clone.style.cssText = `width:${SOURCE_W}px;min-height:auto;transform:none;position:static;overflow:visible;box-shadow:none;border-radius:0;margin:0;background:#ffffff;`;
      clone.querySelectorAll<HTMLElement>('*').forEach(el => {
        el.style.direction = el.closest('[dir="ltr"]') ? 'ltr' : el.style.direction || '';
        el.style.unicodeBidi = 'isolate';
      });

      overlay.appendChild(clone);
      document.body.appendChild(overlay);

      await document.fonts.ready;
      await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      await new Promise<void>(r => setTimeout(r, 400));

      const canvas = await html2canvas(overlay, {
        scale: SCALE, useCORS: true, allowTaint: true,
        backgroundColor: '#ffffff', logging: false,
        width: SOURCE_W, height: overlay.scrollHeight,
        windowWidth: SOURCE_W, windowHeight: overlay.scrollHeight,
        x: 0, y: 0,
      });

      document.body.removeChild(overlay);

      if (canvas.width === 0 || canvas.height === 0) throw new Error('Canvas empty');

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const canvasW = canvas.width;
      const canvasH = canvas.height;
      const mmPerPx = PAGE_W_MM / canvasW;
      const pageH_px = Math.round(PAGE_H_MM / mmPerPx);
      let yPx = 0;
      let isFirst = true;

      while (yPx < canvasH) {
        const remaining = canvasH - yPx;
        if (remaining < 3) break;
        const sliceH_px = Math.min(pageH_px, remaining);
        const sliceH_mm = sliceH_px * mmPerPx;
        const slice = document.createElement('canvas');
        slice.width = canvasW;
        slice.height = sliceH_px;
        const ctx = slice.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasW, sliceH_px);
        ctx.drawImage(canvas, 0, yPx, canvasW, sliceH_px, 0, 0, canvasW, sliceH_px);
        if (!isFirst) pdf.addPage();
        pdf.addImage(slice.toDataURL('image/jpeg', 0.97), 'JPEG', 0, 0, PAGE_W_MM, Math.min(sliceH_mm, PAGE_H_MM));
        yPx += sliceH_px;
        isFirst = false;
      }

      pdf.save(`وثيقة_${docTitle}_${form.party1.fullName || 'بدون_اسم'}.pdf`);
      saveToHistory({ module: 'public-writer', type: docTitle, title: form.subject || docTitle, content: getResolvedBody() });
      onSave();
    } catch (err) {
      console.error('PDF export error:', err);
    }
    setLoading('');
  }

  async function handleExportDocx() {
    if (!tpl) return;
    const errs = validateForm(form, tpl);
    if (errs.length > 0) { setErrors(errs); return; }
    setErrors([]);
    setLoading('docx');
    try {
      const body = getResolvedBody();
      await exportArabicDocToDocx(
        docTitle, '', '', body,
        form.party1.fullName, form.party1.cin,
        `${form.party1.address}، ${form.party1.city}`,
        form.city || form.party1.city,
        isFrench ? displayDate : arabicDate,
        `وثيقة_${docTitle}_${form.party1.fullName || 'بدون_اسم'}`
      );
      saveToHistory({ module: 'public-writer', type: docTitle, title: form.subject || docTitle, content: getResolvedBody() });
      onSave();
    } catch (err) { console.error('DOCX export error:', err); }
    setLoading('');
  }

  const enabledTemplates = templates.filter(t => t.enabled);

  // Show subject field if template has showSubject or if doctype is certain built-in ones
  const showSubjectField = tpl?.showSubject ||
    (['administrative-request','official-letter-ar','official-letter-fr','contrat-deux-parties','contrat-location'] as string[]).includes(form.docType);

  const getDocTypeLabel_unused = getDocTypeLabel; // suppress unused warning
  void getDocTypeLabel_unused;

  return (
    <div className="animate-fadeIn" style={{ padding: '24px 36px', background: '#f8fafc', minHeight: '100%' }}>

      {showTplManager && (
        <TemplateEditorModal templates={templates} onSave={setTemplates} onClose={() => setShowTplManager(false)} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#0f2744,#1a3a5c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>✍️</div>
        <div>
          <h2 style={{ fontSize: 19, fontWeight: 900, color: '#0f2744', margin: 0 }}>الكاتب العمومي</h2>
          <p style={{ color: '#64748b', fontSize: 11, margin: 0, fontFamily: 'Inter,sans-serif' }}>Rédacteur Public — Génération automatique de documents</p>
        </div>
        <div style={{ marginRight: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={() => setShowHeaderEditor(!showHeaderEditor)}
            style={{ padding: '8px 14px', background: showHeaderEditor ? '#0f2744' : 'white', border: `1.5px solid ${showHeaderEditor ? '#0f2744' : '#c8962c'}`, borderRadius: 9, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, color: showHeaderEditor ? 'white' : '#c8962c', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
            🎨 تخصيص الشكل
          </button>
          <button onClick={() => setShowTplManager(true)}
            style={{ padding: '8px 14px', background: 'white', border: '1.5px solid #c8962c', borderRadius: 9, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, color: '#c8962c', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
            ⚙️ إدارة النماذج
          </button>
        </div>
      </div>

      {/* Header Customizer */}
      {showHeaderEditor && (
        <div style={{ background: 'white', borderRadius: 14, padding: 20, border: '2px solid #c8962c30', boxShadow: '0 4px 20px rgba(200,150,44,0.1)', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 18 }}>🎨</span>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#0f2744' }}>تخصيص شكل وعنوان PDF المُصدَّر</div>
          </div>
          <PDFHeaderEditor config={headerConfig} onChange={setHeaderConfig} />
        </div>
      )}

      <div className="pw-layout" style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 22, alignItems: 'start' }}>

        {/* FORM PANEL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Doc type selector */}
          <div style={{ background: 'white', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#0f2744', borderBottom: '2px solid #c8962c', paddingBottom: 4 }}>
                📂 نوع الوثيقة — Type de Document
              </div>
              <button onClick={() => setShowTplManager(true)}
                style={{ padding: '4px 10px', background: '#059669', color: 'white', border: 'none', borderRadius: 7, fontSize: 10, cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
                🆕 جديد
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {enabledTemplates.map(dt => (
                <button key={dt.id}
                  onClick={() => { setField('docType', dt.docType as PublicDocType); setPreview(false); setErrors([]); }}
                  style={{
                    padding: '9px 7px', borderRadius: 9,
                    border: tpl?.id === dt.id ? `2px solid ${dt.color}` : '1.5px solid #e2e8f0',
                    background: tpl?.id === dt.id ? `${dt.color}10` : dt.isCustom ? '#f0fdf4' : 'white',
                    color: tpl?.id === dt.id ? dt.color : '#475569',
                    fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    textAlign: 'center', fontFamily: 'inherit', transition: 'all 0.15s',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, lineHeight: 1.3,
                    position: 'relative',
                  }}>
                  {dt.isCustom && (
                    <span style={{ position: 'absolute', top: 3, right: 3, width: 6, height: 6, borderRadius: '50%', background: '#059669' }} />
                  )}
                  <span style={{ fontSize: 18 }}>{dt.icon}</span>
                  <span>{dt.nameAr}</span>
                  <span style={{ fontSize: 9, opacity: 0.55, fontWeight: 400 }}>{dt.category === 'two-parties' ? '👥' : '👤'}</span>
                </button>
              ))}
            </div>
            {enabledTemplates.some(t => t.isCustom) && (
              <div style={{ marginTop: 8, fontSize: 10, color: '#64748b', textAlign: 'center', borderTop: '1px dashed #e2e8f0', paddingTop: 6 }}>
                🟢 النماذج المخصصة محددة بنقطة خضراء
              </div>
            )}
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div style={{ background: '#fff5f5', border: '1.5px solid #fecaca', borderRadius: 10, padding: '10px 13px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', marginBottom: 5 }}>⚠ يرجى تصحيح الأخطاء:</div>
              {errors.map((e, i) => <div key={i} style={{ fontSize: 11, color: '#dc2626', lineHeight: 2 }}>• {e.message}</div>)}
            </div>
          )}

          {/* Party 1 */}
          <div style={{ background: 'white', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <PersonForm
              title={isTwoParty ? `الطرف الأول — ${tpl?.nameAr}` : `بيانات الشخص — ${tpl?.nameAr}`}
              data={form.party1} onChange={setParty1} errors={errors} prefix="party1" color={tpl?.color || '#0f2744'}
            />
          </div>

          {/* Party 2 */}
          {isTwoParty && (
            <div style={{ background: 'white', borderRadius: 12, padding: 16, border: `1px solid ${tpl?.color || '#7c3aed'}30`, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <PersonForm title="الطرف الثاني — Deuxième Partie" data={form.party2} onChange={setParty2} errors={errors} prefix="party2" color="#7c3aed" />
            </div>
          )}

          {/* Doc details */}
          <div style={{ background: 'white', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 12 }}>📄 تفاصيل الوثيقة</div>
            {showSubjectField && (
              <FInput label="الموضوع" labelFr="Objet / Sujet" value={form.subject} onChange={v => setField('subject', v)} placeholder="موضوع الوثيقة" />
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <FInput label="مدينة التحرير" labelFr="Ville" value={form.city} onChange={v => setField('city', v)} placeholder="المدينة" />
              <FInput label="تاريخ الوثيقة" labelFr="Date" value={form.date} onChange={v => setField('date', v)} type="date" dir="ltr" />
            </div>
            {tpl?.showAmount && <FInput label="المبلغ (د.م)" labelFr="Montant MAD" value={form.amount} onChange={v => setField('amount', v)} placeholder="5000.00" dir="ltr" mono />}
            {tpl?.showDuration && <FInput label="المدة / الأجل" labelFr="Durée" value={form.duration} onChange={v => setField('duration', v)} placeholder="12 شهراً" />}
            {tpl?.showProperty && <>
              <FInput label="عنوان العقار" labelFr="Adresse bien" value={form.propertyAddress || ''} onChange={v => setField('propertyAddress', v)} placeholder="العنوان الكامل" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <FInput label="الكراء الشهري (د.م)" labelFr="Loyer" value={form.monthlyRent || ''} onChange={v => setField('monthlyRent', v)} placeholder="0.00" dir="ltr" mono />
                <FInput label="الضمانة (د.م)" labelFr="Dépôt" value={form.depositAmount || ''} onChange={v => setField('depositAmount', v)} placeholder="0.00" dir="ltr" mono />
              </div>
            </>}
            {tpl?.showDebt && <>
              <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 3 }}>وصف الدين / سبب القرض</label>
                <textarea value={form.debtDescription || ''} onChange={e => setField('debtDescription', e.target.value)} rows={3} dir="rtl"
                  style={{ width: '100%', padding: '8px 11px', borderRadius: 7, border: '1.5px solid #e2e8f0', fontSize: 12, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <FInput label="تاريخ السداد" labelFr="Remboursement" value={form.repaymentDate || ''} onChange={v => setField('repaymentDate', v)} type="date" dir="ltr" />
            </>}
            <ClausesEditor clauses={form.customClauses} onChange={c => setField('customClauses', c)} color={tpl?.color || '#0f2744'} />
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 3 }}>تفاصيل إضافية — Détails</label>
              <textarea value={form.details || ''} onChange={e => setField('details', e.target.value)} rows={3} dir="rtl"
                style={{ width: '100%', padding: '8px 11px', borderRadius: 7, border: '1.5px solid #e2e8f0', fontSize: 12, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={handleGenerate}
              style={{ width: '100%', padding: '13px', border: 'none', borderRadius: 10, cursor: 'pointer', background: `linear-gradient(135deg, ${tpl?.color || '#0f2744'}, ${tpl?.color || '#0f2744'}cc)`, color: 'white', fontSize: 14, fontWeight: 800, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: `0 4px 16px ${tpl?.color || '#0f2744'}40` }}>
              {tpl?.icon} معاينة الوثيقة
            </button>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button onClick={handleExportPDF} disabled={!!loading}
                style={{ padding: '11px', background: loading === 'pdf' ? '#cbd5e1' : '#dc2626', color: 'white', border: 'none', borderRadius: 9, fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {loading === 'pdf' ? <><div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />جاري...</> : '📥 تصدير PDF'}
              </button>
              <button onClick={handleExportDocx} disabled={!!loading}
                style={{ padding: '11px', background: loading === 'docx' ? '#cbd5e1' : '#2563eb', color: 'white', border: 'none', borderRadius: 9, fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {loading === 'docx' ? <><div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />جاري...</> : '📄 تصدير Word'}
              </button>
            </div>
          </div>
        </div>

        {/* PREVIEW PANEL */}
        <div>
          {!preview ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 620, background: 'white', borderRadius: 12, border: '2px dashed #e2e8f0', flexDirection: 'column', gap: 20 }}>
              <span style={{ fontSize: 64, opacity: 0.07 }}>📄</span>
              <div style={{ textAlign: 'center', maxWidth: 360 }}>
                <div style={{ color: '#94a3b8', fontSize: 17, fontWeight: 800, marginBottom: 8 }}>اضغط «معاينة الوثيقة»</div>
                <div style={{ color: '#cbd5e1', fontSize: 12, fontFamily: 'Inter,sans-serif', marginBottom: 18 }}>سيتم توليد الوثيقة من النموذج المحدد</div>
                {tpl && (
                  <div style={{ background: `${tpl.color}10`, border: `2px solid ${tpl.color}30`, borderRadius: 12, padding: '14px 18px', textAlign: 'right' }}>
                    <div style={{ fontSize: 24, marginBottom: 5 }}>{tpl.icon}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: tpl.color, marginBottom: 3 }}>{tpl.nameAr}</div>
                    <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'Inter,sans-serif' }}>{tpl.nameFr}</div>
                    {tpl.isCustom && <div style={{ marginTop: 6, background: '#dcfce7', color: '#15803d', borderRadius: 20, padding: '2px 10px', fontSize: 9, fontWeight: 700, display: 'inline-block' }}>🆕 نموذج مخصص</div>}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>📄 معاينة A4</span>
                  <span style={{ background: '#dcfce7', color: '#15803d', borderRadius: 20, padding: '2px 9px', fontSize: 10, fontWeight: 700 }}>✓ جاهزة للتصدير</span>
                </div>
                <div style={{ display: 'flex', gap: 7 }}>
                  <button onClick={handleExportPDF} disabled={!!loading} style={{ padding: '7px 13px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>📥 PDF</button>
                  <button onClick={handleExportDocx} disabled={!!loading} style={{ padding: '7px 13px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>📄 Word</button>
                  <button onClick={() => setPreview(false)} style={{ padding: '7px 11px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
                </div>
              </div>

              <div style={{ marginBottom: 12, background: '#fffbeb', borderRadius: 10, padding: '12px 14px', border: '1.5px solid #fde68a' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', marginBottom: 8 }}>
                  ✏️ تحرير مباشر لمتن الوثيقة — <span style={{ fontWeight: 400, color: '#a16207' }}>التغييرات تُطبَّق فوراً</span>
                </div>
                <WYSIWYGEditor value={richBody} onChange={v => setRichBody(v)} dir={isFrench ? 'ltr' : 'rtl'} minHeight={200} />
              </div>

              <div style={{ overflow: 'auto', maxHeight: '70vh', borderRadius: 8, boxShadow: '0 4px 28px rgba(0,0,0,0.12)' }}>
                {isFrench
                  ? <FrenchDocPreview form={form} tpl={tpl!} docTitle={tpl?.nameFr || ''} richBody={richBody} displayDate={displayDate} headerConfig={headerConfig} ref={previewRef} />
                  : <ArabicDocPreview form={form} tpl={tpl!} docTitle={docTitle} richBody={richBody} displayDate={arabicDate} headerConfig={headerConfig} ref={previewRef} />
                }
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ARABIC DOCUMENT PREVIEW
═══════════════════════════════════════════════════════════ */
const ArabicDocPreview = forwardRef<HTMLDivElement, {
  form: PublicWriterForm; tpl: TemplateDef; docTitle: string;
  richBody: string; displayDate: string; headerConfig: DocHeaderConfig;
}>(({ form, tpl, docTitle, richBody, displayDate, headerConfig: hc }, ref) => {
  const color = tpl?.color || '#0f2744';
  return (
    <div ref={ref} className="doc-preview doc-preview-a4" dir="rtl"
      style={{ fontFamily: "'Cairo', 'Amiri', serif", background: 'white', padding: `${hc.pageMarginTop}px ${hc.pageMarginSide}px`, minHeight: '297mm' }}>

      {hc.showTitle && (
        <div style={{ marginBottom: 20, textAlign: hc.titleAlign }}>
          <div style={{
            display: 'inline-block', border: `2.5px solid ${color}`,
            borderRadius: 8, padding: '8px 32px', background: `${color}08`,
          }}>
            <div style={{
              fontSize: hc.titleFontSize,
              fontWeight: hc.titleBold ? 900 : 400,
              color: hc.titleColor,
              letterSpacing: 1,
              direction: 'rtl',
              unicodeBidi: 'plaintext',
              textAlign: 'center',
              fontFamily: "'Cairo', 'Amiri', serif",
              whiteSpace: 'nowrap',
            }}>{docTitle}</div>
          </div>
          {hc.showOrnament && (
            <div style={{ color: `${color}60`, fontSize: 14, letterSpacing: 8, marginTop: 6, direction: 'ltr', textAlign: 'center' }}>
              {hc.ornamentChar}
            </div>
          )}
        </div>
      )}

      {hc.showDivider && <div style={{ borderBottom: `1.5px solid ${hc.dividerColor}25`, marginBottom: 20 }} />}

      {hc.showDate && (
        <div style={{ textAlign: 'right', color: '#475569', fontWeight: 600, fontSize: 13, marginBottom: 20 }}>
          {hc.showCity && <span>{(form.city || form.party1.city) || 'المدينة'}، </span>}
          بتاريخ: {displayDate}
        </div>
      )}

      <div
        dir="rtl"
        style={{ lineHeight: hc.bodyLineHeight, fontSize: hc.bodyFontSize, textAlign: 'justify', color: '#1e293b', marginBottom: 16, fontFamily: "'Cairo', serif" }}
        dangerouslySetInnerHTML={{ __html: richBody.replace(/\n/g, '<br/>') }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 52, fontSize: 13 }}>
        {tpl?.category === 'two-parties' ? (
          <>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', marginBottom: 6 }}>توقيع الطرف الثاني</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0f2744', marginBottom: hc.signatureStyle === 'simple' ? 10 : 40 }}>{form.party2.fullName || '...'}</div>
              {hc.signatureStyle !== 'simple' && <div style={{ borderBottom: '2px solid #7c3aed', width: 160 }} />}
              {hc.signatureStyle === 'formal' && <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 4 }}>الإمضاء والتاريخ</div>}
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 6 }}>توقيع الطرف الأول</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0f2744', marginBottom: hc.signatureStyle === 'simple' ? 10 : 40 }}>{form.party1.fullName || '...'}</div>
              {hc.signatureStyle !== 'simple' && <div style={{ borderBottom: `2px solid ${color}`, width: 160 }} />}
              {hc.signatureStyle === 'formal' && <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 4 }}>الإمضاء والتاريخ</div>}
            </div>
          </>
        ) : (
          <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>التوقيع</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f2744', marginBottom: hc.signatureStyle === 'simple' ? 10 : 40 }}>{form.party1.fullName || '...'}</div>
              {hc.signatureStyle !== 'simple' && <div style={{ borderBottom: `2px solid ${color}`, width: 200 }} />}
              {hc.signatureStyle === 'formal' && <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 4 }}>الإمضاء والتاريخ</div>}
            </div>
          </div>
        )}
      </div>
      <div style={{ marginTop: 32, borderTop: `1px solid ${color}15` }} />
    </div>
  );
});
ArabicDocPreview.displayName = 'ArabicDocPreview';

/* ═══════════════════════════════════════════════════════════
   FRENCH DOCUMENT PREVIEW
═══════════════════════════════════════════════════════════ */
const FrenchDocPreview = forwardRef<HTMLDivElement, {
  form: PublicWriterForm; tpl: TemplateDef; docTitle: string;
  richBody: string; displayDate: string; headerConfig: DocHeaderConfig;
}>(({ form, tpl, docTitle, richBody, displayDate, headerConfig: hc }, ref) => (
  <div ref={ref} className="doc-preview doc-preview-a4" dir="ltr"
    style={{ fontFamily: "'Inter', sans-serif", background: 'white', padding: `${hc.pageMarginTop}px ${hc.pageMarginSide}px`, minHeight: '297mm' }}>

    {hc.showDivider && <div style={{ background: tpl?.color || '#0f2744', height: 4, marginBottom: 32, borderRadius: 2 }} />}
    {hc.showTitle && (
      <div style={{ textAlign: hc.titleAlign, marginBottom: 20 }}>
        <div style={{ fontSize: hc.titleFontSize, fontWeight: hc.titleBold ? 800 : 400, color: hc.titleColor, direction: 'ltr' }}>{docTitle}</div>
      </div>
    )}

    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 28 }}>
      <div>
        <div style={{ fontWeight: 800, fontSize: 15, color: '#0f2744' }}>{form.party1.fullName}</div>
        {form.party1.address && <div style={{ fontSize: 12, color: '#475569' }}>{form.party1.address}</div>}
        {form.party1.city && <div style={{ fontSize: 12, color: '#475569' }}>{form.party1.city}</div>}
        {form.party1.phone && <div style={{ fontSize: 12, color: '#475569' }}>Tél : {form.party1.phone}</div>}
      </div>
      {hc.showDate && (
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
            {hc.showCity && (form.party1.city || form.city || '')}{hc.showCity && ', '}le {displayDate}
          </div>
        </div>
      )}
    </div>

    {form.subject && (
      <div style={{ marginBottom: 24, padding: '10px 15px', background: '#f8fafc', borderLeft: `4px solid ${tpl?.color || '#c8962c'}`, borderRadius: '0 8px 8px 0' }}>
        <span style={{ fontWeight: 700, textDecoration: 'underline', fontSize: 13 }}>Objet : </span>
        <span style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{form.subject}</span>
      </div>
    )}

    <p style={{ fontSize: 13.5, marginBottom: 20, color: '#374151' }}>Madame, Monsieur,</p>

    <div
      style={{ lineHeight: hc.bodyLineHeight, fontSize: hc.bodyFontSize, textAlign: 'justify', color: '#1e293b', direction: 'ltr' }}
      dangerouslySetInnerHTML={{ __html: richBody.replace(/\n/g, '<br/>') }}
    />

    <div style={{ marginTop: 44 }}>
      <div style={{ display: 'inline-block', borderBottom: hc.signatureStyle !== 'simple' ? '2px solid #1e293b' : 'none', paddingBottom: 4, minWidth: 200 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: '#0f2744' }}>{form.party1.fullName}</div>
        {form.party1.city && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{form.party1.city}</div>}
      </div>
    </div>
    <div style={{ marginTop: 44, borderTop: `1px solid ${tpl?.color || '#0f2744'}25` }} />
  </div>
));
FrenchDocPreview.displayName = 'FrenchDocPreview';
