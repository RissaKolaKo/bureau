import { PublicWriterForm, FrenchLetterForm } from '../types';

/* ── Kept for backward compatibility with other modules ── */
export function generateDocumentContent(form: PublicWriterForm): string {
  // PublicWriter now uses its own template engine with applyTemplate()
  // This function is kept for history/storage references only
  return form.details || '';
}

export function generateArabicDocBody(form: PublicWriterForm): string {
  return generateDocumentContent(form);
}

/* ══════════════════════════════════════════════════════════════
   FRENCH LETTER GENERATOR
   ══════════════════════════════════════════════════════════════ */
export function generateFrenchLetterBody(form: FrenchLetterForm): string {
  const { poste, organisation, stageType, stageDuration, stageStartDate, noticePeriod, objet, corps } = form;

  switch (form.type) {
    case 'demande-stage':
      return `J'ai l'honneur de solliciter auprès de votre estimée institution l'opportunité d'effectuer un stage ${stageType || 'de formation professionnelle'} au sein de vos services${stageDuration ? `, d'une durée de ${stageDuration}` : ''}${stageStartDate ? `, à compter du ${stageStartDate}` : ''}.

Actuellement en cours de formation dans le domaine concerné, je suis particulièrement motivé(e) par l'idée d'intégrer votre structure, reconnue pour son expertise et son dynamisme professionnel.

${corps || "Ce stage me permettrait de mettre en pratique les acquis théoriques de ma formation, de développer des compétences pratiques au contact de professionnels chevronnés, et de contribuer modestement au bon fonctionnement de vos services."}

Je reste à votre entière disposition pour tout entretien ou complément d'information que vous souhaiteriez obtenir. Vous trouverez ci-joint mon curriculum vitæ ainsi que toutes les pièces justificatives nécessaires.

Dans l'espoir que ma candidature retiendra votre bienveillante attention, je vous prie d'agréer, l'expression de mes respectueuses salutations.`;

    case 'lettre-demission':
      return `Par la présente, j'ai l'honneur de vous informer de ma décision irrévocable de mettre fin à mes fonctions de ${poste || '...'} au sein de ${organisation || 'votre organisation'}.

Conformément aux dispositions du Code du travail marocain (loi n° 65-99) et aux clauses de mon contrat de travail, je m'engage à respecter un préavis de ${noticePeriod || '...'} à compter de la réception de la présente lettre.

${corps || "Je tiens à vous exprimer ma sincère gratitude pour la confiance que vous m'avez accordée tout au long de cette collaboration et pour les opportunités de développement professionnel qui m'ont été offertes."}

Je m'engage à assurer une passation de poste dans les meilleures conditions, et à transmettre l'ensemble des dossiers et informations nécessaires à la continuité du service.

Je vous prie de bien vouloir accuser réception de la présente démission et de m'en délivrer une attestation de travail à l'issue de mon préavis.`;

    case 'demande-administrative':
      return `J'ai l'honneur de porter à votre haute attention la présente demande relative à : ${objet || '...'}.

En application des dispositions légales en vigueur et compte tenu de ma situation personnelle, je me permets de solliciter respectueusement votre bienveillante intervention.

${corps || "Je vous serais infiniment reconnaissant(e) de bien vouloir examiner ma demande avec toute la diligence requise, et de m'apporter une réponse dans les meilleurs délais."}

Je tiens à votre disposition l'ensemble des pièces justificatives nécessaires à l'instruction de ce dossier, et reste disponible pour tout renseignement complémentaire.

Veuillez agréer, l'expression de ma haute considération.`;

    case 'lettre-officielle':
      return `J'ai l'honneur de vous soumettre la présente lettre officielle concernant : ${objet || '...'}.

${corps || "Veuillez trouver ci-joint l'ensemble des pièces justificatives nécessaires à l'examen de ce dossier."}

Je me tiens à votre entière disposition pour tout renseignement complémentaire, et vous prie de croire en l'assurance de ma considération distinguée.`;

    default:
      return corps || '';
  }
}

/* ══════════════════════════════════════════════════════════════
   LABELS
   ══════════════════════════════════════════════════════════════ */
export function getDocTypeLabel(type: string, lang: 'ar' | 'fr' = 'ar'): string {
  const labels: Record<string, { ar: string; fr: string }> = {
    'declaration-honneur':    { ar: 'تصريح بالشرف',          fr: "Déclaration sur l'Honneur" },
    'procuration':            { ar: 'وكالة خاصة',            fr: 'Procuration / Mandat Spécial' },
    'contrat-deux-parties':   { ar: 'عقد بين طرفين',         fr: 'Contrat entre Deux Parties' },
    'engagement-ecrit':       { ar: 'التزام كتابي',          fr: 'Engagement Écrit' },
    'reconnaissance-dette':   { ar: 'إقرار بدين',            fr: 'Reconnaissance de Dette' },
    'contrat-location':       { ar: 'عقد كراء',              fr: 'Contrat de Location' },
    'administrative-request': { ar: 'طلب إداري',             fr: 'Demande Administrative' },
    'official-letter-ar':     { ar: 'مراسلة رسمية عربية',   fr: 'Lettre Officielle Arabe' },
    'official-letter-fr':     { ar: 'مراسلة رسمية فرنسية',  fr: 'Lettre Officielle Française' },
    'demande-stage':          { ar: 'طلب تدريب',             fr: 'Demande de Stage' },
    'lettre-demission':       { ar: 'رسالة استقالة',         fr: 'Lettre de Démission' },
    'demande-administrative': { ar: 'طلب إداري',             fr: 'Demande Administrative' },
    'lettre-officielle':      { ar: 'رسالة رسمية',           fr: 'Lettre Officielle' },
  };
  return labels[type]?.[lang] || type;
}

export function getTodayMoroccan(): string {
  return new Date().toLocaleDateString('fr-MA', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}
