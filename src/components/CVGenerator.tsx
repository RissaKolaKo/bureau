import { useState, useRef, useCallback } from 'react';
import { CVData, CVTemplate, CVEducation, CVExperience } from '../types';
import { exportCVToPDF } from '../utils/exportPdf';
import { exportCVToDocx } from '../utils/exportDocx';
import { saveToHistory } from '../utils/storage';
import { forwardRef } from 'react';

const defaultCV: CVData = {
  template: 'classic',
  nom: '', prenom: '', dateNaissance: '', nationalite: 'Marocain(e)',
  email: '', telephone: '', adresse: '', ville: '',
  profil: '',
  formation: [{ id: '1', degree: '', institution: '', year: '', description: '' }],
  experience: [{ id: '1', title: '', company: '', period: '', description: '' }],
  competences: [''],
  langues: [{ langue: 'Arabe', niveau: 'Langue maternelle' }, { langue: 'Français', niveau: 'Courant' }],
  loisirs: [''],
};

/* ── Color themes for CV ── */
interface CVColors {
  primary: string;    // Header/sidebar background
  accent: string;     // Section titles, highlights
  text: string;       // Body text
  textLight: string;  // Secondary text
  bg: string;         // Page background
  sideText: string;   // Sidebar text color
}

const CV_THEMES: { id: string; name: string; colors: CVColors }[] = [
  { id: 'navy', name: '🔵 Navy', colors: { primary: '#0f2744', accent: '#c8962c', text: '#1e293b', textLight: '#475569', bg: '#ffffff', sideText: '#ffffff' } },
  { id: 'forest', name: '🟢 Forêt', colors: { primary: '#14532d', accent: '#16a34a', text: '#1e293b', textLight: '#475569', bg: '#ffffff', sideText: '#ffffff' } },
  { id: 'burgundy', name: '🔴 Bordeaux', colors: { primary: '#7f1d1d', accent: '#dc2626', text: '#1e293b', textLight: '#475569', bg: '#ffffff', sideText: '#ffffff' } },
  { id: 'charcoal', name: '⬛ Charbon', colors: { primary: '#1c1917', accent: '#78716c', text: '#1e293b', textLight: '#475569', bg: '#ffffff', sideText: '#ffffff' } },
  { id: 'ocean', name: '🌊 Océan', colors: { primary: '#0c4a6e', accent: '#0891b2', text: '#1e293b', textLight: '#475569', bg: '#ffffff', sideText: '#ffffff' } },
  { id: 'purple', name: '🟣 Violet', colors: { primary: '#4c1d95', accent: '#7c3aed', text: '#1e293b', textLight: '#475569', bg: '#ffffff', sideText: '#ffffff' } },
  { id: 'gold', name: '🟡 Or', colors: { primary: '#92400e', accent: '#d97706', text: '#1e293b', textLight: '#475569', bg: '#fffbeb', sideText: '#ffffff' } },
  { id: 'slate', name: '🩶 Ardoise', colors: { primary: '#334155', accent: '#64748b', text: '#1e293b', textLight: '#475569', bg: '#f8fafc', sideText: '#ffffff' } },
];

const LEVELS = ['Langue maternelle', 'Courant', 'Avancé', 'Intermédiaire', 'Débutant'];

