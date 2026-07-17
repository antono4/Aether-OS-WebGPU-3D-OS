/**
 * Aether OS - Native Mobile App
 * React Native structure and Capacitor integration
 */

// TypeScript interfaces for native module communication

export interface MobileAppConfig {
  name: string;
  version: string;
  bundleId: string;
  deepLinks: string[];
  permissions: Permission[];
}

export interface Permission {
  name: string;
  reason: string;
  granted: boolean;
}

export interface AppState {
  isActive: boolean;
  isOnline: boolean;
  batteryLevel: number;
  memoryUsage: number;
}

export interface NativeFeature<T = any> {
  available: boolean;
  result?: T;
  error?: string;
}

// React Native Bridge Interface
export interface AetherMobileBridge {
  // Device Info
  getDeviceInfo(): Promise<{
    platform: 'ios' | 'android';
    osVersion: string;
    deviceModel: string;
    deviceId: string;
  }>;

  // Camera & Media
  takePhoto(options?: { quality?: number; maxWidth?: number; maxHeight?: number }): Promise<string>;
  pickImage(source?: 'gallery' | 'camera'): Promise<string>;
  recordVideo(duration?: number): Promise<string>;

  // Location
  getCurrentLocation(): Promise<{ latitude: number; longitude: number; accuracy: number }>;
  watchLocation(interval?: number): Promise<string>; // Returns watch ID
  stopLocationWatch(watchId: string): void;

  // Biometrics
  authenticateWithBiometrics(reason: string): Promise<boolean>;
  isBiometricsAvailable(): Promise<{ available: boolean; type: string }>;

  // Notifications
  requestNotificationPermission(): Promise<boolean>;
  scheduleLocalNotification(options: {
    title: string;
    body: string;
    date: Date;
    data?: Record<string, string>;
  }): Promise<string>;
  cancelNotification(id: string): void;

  // Share & Files
  shareContent(options: { title?: string; text?: string; url?: string; image?: string }): Promise<void>;
  pickDocument(types?: string[]): Promise<{ uri: string; name: string; size: number }>;
  saveToGallery(filePath: string): Promise<void>;

  // Network
  getNetworkStatus(): Promise<{ isConnected: boolean; type: string }>;
  downloadFile(url: string, progress?: (p: number) => void): Promise<string>;
  uploadFile(filePath: string, endpoint: string, progress?: (p: number) => void): Promise<void>;

  // Clipboard
  copyToClipboard(text: string): void;
  getFromClipboard(): Promise<string>;

  // Haptics
  triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'): void;

  // QR Code
  scanQRCode(): Promise<string>;
  generateQRCode(data: string): Promise<string>;

  // App Lifecycle
  getAppState(): Promise<AppState>;
  setBadgeCount(count: number): void;
  openSettings(): void;

  // Store
  openAppStore(): void;
  openPlayStore(): void;
  rateApp(): Promise<boolean>;

  // Analytics
  trackEvent(name: string, properties?: Record<string, any>): void;
  setUserProperties(properties: Record<string, any>): void;

  // In-App Purchases
  requestPurchase(productId: string): Promise<{ success: boolean; transactionId?: string }>;
  restorePurchases(): Promise<string[]>;
  getProducts(productIds: string[]): Promise<{ id: string; price: string; title: string }[]>;
}

// Implementation for Capacitor
export class CapacitorBridge implements AetherMobileBridge {
  private capacitor: any = null;

  constructor() {
    this.initCapacitor();
  }

