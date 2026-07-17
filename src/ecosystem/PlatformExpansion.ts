/**
 * Aether OS - Platform Expansion
 * Cross-device sync, mobile native, browser extensions, API
 */

import { EventBus } from '../core/EventBus';
import { storage } from '../storage/PersistentStorage';

export interface SyncConfig {
  enabled: boolean;
  syncInterval: number; // milliseconds
  conflictResolution: 'local' | 'remote' | 'manual';
  maxRetries: number;
}

export interface SyncState {
  lastSync: number;
  pendingChanges: number;
  conflicts: Conflict[];
  status: 'idle' | 'syncing' | 'error';
}

export interface Conflict {
  id: string;
  type: string;
  localVersion: any;
  remoteVersion: any;
  timestamp: number;
}

export interface Device {
  id: string;
  name: string;
  type: 'desktop' | 'mobile' | 'tablet';
  platform: string;
  lastSeen: number;
  isCurrent: boolean;
}

export interface CrossDeviceEvent {
  type: string;
  deviceId: string;
  timestamp: number;
  data: any;
}

export class CrossDeviceSync {
  private eventBus: EventBus;
  private config: SyncConfig;
  private state: SyncState;
  private devices: Map<string, Device> = new Map();
  private syncInterval: number = 0;
  private ws: WebSocket | null = null;

  constructor(eventBus: EventBus, config?: Partial<SyncConfig>) {
    this.eventBus = eventBus;
    this.config = {
      enabled: config?.enabled ?? true,
      syncInterval: config?.syncInterval ?? 30000,
      conflictResolution: config?.conflictResolution ?? 'local',
      maxRetries: config?.maxRetries ?? 3
    };
    this.state = {
      lastSync: 0,
      pendingChanges: 0,
      conflicts: [],
      status: 'idle'
    };

    this.initializeDevice();
  }

  private initializeDevice(): void {
    const device: Device = {
      id: this.getOrCreateDeviceId(),
      name: this.getDeviceName(),
      type: this.getDeviceType(),
      platform: navigator.platform,
      lastSeen: Date.now(),
      isCurrent: true
    };

    this.devices.set(device.id, device);
    console.log(`📱 Device initialized: ${device.name} (${device.type})`);
  }

  private getOrCreateDeviceId(): string {
    let deviceId = localStorage.getItem('aether_device_id');
    if (!deviceId) {
      deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('aether_device_id', deviceId);
    }
    return deviceId;
  }

  private getDeviceName(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Mobile')) return 'Mobile Device';
    if (ua.includes('Tablet')) return 'Tablet';
    return 'Desktop';
  }

