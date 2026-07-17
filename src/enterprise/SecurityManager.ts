/**
 * Aether OS - Security Manager
 * Encryption, authentication, and permissions
 */

import { EventBus } from '../core/EventBus';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  permissions: Permission[];
  createdAt: number;
  lastLogin?: number;
  metadata?: Record<string, any>;
}

export type UserRole = 'admin' | 'editor' | 'viewer' | 'guest';

export type Permission = 
  | 'workspace:create' | 'workspace:delete' | 'workspace:manage' | 'workspace:view'
  | 'node:create' | 'node:edit' | 'node:delete' | 'node:view'
  | 'plugin:install' | 'plugin:manage'
  | 'settings:view' | 'settings:edit'
  | 'user:manage' | 'audit:view';

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId: string;
}

export interface SecurityConfig {
  encryptionEnabled: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  requireMFA: boolean;
}

export class SecurityManager {
  private eventBus: EventBus;
  private currentUser: User | null = null;
  private token: AuthToken | null = null;
  private config: SecurityConfig;
  private encryptionKey: CryptoKey | null = null;
  private loginAttempts: Map<string, number> = new Map();

  constructor(eventBus: EventBus, config?: Partial<SecurityConfig>) {
    this.eventBus = eventBus;
    this.config = {
      encryptionEnabled: config?.encryptionEnabled ?? true,
      sessionTimeout: config?.sessionTimeout ?? 3600000, // 1 hour
      maxLoginAttempts: config?.maxLoginAttempts ?? 5,
      requireMFA: config?.requireMFA ?? false
    };

    this.loadStoredAuth();
  }

  private async loadStoredAuth(): Promise<void> {
    try {
      const storedToken = localStorage.getItem('aether_auth_token');
      const storedUser = localStorage.getItem('aether_user');

      if (storedToken && storedUser) {
        this.token = JSON.parse(storedToken);
        this.currentUser = JSON.parse(storedUser);

        // Check if token is expired
        if (this.token && Date.now() > this.token.expiresAt) {
          await this.refreshToken();
        }

        console.log('🔐 Loaded stored authentication');
      }
    } catch (e) {
      console.error('Failed to load auth:', e);
    }
  }

  async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    // Check login attempts
    const attempts = this.loginAttempts.get(email) || 0;
    if (attempts >= this.config.maxLoginAttempts) {
      return { success: false, error: 'Account locked. Try again later.' };
    }

