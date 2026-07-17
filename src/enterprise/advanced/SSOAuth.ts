/**
 * Aether OS - SSO & OAuth Integration
 * Enterprise authentication with OAuth2/OIDC providers
 */

import { EventBus } from '../../core/EventBus';
import { SecurityManager, User } from '../SecurityManager';

export interface OAuthProvider {
  id: string;
  name: string;
  icon: string;
  color: string;
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
  clientId: string;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt: number;
  expiresIn?: number;
  tokenType: string;
  scope: string;
}

export interface OIDCClaims {
  sub: string;
  name?: string;
  email?: string;
  email_verified?: boolean;
  picture?: string;
  locale?: string;
  zoneinfo?: string;
  iss: string;
  aud: string | string[];
  exp: number;
  iat: number;
  nonce?: string;
}

export interface SSOConfig {
  enabled: boolean;
  providers: OAuthProvider[];
  clientId: string;
  redirectUri: string;
  postLoginRedirect?: string;
  autoLinkAccounts: boolean;
}

export class SSOAuthProvider {
  private eventBus: EventBus;
  private securityManager: SecurityManager;
  private config: SSOConfig;
  private currentProvider: string | null = null;
  private pkceVerifier: string | null = null;

  constructor(eventBus: EventBus, securityManager: SecurityManager, config?: Partial<SSOConfig>) {
    this.eventBus = eventBus;
    this.securityManager = securityManager;
    this.config = {
      enabled: config?.enabled ?? false,
      providers: config?.providers ?? [],
      clientId: config?.clientId ?? '',
      redirectUri: config?.redirectUri ?? `${window.location.origin}/auth/callback`,
      autoLinkAccounts: config?.autoLinkAccounts ?? true
    };

    this.initializeDefaultProviders();
    this.handleCallback();
  }

  private initializeDefaultProviders(): void {
    // Google OAuth
    this.config.providers.push({
      id: 'google',
      name: 'Google',
      icon: '🔵',
      color: '#4285f4',
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
      scopes: ['openid', 'email', 'profile'],
      clientId: ''
    });

    // GitHub OAuth
    this.config.providers.push({
      id: 'github',
      name: 'GitHub',
      icon: '⚫',
      color: '#24292e',
      authUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      userInfoUrl: 'https://api.github.com/user',
      scopes: ['read:user', 'user:email'],
      clientId: ''
    });

    // Microsoft/Azure AD
    this.config.providers.push({
      id: 'microsoft',
      name: 'Microsoft',
      icon: '🟢',
      color: '#00a4ef',
      authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
      scopes: ['openid', 'profile', 'email', 'User.Read'],
      clientId: ''
    });

    // Apple Sign In
    this.config.providers.push({
      id: 'apple',
      name: 'Apple',
      icon: '🍎',
      color: '#000000',
      authUrl: 'https://appleid.apple.com/auth/authorize',
      tokenUrl: 'https://appleid.apple.com/auth/token',
      userInfoUrl: 'https://appleid.apple.com/auth/userinfo',
      scopes: ['name', 'email'],
      clientId: ''
    });
  }

  getProviders(): OAuthProvider[] {
    return this.config.providers.filter(p => p.clientId);
  }