  private async initCapacitor(): Promise<void> {
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      this.capacitor = (window as any).Capacitor;
      console.log('📱 Capacitor initialized');
    } else {
      console.log('📱 Running in browser mode');
    }
  }

  private async callPlugin(plugin: string, method: string, args?: any): Promise<any> {
    if (!this.capacitor) {
      return this.fallbackImplementation(plugin, method, args);
    }

    try {
      const result = await this.capacitor.Plugins[plugin]?.[method]?.(args);
      return result;
    } catch (e) {
      console.warn(`Capacitor ${plugin}.${method} failed:`, e);
      return this.fallbackImplementation(plugin, method, args);
    }
  }

  private fallbackImplementation(plugin: string, method: string, args?: any): any {
    // Browser fallback implementations
    console.log(`Fallback: ${plugin}.${method}`, args);
    return null;
  }

  async getDeviceInfo(): Promise<any> {
    return {
      platform: 'web',
      osVersion: navigator.userAgent,
      deviceModel: 'Web Browser',
      deviceId: localStorage.getItem('device_id') || 'web-' + Date.now()
    };
  }

  async takePhoto(options?: any): Promise<string> {
    return this.callPlugin('Camera', 'takePhoto', options);
  }

  async pickImage(source?: 'gallery' | 'camera'): Promise<string> {
    return this.callPlugin('Camera', 'pickImage', { source });
  }

  async recordVideo(duration?: number): Promise<string> {
    return this.callPlugin('Camera', 'recordVideo', { duration });
  }

  async getCurrentLocation(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not available'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        }),
        reject
      );
    });
  }

  async watchLocation(interval?: number): Promise<string> {
    const id = 'location_watch_' + Date.now();
    // Store watch ID for later cleanup
    localStorage.setItem(id, 'active');
    return id;
  }

  stopLocationWatch(watchId: string): void {
    localStorage.removeItem(watchId);
  }

  async authenticateWithBiometrics(reason: string): Promise<boolean> {
    return this.callPlugin('BiometricAuth', 'authenticate', { reason });
  }

  async isBiometricsAvailable(): Promise<any> {
    return { available: false, type: 'none' };
  }

  async requestNotificationPermission(): Promise<boolean> {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      return result === 'granted';
    }
    return false;
  }

  async scheduleLocalNotification(options: any): Promise<string> {
    const id = 'notif_' + Date.now();
    // Store for later display
    localStorage.setItem(id, JSON.stringify(options));
    return id;
  }

  cancelNotification(id: string): void {
    localStorage.removeItem(id);
  }

  async shareContent(options: any): Promise<void> {
    if (navigator.share) {
      await navigator.share(options);
    } else {
      console.log('Share:', options);
    }
  }

  async pickDocument(types?: string[]): Promise<any> {
    return this.callPlugin('Filesystem', 'pickDocument', { types });
  }

  async saveToGallery(filePath: string): Promise<void> {
    return this.callPlugin('Camera', 'saveToGallery', { path: filePath });
  }

  async getNetworkStatus(): Promise<any> {
    const online = navigator.onLine;
    return {
      isConnected: online,
      type: online ? 'wifi' : 'offline'
    };
  }

  async downloadFile(url: string, progress?: (p: number) => void): Promise<string> {
    // Browser download
    const a = document.createElement('a');
    a.href = url;
    a.download = url.split('/').pop() || 'download';
    a.click();
    return url;
  }

  async uploadFile(filePath: string, endpoint: string, progress?: (p: number) => void): Promise<void> {
    console.log(`Upload ${filePath} to ${endpoint}`);
  }

  copyToClipboard(text: string): void {
    navigator.clipboard?.writeText(text);
  }

  async getFromClipboard(): Promise<string> {
    return navigator.clipboard?.readText() || '';
  }

  triggerHaptic(type: string): void {
    if ('vibrate' in navigator) {
      const durations: Record<string, number> = {
        light: 10,
        medium: 20,
        heavy: 50,
        success: 30,
        warning: 50,
        error: 100
      };
      navigator.vibrate(durations[type] || 20);
    }
  }

  async scanQRCode(): Promise<string> {
    // Would use camera + QR library
    return 'qr_code_content';
  }

  async generateQRCode(data: string): Promise<string> {
    // Would use QR library
    return `data:image/png;base64,placeholder_${data}`;
  }

  async getAppState(): Promise<AppState> {
    return {
      isActive: document.visibilityState === 'visible',
      isOnline: navigator.onLine,
      batteryLevel: 1.0,
      memoryUsage: 0
    };
  }

  setBadgeCount(count: number): void {
    console.log(`Badge count: ${count}`);
  }

  openSettings(): void {
    window.open('settings:', '_blank');
  }

  openAppStore(): void {
    window.open('https://apps.apple.com/app/aether-os');
  }

  openPlayStore(): void {
    window.open('https://play.google.com/store/apps/details?id=com.aetheros.app');
  }

  async rateApp(): Promise<boolean> {
    return true;
  }

  trackEvent(name: string, properties?: Record<string, any>): void {
    console.log('Analytics:', name, properties);
  }

  setUserProperties(properties: Record<string, any>): void {
    console.log('User properties:', properties);
  }

  async requestPurchase(productId: string): Promise<any> {
    console.log('Purchase:', productId);
    return { success: false };
  }

  async restorePurchases(): Promise<string[]> {
    return [];
  }

  async getProducts(productIds: string[]): Promise<any[]> {
    return productIds.map(id => ({
      id,
      price: '$9.99',
      title: 'Product'
    }));
  }
}