    try {
      // Simulate authentication (replace with real auth API)
      const user = await this.authenticateUser(email, password);

      if (user) {
        this.currentUser = user;
        this.token = {
          accessToken: this.generateToken(),
          refreshToken: this.generateToken(),
          expiresAt: Date.now() + this.config.sessionTimeout,
          userId: user.id
        };

        // Store auth
        localStorage.setItem('aether_auth_token', JSON.stringify(this.token));
        localStorage.setItem('aether_user', JSON.stringify(user));

        this.loginAttempts.delete(email);
        this.eventBus.emit('auth:login', user);

        return { success: true };
      }

      // Track failed attempt
      this.loginAttempts.set(email, attempts + 1);
      return { success: false, error: 'Invalid credentials' };
    } catch (e) {
      return { success: false, error: 'Authentication failed' };
    }
  }

  async logout(): Promise<void> {
    this.currentUser = null;
    this.token = null;
    this.encryptionKey = null;

    localStorage.removeItem('aether_auth_token');
    localStorage.removeItem('aether_user');

    this.eventBus.emit('auth:logout');
    console.log('🔐 User logged out');
  }

  async refreshToken(): Promise<boolean> {
    if (!this.token?.refreshToken) return false;

    try {
      // Simulate token refresh
      this.token = {
        accessToken: this.generateToken(),
        refreshToken: this.generateToken(),
        expiresAt: Date.now() + this.config.sessionTimeout,
        userId: this.token.userId
      };

      localStorage.setItem('aether_auth_token', JSON.stringify(this.token));
      return true;
    } catch (e) {
      await this.logout();
      return false;
    }
  }

  private async authenticateUser(email: string, password: string): Promise<User | null> {
    // Simulated authentication - replace with real implementation
    if (password.length >= 6) {
      return {
        id: `user-${Date.now()}`,
        email,
        name: email.split('@')[0],
        role: 'editor',
        permissions: this.getDefaultPermissions('editor'),
        createdAt: Date.now()
      };
    }
    return null;
  }

  private generateToken(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private getDefaultPermissions(role: UserRole): Permission[] {
    const rolePermissions: Record<UserRole, Permission[]> = {
      admin: [
        'workspace:create', 'workspace:delete', 'workspace:manage',
        'node:create', 'node:edit', 'node:delete',
        'plugin:install', 'plugin:manage',
        'settings:view', 'settings:edit',
        'user:manage', 'audit:view'
      ],
      editor: [
        'workspace:create', 'node:create', 'node:edit', 'node:delete',
        'plugin:install', 'settings:view'
      ],
      viewer: ['workspace:view', 'node:view'],
      guest: ['node:view']
    };

    return rolePermissions[role] || [];
  }

  hasPermission(permission: Permission): boolean {
    return this.currentUser?.permissions.includes(permission) || false;
  }

  hasRole(role: UserRole): boolean {
    return this.currentUser?.role === role || false;
  }

  isAuthenticated(): boolean {
    return !!this.currentUser && !!this.token && Date.now() < this.token.expiresAt;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  getToken(): AuthToken | null {
    return this.token;
  }

  // Encryption
  async initializeEncryption(passphrase: string): Promise<void> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    this.encryptionKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('aether-os-salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    console.log('🔐 Encryption initialized');
  }

  async encrypt(data: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption not initialized');
    }

    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      encoder.encode(data)
    );

    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  async decrypt(encryptedData: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption not initialized');
    }

    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      data
    );

    return new TextDecoder().decode(decrypted);
  }

  // Session management
  startSessionMonitor(): void {
    setInterval(async () => {
      if (this.token && Date.now() > this.token.expiresAt - 60000) {
        // Token about to expire, refresh it
        const refreshed = await this.refreshToken();
        if (!refreshed) {
          console.warn('Session expired');
        }
      }
    }, 30000);
  }

  // Permission check helper
  checkPermission(permission: Permission): boolean {
    return this.hasPermission(permission);
  }
}

// Audit Logger
export class AuditLogger {
  private eventBus: EventBus;
  private logs: AuditEntry[] = [];
  private maxLogs: number = 1000;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.loadLogs();
  }

  private async loadLogs(): Promise<void> {
    try {
      const stored = localStorage.getItem('aether_audit_logs');
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load audit logs:', e);
    }
  }

  private async saveLogs(): Promise<void> {
    localStorage.setItem('aether_audit_logs', JSON.stringify(this.logs));
  }

  log(action: AuditAction, details: Record<string, any> = {}, userId?: string): void {
    const entry: AuditEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      action,
      userId: userId || 'system',
      details,
      ipAddress: '127.0.0.1' // Would be server-side in production
    };

    this.logs.unshift(entry);
    
    // Trim old logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    this.saveLogs();
    this.eventBus.emit('audit:logged', entry);
  }

  query(options: {
    action?: AuditAction;
    userId?: string;
    startDate?: number;
    endDate?: number;
    limit?: number;
  }): AuditEntry[] {
    let results = [...this.logs];

    if (options.action) {
      results = results.filter(l => l.action === options.action);
    }
    if (options.userId) {
      results = results.filter(l => l.userId === options.userId);
    }
    if (options.startDate) {
      results = results.filter(l => l.timestamp >= options.startDate!);
    }
    if (options.endDate) {
      results = results.filter(l => l.timestamp <= options.endDate!);
    }

    return results.slice(0, options.limit || 100);
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  clearLogs(): void {
    this.logs = [];
    this.saveLogs();
    console.log('🗑️ Audit logs cleared');
  }
}

export type AuditAction = 
  | 'user:login' | 'user:logout' | 'user:register'
  | 'workspace:create' | 'workspace:delete' | 'workspace:update'
  | 'node:create' | 'node:delete' | 'node:update'
  | 'plugin:install' | 'plugin:uninstall'
  | 'settings:update' | 'security:encrypt' | 'security:decrypt';

export interface AuditEntry {
  id: string;
  timestamp: number;
  action: AuditAction;
  userId: string;
  details: Record<string, any>;
  ipAddress: string;
}
