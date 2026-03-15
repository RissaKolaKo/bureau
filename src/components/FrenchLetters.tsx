import { useState, useRef, forwardRef } from 'react';
import { FrenchLetterForm, FrenchLetterType } from '../types';
import { generateFrenchLetterBody, getDocTypeLabel, getTodayISO } from '../utils/documentTemplates';
// exportPdf not used directly — inline portal export below
import { exportFrenchDocToDocx } from '../utils/exportDocx';
import { saveToHistory } from '../utils/storage';

const letterTypes: { id: FrenchLetterType; icon: string; desc: string }[] = [
  { id: 'demande-stage', icon: '🎓', desc: 'Demande de stage professionnel ou académique' },
  { id: 'lettre-demission', icon: '🚪', desc: 'Lettre de démission formelle' },
  { id: 'demande-administrative', icon: '🏛️', desc: 'Demande administrative officielle' },
  { id: 'lettre-officielle', icon: '📮', desc: 'Lettre officielle marocaine' },
];

const defaultForm: FrenchLetterForm = {
  type: 'demande-stage',
  nom: '', prenom: '', adresse: '', ville: '', email: '', telephone: '',
  destinataire: '', titreDestinataire: 'Monsieur/Madame le Directeur(rice)',
  organisation: '', adresseDestinataire: '',
  objet: '', corps: '',
  date: getTodayISO(),
  stageType: 'de fin d\'études', stageDuration: '2 mois',
  stageStartDate: '', poste: '', dateDebut: '', noticePeriod: '1 mois',
};