// Singleton instance
let bridgeInstance: AetherMobileBridge | null = null;

export function getMobileBridge(): AetherMobileBridge {
  if (!bridgeInstance) {
    bridgeInstance = new CapacitorBridge();
  }
  return bridgeInstance;
}

// React hooks for common mobile features
export const MobileHooks = {
  useLocation() {
    const bridge = getMobileBridge();
    
    return {
      getCurrentLocation: () => bridge.getCurrentLocation(),
      watchLocation: (interval?: number) => bridge.watchLocation(interval),
      stopWatching: (id: string) => bridge.stopLocationWatch(id)
    };
  },

  useCamera() {
    const bridge = getMobileBridge();
    
    return {
      takePhoto: (options?: any) => bridge.takePhoto(options),
      pickImage: (source?: 'gallery' | 'camera') => bridge.pickImage(source),
      recordVideo: (duration?: number) => bridge.recordVideo(duration)
    };
  },

  useBiometrics() {
    const bridge = getMobileBridge();
    
    return {
      authenticate: (reason: string) => bridge.authenticateWithBiometrics(reason),
      isAvailable: () => bridge.isBiometricsAvailable()
    };
  },

  useShare() {
    const bridge = getMobileBridge();
    
    return {
      share: (options: any) => bridge.shareContent(options)
    };
  },

  useNotifications() {
    const bridge = getMobileBridge();
    
    return {
      requestPermission: () => bridge.requestNotificationPermission(),
      schedule: (options: any) => bridge.scheduleLocalNotification(options),
      cancel: (id: string) => bridge.cancelNotification(id)
    };
  }
};

// Capacitor plugin definitions for TypeScript
export const CAPACITOR_PLUGINS = {
  Camera: {
    takePhoto: (options?: any) => {},
    pickImage: (options?: any) => {},
    recordVideo: (options?: any) => {},
    saveToGallery: (options?: any) => {}
  },
  Geolocation: {
    getCurrentPosition: (options?: any) => {},
    watchPosition: (success: Function, error?: Function, options?: any) => {},
    clearWatch: (id: string) => {}
  },
  BiometricAuth: {
    authenticate: (options?: any) => {},
    checkAvailability: () => {}
  },
  LocalNotifications: {
    requestPermission: () => {},
    schedule: (options?: any) => {},
    cancel: (id: string) => {},
    addListener: (event: string, callback: Function) => {}
  },
  Share: {
    share: (options?: any) => {},
    addListener: (event: string, callback: Function) => {}
  },
  Filesystem: {
    pickDocument: (options?: any) => {},
    writeFile: (options?: any) => {},
    readFile: (options?: any) => {}
  },
  Network: {
    getStatus: () => {},
    addListener: (event: string, callback: Function) => {}
  },
  Haptics: {
    impact: (options?: any) => {},
    notification: (options?: any) => {},
    selection: () => {}
  },
  BarcodeScanner: {
    scan: (options?: any) => {},
    encode: (type: string, data: string) => {}
  },
  App: {
    addListener: (event: string, callback: Function) => {},
    getState: () => {},
    setBadgeCount: (count: number) => {},
    openUrl: (url: string) => {}
  },
  Store: {
    review: () => {},
    openUrl: (url: string) => {}
  },
  Purchases: {
    purchaseProduct: (productId: string) => {},
    restorePurchases: () => {},
    getProducts: (productIds: string[]) => {}
  }
};
