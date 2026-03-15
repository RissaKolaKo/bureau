/* ═══════════════════════════════════════════════════════════════
   USER DATABASE — localStorage-based persistent storage
   Full CRUD, password hashing, session management, audit logs
   ═══════════════════════════════════════════════════════════════ */

export type UserRole = 'superadmin' | 'admin' | 'editor' | 'viewer';
export type UserStatus = 'active' | 'suspended' | 'pending';
export type AuthProvider = 'local' | 'google' | 'email-link';
export type RegistrationStatus = 'pending' | 'approved' | 'rejected';

export interface RegistrationRequest {
  id: string;
  username: string;
  passwordHash: string;
  name: string;
  nameFr: string;
  email: string;
  phone: string;
  avatar: string;
  provider: AuthProvider;
  googleId?: string;
  googlePicture?: string;
  requestedRole: UserRole;
  status: RegistrationStatus;
  requestedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason: string;
  notes: string;
  ipAddress: string;
  userAgent: string;
}

export interface AppUser {
  id: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  name: string;
  nameFr: string;
  email: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
  lastLogin: string | null;
  loginCount: number;
  avatar: string; // emoji
  permissions: Permission[];
  notes: string;
  sessionTimeout: number; // minutes
}

export type Permission =
  | 'public-writer'
  | 'cv-generator'
  | 'cin-scanner'
  | 'french-letters'
  | 'admin-procedures'
  | 'user-management'
  | 'view-history'
  | 'export-pdf'
  | 'export-docx'
  | 'template-editor'
  | 'system-settings';

export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  target: string;
  detail: string;
  timestamp: string;
  ip: string;
  success: boolean;
}

export interface ActiveSession {
  userId: string;
  username: string;
  role: UserRole;
  name: string;
  nameFr: string;
  email: string;
  avatar: string;
  provider: AuthProvider;
  permissions: Permission[];
  loginAt: string;
  expiresAt: string;
  sessionId: string;
}

/* ── Simple hash (not crypto — browser-only app) ── */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'H' + Math.abs(hash).toString(36).toUpperCase() + str.length.toString(36);
}

