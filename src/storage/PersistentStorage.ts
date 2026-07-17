/**
 * Aether OS - Persistent Storage
 * IndexedDB wrapper for offline-first data persistence
 */

import { EventBus, Events } from '../core/EventBus';

export interface StorageConfig {
  databaseName: string;
  version: number;
  stores: StoreConfig[];
}

export interface StoreConfig {
  name: string;
  keyPath: string;
  indexes?: IndexConfig[];
  autoIncrement?: boolean;
}

export interface IndexConfig {
  name: string;
  keyPath: string;
  unique?: boolean;
  multiEntry?: boolean;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  direction?: 'next' | 'prev';
  index?: string;
  range?: IDBKeyRange;
}

export class PersistentStorage {
  private db: IDBDatabase | null = null;
  private config: StorageConfig;
  private eventBus: EventBus;
  private isReady: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor(config: Partial<StorageConfig> = {}, eventBus?: EventBus) {
    this.eventBus = eventBus || new EventBus();
    this.config = {
      databaseName: config.databaseName || 'aether-os',
      version: config.version || 1,
      stores: config.stores || this.getDefaultStores()
    };
    this.initPromise = this.initialize();
  }

  private getDefaultStores(): StoreConfig[] {
    return [
      {
        name: 'nodes',
        keyPath: 'id',
        indexes: [
          { name: 'type', keyPath: 'type' },
          { name: 'created', keyPath: 'metadata.created' },
          { name: 'tags', keyPath: 'metadata.tags', multiEntry: true }
        ]
      },
      {
        name: 'edges',
        keyPath: 'id',
        indexes: [
          { name: 'source', keyPath: 'source' },
          { name: 'target', keyPath: 'target' },
          { name: 'type', keyPath: 'type' }
        ]
      },
      {
        name: 'tools',
        keyPath: 'id',
        indexes: [
          { name: 'intent', keyPath: 'intent' },
          { name: 'created', keyPath: 'metadata.created' }
        ]
      },
      {
        name: 'settings',
        keyPath: 'key',
        indexes: []
      },
      {
        name: 'sessions',
        keyPath: 'id',
        indexes: [
          { name: 'timestamp', keyPath: 'timestamp' }
        ]
      },
      {
        name: 'plugins',
        keyPath: 'id',
        indexes: [
          { name: 'enabled', keyPath: 'enabled' },
          { name: 'type', keyPath: 'type' }
        ]
      }
    ];
  }

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.databaseName, this.config.version);

      request.onerror = () => {
        console.error('IndexedDB Error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isReady = true;
        console.log('✅ IndexedDB initialized:', this.config.databaseName);
        this.eventBus.emit(Events.READY);
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create stores
        this.config.stores.forEach(store => {
          if (!db.objectStoreNames.contains(store.name)) {
            const objectStore = db.createObjectStore(store.name, {
              keyPath: store.keyPath,
              autoIncrement: store.autoIncrement || false
            });

            // Create indexes
            store.indexes?.forEach(index => {
              objectStore.createIndex(index.name, index.keyPath, {
                unique: index.unique || false,
                multiEntry: index.multiEntry || false
              });
            });

            console.log(`📦 Store created: ${store.name}`);
          }
        });
      };
    });
  }

  async waitForReady(): Promise<void> {
    if (this.isReady) return;
    if (this.initPromise) await this.initPromise;
  }

  async put<T>(storeName: string, item: T): Promise<T> {
    await this.waitForReady();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);

      request.onsuccess = () => {
        this.eventBus.emit(Events.MEMORY_STORED, { store: storeName, item });
        resolve(item);
      };

      request.onerror = () => {
        console.error('Put error:', request.error);
        reject(request.error);
      };
    });
  }

  async get<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
    await this.waitForReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result as T | undefined);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll<T>(storeName: string, options?: QueryOptions): Promise<T[]> {
    await this.waitForReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        let results = request.result as T[];
        if (options?.offset) results = results.slice(options.offset);
        if (options?.limit) results = results.slice(0, options.limit);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, key: IDBValidKey): Promise<void> {
    await this.waitForReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName: string): Promise<void> {
    await this.waitForReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async query<T>(storeName: string, indexName: string, value: IDBValidKey): Promise<T[]> {
    await this.waitForReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  }

  async count(storeName: string): Promise<number> {
    await this.waitForReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async batch<T>(storeName: string, items: T[], operation: 'put' | 'delete'): Promise<void> {
    await this.waitForReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      items.forEach(item => {
        if (operation === 'put') {
          store.put(item);
        } else {
          store.delete((item as any)[this.config.stores.find(s => s.name === storeName)!.keyPath]);
        }
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async export(): Promise<Record<string, any[]>> {
    await this.waitForReady();
    const data: Record<string, any[]> = {};

    for (const store of this.config.stores) {
      data[store.name] = await this.getAll(store.name);
    }

    return data;
  }

  async import(data: Record<string, any[]>): Promise<void> {
    await this.waitForReady();

    for (const [storeName, items] of Object.entries(data)) {
      if (this.config.stores.some(s => s.name === storeName)) {
        await this.clear(storeName);
        await this.batch(storeName, items, 'put');
      }
    }
  }

  async getStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return { usage: estimate.usage || 0, quota: estimate.quota || 0 };
    }
    return null;
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isReady = false;
    }
  }

  async deleteDatabase(): Promise<void> {
    this.close();
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this.config.databaseName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const storage = new PersistentStorage();
