/* ═══════════════════════════════════════════════════════════════════════
   AUTH SERVICE v3 — Full Production Auth System
   Re-exports authCore types + implements the AuthDatabase class
   ═══════════════════════════════════════════════════════════════════════ */
export type {
  UserRole, UserStatus, AuthProvider, Permission, RegistrationStatus,
  AppUser, ActiveSession, AuditLog, AuditAction,
  RegistrationRequest, EmailRecord, RateLimitEntry, LoginAttempt,
} from './authCore';

export {
  secureRandom, genId, hashPassword, verifyPassword,
  genResetToken, genCsrfToken, getBrowserFingerprint, getClientInfo,
  checkRateLimit, recordLoginAttempt, defaultPermissions, STORE,
} from './authCore';

import {
  AppUser, ActiveSession, AuditLog, AuditAction,
  RegistrationRequest, EmailRecord, UserRole, UserStatus,
  AuthProvider, Permission,
  secureRandom, genId, hashPassword, verifyPassword,
  genResetToken, genCsrfToken, getBrowserFingerprint, getClientInfo,
  checkRateLimit, recordLoginAttempt, defaultPermissions, STORE,
} from './authCore';

/* ══════════════════════════════════════
   DEFAULT USERS (seeded on first run)
   ══════════════════════════════════════ */
function buildDefaultUsers(): AppUser[] {
  const salt1 = secureRandom(16);
  return [
    {
      id: 'U_SUPERADMIN_001',
      username: 'rissay',
      passwordHash: hashPassword('140989', salt1),
      salt: salt1,
      role: 'superadmin', status: 'active',
      name: 'rissay', nameFr: 'Super Administrateur',
      email: 'rissay@bureau.ma', phone: '0600000000',
      avatar: '👑', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      lastLogin: null, lastLoginIp: '', lastLoginDevice: '', loginCount: 0,
      permissions: defaultPermissions('superadmin'), notes: 'Compte système principal',
      sessionTimeout: 480, provider: 'local', emailVerified: true,
      twoFactorEnabled: false, failedAttempts: 0,
    },
  ];
}

/* ══════════════════════════════════════
   AUTH DATABASE CLASS
   ══════════════════════════════════════ */
class AuthDatabase {

  /* ── Initialization ── */
  init(): void {
    if (!localStorage.getItem(STORE.USERS)) {
      localStorage.setItem(STORE.USERS, JSON.stringify(buildDefaultUsers()));
    }
  }

  /* ══════════════════════
     USER CRUD
     ══════════════════════ */
  getUsers(): AppUser[] {
    this.init();
    try { return JSON.parse(localStorage.getItem(STORE.USERS) || '[]'); }
    catch { return []; }
  }

  private saveUsers(users: AppUser[]): void {
    localStorage.setItem(STORE.USERS, JSON.stringify(users));
  }

  getUserById(id: string): AppUser | null {
    return this.getUsers().find(u => u.id === id) ?? null;
  }