  private getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
    const ua = navigator.userAgent;
    if (ua.includes('Mobile')) return 'mobile';
    if (ua.includes('Tablet')) return 'tablet';
    return 'desktop';
  }

  async connect(serverUrl: string): Promise<boolean> {
    try {
      this.ws = new WebSocket(serverUrl);

      return new Promise((resolve) => {
        if (!this.ws) return resolve(false);

        this.ws.onopen = () => {
          console.log('🔗 Cross-device sync connected');
          this.registerDevice();
          this.startSyncLoop();
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(JSON.parse(event.data));
        };

        this.ws.onclose = () => {
          console.log('🔌 Cross-device sync disconnected');
          this.stopSyncLoop();
        };

        this.ws.onerror = (e) => {
          console.error('Sync error:', e);
        };

        // Timeout
        setTimeout(() => resolve(false), 5000);
      });
    } catch (e) {
      console.error('Failed to connect:', e);
      return false;
    }
  }

  disconnect(): void {
    this.stopSyncLoop();
    this.ws?.close();
    this.ws = null;
  }

  private registerDevice(): void {
    const device = Array.from(this.devices.values())[0];
    this.send({
      type: 'device:register',
      device
    });
  }

  private startSyncLoop(): void {
    this.syncInterval = window.setInterval(() => {
      this.sync();
    }, this.config.syncInterval);
  }

  private stopSyncLoop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = 0;
    }
  }

  async sync(): Promise<void> {
    if (this.state.status === 'syncing') return;

    this.state.status = 'syncing';
    this.eventBus.emit('sync:started');

    try {
      // Get all data from IndexedDB
      const data = await storage.export();

      // Check for conflicts
      const conflicts = await this.checkConflicts(data);

      if (conflicts.length > 0) {
        this.state.conflicts = conflicts;
        this.eventBus.emit('sync:conflicts', conflicts);
      }

      // Send data to server
      this.send({
        type: 'sync:push',
        deviceId: this.getOrCreateDeviceId(),
        data,
        timestamp: Date.now()
      });

      this.state.lastSync = Date.now();
      this.state.pendingChanges = 0;
      this.state.status = 'idle';

      this.eventBus.emit('sync:completed');
    } catch (e) {
      this.state.status = 'error';
      this.eventBus.emit('sync:error', e);
    }
  }

  private async checkConflicts(data: Record<string, any[]>): Promise<Conflict[]> {
    // Simplified conflict detection
    // In production, would compare local vs remote versions
    return [];
  }

  private handleMessage(message: any): void {
    switch (message.type) {
      case 'sync:pull':
        this.handleSyncPull(message);
        break;
      case 'device:update':
        this.handleDeviceUpdate(message);
        break;
      case 'conflict:resolve':
        this.handleConflictResolve(message);
        break;
    }
  }

  private async handleSyncPull(message: any): Promise<void> {
    const { data } = message;
    
    // Merge remote data
    for (const [storeName, items] of Object.entries(data)) {
      // Apply conflict resolution
      if (this.config.conflictResolution === 'remote') {
        await storage.import({ [storeName]: items as any[] });
      }
    }

    this.eventBus.emit('sync:pulled', data);
  }

  private handleDeviceUpdate(message: any): void {
    const { device } = message;
    this.devices.set(device.id, device);
    this.eventBus.emit('device:updated', device);
  }

  private handleConflictResolve(message: any): void {
    const { conflictId, resolution } = message;
    this.state.conflicts = this.state.conflicts.filter(c => c.id !== conflictId);
    this.eventBus.emit('conflict:resolved', { conflictId, resolution });
  }

  private send(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  markChange(): void {
    this.state.pendingChanges++;
  }

  getState(): SyncState {
    return { ...this.state };
  }

  getDevices(): Device[] {
    return Array.from(this.devices.values());
  }

  setConflictResolution(mode: 'local' | 'remote' | 'manual'): void {
    this.config.conflictResolution = mode;
  }
}

// Browser Extension API
export class BrowserExtensionAPI {
  private eventBus: EventBus;
  private port: any = null;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.initializePort();
  }

  private initializePort(): void {
    const chrome = (window as any).chrome;
    if (chrome && chrome.runtime) {
      try {
        this.port = chrome.runtime.connect({
          name: 'aether-os'
        });

        this.port.onMessage.addListener((message: any) => {
          this.handleExtensionMessage(message);
        });

        console.log('🔌 Browser extension connected');
      } catch (e) {
        console.log('Browser extension not available');
      }
    }
  }

  private handleExtensionMessage(message: any): void {
    const chrome = (window as any).chrome;
    switch (message.type) {
      case 'clipboard:copy':
        navigator.clipboard.writeText(message.data);
        break;
      case 'tab:create':
        chrome?.tabs?.create({ url: message.data.url });
        break;
      case 'bookmark:add':
        this.addBookmark(message.data);
        break;
    }
  }

  private addBookmark(data: { url: string; title: string }): void {
    // Store bookmark in local storage
    const bookmarks = JSON.parse(localStorage.getItem('aether_bookmarks') || '[]');
    bookmarks.push({
      ...data,
      createdAt: Date.now()
    });
    localStorage.setItem('aether_bookmarks', JSON.stringify(bookmarks));
    
    this.eventBus.emit('bookmark:added', data);
  }

  sendToExtension(type: string, data: any): void {
    if (this.port) {
      this.port.postMessage({ type, data });
    }
  }

  isAvailable(): boolean {
    return this.port !== null;
  }
}

// Mobile App Bridge (for native mobile integration)
export interface MobileBridgeConfig {
  appScheme: string;
  universalLinks?: string[];
}