export default function FrenchLetters({ onSave }: { onSave: () => void }) {
  const [form, setForm] = useState<FrenchLetterForm>(defaultForm);
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState('');
  const previewRef = useRef<HTMLDivElement>(null);

  const set = (k: keyof FrenchLetterForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const body = form.corps || generateFrenchLetterBody(form);
  const displayDate = form.date
    ? new Date(form.date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';
  const typeLabel = getDocTypeLabel(form.type, 'fr');

  async function handlePDF() {
    setLoading('pdf');
    // Ensure preview is visible so ref is populated
    setPreview(true);
    await new Promise(r => setTimeout(r, 600));
    const node = previewRef.current;
    if (!node) { setLoading(''); return; }

    try {
      const SOURCE_W = node.scrollWidth || 794;
      const SCALE = 3;
      const PAGE_W_MM = 210;
      const PAGE_H_MM = 297;

      const portal = document.createElement('div');
      portal.style.cssText = [
        'position:fixed', 'top:0', 'left:0', 'z-index:999999',
        `width:${SOURCE_W}px`, 'overflow:visible', 'pointer-events:none',
        'opacity:0.01', 'background:#ffffff',
      ].join(';');

      const clone = node.cloneNode(true) as HTMLElement;
      clone.style.cssText = `width:${SOURCE_W}px;min-height:auto;transform:none;position:static;overflow:visible;box-shadow:none;border-radius:0;margin:0;background:#ffffff;font-family:Inter,sans-serif;`;
      portal.appendChild(clone);
      document.body.appendChild(portal);

      await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      await new Promise<void>(r => setTimeout(r, 300));

      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(portal, {
        scale: SCALE, useCORS: true, allowTaint: true, backgroundColor: '#ffffff',
        logging: false, width: SOURCE_W, height: portal.scrollHeight,
        windowWidth: SOURCE_W, windowHeight: portal.scrollHeight, x: 0, y: 0,
      });

      document.body.removeChild(portal);
      if (canvas.width === 0 || canvas.height === 0) throw new Error('Empty canvas');

      const { default: jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const mmPerPx = PAGE_W_MM / canvas.width;
      const pageH_px = Math.floor(PAGE_H_MM / mmPerPx);
      let yPx = 0; let isFirst = true;

      while (yPx < canvas.height) {
        const sliceH_px = Math.min(pageH_px, canvas.height - yPx);
        const slice = document.createElement('canvas');
        slice.width = canvas.width; slice.height = sliceH_px;
        const ctx = slice.getContext('2d')!;
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, sliceH_px);
        ctx.drawImage(canvas, 0, yPx, canvas.width, sliceH_px, 0, 0, canvas.width, sliceH_px);
        if (!isFirst) pdf.addPage();
        pdf.addImage(slice.toDataURL('image/png'), 'PNG', 0, 0, PAGE_W_MM, Math.min(sliceH_px * mmPerPx, PAGE_H_MM));
        yPx += sliceH_px; isFirst = false;
      }

      pdf.save(`${typeLabel}_${form.nom}.pdf`);
      saveToHistory({ module: 'french-letters', type: typeLabel, title: `${typeLabel} — ${form.prenom} ${form.nom}` });
      onSave();
    } catch (err) {
      console.error('PDF export error:', err);
    }
    setLoading('');
  }

  async function handleDocx() {
    setLoading('docx');
    await exportFrenchDocToDocx(
      form.objet || typeLabel, `${form.prenom} ${form.nom}`, form.adresse, form.ville,
      form.email, form.telephone, form.destinataire, form.titreDestinataire,
      form.organisation, form.adresseDestinataire, body, displayDate,
      `${typeLabel}_${form.nom}`
    );
    saveToHistory({ module: 'french-letters', type: typeLabel, title: `${typeLabel} — ${form.prenom} ${form.nom}` });
    onSave(); setLoading('');
  }

  return (
    <div className="animate-fadeIn fl-page" style={{ padding: '28px 40px' }}>
      <div className="section-header">
        <div className="section-icon" style={{ background: '#f5f3ff' }}>
          <span style={{ fontSize: 22 }}>📝</span>
        </div>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f2744', margin: 0 }}>الرسائل الفرنسية الرسمية</h2>
          <p style={{ color: '#64748b', fontSize: 13, margin: 0, fontFamily: 'Inter, sans-serif' }}>Lettres Officielles en Français — نماذج جاهزة</p>
        </div>
      </div>

      {/* Type selector */}
      <div className="fl-type-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {letterTypes.map(lt => (
          <button key={lt.id} onClick={() => set('type', lt.id)}
            style={{
              background: form.type === lt.id ? '#f5f3ff' : 'white',
              border: form.type === lt.id ? '2px solid #7c3aed' : '1.5px solid #e2e8f0',
              borderRadius: 12, padding: '16px', cursor: 'pointer', textAlign: 'center',
              transition: 'all 0.15s', fontFamily: 'Inter, sans-serif',
            }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{lt.icon}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: form.type === lt.id ? '#7c3aed' : '#0f2744', marginBottom: 4 }}>
              {getDocTypeLabel(lt.id, 'fr')}
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.4 }}>{lt.desc}</div>
          </button>
        ))}
      </div>

      <div className="fl-layout" style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 28, alignItems: 'start' }}>
        {/* Form */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#7c3aed', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            👤 Expéditeur
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Prénom</label>
              <input className="form-input" value={form.prenom} onChange={e => set('prenom', e.target.value)} style={{ fontFamily: 'Inter, sans-serif' }} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Nom</label>
              <input className="form-input" value={form.nom} onChange={e => set('nom', e.target.value)} style={{ fontFamily: 'Inter, sans-serif' }} />
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <div className="form-group">
              <label className="form-label">Adresse</label>
              <input className="form-input" value={form.adresse} onChange={e => set('adresse', e.target.value)} style={{ fontFamily: 'Inter, sans-serif' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Ville</label>
                <input className="form-input" value={form.ville} onChange={e => set('ville', e.target.value)} style={{ fontFamily: 'Inter, sans-serif' }} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Téléphone</label>
                <input className="form-input" value={form.telephone} onChange={e => set('telephone', e.target.value)} style={{ fontFamily: 'Inter, sans-serif' }} />
              </div>
            </div>
            <div className="form-group" style={{ marginTop: 10 }}>
              <label className="form-label">Email</label>
              <input className="form-input" value={form.email} onChange={e => set('email', e.target.value)} type="email" style={{ fontFamily: 'Inter, sans-serif' }} />
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '8px 0 14px' }} />
          <div style={{ fontWeight: 700, fontSize: 13, color: '#7c3aed', marginBottom: 14 }}>🏛️ Destinataire</div>

          <div className="form-group">
            <label className="form-label">Titre</label>
            <input className="form-input" value={form.titreDestinataire} onChange={e => set('titreDestinataire', e.target.value)} style={{ fontFamily: 'Inter, sans-serif' }} placeholder="Monsieur le Directeur" />
          </div>
          <div className="form-group">
            <label className="form-label">Nom du destinataire</label>
            <input className="form-input" value={form.destinataire} onChange={e => set('destinataire', e.target.value)} style={{ fontFamily: 'Inter, sans-serif' }} />
          </div>
          <div className="form-group">
            <label className="form-label">Organisation / Établissement</label>
            <input className="form-input" value={form.organisation} onChange={e => set('organisation', e.target.value)} style={{ fontFamily: 'Inter, sans-serif' }} />
          </div>
          <div className="form-group">
            <label className="form-label">Adresse destinataire</label>
            <input className="form-input" value={form.adresseDestinataire} onChange={e => set('adresseDestinataire', e.target.value)} style={{ fontFamily: 'Inter, sans-serif' }} />
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '8px 0 14px' }} />
          <div style={{ fontWeight: 700, fontSize: 13, color: '#7c3aed', marginBottom: 14 }}>📄 Contenu</div>

          <div className="form-group">
            <label className="form-label">Objet</label>
            <input className="form-input" value={form.objet} onChange={e => set('objet', e.target.value)} style={{ fontFamily: 'Inter, sans-serif' }} placeholder="Objet de la lettre" />
          </div>

          {/* Type-specific fields */}
          {form.type === 'demande-stage' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Type de stage</label>
                <input className="form-input" value={form.stageType} onChange={e => set('stageType', e.target.value)} style={{ fontFamily: 'Inter, sans-serif' }} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Durée</label>
                <input className="form-input" value={form.stageDuration} onChange={e => set('stageDuration', e.target.value)} style={{ fontFamily: 'Inter, sans-serif' }} />
              </div>
            </div>
          )}

          {form.type === 'lettre-demission' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Poste actuel</label>
                <input className="form-input" value={form.poste} onChange={e => set('poste', e.target.value)} style={{ fontFamily: 'Inter, sans-serif' }} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Préavis</label>
                <input className="form-input" value={form.noticePeriod} onChange={e => set('noticePeriod', e.target.value)} style={{ fontFamily: 'Inter, sans-serif' }} />
              </div>
            </div>
          )}

          <div className="form-group" style={{ marginTop: 10 }}>
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Corps personnalisé (optionnel)</span>
              <span style={{ color: '#94a3b8', fontSize: 11 }}>laissez vide pour auto</span>
            </label>
            <textarea className="form-textarea" value={form.corps} onChange={e => set('corps', e.target.value)} style={{ fontFamily: 'Inter, sans-serif' }} rows={4} placeholder="Personnalisez le contenu ici, ou laissez vide pour utiliser le modèle automatique..." />
          </div>

          <div className="form-group">
            <label className="form-label">Date</label>
            <input className="form-input" type="date" value={form.date} onChange={e => set('date', e.target.value)} style={{ fontFamily: 'Inter, sans-serif' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setPreview(!preview)}>
              {preview ? '📝 Retour Formulaire' : '👁️ Aperçu Lettre'}
            </button>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button className="btn btn-danger" style={{ justifyContent: 'center' }} onClick={handlePDF} disabled={!!loading}>
                {loading === 'pdf' ? <span className="spinner" /> : '📥'} PDF
              </button>
              <button className="btn btn-success" style={{ justifyContent: 'center' }} onClick={handleDocx} disabled={!!loading}>
                {loading === 'docx' ? <span className="spinner" /> : '📄'} Word
              </button>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="fl-preview-scroll" style={{ overflow: 'auto' }}>
          {preview ? (
            <LetterPreview form={form} body={body} displayDate={displayDate} typeLabel={typeLabel} ref={previewRef} />
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minHeight: 500, background: '#f8fafc', borderRadius: 12,
              border: '2px dashed #e2e8f0', flexDirection: 'column', gap: 12,
            }}>
              <span style={{ fontSize: 48, opacity: 0.3 }}>📝</span>
              <p style={{ color: '#94a3b8', fontSize: 14, fontFamily: 'Inter, sans-serif' }}>Cliquez "Aperçu" pour voir votre lettre</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const LetterPreview = forwardRef<HTMLDivElement, { form: FrenchLetterForm; body: string; displayDate: string; typeLabel: string }>(
  ({ form, body, displayDate, typeLabel }, ref) => (
    <div ref={ref} className="doc-preview doc-preview-a4" dir="ltr" style={{ fontFamily: 'Inter, sans-serif', fontSize: 12.5 }}>
      {/* Top stripe */}
      <div style={{ height: 5, background: 'linear-gradient(90deg, #0f2744, #7c3aed, #c8962c)', margin: '-20mm -25mm 0', marginBottom: 28 }} />

      {/* Header grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        {/* Sender */}
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: '#0f2744', marginBottom: 4 }}>
            {form.prenom} {form.nom}
          </div>
          {form.adresse && <div style={{ color: '#475569', fontSize: 12 }}>{form.adresse}</div>}
          {form.ville && <div style={{ color: '#475569', fontSize: 12 }}>{form.ville}</div>}
          {form.telephone && <div style={{ color: '#475569', fontSize: 12 }}>📞 {form.telephone}</div>}
          {form.email && <div style={{ color: '#475569', fontSize: 12 }}>✉ {form.email}</div>}
        </div>
        {/* Recipient */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 700, color: '#0f2744', marginBottom: 4 }}>{form.titreDestinataire}</div>
          {form.destinataire && <div style={{ color: '#0f2744' }}>{form.destinataire}</div>}
          {form.organisation && <div style={{ color: '#475569', fontSize: 12 }}>{form.organisation}</div>}
          {form.adresseDestinataire && <div style={{ color: '#475569', fontSize: 12 }}>{form.adresseDestinataire}</div>}
        </div>
      </div>

      {/* Date & location */}
      <div style={{ textAlign: 'right', marginBottom: 24, fontSize: 12, color: '#475569' }}>
        {form.ville}, le {displayDate}
      </div>

      {/* Objet */}
      <div style={{ marginBottom: 24 }}>
        <span style={{ fontWeight: 800, textDecoration: 'underline', color: '#0f2744' }}>Objet : </span>
        <span style={{ fontWeight: 700, color: '#0f2744' }}>{form.objet || typeLabel}</span>
      </div>

      {/* Salutation */}
      <div style={{ marginBottom: 20, fontWeight: 600 }}>
        {form.titreDestinataire || 'Madame, Monsieur'},
      </div>

      {/* Body */}
      <div style={{ lineHeight: 1.85, textAlign: 'justify', whiteSpace: 'pre-wrap', color: '#1e293b' }}>
        {body}
      </div>

      {/* Closing */}
      <div style={{ marginTop: 28, lineHeight: 1.8 }}>
        <p style={{ margin: 0 }}>
          Dans l'attente d'une réponse favorable de votre part, je vous prie d'agréer, {form.titreDestinataire || 'Madame/Monsieur'}, l'expression de mes salutations distinguées.
        </p>
      </div>

      {/* Signature */}
      <div style={{ marginTop: 40, display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ textAlign: 'center', minWidth: 180 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{form.prenom} {form.nom}</div>
          <div style={{ height: 48, borderBottom: '1px solid #475569', display: 'block' }} />
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Signature</div>
        </div>
      </div>

      {/* Bottom stripe */}
      <div style={{ height: 4, background: 'linear-gradient(90deg, #c8962c, #7c3aed)', margin: '28px -25mm -20mm' }} />
    </div>
  )
);