  async loginWithProvider(providerId: string): Promise<void> {
    const provider = this.config.providers.find(p => p.id === providerId);
    if (!provider || !provider.clientId) {
      throw new Error(`Provider ${providerId} not configured`);
    }

    this.currentProvider = providerId;

    // Generate PKCE verifier
    this.pkceVerifier = this.generateRandomString(64);
    const codeChallenge = await this.generateCodeChallenge(this.pkceVerifier);

    // Build auth URL
    const params = new URLSearchParams({
      client_id: provider.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: provider.scopes.join(' '),
      state: this.generateState(),
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    // Add provider-specific params
    if (providerId === 'microsoft') {
      params.set('response_mode', 'query');
    }

    const authUrl = `${provider.authUrl}?${params.toString()}`;
    
    // Store state in session storage
    sessionStorage.setItem('oauth_state', params.get('state')!);
    sessionStorage.setItem('oauth_provider', providerId);
    sessionStorage.setItem('oauth_verifier', this.pkceVerifier);

    // Redirect to provider
    window.location.href = authUrl;
  }

  private async handleCallback(): Promise<void> {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      this.eventBus.emit('auth:oauth-error', { error, description: urlParams.get('error_description') });
      return;
    }

    if (!code) return;

    // Verify state
    const storedState = sessionStorage.getItem('oauth_state');
    if (state !== storedState) {
      console.error('State mismatch - possible CSRF attack');
      return;
    }

    const providerId = sessionStorage.getItem('oauth_provider');
    const verifier = sessionStorage.getItem('oauth_verifier');
    
    if (!providerId || !verifier) return;

    // Clear session storage
    sessionStorage.removeItem('oauth_state');
    sessionStorage.removeItem('oauth_provider');
    sessionStorage.removeItem('oauth_verifier');

    // Exchange code for tokens
    await this.exchangeCodeForTokens(providerId, code, verifier);

    // Clean URL
    window.history.replaceState({}, '', window.location.pathname);
  }

  private async exchangeCodeForTokens(providerId: string, code: string, verifier: string): Promise<void> {
    const provider = this.config.providers.find(p => p.id === providerId);
    if (!provider) return;

    const response = await fetch(provider.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        client_id: provider.clientId,
        code,
        redirect_uri: this.config.redirectUri,
        grant_type: 'authorization_code',
        code_verifier: verifier
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
    }

    const tokens: OAuthTokens = await response.json();
    tokens.expiresAt = Date.now() + (tokens.expiresIn || 3600) * 1000;

    // Get user info
    const userInfo = await this.fetchUserInfo(providerId, tokens.accessToken);

    // Create or link user account
    const user = await this.createOrLinkUser(providerId, userInfo, tokens);

    // Login user
    await this.securityManager.login(user.email, 'oauth:' + providerId);

    this.eventBus.emit('auth:oauth-success', { user, provider: providerId });
    console.log(`🔐 Logged in with ${provider.name}`);
  }

  private async fetchUserInfo(providerId: string, accessToken: string): Promise<any> {
    const provider = this.config.providers.find(p => p.id === providerId);
    if (!provider) return null;

    const response = await fetch(provider.userInfoUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user info');
    }

    return response.json();
  }

  private async createOrLinkUser(providerId: string, providerData: any, tokens: OAuthTokens): Promise<User> {
    // Map provider-specific fields to user
    const email = providerData.email || providerData.login;
    const name = providerData.name || providerData.display_name || email;
    const avatar = providerData.avatar_url || providerData.picture;

    return {
      id: `user-${providerId}-${providerData.id || providerData.sub}`,
      email,
      name,
      avatar,
      role: 'editor',
      permissions: [],
      createdAt: Date.now(),
      metadata: {
        provider: providerId,
        providerId: providerData.id || providerData.sub,
        idToken: tokens.idToken
      }
    };
  }

  async refreshToken(providerId: string, refreshToken: string): Promise<OAuthTokens> {
    const provider = this.config.providers.find(p => p.id === providerId);
    if (!provider) throw new Error('Provider not found');

    const response = await fetch(provider.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        client_id: provider.clientId,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    return response.json();
  }

  async revokeToken(providerId: string, token: string): Promise<void> {
    const provider = this.config.providers.find(p => p.id === providerId);
    if (!provider) return;

    // Most providers don't have a revocation endpoint for refresh tokens
    await fetch(`${provider.tokenUrl.replace('/token', '/revoke')}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token })
    }).catch(() => {}); // Ignore errors
  }

  // PKCE helpers
  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => chars[byte % chars.length]).join('');
  }

  private generateState(): string {
    return this.generateRandomString(32);
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
}

// SAML Support (Enterprise)
export interface SAMLConfig {
  entityId: string;
  acsUrl: string;
  certificate: string;
  privateKey?: string;
}

export class SAMLAuthProvider {
  private eventBus: EventBus;
  private config: SAMLConfig | null = null;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  configure(config: SAMLConfig): void {
    this.config = config;
    console.log('🔐 SAML configured for:', config.entityId);
  }

  async generateAuthRequest(): Promise<string> {
    if (!this.config) throw new Error('SAML not configured');

    // In production, use a proper SAML library
    // This is a simplified implementation
    const request = `<?xml version="1.0"?>
<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
  ID="_${Date.now()}" Version="2.0" IssueInstant="${new Date().toISOString()}"
  AssertionConsumerServiceURL="${this.config.acsUrl}" ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
  <saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">${this.config.entityId}</saml:Issuer>
</samlp:AuthnRequest>`;

    return btoa(request);
  }

  parseResponse(samlResponse: string): Promise<{
    nameId: string;
    attributes: Record<string, string[]>;
  }> {
    return new Promise((resolve, reject) => {
      // In production, use a proper SAML parser with certificate validation
      try {
        const xml = atob(samlResponse);
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'text/xml');

        const nameId = doc.querySelector('NameID')?.textContent || '';
        const attributes: Record<string, string[]> = {};

        doc.querySelectorAll('Attribute').forEach(attr => {
          const name = attr.getAttribute('Name') || '';
          const values = Array.from(attr.querySelectorAll('AttributeValue'))
            .map(v => v.textContent || '');
          attributes[name] = values;
        });

        resolve({ nameId, attributes });
      } catch (e) {
        reject(e);
      }
    });
  }
}