export class MobileBridge {
  private eventBus: EventBus;
  private config: MobileBridgeConfig;
  private pendingCallbacks: Map<string, (result: any) => void> = new Map();

  constructor(eventBus: EventBus, config: MobileBridgeConfig) {
    this.eventBus = eventBus;
    this.config = config;
    this.setupDeepLinks();
    this.setupMessageHandlers();
  }

  private setupDeepLinks(): void {
    // Handle incoming deep links
    window.addEventListener('urlchange', () => {
      this.handleDeepLink(window.location.href);
    });

    // Initial check
    this.handleDeepLink(window.location.href);
  }

  private handleDeepLink(url: string): void {
    if (!url.startsWith(this.config.appScheme)) return;

    try {
      const urlObj = new URL(url);
      const action = urlObj.hostname;
      const params = Object.fromEntries(urlObj.searchParams);

      this.eventBus.emit('mobile:deeplink', { action, params });
      console.log(`📱 Deep link: ${action}`, params);
    } catch (e) {
      console.error('Invalid deep link:', e);
    }
  }

  private setupMessageHandlers(): void {
    // Handle messages from native app
    if ((window as any).ReactNativeWebView) {
      window.addEventListener('message', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          this.handleNativeMessage(data);
        } catch (err) {
          // Not JSON, ignore
        }
      });
    }
  }

  private handleNativeMessage(message: { type: string; id?: string; data?: any }): void {
    if (message.id && this.pendingCallbacks.has(message.id)) {
      const callback = this.pendingCallbacks.get(message.id)!;
      callback(message.data);
      this.pendingCallbacks.delete(message.id);
    }

    this.eventBus.emit(`mobile:${message.type}`, message.data);
  }

  // Call native app methods
  async callNative(method: string, params?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = `call-${Date.now()}`;
      this.pendingCallbacks.set(id, resolve);

      const message = { type: 'invoke', id, method, params };

      // Try React Native bridge
      if ((window as any).ReactNativeWebView) {
        (window as any).ReactNativeWebView.postMessage(JSON.stringify(message));
      }
      // Try iOS WKWebView
      else if ((window as any).webkit?.messageHandlers?.iosBridge) {
        (window as any).webkit.messageHandlers.iosBridge.postMessage(message);
      }
      // Try Android
      else if ((window as any).AndroidBridge) {
        (window as any).AndroidBridge[method](JSON.stringify(params));
        resolve(null); // Android uses callbacks
      }
      // Fallback
      else {
        console.warn('Mobile bridge not available');
        resolve(null);
      }

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.pendingCallbacks.has(id)) {
          this.pendingCallbacks.delete(id);
          reject(new Error('Native call timeout'));
        }
      }, 10000);
    });
  }

  // Specific native features
  async getContacts(): Promise<any[]> {
    return this.callNative('getContacts');
  }

  async shareContent(content: { title: string; text: string; url?: string }): Promise<void> {
    return this.callNative('share', content);
  }

  async getLocation(): Promise<{ latitude: number; longitude: number }> {
    return this.callNative('getLocation');
  }

  async takePhoto(): Promise<string> {
    return this.callNative('takePhoto');
  }

  async scanQRCode(): Promise<string> {
    return this.callNative('scanQRCode');
  }

  async sendNotification(title: string, body: string): Promise<void> {
    return this.callNative('sendNotification', { title, body });
  }

  async authenticateWithBiometrics(): Promise<boolean> {
    return this.callNative('authenticateBiometrics');
  }

  openAppStore(): void {
    window.location.href = `${this.config.appScheme}://app-store`;
  }
}