/* ── Generate ID ── */
function genId(prefix = 'U'): string {
  return prefix + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

/* ── Default permissions per role ── */
export function defaultPermissions(role: UserRole): Permission[] {
  switch (role) {
    case 'superadmin':
      return ['public-writer','cv-generator','cin-scanner','french-letters','admin-procedures','user-management','view-history','export-pdf','export-docx','template-editor','system-settings'];
    case 'admin':
      return ['public-writer','cv-generator','cin-scanner','french-letters','admin-procedures','user-management','view-history','export-pdf','export-docx','template-editor'];
    case 'editor':
      return ['public-writer','cv-generator','cin-scanner','french-letters','admin-procedures','view-history','export-pdf','export-docx'];
    case 'viewer':
      return ['view-history','admin-procedures'];
    default:
      return [];
  }
}

/* ── Storage keys ── */
const KEYS = {
  USERS: 'mosa_users',
  LOGS:  'mosa_audit_logs',
  SESSION: 'mosa_session',
  SETTINGS: 'mosa_db_settings',
  REGISTRATIONS: 'mosa_registrations',
  NOTIFICATIONS: 'mosa_notifications',
};

/* ═══════════════════════════════
   DEFAULT USERS (first-time init)
   ═══════════════════════════════ */
const DEFAULT_USERS: AppUser[] = [
  {
    id: 'U_SUPERADMIN',
    username: 'superadmin',
    passwordHash: simpleHash('Admin@2024'),
    role: 'superadmin',
    status: 'active',
    name: 'المدير العام',
    nameFr: 'Super Administrateur',
    email: 'admin@bureau.ma',
    phone: '0600000000',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLogin: null,
    loginCount: 0,
    avatar: '👑',
    permissions: defaultPermissions('superadmin'),
    notes: 'Compte système principal — ne pas supprimer',
    sessionTimeout: 480,
  },
  {
    id: 'U_ADMIN',
    username: 'admin',
    passwordHash: simpleHash('admin123'),
    role: 'admin',
    status: 'active',
    name: 'مدير المكتب',
    nameFr: 'Administrateur Bureau',
    email: 'bureau@bureau.ma',
    phone: '0611111111',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLogin: null,
    loginCount: 0,
    avatar: '🏛️',
    permissions: defaultPermissions('admin'),
    notes: '',
    sessionTimeout: 240,
  },
  {
    id: 'U_EDITOR',
    username: 'editor',
    passwordHash: simpleHash('editor123'),
    role: 'editor',
    status: 'active',
    name: 'الكاتب',
    nameFr: 'Éditeur',
    email: 'editeur@bureau.ma',
    phone: '0622222222',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLogin: null,
    loginCount: 0,
    avatar: '✍️',
    permissions: defaultPermissions('editor'),
    notes: '',
    sessionTimeout: 120,
  },
];

/* ═══════════════════════════════
   DATABASE CLASS
   ═══════════════════════════════ */
class UserDatabase {
  /* ── Initialize ── */
  init(): void {
    const raw = localStorage.getItem(KEYS.USERS);
    if (!raw) {
      localStorage.setItem(KEYS.USERS, JSON.stringify(DEFAULT_USERS));
    }
  }

  /* ── Get all users ── */
  getUsers(): AppUser[] {
    this.init();
    try {
      return JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    } catch { return []; }
  }

  /* ── Get user by ID ── */
  getUserById(id: string): AppUser | null {
    return this.getUsers().find(u => u.id === id) || null;
  }

  /* ── Get user by username ── */
  getUserByUsername(username: string): AppUser | null {
    return this.getUsers().find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
  }

  /* ── Save users array ── */
  private saveUsers(users: AppUser[]): void {
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  }

  /* ── Create user ── */
  createUser(data: {
    username: string;
    password: string;
    role: UserRole;
    name: string;
    nameFr: string;
    email: string;
    phone: string;
    avatar: string;
    notes: string;
    sessionTimeout: number;
    permissions?: Permission[];
  }): { success: boolean; error?: string; user?: AppUser } {
    const existing = this.getUserByUsername(data.username);
    if (existing) return { success: false, error: 'اسم المستخدم موجود مسبقاً' };
    if (data.password.length < 6) return { success: false, error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' };

    const user: AppUser = {
      id: genId('U'),
      username: data.username.trim().toLowerCase(),
      passwordHash: simpleHash(data.password),
      role: data.role,
      status: 'active',
      name: data.name,
      nameFr: data.nameFr,
      email: data.email,
      phone: data.phone,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLogin: null,
      loginCount: 0,
      avatar: data.avatar || '👤',
      permissions: data.permissions || defaultPermissions(data.role),
      notes: data.notes || '',
      sessionTimeout: data.sessionTimeout || 120,
    };

    const users = this.getUsers();
    users.push(user);
    this.saveUsers(users);
    this.log('CREATE_USER', 'system', user.id, `Création utilisateur: ${user.username} [${user.role}]`, true);
    return { success: true, user };
  }

  /* ── Update user ── */
  updateUser(id: string, updates: Partial<Omit<AppUser, 'id' | 'passwordHash'>>): { success: boolean; error?: string } {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return { success: false, error: 'المستخدم غير موجود' };

    // Check username conflict
    if (updates.username) {
      const conflict = users.find(u => u.username.toLowerCase() === updates.username!.toLowerCase() && u.id !== id);
      if (conflict) return { success: false, error: 'اسم المستخدم مستخدم من طرف شخص آخر' };
    }

    users[idx] = { ...users[idx], ...updates, updatedAt: new Date().toISOString() };
    this.saveUsers(users);
    this.log('UPDATE_USER', 'system', id, `تعديل المستخدم: ${users[idx].username}`, true);
    return { success: true };
  }

  /* ── Change password ── */
  changePassword(id: string, oldPassword: string, newPassword: string): { success: boolean; error?: string } {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return { success: false, error: 'المستخدم غير موجود' };
    if (users[idx].passwordHash !== simpleHash(oldPassword)) return { success: false, error: 'كلمة المرور القديمة غير صحيحة' };
    if (newPassword.length < 6) return { success: false, error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' };
    users[idx].passwordHash = simpleHash(newPassword);
    users[idx].updatedAt = new Date().toISOString();
    this.saveUsers(users);
    this.log('CHANGE_PASSWORD', 'system', id, `تغيير كلمة المرور: ${users[idx].username}`, true);
    return { success: true };
  }

  /* ── Admin reset password (no old password needed) ── */
  adminResetPassword(id: string, newPassword: string): { success: boolean; error?: string } {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return { success: false, error: 'المستخدم غير موجود' };
    if (newPassword.length < 6) return { success: false, error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' };
    users[idx].passwordHash = simpleHash(newPassword);
    users[idx].updatedAt = new Date().toISOString();
    this.saveUsers(users);
    this.log('ADMIN_RESET_PASSWORD', 'admin', id, `إعادة تعيين كلمة المرور: ${users[idx].username}`, true);
    return { success: true };
  }

  /* ── Toggle suspend ── */
  toggleStatus(id: string): { success: boolean; newStatus?: UserStatus; error?: string } {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return { success: false, error: 'المستخدم غير موجود' };
    if (users[idx].id === 'U_SUPERADMIN') return { success: false, error: 'لا يمكن تعطيل المدير العام' };
    const newStatus: UserStatus = users[idx].status === 'active' ? 'suspended' : 'active';
    users[idx].status = newStatus;
    users[idx].updatedAt = new Date().toISOString();
    this.saveUsers(users);
    this.log('TOGGLE_STATUS', 'admin', id, `${newStatus === 'suspended' ? 'تعطيل' : 'تفعيل'} المستخدم: ${users[idx].username}`, true);
    return { success: true, newStatus };
  }

  /* ── Delete user ── */
  deleteUser(id: string): { success: boolean; error?: string } {
    if (id === 'U_SUPERADMIN') return { success: false, error: 'لا يمكن حذف المدير العام' };
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return { success: false, error: 'المستخدم غير موجود' };
    const username = users[idx].username;
    users.splice(idx, 1);
    this.saveUsers(users);
    this.log('DELETE_USER', 'admin', id, `حذف المستخدم: ${username}`, true);
    return { success: true };
  }

  /* ── Update permissions ── */
  updatePermissions(id: string, permissions: Permission[]): { success: boolean; error?: string } {
    return this.updateUser(id, { permissions });
  }

  /* ═══════════════════════════════
     AUTHENTICATION
     ═══════════════════════════════ */
  login(username: string, password: string): { success: boolean; session?: ActiveSession; error?: string } {
    const user = this.getUserByUsername(username);
    if (!user) {
      this.log('LOGIN_FAIL', 'system', 'unknown', `محاولة دخول فاشلة: ${username}`, false);
      return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
    }
    if (user.status === 'suspended') {
      this.log('LOGIN_BLOCKED', 'system', user.id, `حساب معطّل: ${username}`, false);
      return { success: false, error: 'هذا الحساب معطّل. تواصل مع المدير.' };
    }
    if (user.passwordHash !== simpleHash(password)) {
      this.log('LOGIN_FAIL', 'system', user.id, `كلمة مرور خاطئة: ${username}`, false);
      return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
    }

    // Update login stats
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      users[idx].lastLogin = new Date().toISOString();
      users[idx].loginCount = (users[idx].loginCount || 0) + 1;
      this.saveUsers(users);
    }

    const now = new Date();
    const expires = new Date(now.getTime() + (user.sessionTimeout || 120) * 60 * 1000);
    const session: ActiveSession = {
      userId: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      nameFr: user.nameFr,
      email: user.email,
      avatar: user.avatar,
      provider: (user as AppUser & { provider?: AuthProvider }).provider || 'local',
      permissions: user.permissions,
      loginAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      sessionId: genId('S'),
    };

    sessionStorage.setItem(KEYS.SESSION, JSON.stringify(session));
    this.log('LOGIN_SUCCESS', user.username, user.id, `دخول ناجح: ${username} [${user.role}]`, true);
    return { success: true, session };
  }

  logout(session: ActiveSession | null): void {
    if (session) {
      this.log('LOGOUT', session.username, session.userId, `خروج: ${session.username}`, true);
    }
    sessionStorage.removeItem(KEYS.SESSION);
  }

  getSession(): ActiveSession | null {
    try {
      const raw = sessionStorage.getItem(KEYS.SESSION);
      if (!raw) return null;
      const session: ActiveSession = JSON.parse(raw);
      // Check expiry
      if (new Date() > new Date(session.expiresAt)) {
        sessionStorage.removeItem(KEYS.SESSION);
        return null;
      }
      return session;
    } catch { return null; }
  }

  refreshSession(): void {
    const session = this.getSession();
    if (!session) return;
    const user = this.getUserById(session.userId);
    if (!user) return;
    const expires = new Date(Date.now() + (user.sessionTimeout || 120) * 60 * 1000);
    const refreshed: ActiveSession = { ...session, expiresAt: expires.toISOString() };
    sessionStorage.setItem(KEYS.SESSION, JSON.stringify(refreshed));
  }

  hasPermission(session: ActiveSession | null, permission: Permission): boolean {
    if (!session) return false;
    if (session.role === 'superadmin') return true;
    return session.permissions.includes(permission);
  }

  /* ═══════════════════════════════
     AUDIT LOG
     ═══════════════════════════════ */
  private log(action: string, username: string, target: string, detail: string, success: boolean): void {
    try {
      const logs: AuditLog[] = JSON.parse(localStorage.getItem(KEYS.LOGS) || '[]');
      const entry: AuditLog = {
        id: genId('L'),
        userId: target,
        username,
        action,
        target,
        detail,
        timestamp: new Date().toISOString(),
        ip: 'localhost',
        success,
      };
      logs.unshift(entry);
      // Keep last 500 logs
      if (logs.length > 500) logs.splice(500);
      localStorage.setItem(KEYS.LOGS, JSON.stringify(logs));
    } catch { /* silent */ }
  }

  getLogs(limit = 100): AuditLog[] {
    try {
      const logs: AuditLog[] = JSON.parse(localStorage.getItem(KEYS.LOGS) || '[]');
      return logs.slice(0, limit);
    } catch { return []; }
  }

  clearLogs(): void {
    localStorage.setItem(KEYS.LOGS, '[]');
  }

  /* ── Stats ── */
  getStats() {
    const users = this.getUsers();
    const logs = this.getLogs(500);
    const today = new Date().toDateString();
    return {
      total: users.length,
      active: users.filter(u => u.status === 'active').length,
      suspended: users.filter(u => u.status === 'suspended').length,
      admins: users.filter(u => u.role === 'admin' || u.role === 'superadmin').length,
      editors: users.filter(u => u.role === 'editor').length,
      viewers: users.filter(u => u.role === 'viewer').length,
      todayLogins: logs.filter(l => l.action === 'LOGIN_SUCCESS' && new Date(l.timestamp).toDateString() === today).length,
      failedLogins: logs.filter(l => l.action === 'LOGIN_FAIL').length,
      totalLogins: users.reduce((s, u) => s + (u.loginCount || 0), 0),
    };
  }

  /* ── Export users as JSON ── */
  exportUsers(): string {
    const users = this.getUsers().map(u => ({
      ...u,
      passwordHash: '***',
    }));
    return JSON.stringify(users, null, 2);
  }

  /* ── Reset to defaults ── */
  resetToDefaults(): void {
    localStorage.setItem(KEYS.USERS, JSON.stringify(DEFAULT_USERS));
    localStorage.setItem(KEYS.REGISTRATIONS, JSON.stringify([]));
    this.log('RESET_DB', 'system', 'system', 'إعادة تعيين قاعدة البيانات للإعدادات الافتراضية', true);
  }

  /* ═══════════════════════════════════════════
     REGISTRATION SYSTEM
     ═══════════════════════════════════════════ */

  getRegistrations(): RegistrationRequest[] {
    try {
      return JSON.parse(localStorage.getItem(KEYS.REGISTRATIONS) || '[]');
    } catch { return []; }
  }

  private saveRegistrations(regs: RegistrationRequest[]): void {
    localStorage.setItem(KEYS.REGISTRATIONS, JSON.stringify(regs));
  }

  getPendingRegistrations(): RegistrationRequest[] {
    return this.getRegistrations().filter(r => r.status === 'pending');
  }

  /* Submit a new registration request */
  submitRegistration(data: {
    username: string;
    password?: string;
    name: string;
    nameFr?: string;
    email: string;
    phone?: string;
    provider: AuthProvider;
    googleId?: string;
    googlePicture?: string;
    requestedRole?: UserRole;
    notes?: string;
  }): { success: boolean; error?: string; requestId?: string } {
    // Check existing username
    if (this.getUserByUsername(data.username)) {
      return { success: false, error: 'اسم المستخدم مستخدم بالفعل' };
    }
    // Check existing email in users
    const allUsers = this.getUsers();
    if (data.email && allUsers.find(u => u.email.toLowerCase() === data.email.toLowerCase())) {
      return { success: false, error: 'البريد الإلكتروني مسجل بالفعل' };
    }
    // Check existing pending registration
    const existing = this.getRegistrations();
    if (existing.find(r => r.email.toLowerCase() === data.email.toLowerCase() && r.status === 'pending')) {
      return { success: false, error: 'طلب تسجيل بهذا البريد الإلكتروني قيد المراجعة بالفعل' };
    }

    const req: RegistrationRequest = {
      id: genId('REG'),
      username: (data.username || data.email.split('@')[0]).trim().toLowerCase(),
      passwordHash: data.password ? simpleHash(data.password) : '',
      name: data.name,
      nameFr: data.nameFr || data.name,
      email: data.email,
      phone: data.phone || '',
      avatar: data.googlePicture ? '' : '👤',
      provider: data.provider,
      googleId: data.googleId,
      googlePicture: data.googlePicture,
      requestedRole: data.requestedRole || 'editor',
      status: 'pending',
      requestedAt: new Date().toISOString(),
      reviewedAt: null,
      reviewedBy: null,
      rejectionReason: '',
      notes: data.notes || '',
      ipAddress: 'localhost',
      userAgent: navigator.userAgent.substring(0, 100),
    };

    existing.push(req);
    this.saveRegistrations(existing);
    this.log('REGISTRATION_REQUEST', data.name, req.id, `طلب تسجيل جديد: ${data.email} [${data.provider}]`, true);
    this.addNotification(req);
    return { success: true, requestId: req.id };
  }

  /* Approve a registration */
  approveRegistration(requestId: string, reviewerUsername: string, assignedRole: UserRole): { success: boolean; error?: string } {
    const regs = this.getRegistrations();
    const idx = regs.findIndex(r => r.id === requestId);
    if (idx === -1) return { success: false, error: 'الطلب غير موجود' };

    const req = regs[idx];
    if (req.status !== 'pending') return { success: false, error: 'الطلب تمت مراجعته مسبقاً' };

    // Create the user
    const users = this.getUsers();
    const newUser: AppUser = {
      id: genId('U'),
      username: req.username,
      passwordHash: req.passwordHash || simpleHash(genId('P')),
      role: assignedRole,
      status: 'active',
      name: req.name,
      nameFr: req.nameFr,
      email: req.email,
      phone: req.phone,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLogin: null,
      loginCount: 0,
      avatar: req.googlePicture || req.avatar || '👤',
      permissions: defaultPermissions(assignedRole),
      notes: `مُنشأ من طلب تسجيل [${req.provider}]`,
      sessionTimeout: 120,
    };

    users.push(newUser);
    this.saveUsers(users);

    // Update registration
    regs[idx] = { ...req, status: 'approved', reviewedAt: new Date().toISOString(), reviewedBy: reviewerUsername };
    this.saveRegistrations(regs);
    this.log('APPROVE_REGISTRATION', reviewerUsername, requestId, `قبول طلب: ${req.email} → ${assignedRole}`, true);
    return { success: true };
  }

  /* Reject a registration */
  rejectRegistration(requestId: string, reviewerUsername: string, reason: string): { success: boolean; error?: string } {
    const regs = this.getRegistrations();
    const idx = regs.findIndex(r => r.id === requestId);
    if (idx === -1) return { success: false, error: 'الطلب غير موجود' };
    if (regs[idx].status !== 'pending') return { success: false, error: 'الطلب تمت مراجعته مسبقاً' };

    regs[idx] = {
      ...regs[idx],
      status: 'rejected',
      reviewedAt: new Date().toISOString(),
      reviewedBy: reviewerUsername,
      rejectionReason: reason,
    };
    this.saveRegistrations(regs);
    this.log('REJECT_REGISTRATION', reviewerUsername, requestId, `رفض طلب: ${regs[idx].email} — ${reason}`, true);
    return { success: true };
  }

  /* Notifications */
  private addNotification(req: RegistrationRequest): void {
    try {
      const notifs = JSON.parse(localStorage.getItem(KEYS.NOTIFICATIONS) || '[]');
      notifs.unshift({
        id: genId('N'),
        type: 'registration',
        title: 'طلب تسجيل جديد',
        body: `${req.name} (${req.email}) يطلب الانضمام عبر ${req.provider}`,
        timestamp: new Date().toISOString(),
        read: false,
        requestId: req.id,
      });
      if (notifs.length > 50) notifs.splice(50);
      localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(notifs));
    } catch { /* silent */ }
  }

  getNotifications(): { id:string; type:string; title:string; body:string; timestamp:string; read:boolean; requestId:string }[] {
    try {
      return JSON.parse(localStorage.getItem(KEYS.NOTIFICATIONS) || '[]');
    } catch { return []; }
  }

  markNotificationsRead(): void {
    try {
      const notifs = this.getNotifications().map(n => ({ ...n, read: true }));
      localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(notifs));
    } catch { /* silent */ }
  }

  /* Google OAuth simulation — in real app, replace with Firebase/Supabase */
  loginWithGoogle(googleProfile: {
    googleId: string;
    email: string;
    name: string;
    picture?: string;
  }): { success: boolean; session?: ActiveSession; needsRegistration?: boolean; error?: string } {
    // Check if google user already exists
    const users = this.getUsers();
    const existing = users.find(u => u.email.toLowerCase() === googleProfile.email.toLowerCase());

    if (existing) {
      if (existing.status === 'suspended') {
        return { success: false, error: 'هذا الحساب معطّل. تواصل مع المدير.' };
      }
      // Auto login
      const idx = users.findIndex(u => u.id === existing.id);
      users[idx].lastLogin = new Date().toISOString();
      users[idx].loginCount = (users[idx].loginCount || 0) + 1;
      this.saveUsers(users);

      const now = new Date();
      const expires = new Date(now.getTime() + (existing.sessionTimeout || 120) * 60 * 1000);
      const session: ActiveSession = {
        userId: existing.id, username: existing.username,
        role: existing.role, name: existing.name, nameFr: existing.nameFr,
        email: existing.email, avatar: googleProfile.picture || existing.avatar,
        provider: 'google',
        permissions: existing.permissions,
        loginAt: now.toISOString(), expiresAt: expires.toISOString(),
        sessionId: genId('S'),
      };
      sessionStorage.setItem(KEYS.SESSION, JSON.stringify(session));
      this.log('LOGIN_GOOGLE', existing.username, existing.id, `دخول بجوجل: ${googleProfile.email}`, true);
      return { success: true, session };
    }

    // Check pending registration
    const pendingReg = this.getRegistrations().find(
      r => r.email.toLowerCase() === googleProfile.email.toLowerCase() && r.status === 'pending'
    );
    if (pendingReg) {
      return { success: false, error: 'طلبك قيد المراجعة. سيتم إخطارك عند الموافقة.' };
    }

    // Needs registration
    return { success: false, needsRegistration: true };
  }
}

export const userDB = new UserDatabase();
export { simpleHash };
