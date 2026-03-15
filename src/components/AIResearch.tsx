import { useState, useRef, forwardRef } from 'react';
import { ResearchForm, ResearchOutput } from '../types';
import { exportElementToPDF } from '../utils/exportPdf';
import { exportResearchToDocx } from '../utils/exportDocx';
import { saveToHistory } from '../utils/storage';

const defaultForm: ResearchForm = {
  title: '',
  subject: '',
  language: 'ar',
  keywords: '',
  sections: 4,
  includeImages: true,
  apiKey: localStorage.getItem('openai_key') || '',
};

const PEXELS_KEY = 'a8M3bpHpMFgNGaqj7o4wTaFB4TQk9xJrXp6bHFEKhvVTgQPJpHdgQQe1';

async function fetchImage(query: string): Promise<string | undefined> {
  try {
    const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`, {
      headers: { Authorization: PEXELS_KEY },
    });
    const data = await res.json();
    return data.photos?.[0]?.src?.medium;
  } catch { return undefined; }
}

async function generateWithOpenAI(form: ResearchForm): Promise<ResearchOutput> {
  const isAr = form.language === 'ar';
  const systemPrompt = isAr
    ? `أنت باحث أكاديمي متخصص في كتابة البحوث العلمية والأكاديمية باللغة العربية الفصحى. اكتب بأسلوب رسمي وأكاديمي.`
    : `Vous êtes un chercheur académique expert en rédaction de recherches scientifiques en français formel et académique.`;

  const userPrompt = isAr
    ? `اكتب بحثاً أكاديمياً كاملاً حول: "${form.title}"
الموضوع: ${form.subject}
الكلمات المفتاحية: ${form.keywords}
عدد الأقسام الرئيسية: ${form.sections}

أعطني الإخراج بصيغة JSON بالهيكل التالي:
{
  "introduction": "مقدمة وافية",
  "sections": [
    { "title": "عنوان القسم", "content": "محتوى القسم التفصيلي", "imageQuery": "كلمة بحث للصورة بالإنجليزية" }
  ],
  "conclusion": "خاتمة شاملة"
}
اكتب كل قسم بشكل مفصل وعلمي، لا تقل عن 150 كلمة لكل قسم.`
    : `Rédigez une recherche académique complète sur : "${form.title}"
Sujet : ${form.subject}
Mots-clés : ${form.keywords}
Nombre de sections : ${form.sections}

Retournez le résultat en JSON avec cette structure :
{
  "introduction": "introduction détaillée",
  "sections": [
    { "title": "titre de section", "content": "contenu détaillé de la section", "imageQuery": "mot-clé en anglais pour image" }
  ],
  "conclusion": "conclusion complète"
}
Chaque section doit faire au minimum 150 mots, style académique formel.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${form.apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'OpenAI API error');
  }

  const data = await response.json();
  const parsed = JSON.parse(data.choices[0].message.content);

  return {
    title: form.title,
    language: form.language,
    introduction: parsed.introduction || '',
    sections: parsed.sections || [],
    conclusion: parsed.conclusion || '',
  };
}