// Developer API
export class DeveloperAPI {
  private eventBus: EventBus;
  private rateLimits: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  // Rate limiting
  private checkRateLimit(endpoint: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const record = this.rateLimits.get(endpoint);

    if (!record || now > record.resetTime) {
      this.rateLimits.set(endpoint, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (record.count >= limit) {
      return false;
    }

    record.count++;
    return true;
  }

  // REST API endpoints
  async handleAPIRequest(
    method: string,
    path: string,
    body?: any,
    headers?: Record<string, string>
  ): Promise<Response> {
    const rateLimit = 100; // requests
    const rateWindow = 60000; // per minute

    if (!this.checkRateLimit(path, rateLimit, rateWindow)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Handle different endpoints
    switch (path) {
      case '/api/nodes':
        return this.handleNodesAPI(method, body);
      case '/api/workspaces':
        return this.handleWorkspacesAPI(method, body);
      case '/api/search':
        return this.handleSearchAPI(method, body);
      case '/api/export':
        return this.handleExportAPI(method, body);
      default:
        return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
    }
  }

  private async handleNodesAPI(method: string, body?: any): Promise<Response> {
    switch (method) {
      case 'GET':
        const nodes = await storage.getAll('nodes');
        return new Response(JSON.stringify(nodes), {
          headers: { 'Content-Type': 'application/json' }
        });
      case 'POST':
        await storage.put('nodes', body);
        return new Response(JSON.stringify(body), {
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        });
      default:
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405
        });
    }
  }

  private async handleWorkspacesAPI(method: string, body?: any): Promise<Response> {
    switch (method) {
      case 'GET':
        const workspaces = await storage.getAll('workspaces');
        return new Response(JSON.stringify(workspaces), {
          headers: { 'Content-Type': 'application/json' }
        });
      case 'POST':
        await storage.put('workspaces', body);
        return new Response(JSON.stringify(body), {
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        });
      default:
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405
        });
    }
  }

  private async handleSearchAPI(method: string, body?: any): Promise<Response> {
    if (method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405
      });
    }

    const { query } = body;
    const nodes = await storage.getAll('nodes');
    const results = nodes.filter(node => {
      const searchable = JSON.stringify(node).toLowerCase();
      return searchable.includes(query.toLowerCase());
    });

    return new Response(JSON.stringify({ results }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async handleExportAPI(method: string, body?: any): Promise<Response> {
    const data = await storage.export();
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="aether-export.json"'
      }
    });
  }

  // WebSocket API for real-time
  createWebSocketHandler(ws: WebSocket): void {
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleWebSocketMessage(ws, message);
      } catch (e) {
        ws.send(JSON.stringify({ error: 'Invalid JSON' }));
      }
    };
  }

  private handleWebSocketMessage(ws: WebSocket, message: any): void {
    switch (message.type) {
      case 'subscribe':
        this.eventBus.on(message.channel, (data) => {
          ws.send(JSON.stringify({ type: 'event', channel: message.channel, data }));
        });
        break;
      case 'broadcast':
        this.eventBus.emit(message.channel, message.data);
        break;
    }
  }
}

// Service Worker for offline support
export function registerServiceWorker(): void {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('🔄 Service Worker registered:', registration.scope);
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  }
}

// Push Notifications
export class PushNotifications {
  private eventBus: EventBus;
  private permission: NotificationPermission = 'default';
  private subscription: PushSubscription | null = null;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.checkPermission();
  }

  private async checkPermission(): Promise<void> {
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return false;
    }

    const permission = await Notification.requestPermission();
    this.permission = permission;
    
    if (permission === 'granted') {
      console.log('🔔 Notifications enabled');
      this.eventBus.emit('notifications:enabled');
      return true;
    }

    return false;
  }

  async subscribeToPush(): Promise<void> {
    if (this.permission !== 'granted') {
      await this.requestPermission();
    }

    if ('serviceWorker' in navigator && 'PushManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      
      const key = this.urlBase64ToUint8Array('BEl62iUYgUivxIkv69yViEuiBIa0b11ThwfrTxgqF_5JKk3TIHBE7rZ60JqIZcB3O9tb7K1mT2K8XLR6Qf8T1w');
      this.subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key as any
      });

      console.log('📱 Push subscription:', this.subscription.endpoint);
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async showNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (this.permission !== 'granted') {
      console.warn('Notifications not permitted');
      return;
    }

    const notification = new Notification(title, {
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      ...options
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      this.eventBus.emit('notification:clicked', { title });
    };
  }

  isEnabled(): boolean {
    return this.permission === 'granted';
  }
}
