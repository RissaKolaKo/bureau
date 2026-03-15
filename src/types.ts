export type Module = 'dashboard' | 'public-writer' | 'cv-generator' | 'cin-scanner' | 'french-letters' | 'admin-procedures' | 'user-management' | 'registration-manager' | 'invoice-generator' | 'homepage-control' | 'general-settings';

export interface DocRecord {
  id: string;
  type: string;
  title: string;
  module: Module;
  createdAt: string;
  content?: string;
}

/* ══════════════════════════════════════════════════════════════
   PUBLIC WRITER — Phase 1 Document Types
   ══════════════════════════════════════════════════════════════ */
export type PublicDocType =
  | 'declaration-honneur'   // تصريح بالشرف
  | 'procuration'           // وكالة خاصة
  | 'contrat-deux-parties'  // عقد بين طرفين
  | 'engagement-ecrit'      // التزام كتابي
  | 'reconnaissance-dette'  // إقرار بدين
  | 'contrat-location'      // عقد كراء
  | 'administrative-request'
  | 'official-letter-ar'
  | 'official-letter-fr';

/* ── Person block (used for Party 1 & Party 2) ── */
export interface PersonBlock {
  fullName: string;
  cin: string;
  address: string;
  city: string;
  dateOfBirth: string;
  phone: string;
}

/* ── Template clause ── */
export interface CustomClause {
  id: string;
  text: string;
}

/* ── Template definition (admin-configurable) ── */
export interface TemplateDefinition {
  id: string;
  docType: PublicDocType;
  name: string;
  nameFr: string;
  icon: string;
  color: string;
  category: 'single-party' | 'two-parties';
  enabled: boolean;
  legalRef: string;
  fields: FieldConfig[];
  defaultClauses: string[];
}

export interface FieldConfig {
  key: string;
  label: string;
  labelFr: string;
  type: 'text' | 'number' | 'date' | 'textarea' | 'select';
  required?: boolean;
  placeholder?: string;
  options?: string[];
}

/* ── Main form ── */
export interface PublicWriterForm {
  docType: PublicDocType;
  language: 'ar' | 'fr';
  // Party 1
  party1: PersonBlock;
  // Party 2 (for two-party documents)
  party2: PersonBlock;
  // Document fields
  subject: string;
  amount: string;
  duration: string;
  customClauses: CustomClause[];
  date: string;
  city: string;
  // Legacy fields kept for French letter
  recipient?: string;
  recipientTitle?: string;
  details?: string;
  // Rental specific
  propertyAddress?: string;
  monthlyRent?: string;
  depositAmount?: string;
  // Debt specific
  debtDescription?: string;
  repaymentDate?: string;
}

/* ── Validation error ── */
export interface FormError {
  field: string;
  message: string;
}

// CV Generator
export type CVTemplate = 'classic' | 'modern' | 'professional';

export interface CVEducation {
  id: string;
  degree: string;
  institution: string;
  year: string;
  description?: string;
}

export interface CVExperience {
  id: string;
  title: string;
  company: string;
  period: string;
  description: string;
}

export interface CVData {
  template: CVTemplate;
  nom: string;
  prenom: string;
  dateNaissance: string;
  nationalite: string;
  email: string;
  telephone: string;
  adresse: string;
  ville: string;
  photo?: string;
  profil: string;
  formation: CVEducation[];
  experience: CVExperience[];
  competences: string[];
  langues: { langue: string; niveau: string }[];
  loisirs: string[];
}

// CIN Scanner
export interface CINData {
  frontImage: string | null;
  backImage: string | null;
  frontCropped: string | null;
  backCropped: string | null;
}

// French Letters
export type FrenchLetterType =
  | 'demande-stage'
  | 'lettre-demission'
  | 'demande-administrative'
  | 'lettre-officielle';

export interface FrenchLetterForm {
  type: FrenchLetterType;
  nom: string;
  prenom: string;
  adresse: string;
  ville: string;
  email: string;
  telephone: string;
  destinataire: string;
  titreDestinataire: string;
  organisation: string;
  adresseDestinataire: string;
  objet: string;
  corps: string;
  date: string;
  stageType?: string;
  stageDuration?: string;
  stageStartDate?: string;
  poste?: string;
  dateDebut?: string;
  noticePeriod?: string;
}

// AI Research
export interface ResearchForm {
  title: string;
  subject: string;
  language: 'ar' | 'fr';
  keywords: string;
  sections: number;
  includeImages: boolean;
  apiKey: string;
}

export interface ResearchSection {
  title: string;
  content: string;
  imageUrl?: string;
}

export interface ResearchOutput {
  title: string;
  introduction: string;
  sections: ResearchSection[];
  conclusion: string;
  language: 'ar' | 'fr';
}