function generateMockResearch(form: ResearchForm): ResearchOutput {
  const isAr = form.language === 'ar';
  const sections = Array.from({ length: form.sections }, (_, i) => ({
    title: isAr ? `القسم ${i + 1}: ${form.keywords.split(',')[i] || `المحور ${i + 1}`}` : `Section ${i + 1}: ${form.keywords.split(',')[i] || `Axe ${i + 1}`}`,
    content: isAr
      ? `يتناول هذا القسم جانباً مهماً من جوانب الموضوع المطروح "${form.title}". إن دراسة هذا المحور تستدعي التعمق في الأبعاد النظرية والتطبيقية المتعددة، إذ يرتكز على جملة من المفاهيم الأساسية التي تشكل الإطار المرجعي للبحث. وقد أثبتت الدراسات الأكاديمية المتعددة أهمية هذا الجانب في فهم الظاهرة المدروسة، كما أن التراكم المعرفي في هذا المجال يفتح آفاقاً جديدة للتحليل والاستنتاج. يسعى هذا القسم إلى تسليط الضوء على العوامل المحددة والمتغيرات المؤثرة، مع استحضار الشواهد والأمثلة التطبيقية التي تعزز الفهم الشامل للموضوع المعالج.`
      : `Cette section traite un aspect fondamental du sujet "${form.title}". L'analyse approfondie de cet axe nécessite une exploration des dimensions théoriques et pratiques multiples, s'appuyant sur un ensemble de concepts fondamentaux qui constituent le cadre référentiel de la recherche. Les études académiques récentes ont démontré l'importance cruciale de cet aspect dans la compréhension du phénomène étudié. L'accumulation des connaissances dans ce domaine ouvre de nouvelles perspectives d'analyse et de déduction, permettant ainsi une meilleure compréhension des enjeux contemporains liés au sujet traité dans cette recherche.`,
    imageQuery: form.keywords.split(',')[i]?.trim() || form.subject,
  }));

  return {
    title: form.title,
    language: form.language,
    introduction: isAr
      ? `تُعدّ دراسة موضوع "${form.title}" من المواضيع البالغة الأهمية في السياق الأكاديمي المعاصر، نظراً للتحولات المتسارعة التي يشهدها المجال. تهدف هذه الدراسة إلى استعراض أبرز جوانب الموضوع المطروح من خلال مقاربة منهجية شاملة تجمع بين الجانبين النظري والتطبيقي. وقد انطلق البحث من إشكالية محورية تتمحور حول ${form.subject}، مستلهماً أُطره المفاهيمية من أمهات المراجع ذات الصلة، مع حرص تام على الموضوعية والصرامة العلمية.`
      : `L'étude du sujet "${form.title}" revêt une importance considérable dans le contexte académique contemporain, compte tenu des transformations rapides que connaît ce domaine. Cette recherche vise à présenter les aspects les plus saillants du sujet abordé à travers une approche méthodologique rigoureuse combinant les dimensions théoriques et pratiques. La problématique centrale tourne autour de ${form.subject}, puisant ses cadres conceptuels dans les références académiques les plus pertinentes, tout en maintenant l'objectivité et la rigueur scientifique.`,
    sections,
    conclusion: isAr
      ? `خلصت هذه الدراسة إلى جملة من النتائج والاستنتاجات الجوهرية التي تُثري الرصيد المعرفي المتعلق بموضوع "${form.title}". وقد تجلّى بوضوح أن الإحاطة الشاملة بهذا الموضوع تستدعي التكامل بين مختلف المناهج والمقاربات البحثية. وفي ضوء ما تمت دراسته وتحليله، يوصي البحث بمواصلة التعمق في هذا الميدان، وإجراء دراسات ميدانية تكميلية تُكمل ما بدأه هذا البحث من مسيرة بحثية علمية رصينة.`
      : `Cette étude a abouti à un ensemble de résultats et conclusions fondamentales qui enrichissent la connaissance relative au sujet "${form.title}". Il est clairement apparu qu'une approche globale de ce sujet nécessite l'intégration de différentes méthodologies et approches de recherche. À la lumière de ce qui a été étudié et analysé, cette recherche recommande de poursuivre l'approfondissement dans ce domaine et de mener des études complémentaires qui complèteront le parcours de recherche scientifique initié.`,
  };
}