export default function CVGenerator({ onSave }: { onSave: () => void }) {
  const [cv, setCV] = useState<CVData>(defaultCV);
  const [photo, setPhoto] = useState<string | null>(null);
  const [tab, setTab] = useState<'form' | 'preview'>('form');
  const [loading, setLoading] = useState('');
  const [photoHover, setPhotoHover] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState('navy');
  const [customColors, setCustomColors] = useState<CVColors>(CV_THEMES[0].colors);
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeColors: CVColors = customColors;

  function applyTheme(themeId: string) {
    const theme = CV_THEMES.find(t => t.id === themeId);
    if (theme) { setSelectedTheme(themeId); setCustomColors(theme.colors); }
  }

  const setField = (k: keyof CVData, v: any) => setCV(c => ({ ...c, [k]: v }));

  // Photo upload handler
  const handlePhotoUpload = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => setPhoto(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handlePhotoUpload(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handlePhotoUpload(f);
  };

  // Education helpers
  const addEdu = () => setCV(c => ({ ...c, formation: [...c.formation, { id: Date.now().toString(), degree: '', institution: '', year: '', description: '' }] }));
  const removeEdu = (id: string) => setCV(c => ({ ...c, formation: c.formation.filter(e => e.id !== id) }));
  const setEdu = (id: string, k: keyof CVEducation, v: string) =>
    setCV(c => ({ ...c, formation: c.formation.map(e => e.id === id ? { ...e, [k]: v } : e) }));

  // Experience helpers
  const addExp = () => setCV(c => ({ ...c, experience: [...c.experience, { id: Date.now().toString(), title: '', company: '', period: '', description: '' }] }));
  const removeExp = (id: string) => setCV(c => ({ ...c, experience: c.experience.filter(e => e.id !== id) }));
  const setExp = (id: string, k: keyof CVExperience, v: string) =>
    setCV(c => ({ ...c, experience: c.experience.map(e => e.id === id ? { ...e, [k]: v } : e) }));

  async function handlePDF() {
    setLoading('pdf');
    try {
      // Ensure preview tab is active so previewRef.current is mounted
      setTab('preview');
      // Wait two animation frames for React to commit the tab change
      await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      await new Promise<void>(r => setTimeout(r, 400));

      const node = previewRef.current;
      if (!node) throw new Error('Preview element not found');

      await exportCVToPDF(
        node,
        `CV_${cv.prenom}_${cv.nom}`,
        activeColors.bg || '#ffffff'
      );

      saveToHistory({ module: 'cv-generator', type: cv.template, title: `CV — ${cv.prenom} ${cv.nom}` });
      onSave();
    } catch (err) {
      console.error('CV PDF export error:', err);
    }
    setLoading('');
  }

  async function handleDocx() {
    setLoading('docx');
    await exportCVToDocx(cv, `CV_${cv.prenom}_${cv.nom}`);
    saveToHistory({ module: 'cv-generator', type: cv.template, title: `CV — ${cv.prenom} ${cv.nom}` });
    onSave(); setLoading('');
  }

  return (
    <div className="animate-fadeIn cv-page" style={{ padding: '28px 40px' }}>
      {/* Header */}
      <div className="section-header">
        <div className="section-icon" style={{ background: '#f0fdf4' }}>
          <span style={{ fontSize: 22 }}>📄</span>
        </div>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f2744', margin: 0 }}>مولّد السيرة الذاتية</h2>
          <p style={{ color: '#64748b', fontSize: 13, margin: 0, fontFamily: 'Inter, sans-serif' }}>Générateur de CV Professionnel en Français</p>
        </div>
      </div>

      {/* Template Selector + Actions */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 24 }}>
        <div className="cv-template-selector" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: '#475569' }}>Modèle :</span>
          {(['classic', 'modern', 'professional'] as CVTemplate[]).map(t => (
            <button key={t} onClick={() => setField('template', t)}
              style={{
                padding: '8px 18px', borderRadius: 8,
                border: cv.template === t ? `2px solid ${activeColors.primary}` : '1.5px solid #e2e8f0',
                background: cv.template === t ? `${activeColors.primary}12` : 'white',
                color: cv.template === t ? activeColors.primary : '#475569',
                fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              }}>
              {t === 'classic' ? '📋 Classique' : t === 'modern' ? '✨ Moderne' : '💼 Professionnel'}
            </button>
          ))}
        </div>
        {/* Color Theme Row */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
          <span style={{ fontWeight: 700, fontSize: 12, color: '#475569' }}>🎨 Thème couleur :</span>
          {CV_THEMES.map(theme => (
            <button key={theme.id} onClick={() => applyTheme(theme.id)} title={theme.name}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 20, border: selectedTheme === theme.id ? `2px solid ${theme.colors.primary}` : '1.5px solid #e2e8f0', background: selectedTheme === theme.id ? `${theme.colors.primary}12` : 'white', cursor: 'pointer', fontFamily: 'Inter,sans-serif', fontSize: 11, fontWeight: 700, color: selectedTheme === theme.id ? theme.colors.primary : '#64748b' }}>
              <span style={{ width: 14, height: 14, borderRadius: '50%', background: theme.colors.primary, display: 'inline-block', flexShrink: 0 }} />
              {theme.name.split(' ').slice(1).join(' ')}
            </button>
          ))}
          {/* Custom color pickers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 'auto' }}>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>خلفية:</span>
            <input type="color" value={customColors.primary} onChange={e => { setCustomColors(c => ({...c, primary: e.target.value})); setSelectedTheme('custom'); }}
              style={{ width: 28, height: 28, borderRadius: 6, border: '1.5px solid #e2e8f0', cursor: 'pointer', padding: 2 }} />
            <span style={{ fontSize: 11, color: '#94a3b8' }}>تمييز:</span>
            <input type="color" value={customColors.accent} onChange={e => { setCustomColors(c => ({...c, accent: e.target.value})); setSelectedTheme('custom'); }}
              style={{ width: 28, height: 28, borderRadius: 6, border: '1.5px solid #e2e8f0', cursor: 'pointer', padding: 2 }} />
            <span style={{ fontSize: 11, color: '#94a3b8' }}>نص:</span>
            <input type="color" value={customColors.text} onChange={e => { setCustomColors(c => ({...c, text: e.target.value})); setSelectedTheme('custom'); }}
              style={{ width: 28, height: 28, borderRadius: 6, border: '1.5px solid #e2e8f0', cursor: 'pointer', padding: 2 }} />
            <span style={{ fontSize: 11, color: '#94a3b8' }}>صفحة:</span>
            <input type="color" value={customColors.bg} onChange={e => { setCustomColors(c => ({...c, bg: e.target.value})); setSelectedTheme('custom'); }}
              style={{ width: 28, height: 28, borderRadius: 6, border: '1.5px solid #e2e8f0', cursor: 'pointer', padding: 2 }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <div style={{ display: 'flex', gap: 2, background: '#f1f5f9', borderRadius: 8, padding: 3 }}>
            {(['form', 'preview'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{
                  padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  background: tab === t ? 'white' : 'transparent',
                  fontWeight: tab === t ? 700 : 500,
                  color: tab === t ? '#0f2744' : '#64748b',
                  fontSize: 13,
                  boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                }}>
                {t === 'form' ? '📝 Formulaire' : '👁️ Aperçu'}
              </button>
            ))}
          </div>
          <button className="btn btn-danger" onClick={handlePDF} disabled={!!loading} style={{ padding: '6px 14px' }}>
            {loading === 'pdf' ? <span className="spinner" /> : '📥'} PDF
          </button>
          <button className="btn btn-success" onClick={handleDocx} disabled={!!loading} style={{ padding: '6px 14px' }}>
            {loading === 'docx' ? <span className="spinner" /> : '📄'} Word
          </button>
        </div>
      </div>

      {tab === 'form' ? (
        <div className="cv-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* ── Personal Info + Photo ── */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0f2744', marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid #059669' }}>
              👤 Informations Personnelles
            </div>

            {/* Photo Upload */}
            <div style={{ display: 'flex', gap: 18, marginBottom: 18, alignItems: 'flex-start' }}>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={onDrop}
                onDragOver={e => e.preventDefault()}
                onMouseEnter={() => setPhotoHover(true)}
                onMouseLeave={() => setPhotoHover(false)}
                style={{
                  width: 100, height: 120, borderRadius: 10, flexShrink: 0, cursor: 'pointer',
                  border: photo ? 'none' : `2px dashed ${photoHover ? '#059669' : '#cbd5e1'}`,
                  background: photo ? 'transparent' : (photoHover ? '#f0fdf4' : '#f8fafc'),
                  overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative', transition: 'all 0.2s',
                  boxShadow: photo ? '0 2px 12px rgba(0,0,0,0.12)' : 'none',
                }}>
                {photo ? (
                  <>
                    <img src={photo} alt="Photo CV" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{
                      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      opacity: photoHover ? 1 : 0, transition: 'opacity 0.2s',
                    }}>
                      <span style={{ fontSize: 20 }}>📷</span>
                      <span style={{ fontSize: 10, color: 'white', fontWeight: 700, marginTop: 4 }}>Changer</span>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '0 8px' }}>
                    <div style={{ fontSize: 28, marginBottom: 4 }}>📷</div>
                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, lineHeight: 1.4 }}>
                      Photo<br />professionnelle
                    </div>
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFileChange} />

              <div style={{ flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Prénom</label>
                    <input className="form-input" value={cv.prenom} onChange={e => setField('prenom', e.target.value)} style={{ fontFamily: 'Inter, sans-serif' }} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Nom</label>
                    <input className="form-input" value={cv.nom} onChange={e => setField('nom', e.target.value)} style={{ fontFamily: 'Inter, sans-serif' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Date de Naissance</label>
                    <input className="form-input" type="date" value={cv.dateNaissance} onChange={e => setField('dateNaissance', e.target.value)} style={{ fontFamily: 'Inter, sans-serif' }} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Nationalité</label>
                    <input className="form-input" value={cv.nationalite} onChange={e => setField('nationalite', e.target.value)} style={{ fontFamily: 'Inter, sans-serif' }} />
                  </div>
                </div>
                {photo && (
                  <button onClick={() => setPhoto(null)} style={{ marginTop: 8, fontSize: 11, color: '#dc2626', background: '#fff1f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    🗑 Supprimer la photo
                  </button>
                )}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Email</label>
              <input className="form-input" value={cv.email} onChange={e => setField('email', e.target.value)} style={{ fontFamily: 'Inter, sans-serif' }} type="email" />
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Téléphone</label>
              <input className="form-input" value={cv.telephone} onChange={e => setField('telephone', e.target.value)} style={{ fontFamily: 'Inter, sans-serif' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Adresse</label>
                <input className="form-input" value={cv.adresse} onChange={e => setField('adresse', e.target.value)} style={{ fontFamily: 'Inter, sans-serif' }} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Ville</label>
                <input className="form-input" value={cv.ville} onChange={e => setField('ville', e.target.value)} style={{ fontFamily: 'Inter, sans-serif' }} />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0, marginTop: 12 }}>
              <label className="form-label">Profil / Objectif professionnel</label>
              <textarea className="form-textarea" value={cv.profil} onChange={e => setField('profil', e.target.value)} style={{ fontFamily: 'Inter, sans-serif' }} rows={3} placeholder="Brève description professionnelle..." />
            </div>
          </div>

          {/* ── Skills & Languages ── */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0f2744', marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid #059669' }}>
              🎯 Compétences & Langues
            </div>
            <div style={{ fontWeight: 600, fontSize: 12, color: '#475569', marginBottom: 8 }}>Compétences</div>
            {cv.competences.map((comp, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input className="form-input" value={comp} onChange={e => {
                  const arr = [...cv.competences]; arr[i] = e.target.value; setField('competences', arr);
                }} style={{ fontFamily: 'Inter, sans-serif' }} placeholder={`Compétence ${i + 1}`} />
                <button onClick={() => setField('competences', cv.competences.filter((_, j) => j !== i))}
                  style={{ padding: '0 10px', border: '1px solid #fca5a5', borderRadius: 6, background: '#fff1f2', color: '#dc2626', cursor: 'pointer', fontSize: 16 }}>✕</button>
              </div>
            ))}
            <button onClick={() => setField('competences', [...cv.competences, ''])}
              style={{ border: '1.5px dashed #bbf7d0', background: 'transparent', color: '#059669', borderRadius: 8, padding: '6px 16px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, marginBottom: 20 }}>
              + Ajouter compétence
            </button>

            <div style={{ fontWeight: 600, fontSize: 12, color: '#475569', marginBottom: 8 }}>Langues</div>
            {cv.langues.map((lang, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginBottom: 8 }}>
                <input className="form-input" value={lang.langue} onChange={e => {
                  const arr = [...cv.langues]; arr[i] = { ...arr[i], langue: e.target.value }; setField('langues', arr);
                }} style={{ fontFamily: 'Inter, sans-serif' }} placeholder="Langue" />
                <select className="form-select" value={lang.niveau} onChange={e => {
                  const arr = [...cv.langues]; arr[i] = { ...arr[i], niveau: e.target.value }; setField('langues', arr);
                }} style={{ fontFamily: 'Inter, sans-serif' }}>
                  {LEVELS.map(l => <option key={l}>{l}</option>)}
                </select>
                <button onClick={() => setField('langues', cv.langues.filter((_, j) => j !== i))}
                  style={{ padding: '0 10px', border: '1px solid #fca5a5', borderRadius: 6, background: '#fff1f2', color: '#dc2626', cursor: 'pointer', fontSize: 16 }}>✕</button>
              </div>
            ))}
            <button onClick={() => setField('langues', [...cv.langues, { langue: '', niveau: 'Intermédiaire' }])}
              style={{ border: '1.5px dashed #bbf7d0', background: 'transparent', color: '#059669', borderRadius: 8, padding: '6px 16px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600 }}>
              + Ajouter langue
            </button>

            <div style={{ fontWeight: 600, fontSize: 12, color: '#475569', marginBottom: 8, marginTop: 20 }}>Centres d'intérêt / Loisirs</div>
            {cv.loisirs.map((l, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input className="form-input" value={l} onChange={e => {
                  const arr = [...cv.loisirs]; arr[i] = e.target.value; setField('loisirs', arr);
                }} style={{ fontFamily: 'Inter, sans-serif' }} placeholder={`Loisir / Intérêt ${i + 1}`} />
                <button onClick={() => setField('loisirs', cv.loisirs.filter((_, j) => j !== i))}
                  style={{ padding: '0 10px', border: '1px solid #fca5a5', borderRadius: 6, background: '#fff1f2', color: '#dc2626', cursor: 'pointer', fontSize: 16 }}>✕</button>
              </div>
            ))}
            <button onClick={() => setField('loisirs', [...cv.loisirs, ''])}
              style={{ border: '1.5px dashed #bbf7d0', background: 'transparent', color: '#059669', borderRadius: 8, padding: '6px 16px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600 }}>
              + Ajouter loisir
            </button>
          </div>

          {/* ── Formation ── */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0f2744', marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid #059669' }}>
              🎓 Formation
            </div>
            {cv.formation.map((edu, i) => (
              <div key={edu.id} style={{ background: '#f8fafc', borderRadius: 10, padding: 14, marginBottom: 12, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontWeight: 600, fontSize: 12, color: '#64748b' }}>Formation {i + 1}</span>
                  {cv.formation.length > 1 && (
                    <button onClick={() => removeEdu(edu.id)} style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 18 }}>🗑</button>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 8 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Diplôme / Niveau</label>
                    <input className="form-input" value={edu.degree} onChange={e => setEdu(edu.id, 'degree', e.target.value)} style={{ fontFamily: 'Inter, sans-serif' }} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Année</label>
                    <input className="form-input" value={edu.year} onChange={e => setEdu(edu.id, 'year', e.target.value)} style={{ fontFamily: 'Inter, sans-serif' }} placeholder="2020–2023" />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Établissement</label>
                  <input className="form-input" value={edu.institution} onChange={e => setEdu(edu.id, 'institution', e.target.value)} style={{ fontFamily: 'Inter, sans-serif' }} />
                </div>
              </div>
            ))}
            <button onClick={addEdu} style={{ border: '1.5px dashed #bbf7d0', background: 'transparent', color: '#059669', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, width: '100%' }}>
              + Ajouter formation
            </button>
          </div>

          {/* ── Experience ── */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0f2744', marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid #059669' }}>
              💼 Expérience Professionnelle
            </div>
            {cv.experience.map((exp, i) => (
              <div key={exp.id} style={{ background: '#f8fafc', borderRadius: 10, padding: 14, marginBottom: 12, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontWeight: 600, fontSize: 12, color: '#64748b' }}>Expérience {i + 1}</span>
                  {cv.experience.length > 1 && (
                    <button onClick={() => removeExp(exp.id)} style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 18 }}>🗑</button>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Poste</label>
                    <input className="form-input" value={exp.title} onChange={e => setExp(exp.id, 'title', e.target.value)} style={{ fontFamily: 'Inter, sans-serif' }} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Entreprise</label>
                    <input className="form-input" value={exp.company} onChange={e => setExp(exp.id, 'company', e.target.value)} style={{ fontFamily: 'Inter, sans-serif' }} />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 8 }}>
                  <label className="form-label">Période</label>
                  <input className="form-input" value={exp.period} onChange={e => setExp(exp.id, 'period', e.target.value)} style={{ fontFamily: 'Inter, sans-serif' }} placeholder="Jan 2022 – Déc 2023" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Description des missions</label>
                  <textarea className="form-textarea" value={exp.description} onChange={e => setExp(exp.id, 'description', e.target.value)} style={{ fontFamily: 'Inter, sans-serif' }} rows={2} />
                </div>
              </div>
            ))}
            <button onClick={addExp} style={{ border: '1.5px dashed #bbf7d0', background: 'transparent', color: '#059669', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, width: '100%' }}>
              + Ajouter expérience
            </button>
          </div>
        </div>
      ) : (
        <div className="cv-preview-scroll" style={{ overflow: 'auto', background: '#e2e8f0', padding: 24, borderRadius: 12, marginTop: 4 }}>
          <CVPreview cv={cv} photo={photo} colors={activeColors} ref={previewRef} />
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── PREVIEW ROUTER ─────────────────────────── */
const CVPreview = forwardRef<HTMLDivElement, { cv: CVData; photo: string | null; colors: CVColors }>(({ cv, photo, colors }, ref) => {
  if (cv.template === 'modern') return <CVModern cv={cv} photo={photo} colors={colors} ref={ref} />;
  if (cv.template === 'professional') return <CVProfessional cv={cv} photo={photo} colors={colors} ref={ref} />;
  return <CVClassic cv={cv} photo={photo} colors={colors} ref={ref} />;
});

/* ─────────────────────────── CLASSIC TEMPLATE ─────────────────────────── */
const CVClassic = forwardRef<HTMLDivElement, { cv: CVData; photo: string | null; colors: CVColors }>(({ cv, photo, colors }, ref) => (
  <div ref={ref} className="doc-preview doc-preview-a4" dir="ltr" style={{ fontFamily: 'Inter, sans-serif', background: colors.bg, overflow: 'hidden' }}>
    {/* Colored top stripe */}
    <div style={{ height: 6, background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})`, margin: '-20mm -25mm 20px' }} />
    {/* Header */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 24, borderBottom: `3px solid ${colors.primary}`, paddingBottom: 20, marginBottom: 24 }}>
      {photo && (
        <img src={photo} alt="Photo" style={{ width: 88, height: 105, objectFit: 'cover', borderRadius: 6, border: '3px solid #e2e8f0', flexShrink: 0 }} />
      )}
      <div style={{ flex: 1 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: colors.primary, margin: '0 0 6px' }}>
          {cv.prenom} {cv.nom}
        </h1>
        <div style={{ color: colors.textLight, fontSize: 12.5, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {cv.email && <span>✉ {cv.email}</span>}
          {cv.telephone && <span>📞 {cv.telephone}</span>}
          {cv.ville && <span>📍 {cv.adresse ? `${cv.adresse}, ` : ''}{cv.ville}</span>}
          {cv.dateNaissance && <span>🎂 Né(e) le {cv.dateNaissance}</span>}
          {cv.nationalite && <span>🌍 {cv.nationalite}</span>}
        </div>
      </div>
    </div>

    {cv.profil && (
      <ClassicSection title="PROFIL PROFESSIONNEL" colors={colors}>
        <p style={{ lineHeight: 1.7, fontSize: 12.5, textAlign: 'justify', margin: 0, color: colors.text }}>{cv.profil}</p>
      </ClassicSection>
    )}

    {cv.experience.some(e => e.title) && (
      <ClassicSection title="EXPÉRIENCE PROFESSIONNELLE" colors={colors}>
        {cv.experience.filter(e => e.title).map(exp => (
          <div key={exp.id} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <strong style={{ fontSize: 13.5, color: colors.primary }}>{exp.title}</strong>
              <span style={{ fontSize: 11.5, color: colors.textLight, fontStyle: 'italic' }}>{exp.period}</span>
            </div>
            <div style={{ fontSize: 12, color: colors.accent, fontWeight: 600, marginBottom: 3 }}>{exp.company}</div>
            {exp.description && <p style={{ fontSize: 12.5, lineHeight: 1.65, margin: 0, color: colors.text, textAlign: 'justify' }}>{exp.description}</p>}
          </div>
        ))}
      </ClassicSection>
    )}

    {cv.formation.some(e => e.degree) && (
      <ClassicSection title="FORMATION" colors={colors}>
        {cv.formation.filter(e => e.degree).map(edu => (
          <div key={edu.id} style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <strong style={{ fontSize: 13.5, color: colors.primary, display: 'block' }}>{edu.degree}</strong>
              <span style={{ fontSize: 12, color: colors.textLight, fontStyle: 'italic' }}>{edu.institution}</span>
            </div>
            <span style={{ fontSize: 11.5, color: colors.textLight, flexShrink: 0, marginLeft: 12 }}>{edu.year}</span>
          </div>
        ))}
      </ClassicSection>
    )}

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      {cv.competences.some(c => c) && (
        <ClassicSection title="COMPÉTENCES" colors={colors}>
          {cv.competences.filter(c => c).map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, fontSize: 12.5 }}>
              <span style={{ color: colors.accent, fontSize: 10 }}>◆</span> {c}
            </div>
          ))}
        </ClassicSection>
      )}
      <div>
        {cv.langues.some(l => l.langue) && (
          <ClassicSection title="LANGUES" colors={colors}>
            {cv.langues.filter(l => l.langue).map((l, i) => (
              <div key={i} style={{ marginBottom: 6, fontSize: 12.5 }}>
                <strong>{l.langue}</strong> — <span style={{ color: '#64748b' }}>{l.niveau}</span>
              </div>
            ))}
          </ClassicSection>
        )}
        {cv.loisirs.some(l => l) && (
          <ClassicSection title="CENTRES D'INTÉRÊT" colors={colors}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {cv.loisirs.filter(l => l).map((l, i) => (
                <span key={i} style={{ background: '#f1f5f9', borderRadius: 20, padding: '2px 10px', fontSize: 11.5, color: '#475569', border: '1px solid #e2e8f0' }}>{l}</span>
              ))}
            </div>
          </ClassicSection>
        )}
      </div>
    </div>
  </div>
));

function ClassicSection({ title, children, colors }: { title: string; children: React.ReactNode; colors?: CVColors }) {
  const primary = colors?.primary || '#0f2744';
  const accent = colors?.accent || '#c8962c';
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', color: primary, borderBottom: `2px solid ${accent}`, paddingBottom: 5, marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

/* ─────────────────────────── MODERN TEMPLATE ─────────────────────────── */
const CVModern = forwardRef<HTMLDivElement, { cv: CVData; photo: string | null; colors: CVColors }>(({ cv, photo, colors }, ref) => (
  <div ref={ref} className="doc-preview doc-preview-a4" dir="ltr" style={{
    fontFamily: 'Inter, sans-serif',
    padding: 0,
    display: 'flex',
    flexDirection: 'row',
    width: '210mm',
    height: '297mm',
    overflow: 'hidden',
    background: colors.bg,
    boxSizing: 'border-box',
  }}>
    {/* Sidebar — background directly on this div, no absolute layer needed */}
    <div style={{
      width: 220,
      minWidth: 220,
      maxWidth: 220,
      backgroundColor: colors.primary,
      color: colors.sideText,
      padding: '36px 20px',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      alignSelf: 'stretch',
      boxSizing: 'border-box',
    }}>
      {/* Photo */}
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
        {photo ? (
          <img src={photo} alt="Photo" style={{ width: 90, height: 90, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.3)' }} />
        ) : (
          <div style={{ width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, border: '3px solid rgba(255,255,255,0.2)' }}>
            {cv.prenom?.[0]?.toUpperCase()}{cv.nom?.[0]?.toUpperCase()}
          </div>
        )}
      </div>

      <h2 style={{ fontSize: 15, fontWeight: 800, textAlign: 'center', margin: '0 0 3px', color: colors.sideText }}>{cv.prenom}</h2>
      <h2 style={{ fontSize: 15, fontWeight: 800, textAlign: 'center', margin: '0 0 24px', color: colors.accent }}>{cv.nom}</h2>

      <ModernSideSection title="CONTACT" accent={colors.accent}>
        {cv.email && <ModernSideItem icon="✉" text={cv.email} />}
        {cv.telephone && <ModernSideItem icon="📞" text={cv.telephone} />}
        {cv.ville && <ModernSideItem icon="📍" text={cv.ville} />}
        {cv.dateNaissance && <ModernSideItem icon="🎂" text={`Né(e) le ${cv.dateNaissance}`} />}
        {cv.nationalite && <ModernSideItem icon="🌍" text={cv.nationalite} />}
      </ModernSideSection>

      {cv.langues.some(l => l.langue) && (
        <ModernSideSection title="LANGUES" accent={colors.accent}>
          {cv.langues.filter(l => l.langue).map((l, i) => (
            <div key={i} style={{ marginBottom: 7 }}>
              <div style={{ fontSize: 11, fontWeight: 700 }}>{l.langue}</div>
              <div style={{ fontSize: 10, color: '#94a3b8' }}>{l.niveau}</div>
              <div style={{ height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2, marginTop: 3 }}>
                <div style={{ height: '100%', borderRadius: 2, background: colors.accent, width: levelToWidth(l.niveau) }} />
              </div>
            </div>
          ))}
        </ModernSideSection>
      )}

      {cv.competences.some(c => c) && (
        <ModernSideSection title="COMPÉTENCES" accent={colors.accent}>
          {cv.competences.filter(c => c).map((c, i) => (
            <div key={i} style={{ fontSize: 11, marginBottom: 5, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
              <span style={{ color: colors.accent, flexShrink: 0, marginTop: 1 }}>▸</span>
              <span style={{ lineHeight: 1.4 }}>{c}</span>
            </div>
          ))}
        </ModernSideSection>
      )}

      {cv.loisirs.some(l => l) && (
        <ModernSideSection title="LOISIRS" accent={colors.accent}>
          {cv.loisirs.filter(l => l).map((l, i) => (
            <div key={i} style={{ fontSize: 11, marginBottom: 4, display: 'flex', gap: 6 }}>
              <span style={{ color: colors.accent }}>•</span> {l}
            </div>
          ))}
        </ModernSideSection>
      )}
    </div>

    {/* Main Content */}
    <div style={{
      flex: 1,
      padding: '32px 28px',
      overflow: 'hidden',
      backgroundColor: colors.bg,
      boxSizing: 'border-box',
      alignSelf: 'stretch',
    }}>
      {cv.profil && (
        <div style={{ backgroundColor: hexToRgba(colors.primary, 0.06), borderRadius: 8, padding: '12px 16px', marginBottom: 22, borderLeft: `4px solid ${colors.accent}` }}>
          <p style={{ lineHeight: 1.7, fontSize: 12.5, textAlign: 'justify', margin: 0, color: colors.text }}>{cv.profil}</p>
        </div>
      )}

      {cv.experience.some(e => e.title) && (
        <ModernMainSection title="EXPÉRIENCE PROFESSIONNELLE" colors={colors}>
          {cv.experience.filter(e => e.title).map(exp => (
            <div key={exp.id} style={{ marginBottom: 14, paddingLeft: 12, borderLeft: `2px solid ${colors.accent}40` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <strong style={{ fontSize: 13, color: colors.primary }}>{exp.title}</strong>
                <span style={{ fontSize: 11, color: '#64748b', background: '#f1f5f9', padding: '1px 8px', borderRadius: 20, flexShrink: 0, marginLeft: 8 }}>{exp.period}</span>
              </div>
              <div style={{ fontSize: 11.5, color: colors.accent, fontWeight: 700, marginBottom: 3 }}>{exp.company}</div>
              {exp.description && <p style={{ fontSize: 11.5, lineHeight: 1.6, margin: 0, color: '#475569' }}>{exp.description}</p>}
            </div>
          ))}
        </ModernMainSection>
      )}

      {cv.formation.some(e => e.degree) && (
        <ModernMainSection title="FORMATION" colors={colors}>
          {cv.formation.filter(e => e.degree).map(edu => (
            <div key={edu.id} style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ paddingLeft: 12, borderLeft: `2px solid ${colors.accent}40` }}>
                <strong style={{ fontSize: 13, color: colors.primary, display: 'block' }}>{edu.degree}</strong>
                <span style={{ fontSize: 11.5, color: '#475569', fontStyle: 'italic' }}>{edu.institution}</span>
              </div>
              <span style={{ fontSize: 11, color: '#64748b', background: '#f1f5f9', padding: '2px 10px', borderRadius: 20, flexShrink: 0, marginLeft: 12 }}>{edu.year}</span>
            </div>
          ))}
        </ModernMainSection>
      )}
    </div>
  </div>
));

function ModernSideSection({ title, children, accent }: { title: string; children: React.ReactNode; accent?: string }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: accent || '#e8b84b', marginBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: 4 }}>{title}</div>
      {children}
    </div>
  );
}
function ModernSideItem({ icon, text }: { icon: string; text: string }) {
  return <div style={{ fontSize: 10.5, marginBottom: 6, display: 'flex', gap: 7, alignItems: 'flex-start', lineHeight: 1.4, wordBreak: 'break-word' }}><span style={{ flexShrink: 0 }}>{icon}</span><span>{text}</span></div>;
}
function ModernMainSection({ title, children, colors }: { title: string; children: React.ReactNode; colors?: CVColors }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: colors?.primary || '#0f2744', borderBottom: `2px solid ${colors?.accent || '#e8b84b'}`, paddingBottom: 4, marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

/* ─────────────────────────── PROFESSIONAL TEMPLATE ─────────────────────────── */
const CVProfessional = forwardRef<HTMLDivElement, { cv: CVData; photo: string | null; colors: CVColors }>(({ cv, photo, colors }, ref) => (
  <div ref={ref} className="doc-preview doc-preview-a4" dir="ltr" style={{ fontFamily: 'Inter, sans-serif', position: 'relative', background: colors.bg, overflow: 'hidden' }}>
    {/* Top bar — spans full width via negative margin to overcome A4 padding */}
    <div style={{ height: 8, background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})`, margin: '-20mm -25mm 0', marginBottom: 24 }} />

    {/* Name + Photo block */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
      <div style={{ flex: 1 }}>
        <h1 style={{ fontSize: 30, fontWeight: 300, color: colors.primary, margin: '0 0 4px', letterSpacing: '-0.5px' }}>
          {cv.prenom} <strong style={{ fontWeight: 800 }}>{cv.nom}</strong>
        </h1>
        {cv.nationalite && <div style={{ color: colors.textLight, fontSize: 12, marginBottom: 2 }}>🌍 {cv.nationalite}</div>}
        {cv.dateNaissance && <div style={{ color: colors.textLight, fontSize: 12 }}>🎂 Né(e) le {cv.dateNaissance}</div>}
        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 12, color: colors.textLight }}>
          {cv.email && <div>✉ {cv.email}</div>}
          {cv.telephone && <div>📞 {cv.telephone}</div>}
          {(cv.adresse || cv.ville) && <div>📍 {[cv.adresse, cv.ville].filter(Boolean).join(', ')}</div>}
        </div>
      </div>
      {photo && (
        <img src={photo} alt="Photo" style={{ width: 95, height: 110, objectFit: 'cover', borderRadius: 8, border: '3px solid #e2e8f0', marginLeft: 24, flexShrink: 0 }} />
      )}
    </div>

    <div style={{ height: 1, background: '#e2e8f0', marginBottom: 20 }} />

      {cv.profil && (
        <div style={{ background: '#f8fafc', borderRight: `4px solid ${colors.accent}`, padding: '12px 16px', borderRadius: '0 8px 8px 0', marginBottom: 22 }}>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: colors.text, textAlign: 'justify' }}>{cv.profil}</p>
        </div>
      )}

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 28 }}>
      <div>
        {cv.experience.some(e => e.title) && (
          <div style={{ marginBottom: 22 }}>
            <ProfTitle colors={colors}>Expérience Professionnelle</ProfTitle>
            {cv.experience.filter(e => e.title).map(exp => (
              <div key={exp.id} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <strong style={{ fontSize: 13, color: colors.primary }}>{exp.title}</strong>
                  <span style={{ fontSize: 11, color: colors.accent, fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>{exp.period}</span>
                </div>
                <div style={{ fontSize: 12, color: colors.accent, fontWeight: 500 }}>{exp.company}</div>
                {exp.description && <p style={{ fontSize: 12, lineHeight: 1.65, margin: '4px 0 0', color: colors.text, textAlign: 'justify' }}>{exp.description}</p>}
              </div>
            ))}
          </div>
        )}

        {cv.formation.some(e => e.degree) && (
          <div>
            <ProfTitle colors={colors}>Formation</ProfTitle>
            {cv.formation.filter(e => e.degree).map(edu => (
              <div key={edu.id} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <strong style={{ fontSize: 13, color: colors.primary }}>{edu.degree}</strong>
                  <span style={{ fontSize: 11, color: colors.accent, fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>{edu.year}</span>
                </div>
                <div style={{ fontSize: 12, color: colors.textLight, fontStyle: 'italic' }}>{edu.institution}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        {cv.competences.some(c => c) && (
          <div style={{ marginBottom: 20 }}>
            <ProfTitle colors={colors}>Compétences</ProfTitle>
            {cv.competences.filter(c => c).map((c, i) => (
              <div key={i} style={{ fontSize: 12, marginBottom: 6, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: colors.accent, flexShrink: 0, marginTop: 4 }} />
                {c}
              </div>
            ))}
          </div>
        )}

        {cv.langues.some(l => l.langue) && (
          <div style={{ marginBottom: 20 }}>
            <ProfTitle colors={colors}>Langues</ProfTitle>
            {cv.langues.filter(l => l.langue).map((l, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <strong>{l.langue}</strong>
                  <span style={{ color: colors.textLight, fontSize: 11 }}>{l.niveau}</span>
                </div>
                <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, marginTop: 4 }}>
                  <div style={{ height: '100%', borderRadius: 2, background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})`, width: levelToWidth(l.niveau) }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {cv.loisirs.some(l => l) && (
          <div>
            <ProfTitle colors={colors}>Centres d'intérêt</ProfTitle>
            {cv.loisirs.filter(l => l).map((l, i) => (
              <div key={i} style={{ fontSize: 12, marginBottom: 5, display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ color: colors.accent, fontSize: 10 }}>◆</span> {l}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>

    {/* Bottom bar — spans full width */}
    <div style={{ height: 8, background: `linear-gradient(90deg, ${colors.accent}, ${colors.primary})`, margin: '24px -25mm -20mm' }} />
  </div>
));

function ProfTitle({ children, colors }: { children: React.ReactNode; colors?: CVColors }) {
  const primary = colors?.primary || '#0f2744';
  return (
    <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.08em', color: primary, textTransform: 'uppercase', borderBottom: `1.5px solid ${primary}`, paddingBottom: 4, marginBottom: 10 }}>
      {children}
    </div>
  );
}

function levelToWidth(level: string): string {
  const map: Record<string, string> = {
    'Langue maternelle': '100%', 'Courant': '85%', 'Avancé': '70%',
    'Intermédiaire': '50%', 'Débutant': '25%',
  };
  return map[level] || '50%';
}

/** Convert hex color + alpha to rgba() string — works in html2canvas */
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