  getUserByEmail(email: string): AppUser | null {
    return this.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase()) ?? null;
  }

  getUserByUsername(username: string): AppUser | null {
    return this.getUsers().find(u => u.username.toLowerCase() === username.toLowerCase()) ?? null;
  }

  getUserByGoogleId(googleId: string): AppUser | null {
    return this.getUsers().find(u => u.googleId === googleId) ?? null;
  }

  /** Public safe lookup — returns only name (for email service) */
  getUserByEmailPublic(email: string): { name: string } | null {
    const u = this.getUserByEmail(email);
    return u ? { name: u.name } : null;
  }

  createUser(data: {
    username: string; password?: string; role: UserRole; name: string; nameFr?: string;
    email: string; phone?: string; avatar?: string; notes?: string; sessionTimeout?: number;
    permissions?: Permission[]; provider?: AuthProvider; googleId?: string;
    googlePicture?: string; emailVerified?: boolean; status?: UserStatus;
  }): { success: boolean; error?: string; user?: AppUser } {
    if (this.getUserByUsername(data.username)) return { success: false, error: 'اسم المستخدم موجود مسبقاً' };
    if (data.email && this.getUserByEmail(data.email)) return { success: false, error: 'البريد الإلكتروني مسجل مسبقاً' };
    if (data.password && data.password.length < 8) return { success: false, error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' };

    const salt = secureRandom(16);
    const user: AppUser = {
      id: genId('U'),
      username: data.username.trim().toLowerCase(),
      passwordHash: data.password ? hashPassword(data.password, salt) : '',
      salt,
      role: data.role, status: data.status ?? 'active',
      name: data.name, nameFr: data.nameFr ?? data.name,
      email: data.email, phone: data.phone ?? '',
      avatar: data.avatar ?? '👤',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      lastLogin: null, lastLoginIp: '', lastLoginDevice: '', loginCount: 0,
      permissions: data.permissions ?? defaultPermissions(data.role),
      notes: data.notes ?? '',
      sessionTimeout: data.sessionTimeout ?? 120,
      provider: data.provider ?? 'local',
      googleId: data.googleId, googlePicture: data.googlePicture,
      emailVerified: data.emailVerified ?? false,
      twoFactorEnabled: false, failedAttempts: 0,
    };
    const users = this.getUsers();
    users.push(user);
    this.saveUsers(users);
    this.log('CREATE_USER', 'system', user.id, `إنشاء حساب: ${user.username} [${user.role}]`, true, 'info');
    return { success: true, user };
  }

  updateUser(id: string, updates: Partial<Omit<AppUser, 'id' | 'passwordHash' | 'salt'>>): { success: boolean; error?: string } {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return { success: false, error: 'المستخدم غير موجود' };
    if (updates.username) {
      const conflict = users.find(u => u.username.toLowerCase() === updates.username!.toLowerCase() && u.id !== id);
      if (conflict) return { success: false, error: 'اسم المستخدم مستخدم' };
    }
    if (updates.email) {
      const conflict = users.find(u => u.email.toLowerCase() === updates.email!.toLowerCase() && u.id !== id);
      if (conflict) return { success: false, error: 'البريد الإلكتروني مستخدم' };
    }
    users[idx] = { ...users[idx], ...updates, updatedAt: new Date().toISOString() };
    this.saveUsers(users);
    this.log('UPDATE_USER', 'system', id, `تعديل: ${users[idx].username}`, true, 'info');
    return { success: true };
  }

  changePassword(id: string, oldPassword: string, newPassword: string): { success: boolean; error?: string } {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return { success: false, error: 'المستخدم غير موجود' };
    if (!verifyPassword(oldPassword, users[idx].salt, users[idx].passwordHash))
      return { success: false, error: 'كلمة المرور الحالية غير صحيحة' };
    if (newPassword.length < 8) return { success: false, error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' };
    users[idx].salt = secureRandom(16);
    users[idx].passwordHash = hashPassword(newPassword, users[idx].salt);
    users[idx].updatedAt = new Date().toISOString();
    this.saveUsers(users);
    this.log('PASSWORD_CHANGE', users[idx].username, id, 'تغيير كلمة المرور', true, 'warning');
    return { success: true };
  }

  adminResetPassword(id: string, newPassword: string, byAdmin: string): { success: boolean; error?: string } {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return { success: false, error: 'المستخدم غير موجود' };
    if (newPassword.length < 8) return { success: false, error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' };
    users[idx].salt = secureRandom(16);
    users[idx].passwordHash = hashPassword(newPassword, users[idx].salt);
    users[idx].updatedAt = new Date().toISOString();
    this.saveUsers(users);
    this.log('ADMIN_RESET_PASSWORD', byAdmin, id, `إعادة تعيين كلمة مرور: ${users[idx].username}`, true, 'warning');
    return { success: true };
  }

  toggleStatus(id: string, byAdmin?: string): { success: boolean; newStatus?: UserStatus; error?: string } {
    if (id === 'U_SUPERADMIN_001') return { success: false, error: 'لا يمكن تعطيل المدير العام' };
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return { success: false, error: 'المستخدم غير موجود' };
    const newStatus: UserStatus = users[idx].status === 'active' ? 'suspended' : 'active';
    users[idx].status = newStatus; users[idx].updatedAt = new Date().toISOString();
    this.saveUsers(users);
    this.log('TOGGLE_STATUS', byAdmin ?? 'admin', id, `${newStatus === 'suspended' ? 'تعطيل' : 'تفعيل'}: ${users[idx].username}`, true, newStatus === 'suspended' ? 'warning' : 'info');
    return { success: true, newStatus };
  }

  deleteUser(id: string, byAdmin?: string): { success: boolean; error?: string } {
    if (id === 'U_SUPERADMIN_001') return { success: false, error: 'لا يمكن حذف المدير العام' };
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return { success: false, error: 'المستخدم غير موجود' };
    const username = users[idx].username;
    users.splice(idx, 1); this.saveUsers(users);
    this.log('DELETE_USER', byAdmin ?? 'admin', id, `حذف: ${username}`, true, 'danger');
    return { success: true };
  }

  updatePermissions(id: string, permissions: Permission[]): { success: boolean; error?: string } {
    const result = this.updateUser(id, { permissions });
    if (result.success) this.log('CHANGE_PERMISSIONS', 'admin', id, `تعديل صلاحيات المستخدم`, true, 'warning');
    return result;
  }

  /* ══════════════════════
     PASSWORD RESET
     ══════════════════════ */
  requestPasswordReset(email: string): {
    success: boolean; error?: string; token?: string; resetUrl?: string;
  } {
    // Rate limit reset requests
    const rl = checkRateLimit(`reset_${email}`);
    if (!rl.allowed) return { success: false, error: `حاول مرة أخرى بعد ${Math.ceil((rl.lockedForMs ?? 0) / 60000)} دقيقة` };

    const user = this.getUserByEmail(email);
    if (!user) return { success: true }; // Silent — don't reveal if email exists

    if (user.provider === 'google' && !user.passwordHash) {
      return { success: false, error: 'هذا الحساب مرتبط بجوجل. استخدم "الدخول بجوجل".' };
    }

    const { token, tokenHash, expiry } = genResetToken();

    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      users[idx].resetToken = token;
      users[idx].resetTokenHash = tokenHash;
      users[idx].resetTokenExpiry = expiry;
      this.saveUsers(users);
    }

    const resetUrl = `${window.location.origin}${window.location.pathname}?reset_token=${token}&email=${encodeURIComponent(email)}`;

    // Store email log
    this.storeEmail({
      to: email,
      subject: '🔑 إعادة تعيين كلمة المرور — مكتب الخدمات الإدارية',
      body: `مرحباً ${user.name}،\n\nتلقينا طلباً لإعادة تعيين كلمة مرور حسابك.\n\n🔗 رابط إعادة التعيين (صالح لمدة 15 دقيقة):\n${resetUrl}\n\nإذا لم تطلب هذا، تجاهل هذا البريد. حسابك آمن.\n\n— فريق مكتب الخدمات الإدارية`,
      type: 'password_reset',
      resetUrl,
      token,
      userId: user.id,
    });

    recordLoginAttempt(`reset_${email}`, true);
    this.log('PASSWORD_RESET_REQUEST', user.username, user.id, `طلب إعادة تعيين: ${email}`, true, 'warning');
    return { success: true, token, resetUrl };
  }

  resetPasswordWithToken(token: string, email: string, newPassword: string): { success: boolean; error?: string } {
    const user = this.getUserByEmail(email);
    if (!user) return { success: false, error: 'البريد الإلكتروني غير مسجل' };
    if (!user.resetToken || user.resetToken !== token)
      return { success: false, error: 'رابط إعادة التعيين غير صالح' };
    if (!user.resetTokenExpiry || new Date() > new Date(user.resetTokenExpiry))
      return { success: false, error: 'انتهت صلاحية الرابط. يرجى طلب رابط جديد.' };
    if (newPassword.length < 8) return { success: false, error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' };

    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      users[idx].salt = secureRandom(16);
      users[idx].passwordHash = hashPassword(newPassword, users[idx].salt);
      users[idx].resetToken = undefined;
      users[idx].resetTokenHash = undefined;
      users[idx].resetTokenExpiry = undefined;
      users[idx].updatedAt = new Date().toISOString();
      this.saveUsers(users);
    }

    // Mark email as used
    const emails = this.getEmails();
    const ei = emails.findIndex(e => e.token === token);
    if (ei !== -1) { emails[ei].read = true; this.saveEmails(emails); }

    this.log('PASSWORD_RESET_SUCCESS', user.username, user.id, `تمت إعادة التعيين: ${email}`, true, 'info');
    return { success: true };
  }

  /* ══════════════════════
     GOOGLE OAUTH
     ══════════════════════ */
  processGoogleLogin(profile: {
    googleId: string; email: string; name: string; picture?: string;
  }, isAdminLogin: boolean): {
    success: boolean; session?: ActiveSession; needsRegistration?: boolean;
    pendingApproval?: boolean; error?: string; profile?: typeof profile;
  } {
    let user = this.getUserByGoogleId(profile.googleId);
    if (!user) user = this.getUserByEmail(profile.email);

    if (user) {
      if (user.status === 'suspended' || user.status === 'banned')
        return { success: false, error: 'هذا الحساب موقوف. تواصل مع المدير.' };
      if (user.status === 'pending')
        return { success: false, pendingApproval: true, error: 'حسابك في انتظار موافقة المدير.' };
      if (isAdminLogin && user.role !== 'admin' && user.role !== 'superadmin')
        return { success: false, error: 'ليس لديك صلاحية دخول لوحة الإدارة.' };

      const users = this.getUsers();
      const idx = users.findIndex(u => u.id === user!.id);
      const { ip, device } = getClientInfo();
      if (idx !== -1) {
        users[idx].lastLogin = new Date().toISOString();
        users[idx].lastLoginIp = ip;
        users[idx].lastLoginDevice = device;
        users[idx].loginCount = (users[idx].loginCount ?? 0) + 1;
        if (profile.picture) users[idx].googlePicture = profile.picture;
        if (!users[idx].googleId) users[idx].googleId = profile.googleId;
        this.saveUsers(users);
      }

      const session = this._createSession(user, 'google', isAdminLogin, profile.picture);
      this.log('LOGIN_GOOGLE', user.username, user.id, `دخول Google: ${profile.email}`, true, 'info');
      return { success: true, session };
    }

    // Check pending registration
    const pending = this.getRegistrations().find(r => r.email.toLowerCase() === profile.email.toLowerCase() && r.status === 'pending');
    if (pending) return { success: false, pendingApproval: true, error: 'طلبك قيد المراجعة.' };

    return { success: false, needsRegistration: true, profile };
  }

  /* ══════════════════════
     LOGIN (LOCAL)
     ══════════════════════ */
  login(usernameOrEmail: string, password: string, isAdminLogin: boolean): {
    success: boolean; session?: ActiveSession; error?: string; lockedForMs?: number;
    remainingAttempts?: number;
  } {
    const identifier = usernameOrEmail.toLowerCase().trim();

    // Rate limit check
    const rl = checkRateLimit(`login_${identifier}`);
    if (!rl.allowed) {
      const mins = Math.ceil((rl.lockedForMs ?? 0) / 60000);
      this.log('LOGIN_BLOCKED', 'system', identifier, `حساب موقوف مؤقتاً: ${identifier}`, false, 'danger');
      return {
        success: false,
        error: `⛔ تم تجاوز عدد المحاولات المسموحة.\nيرجى الانتظار ${mins} دقيقة قبل المحاولة مجدداً.`,
        lockedForMs: rl.lockedForMs,
      };
    }

    const isEmail = identifier.includes('@');
    const user = isEmail ? this.getUserByEmail(identifier) : this.getUserByUsername(identifier);

    if (!user) {
      recordLoginAttempt(`login_${identifier}`, false);
      this.log('LOGIN_FAIL', 'system', identifier, `مستخدم غير موجود: ${identifier}`, false, 'warning');
      const newRl = checkRateLimit(`login_${identifier}`);
      return {
        success: false,
        error: 'اسم المستخدم أو كلمة المرور غير صحيحة',
        remainingAttempts: newRl.remainingAttempts,
      };
    }

    if (user.status === 'suspended' || user.status === 'banned') {
      this.log('LOGIN_BLOCKED', user.username, user.id, `محاولة دخول حساب موقوف`, false, 'danger');
      return { success: false, error: 'هذا الحساب موقوف. تواصل مع المدير.' };
    }
    if (user.status === 'pending') {
      return { success: false, error: 'حسابك في انتظار موافقة المدير.' };
    }
    if (user.provider === 'google' && !user.passwordHash) {
      return { success: false, error: 'هذا الحساب مرتبط بجوجل. استخدم "الدخول بجوجل".' };
    }
    if (!verifyPassword(password, user.salt, user.passwordHash)) {
      recordLoginAttempt(`login_${identifier}`, false);
      this.log('LOGIN_FAIL', user.username, user.id, `كلمة مرور خاطئة`, false, 'warning');
      const newRl = checkRateLimit(`login_${identifier}`);
      return {
        success: false,
        error: 'اسم المستخدم أو كلمة المرور غير صحيحة',
        remainingAttempts: newRl.remainingAttempts,
      };
    }
    if (isAdminLogin && user.role !== 'admin' && user.role !== 'superadmin') {
      this.log('LOGIN_BLOCKED', user.username, user.id, `محاولة دخول واجهة الإدارة بدون صلاحية`, false, 'danger');
      return { success: false, error: 'ليس لديك صلاحية دخول لوحة الإدارة.' };
    }

    // Success
    recordLoginAttempt(`login_${identifier}`, true);
    const { ip, device } = getClientInfo();
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      users[idx].lastLogin = new Date().toISOString();
      users[idx].lastLoginIp = ip;
      users[idx].lastLoginDevice = device;
      users[idx].loginCount = (users[idx].loginCount ?? 0) + 1;
      users[idx].failedAttempts = 0;
      this.saveUsers(users);
    }

    const session = this._createSession(user, 'local', isAdminLogin);
    this.log('LOGIN_SUCCESS', user.username, user.id, `دخول ناجح [${isAdminLogin ? 'ADMIN' : 'USER'}] من ${device}`, true, 'info');
    return { success: true, session };
  }

  private _createSession(user: AppUser, provider: AuthProvider, isAdminSession: boolean, googlePicture?: string): ActiveSession {
    const now = new Date();
    const expires = new Date(now.getTime() + (user.sessionTimeout ?? 120) * 60 * 1000);
    const session: ActiveSession = {
      sessionId: genId('S'),
      userId: user.id, username: user.username,
      role: user.role, name: user.name, nameFr: user.nameFr,
      email: user.email, avatar: user.avatar, provider,
      permissions: user.permissions,
      loginAt: now.toISOString(), expiresAt: expires.toISOString(),
      isAdminSession,
      googlePicture: googlePicture ?? user.googlePicture,
      fingerprint: getBrowserFingerprint(),
      csrfToken: genCsrfToken(),
    };
    const key = isAdminSession ? STORE.SESSIONS_ADMIN : STORE.SESSIONS_USER;
    sessionStorage.setItem(key, JSON.stringify(session));
    return session;
  }

  logout(session: ActiveSession | null): void {
    if (!session) return;
    this.log('LOGOUT', session.username, session.userId, `خروج: ${session.username}`, true, 'info');
    const key = session.isAdminSession ? STORE.SESSIONS_ADMIN : STORE.SESSIONS_USER;
    sessionStorage.removeItem(key);
  }

  getAdminSession(): ActiveSession | null { return this._getSession(STORE.SESSIONS_ADMIN); }
  getUserSession(): ActiveSession | null { return this._getSession(STORE.SESSIONS_USER); }

  private _getSession(key: string): ActiveSession | null {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      const session: ActiveSession = JSON.parse(raw);
      if (new Date() > new Date(session.expiresAt)) {
        sessionStorage.removeItem(key);
        return null;
      }
      return session;
    } catch { return null; }
  }

  refreshSession(session: ActiveSession): void {
    const user = this.getUserById(session.userId);
    if (!user) return;
    const expires = new Date(Date.now() + (user.sessionTimeout ?? 120) * 60 * 1000);
    const refreshed = { ...session, expiresAt: expires.toISOString() };
    const key = session.isAdminSession ? STORE.SESSIONS_ADMIN : STORE.SESSIONS_USER;
    sessionStorage.setItem(key, JSON.stringify(refreshed));
  }

  /* ══════════════════════
     REGISTRATION
     ══════════════════════ */
  getRegistrations(): RegistrationRequest[] {
    try { return JSON.parse(localStorage.getItem(STORE.REGISTRATIONS) ?? '[]'); }
    catch { return []; }
  }

  private saveRegistrations(regs: RegistrationRequest[]): void {
    localStorage.setItem(STORE.REGISTRATIONS, JSON.stringify(regs));
  }

  getPendingRegistrations(): RegistrationRequest[] {
    return this.getRegistrations().filter(r => r.status === 'pending');
  }

  submitRegistration(data: {
    username: string; password?: string; name: string; nameFr?: string;
    email: string; phone?: string; provider: AuthProvider;
    googleId?: string; googlePicture?: string; notes?: string;
  }): { success: boolean; error?: string; requestId?: string } {
    if (this.getUserByUsername(data.username)) return { success: false, error: 'اسم المستخدم مستخدم بالفعل' };
    if (this.getUserByEmail(data.email)) return { success: false, error: 'البريد الإلكتروني مسجل بالفعل' };
    const existing = this.getRegistrations();
    if (existing.find(r => r.email.toLowerCase() === data.email.toLowerCase() && r.status === 'pending'))
      return { success: false, error: 'طلب تسجيل بهذا البريد قيد المراجعة' };

    const salt = secureRandom(16);
    const { ip, device } = getClientInfo();
    const req: RegistrationRequest = {
      id: genId('REG'),
      username: data.username.trim().toLowerCase(),
      passwordHash: data.password ? hashPassword(data.password, salt) : '',
      salt,
      name: data.name, nameFr: data.nameFr ?? data.name,
      email: data.email, phone: data.phone ?? '',
      provider: data.provider,
      googleId: data.googleId, googlePicture: data.googlePicture,
      requestedRole: 'editor', status: 'pending',
      requestedAt: new Date().toISOString(),
      reviewedAt: null, reviewedBy: null, rejectionReason: '',
      notes: data.notes ?? '',
      ipAddress: ip,
      userAgent: device,
    };
    existing.push(req); this.saveRegistrations(existing);
    this._addNotification(req);
    this.log('REGISTER', data.name, req.id, `طلب تسجيل: ${data.email} [${data.provider}]`, true, 'info');
    return { success: true, requestId: req.id };
  }

  approveRegistration(requestId: string, reviewerUsername: string, assignedRole: UserRole): { success: boolean; error?: string } {
    const regs = this.getRegistrations();
    const idx = regs.findIndex(r => r.id === requestId);
    if (idx === -1) return { success: false, error: 'الطلب غير موجود' };
    const req = regs[idx];
    if (req.status !== 'pending') return { success: false, error: 'الطلب تمت مراجعته مسبقاً' };

    const result = this.createUser({
      username: req.username, role: assignedRole,
      name: req.name, nameFr: req.nameFr, email: req.email, phone: req.phone,
      provider: req.provider, googleId: req.googleId, googlePicture: req.googlePicture,
      emailVerified: req.provider === 'google',
    });
    if (!result.success) return result;

    // Inject password hash directly
    if (req.passwordHash && result.user) {
      const users = this.getUsers();
      const ui = users.findIndex(u => u.id === result.user!.id);
      if (ui !== -1) {
        users[ui].passwordHash = req.passwordHash;
        users[ui].salt = req.salt;
        this.saveUsers(users);
      }
    }

    regs[idx] = { ...req, status: 'approved', reviewedAt: new Date().toISOString(), reviewedBy: reviewerUsername };
    this.saveRegistrations(regs);

    this.storeEmail({
      to: req.email,
      subject: '✅ تم قبول طلب التسجيل — مكتب الخدمات الإدارية',
      body: `مرحباً ${req.name}،\n\nتم قبول طلب تسجيلك!\n\nاسم المستخدم: ${req.username}\nالدور: ${assignedRole}\n\nيمكنك الآن تسجيل الدخول من:\n${window.location.origin}\n\n— فريق مكتب الخدمات الإدارية`,
      type: 'approval', userId: result.user?.id,
    });

    this.log('APPROVE_REGISTRATION', reviewerUsername, requestId, `قبول: ${req.email} → ${assignedRole}`, true, 'info');
    return { success: true };
  }

  rejectRegistration(requestId: string, reviewerUsername: string, reason: string): { success: boolean; error?: string } {
    const regs = this.getRegistrations();
    const idx = regs.findIndex(r => r.id === requestId);
    if (idx === -1) return { success: false, error: 'الطلب غير موجود' };
    if (regs[idx].status !== 'pending') return { success: false, error: 'الطلب تمت مراجعته مسبقاً' };
    regs[idx] = { ...regs[idx], status: 'rejected', reviewedAt: new Date().toISOString(), reviewedBy: reviewerUsername, rejectionReason: reason };
    this.saveRegistrations(regs);
    this.log('REJECT_REGISTRATION', reviewerUsername, requestId, `رفض: ${regs[idx].email}`, true, 'warning');
    return { success: true };
  }

  /* ══════════════════════
     EMAILS LOG
     ══════════════════════ */
  private storeEmail(data: Omit<EmailRecord, 'id' | 'sentAt' | 'read'>): void {
    const emails = this.getEmails();
    emails.unshift({ ...data, id: genId('ML'), sentAt: new Date().toISOString(), read: false });
    this.saveEmails(emails.slice(0, 200));
  }

  getEmails(): EmailRecord[] {
    try { return JSON.parse(localStorage.getItem(STORE.EMAILS) ?? '[]'); }
    catch { return []; }
  }

  private saveEmails(emails: EmailRecord[]): void {
    localStorage.setItem(STORE.EMAILS, JSON.stringify(emails));
  }

  markEmailRead(id: string): void {
    const emails = this.getEmails();
    const i = emails.findIndex(e => e.id === id);
    if (i !== -1) { emails[i].read = true; this.saveEmails(emails); }
  }

  /* ══════════════════════
     NOTIFICATIONS
     ══════════════════════ */
  private _addNotification(req: RegistrationRequest): void {
    try {
      const notifs = JSON.parse(localStorage.getItem(STORE.NOTIFICATIONS) ?? '[]');
      notifs.unshift({
        id: genId('N'), type: 'registration',
        title: 'طلب تسجيل جديد',
        body: `${req.name} (${req.email}) [${req.provider}]`,
        timestamp: new Date().toISOString(), read: false, requestId: req.id,
      });
      if (notifs.length > 50) notifs.splice(50);
      localStorage.setItem(STORE.NOTIFICATIONS, JSON.stringify(notifs));
    } catch { /* silent */ }
  }

  getNotifications(): { id:string; type:string; title:string; body:string; timestamp:string; read:boolean; requestId:string }[] {
    try { return JSON.parse(localStorage.getItem(STORE.NOTIFICATIONS) ?? '[]'); }
    catch { return []; }
  }

  markNotificationsRead(): void {
    try {
      const notifs = this.getNotifications().map(n => ({ ...n, read: true }));
      localStorage.setItem(STORE.NOTIFICATIONS, JSON.stringify(notifs));
    } catch { /* silent */ }
  }

  /* ══════════════════════
     AUDIT LOG
     ══════════════════════ */
  private log(action: AuditAction, username: string, target: string, detail: string, success: boolean, severity: AuditLog['severity']): void {
    try {
      const { ip, device } = getClientInfo();
      const logs: AuditLog[] = JSON.parse(localStorage.getItem(STORE.AUDIT) ?? '[]');
      logs.unshift({ id: genId('L'), userId: target, username, action, target, detail, timestamp: new Date().toISOString(), ip, device, success, severity });
      if (logs.length > 500) logs.splice(500);
      localStorage.setItem(STORE.AUDIT, JSON.stringify(logs));
    } catch { /* silent */ }
  }

  getLogs(limit = 200): AuditLog[] {
    try { return (JSON.parse(localStorage.getItem(STORE.AUDIT) ?? '[]') as AuditLog[]).slice(0, limit); }
    catch { return []; }
  }

  clearLogs(): void { localStorage.setItem(STORE.AUDIT, '[]'); }

  /* ══════════════════════
     PERMISSIONS CHECK
     ══════════════════════ */
  hasPermission(session: ActiveSession | null, permission: Permission): boolean {
    if (!session) return false;
    if (session.role === 'superadmin') return true;
    return session.permissions.includes(permission);
  }

  /* ══════════════════════
     STATS
     ══════════════════════ */
  getStats() {
    const users = this.getUsers();
    const logs = this.getLogs(500);
    const today = new Date().toDateString();
    const thisWeek = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.status === 'active').length,
      suspendedUsers: users.filter(u => u.status === 'suspended').length,
      pendingUsers: users.filter(u => u.status === 'pending').length,
      adminCount: users.filter(u => u.role === 'admin' || u.role === 'superadmin').length,
      editorCount: users.filter(u => u.role === 'editor').length,
      googleUsers: users.filter(u => u.provider === 'google').length,
      todayLogins: logs.filter(l => l.action === 'LOGIN_SUCCESS' && new Date(l.timestamp).toDateString() === today).length,
      weekLogins: logs.filter(l => l.action === 'LOGIN_SUCCESS' && new Date(l.timestamp).getTime() > thisWeek).length,
      failedLogins: logs.filter(l => l.action === 'LOGIN_FAIL').length,
      totalLogins: users.reduce((s, u) => s + (u.loginCount ?? 0), 0),
      pendingRegistrations: this.getPendingRegistrations().length,
      recentLogs: logs.slice(0, 10),
    };
  }

  exportUsers(): string {
    return JSON.stringify(this.getUsers().map(u => ({ ...u, passwordHash: '***', salt: '***', resetToken: '***', resetTokenHash: '***' })), null, 2);
  }

  resetToDefaults(): void {
    localStorage.setItem(STORE.USERS, JSON.stringify(buildDefaultUsers()));
    localStorage.setItem(STORE.REGISTRATIONS, JSON.stringify([]));
    this.log('SYSTEM_RESET', 'system', 'system', 'إعادة تعيين قاعدة البيانات', true, 'critical');
  }
}

export const authService = new AuthDatabase();