export default function AIResearch({ onSave }: { onSave: () => void }) {
  const [form, setForm] = useState<ResearchForm>(defaultForm);
  const [result, setResult] = useState<ResearchOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState('');
  const [showKey, setShowKey] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const set = (k: keyof ResearchForm, v: any) => setForm(f => ({ ...f, [k]: v }));

  async function generate() {
    if (!form.title.trim()) { setError('يرجى إدخال عنوان البحث'); return; }
    setLoading(true); setError(''); setResult(null);

    try {
      let research: ResearchOutput;
      if (form.apiKey.trim().startsWith('sk-')) {
        localStorage.setItem('openai_key', form.apiKey);
        research = await generateWithOpenAI(form);
      } else {
        // Use mock generation if no API key
        await new Promise(r => setTimeout(r, 2000));
        research = generateMockResearch(form);
      }

      // Fetch images if enabled
      if (form.includeImages) {
        for (let i = 0; i < research.sections.length; i++) {
          const query = (research.sections[i] as any).imageQuery || form.subject;
          const imgUrl = await fetchImage(query);
          if (imgUrl) research.sections[i].imageUrl = imgUrl;
        }
      }

      setResult(research);
      saveToHistory({
        module: 'public-writer',
        type: form.language === 'ar' ? 'بحث عربي' : 'Recherche FR',
        title: form.title,
      });
      onSave();
    } catch (e: any) {
      setError(e.message || 'حدث خطأ أثناء التوليد');
    } finally {
      setLoading(false);
    }
  }

  async function handlePDF() {
    if (!previewRef.current) return;
    setExporting('pdf');
    await new Promise(r => setTimeout(r, 300));
    await exportElementToPDF(previewRef.current, `بحث_${form.title}`, 'a4');
    setExporting('');
  }

  async function handleDocx() {
    if (!result) return;
    setExporting('docx');
    await exportResearchToDocx(result, `بحث_${form.title}`);
    setExporting('');
  }

  const isAr = form.language === 'ar';

  return (
    <div className="animate-fadeIn" style={{ padding: '28px 40px' }}>
      <div className="section-header">
        <div className="section-icon" style={{ background: '#fff1f2' }}>
          <span style={{ fontSize: 22 }}>🤖</span>
        </div>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f2744', margin: 0 }}>البحث بالذكاء الاصطناعي</h2>
          <p style={{ color: '#64748b', fontSize: 13, margin: 0, fontFamily: 'Inter, sans-serif' }}>Rédaction Assistée par IA — GPT-4 + Images Pexels</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 28, alignItems: 'start' }}>
        {/* Form */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#0f2744', marginBottom: 16, borderBottom: '2px solid #f87171', paddingBottom: 8 }}>
            ⚙️ إعدادات البحث — Configuration
          </div>

          {/* API Key */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>🔑 OpenAI API Key</span>
              <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'Inter, sans-serif' }}>اختياري — Optionnel</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-input"
                type={showKey ? 'text' : 'password'}
                value={form.apiKey}
                onChange={e => set('apiKey', e.target.value)}
                style={{ fontFamily: 'Inter, sans-serif', paddingLeft: 36 }}
                placeholder="sk-proj-..."
              />
              <button onClick={() => setShowKey(!showKey)}
                style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', fontSize: 16 }}>
                {showKey ? '🙈' : '👁️'}
              </button>
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
              بدون مفتاح: توليد نموذجي | Avec clé: GPT-4 réel
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">عنوان البحث — Titre de la Recherche</label>
            <input className="form-input" value={form.title} onChange={e => set('title', e.target.value)} dir="auto" placeholder={isAr ? 'عنوان البحث العلمي' : 'Titre de la recherche'} />
          </div>

          <div className="form-group">
            <label className="form-label">الموضوع والإشكالية — Sujet / Problématique</label>
            <textarea className="form-textarea" value={form.subject} onChange={e => set('subject', e.target.value)} dir="auto" rows={3}
              placeholder={isAr ? 'وصف موضوع البحث والإشكالية المطروحة' : 'Description du sujet et de la problématique'} />
          </div>

          <div className="form-group">
            <label className="form-label">الكلمات المفتاحية — Mots-clés</label>
            <input className="form-input" value={form.keywords} onChange={e => set('keywords', e.target.value)} dir="auto"
              placeholder={isAr ? 'كلمة1, كلمة2, كلمة3' : 'mot1, mot2, mot3'} />
          </div>

          {/* Language */}
          <div className="form-group">
            <label className="form-label">لغة البحث — Langue</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['ar', 'fr'] as const).map(l => (
                <button key={l} onClick={() => set('language', l)}
                  style={{
                    flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                    border: form.language === l ? '2px solid #dc2626' : '1.5px solid #e2e8f0',
                    background: form.language === l ? '#fff1f2' : 'white',
                    color: form.language === l ? '#dc2626' : '#475569',
                    fontSize: 13, fontWeight: 700,
                  }}>
                  {l === 'ar' ? '🇲🇦 عربي' : '🇫🇷 Français'}
                </button>
              ))}
            </div>
          </div>

          {/* Sections */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>عدد الأقسام — Sections</span>
              <span style={{ color: '#dc2626', fontFamily: 'Inter, sans-serif' }}>{form.sections}</span>
            </label>
            <input type="range" min={2} max={8} value={form.sections}
              onChange={e => set('sections', Number(e.target.value))}
              style={{ width: '100%', accentColor: '#dc2626' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8' }}>
              <span>2</span><span>8</span>
            </div>
          </div>

          {/* Include Images */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '10px 12px', background: '#f8fafc', borderRadius: 8 }}>
            <input type="checkbox" id="includeImages" checked={form.includeImages} onChange={e => set('includeImages', e.target.checked)}
              style={{ width: 16, height: 16, accentColor: '#dc2626' }} />
            <label htmlFor="includeImages" style={{ fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
              🖼️ إضافة صور من Pexels — Inclure des images
            </label>
          </div>

          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#dc2626' }}>
              ⚠️ {error}
            </div>
          )}

          <button className="btn btn-danger" style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 15 }}
            onClick={generate} disabled={loading}>
            {loading ? (
              <><span className="spinner" /> {isAr ? 'جاري التوليد...' : 'Génération en cours...'}</>
            ) : (
              <>{isAr ? '🚀 توليد البحث' : '🚀 Générer la Recherche'}</>
            )}
          </button>

          {result && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
              <button className="btn btn-danger" style={{ justifyContent: 'center' }} onClick={handlePDF} disabled={!!exporting}>
                {exporting === 'pdf' ? <span className="spinner" /> : '📥'} PDF
              </button>
              <button className="btn btn-success" style={{ justifyContent: 'center' }} onClick={handleDocx} disabled={!!exporting}>
                {exporting === 'docx' ? <span className="spinner" /> : '📄'} Word
              </button>
            </div>
          )}
        </div>

        {/* Output */}
        <div style={{ overflow: 'auto' }}>
          {loading ? (
            <div style={{ background: 'linear-gradient(135deg,#0f172a,#1e3a5f)', borderRadius: 16, padding: '60px 40px', textAlign: 'center' }}>
              <div style={{ fontSize: 72, marginBottom: 24, animation: 'pulse 2s infinite' }}>🤖</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'white', marginBottom: 8 }}>
                {isAr ? 'جاري توليد البحث...' : 'Génération en cours...'}
              </div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 32, fontFamily: 'Inter, sans-serif' }}>
                {isAr ? 'يتم الآن إنشاء محتوى البحث وجلب الصور من Pexels' : 'Création du contenu et récupération des images Pexels'}
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                {(isAr
                  ? ['🔍 جمع المعلومات', '✍️ كتابة المحتوى', '🖼️ جلب الصور', '📐 التنسيق']
                  : ['🔍 Collecte', '✍️ Rédaction', '🖼️ Images', '📐 Mise en page']
                ).map((s, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '8px 16px', fontSize: 12, color: '#94a3b8', fontFamily: 'Inter, sans-serif' }}>
                    {s}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 32, width: '60%', margin: '32px auto 0', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'linear-gradient(90deg,#dc2626,#f87171)', borderRadius: 4, animation: 'progressBar 2s ease-in-out infinite' }} />
              </div>
            </div>
          ) : result ? (
            <ResearchPreview result={result} ref={previewRef} />
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minHeight: 500, background: '#f8fafc', borderRadius: 12,
              border: '2px dashed #e2e8f0', flexDirection: 'column', gap: 16,
            }}>
              <div style={{ fontSize: 64 }}>🤖</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f2744' }}>
                {isAr ? 'أدخل تفاصيل البحث وانقر "توليد"' : 'Remplissez le formulaire et cliquez "Générer"'}
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', maxWidth: 300 }}>
                {isAr
                  ? 'سيتم توليد بحث أكاديمي كامل مع مقدمة وأقسام وخاتمة وصور'
                  : 'Une recherche académique complète sera générée avec introduction, sections, conclusion et images'
                }
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const ResearchPreview = forwardRef<HTMLDivElement, { result: ResearchOutput }>(({ result }, ref) => {
  const isAr = result.language === 'ar';
  const hasAnyImage = result.sections.some(s => s.imageUrl);

  return (
    <div ref={ref} className="doc-preview doc-preview-a4" dir={isAr ? 'rtl' : 'ltr'}
      style={{ fontFamily: isAr ? "'Cairo', 'Amiri', serif" : "'Inter', sans-serif" }}>

      {/* ── Cover / Title Page ── */}
      <div style={{ textAlign: 'center', paddingBottom: 24, marginBottom: 28, borderBottom: '3px solid #dc2626' }}>
        {/* Flag line */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ height: 1, flex: 1, background: 'linear-gradient(to right, transparent, #dc262640)' }} />
          <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'Inter, sans-serif', letterSpacing: 2 }}>المملكة المغربية — Royaume du Maroc</span>
          <div style={{ height: 1, flex: 1, background: 'linear-gradient(to left, transparent, #dc262640)' }} />
        </div>

        <div style={{ color: '#dc2626', fontSize: 18, letterSpacing: 10, marginBottom: 14 }}>✦ ✦ ✦</div>

        {/* Title box */}
        <div style={{ display: 'inline-block', border: '2px solid #dc2626', borderRadius: 10, padding: '12px 36px', background: '#fff1f2', marginBottom: 12 }}>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: '#0f2744', margin: 0, lineHeight: 1.5 }}>
            {result.title}
          </h1>
        </div>

        <div style={{ fontSize: 12, color: '#64748b', marginTop: 8, fontFamily: 'Inter, sans-serif' }}>
          {isAr ? '📚 بحث أكاديمي مُعدّ بمساعدة الذكاء الاصطناعي' : '📚 Recherche académique générée par IA'}
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, fontFamily: 'Inter, sans-serif' }}>
          {new Date().toLocaleDateString('fr-MA', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>

        {/* Stats bar */}
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 14 }}>
          {[
            { n: result.sections.length, l: isAr ? 'قسم' : 'Sections' },
            { n: hasAnyImage ? result.sections.filter(s => s.imageUrl).length : 0, l: isAr ? 'صورة' : 'Images' },
            { n: isAr ? 'AR' : 'FR', l: isAr ? 'اللغة' : 'Langue' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#dc2626' }}>{s.n}</div>
              <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'Inter, sans-serif' }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Table of Contents ── */}
      {result.sections.length > 2 && (
        <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 18px', marginBottom: 24, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#0f2744', marginBottom: 10 }}>
            {isAr ? '📋 فهرس المحتويات' : '📋 Table des matières'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#475569' }}>
              <span>{isAr ? 'المقدمة' : 'Introduction'}</span>
              <span style={{ borderBottom: '1px dotted #cbd5e1', flex: 1, margin: '0 8px' }} />
              <span style={{ fontFamily: 'Inter, sans-serif' }}>1</span>
            </div>
            {result.sections.map((sec, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#475569' }}>
                <span>{i + 1}. {sec.title}</span>
                <span style={{ borderBottom: '1px dotted #cbd5e1', flex: 1, margin: '0 8px' }} />
                <span style={{ fontFamily: 'Inter, sans-serif' }}>{i + 2}</span>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#475569' }}>
              <span>{isAr ? 'الخاتمة' : 'Conclusion'}</span>
              <span style={{ borderBottom: '1px dotted #cbd5e1', flex: 1, margin: '0 8px' }} />
              <span style={{ fontFamily: 'Inter, sans-serif' }}>{result.sections.length + 2}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Introduction ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 32, height: 32, background: '#dc2626', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 14, fontWeight: 900, flexShrink: 0 }}>
            {isAr ? 'م' : 'I'}
          </div>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0f2744', margin: 0 }}>
            {isAr ? 'مقدمة' : 'Introduction'}
          </h2>
          <div style={{ flex: 1, height: 1, background: '#dc262630' }} />
        </div>
        <p style={{ lineHeight: 2, fontSize: 13.5, textAlign: 'justify', margin: 0, color: '#1e293b' }}>
          {result.introduction}
        </p>
      </div>

      {/* ── Sections with inline images ── */}
      {result.sections.map((sec, i) => (
        <div key={i} style={{ marginBottom: 32, pageBreakInside: 'avoid' as any }}>
          {/* Section heading */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 32, height: 32, background: '#0f2744', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 13, fontWeight: 900, flexShrink: 0 }}>
              {i + 1}
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f2744', margin: 0, flex: 1 }}>
              {sec.title}
            </h2>
            <div style={{ flex: 1, height: 1, background: '#0f274420', maxWidth: 80 }} />
          </div>

          {/* Image — displayed prominently with caption */}
          {sec.imageUrl && (
            <div style={{
              marginBottom: 16,
              borderRadius: 10,
              overflow: 'hidden',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            }}>
              <img
                src={sec.imageUrl}
                alt={sec.title}
                crossOrigin="anonymous"
                style={{
                  width: '100%',
                  height: 220,
                  objectFit: 'cover',
                  display: 'block',
                }}
                onError={e => {
                  const wrapper = (e.target as HTMLImageElement).closest('div');
                  if (wrapper) wrapper.style.display = 'none';
                }}
              />
              {/* Image caption */}
              <div style={{
                padding: '8px 14px',
                background: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <span style={{ fontSize: 12, color: '#64748b', fontFamily: 'Inter, sans-serif', fontStyle: 'italic' }}>
                  🖼️ {isAr ? 'صورة توضيحية:' : 'Illustration :'} <span style={{ color: '#0f2744', fontWeight: 600 }}>{sec.title}</span>
                </span>
                <span style={{ fontSize: 10, color: '#94a3b8', marginRight: 'auto', fontFamily: 'Inter, sans-serif' }}>
                  via Pexels
                </span>
              </div>
            </div>
          )}

          {/* No image placeholder — subtle */}
          {!sec.imageUrl && (
            <div style={{
              marginBottom: 14,
              padding: '10px 14px',
              background: '#fafafa',
              border: '1px dashed #e2e8f0',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span style={{ fontSize: 16, opacity: 0.4 }}>🖼️</span>
              <span style={{ fontSize: 11, color: '#cbd5e1', fontFamily: 'Inter, sans-serif', fontStyle: 'italic' }}>
                {isAr ? 'لا توجد صورة لهذا القسم' : 'Aucune image disponible pour cette section'}
              </span>
            </div>
          )}

          <p style={{ lineHeight: 2, fontSize: 13.5, textAlign: 'justify', margin: 0, color: '#1e293b' }}>
            {sec.content}
          </p>
        </div>
      ))}

      {/* ── Conclusion ── */}
      <div style={{ background: 'linear-gradient(135deg,#fff1f2,#fef2f2)', borderRadius: 12, padding: '20px 24px', border: '1px solid #fecdd3', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 32, height: 32, background: '#dc2626', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 14, fontWeight: 900, flexShrink: 0 }}>
            {isAr ? 'خ' : 'C'}
          </div>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0f2744', margin: 0 }}>
            {isAr ? 'خاتمة' : 'Conclusion'}
          </h2>
        </div>
        <p style={{ lineHeight: 2, fontSize: 13.5, textAlign: 'justify', margin: 0, color: '#1e293b' }}>
          {result.conclusion}
        </p>
      </div>

      {/* ── References placeholder ── */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16, marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
          {isAr ? '📚 المراجع والمصادر' : '📚 Références et Sources'}
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.8, fontFamily: 'Inter, sans-serif' }}>
          {isAr
            ? '• تم إنشاء هذا البحث بمساعدة الذكاء الاصطناعي GPT-4 ومصادر متعددة.\n• الصور من موقع Pexels.com — رخصة مجانية للاستخدام التجاري.'
            : '• Cette recherche a été générée avec l\'aide de l\'IA GPT-4 et de sources multiples.\n• Images fournies par Pexels.com — Licence gratuite pour usage commercial.'
          }
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 10, borderTop: '1px solid #e2e8f0', paddingTop: 12, fontFamily: 'Inter, sans-serif', letterSpacing: 1 }}>
        نظام خدمات المكتب المغربي — Système de Services de Bureau Marocain ✦ {new Date().getFullYear()}
      </div>
    </div>
  );
});
