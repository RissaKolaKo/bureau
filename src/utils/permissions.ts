/**
 * Centralized Role-Based Permission System
 * 
 * superadmin → EVERYTHING (all modules + general settings)
 * admin      → users management, templates, approve/reject members — NO general settings
 * editor     → only assigned modules (no admin panel)
 * user       → only assigned modules (no admin panel)
 */

export type AppRole = 'superadmin' | 'admin' | 'editor' | 'user';
export type Permission =
  | 'general-settings'      // superadmin ONLY
  | 'user-management'       // admin + superadmin
  | 'registration-manager'  // admin + superadmin
  | 'template-manager'      // admin + superadmin
  | 'public-writer'
  | 'cv-generator'
  | 'cin-scanner'
  | 'french-letters'
  | 'admin-procedures'
  | 'invoice-generator'
  | 'export-pdf'
  | 'export-word'
  | 'view-history';

/** Permissions granted by ROLE (role-level, not user-level overrides) */
const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  superadmin: [
    'general-settings',
    'user-management',
    'registration-manager',
    'template-manager',
    'public-writer',
    'cv-generator',
    'cin-scanner',
    'french-letters',
    'admin-procedures',
    'invoice-generator',
    'export-pdf',
    'export-word',
    'view-history',
  ],
  admin: [
    // NO 'general-settings' — admin cannot access general settings
    'user-management',
    'registration-manager',
    'template-manager',
    'public-writer',
    'cv-generator',
    'cin-scanner',
    'french-letters',
    'admin-procedures',
    'invoice-generator',
    'export-pdf',
    'export-word',
    'view-history',
  ],
  editor: [
    'public-writer',
    'cv-generator',
    'cin-scanner',
    'french-letters',
    'admin-procedures',
    'invoice-generator',
    'export-pdf',
    'export-word',
    'view-history',
  ],
  user: [
    'public-writer',
    'cv-generator',
    'cin-scanner',
    'french-letters',
    'admin-procedures',
    'invoice-generator',
    'export-pdf',
    'export-word',
    'view-history',
  ],
};

/** Check if a role has a specific permission */
export function roleHas(role: AppRole, permission: Permission | string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission as Permission) ?? false;
}

/** Check if a role can access the admin section */
export function isAdminRole(role: AppRole): boolean {
  return role === 'superadmin' || role === 'admin';
}

/** Check if a role can access General Settings */
export function canAccessGeneralSettings(role: AppRole): boolean {
  return role === 'superadmin';
}

/** Check if a role can manage users */
export function canManageUsers(role: AppRole): boolean {
  return role === 'superadmin' || role === 'admin';
}

/** Check if a role can manage templates */
export function canManageTemplates(role: AppRole): boolean {
  return role === 'superadmin' || role === 'admin';
}

/** Check if a role can approve/reject registrations */
export function canManageRegistrations(role: AppRole): boolean {
  return role === 'superadmin' || role === 'admin';
}

/** Get all permissions for a role */
export function getRolePermissions(role: AppRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/** Role display info */
export const ROLE_INFO: Record<AppRole, { label: string; labelFr: string; icon: string; color: string; description: string }> = {
  superadmin: {
    label: 'مدير عام',
    labelFr: 'Super Administrateur',
    icon: '👑',
    color: '#c8962c',
    description: 'صلاحيات كاملة شاملة الإعدادات العامة',
  },
  admin: {
    label: 'مدير',
    labelFr: 'Administrateur',
    icon: '🏛️',
    color: '#3b82f6',
    description: 'إدارة الأعضاء والنماذج — بدون الإعدادات العامة',
  },
  editor: {
    label: 'محرر',
    labelFr: 'Éditeur',
    icon: '✍️',
    color: '#10b981',
    description: 'الوصول للوحدات فقط',
  },
  user: {
    label: 'مستخدم',
    labelFr: 'Utilisateur',
    icon: '👤',
    color: '#64748b',
    description: 'وصول محدود حسب الصلاحيات',
  },
};

/** Navigation items with required permissions */
export interface NavItemDef {
  id: string;
  icon: string;
  labelAr: string;
  labelFr: string;
  color: string;
  requiredPermission?: Permission;
  requiredRole?: AppRole; // minimum role required
  badge?: boolean;
  section: 'modules' | 'admin' | 'superadmin';
}

export const NAV_ITEMS: NavItemDef[] = [
  // ── MODULES (all authenticated users) ──────────────────────
  { id:'dashboard',            icon:'🏠', labelAr:'الرئيسية',          labelFr:'Tableau de Bord',        color:'#94a3b8', section:'modules' },
  { id:'public-writer',        icon:'✍️', labelAr:'كاتب عمومي',         labelFr:'Rédacteur Public',       color:'#60a5fa', section:'modules', requiredPermission:'public-writer' },
  { id:'cv-generator',         icon:'📄', labelAr:'مولّد السيرة',        labelFr:'Générateur CV',          color:'#34d399', section:'modules', requiredPermission:'cv-generator' },
  { id:'cin-scanner',          icon:'🪪', labelAr:'Scan Studio',        labelFr:'Scanner CIN',            color:'#f59e0b', section:'modules', requiredPermission:'cin-scanner' },
  { id:'french-letters',       icon:'📝', labelAr:'رسائل فرنسية',       labelFr:'Lettres Françaises',     color:'#a78bfa', section:'modules', requiredPermission:'french-letters' },
  { id:'admin-procedures',     icon:'🏛️', labelAr:'المساطر الإدارية',   labelFr:'Procédures Admin',       color:'#f87171', section:'modules', requiredPermission:'admin-procedures' },
  { id:'invoice-generator',    icon:'🧾', labelAr:'الفواتير والحسابات', labelFr:'Factures & Devis',       color:'#10b981', section:'modules', requiredPermission:'invoice-generator' },

  // ── ADMIN (admin + superadmin) ──────────────────────────────
  { id:'user-management',      icon:'👥', labelAr:'إدارة المستخدمين',   labelFr:'Gestion Utilisateurs',   color:'#38bdf8', section:'admin', requiredPermission:'user-management' },
  { id:'registration-manager', icon:'📬', labelAr:'طلبات التسجيل',      labelFr:"Demandes d'inscription", color:'#fb923c', section:'admin', requiredPermission:'registration-manager', badge:true },

  // ── SUPERADMIN ONLY ─────────────────────────────────────────
  { id:'general-settings',     icon:'⚙️', labelAr:'الإعدادات العامة',   labelFr:'Paramètres Généraux',    color:'#c8962c', section:'superadmin', requiredPermission:'general-settings' },
];
