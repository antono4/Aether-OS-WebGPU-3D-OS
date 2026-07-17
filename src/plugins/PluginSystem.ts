/**
 * Aether OS - Plugin System
 * Extensible architecture for adding new features
 */

import { EventBus, Events } from '../core/EventBus';

// Plugin Types
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  type: 'feature' | 'theme' | 'integration' | 'tool';
  main: string;
  icon?: string;
  permissions?: string[];
  dependencies?: Record<string, string>;
}

export interface Plugin {
  manifest: PluginManifest;
  instance: PluginInstance;
  enabled: boolean;
  loadedAt?: number;
}

export interface PluginInstance {
  onLoad?: () => Promise<void> | void;
  onEnable?: () => Promise<void> | void;
  onDisable?: () => Promise<void> | void;
  onUnload?: () => Promise<void> | void;
  onEvent?: (event: string, data: any) => void;
  [key: string]: any;
}

export interface PluginAPI {
  registerComponent: (component: any) => void;
  registerTool: (tool: any) => void;
  registerTheme: (theme: any) => void;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (data?: any) => void) => () => void;
  storage: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
  };
  config: {
    get: (key: string) => any;
    set: (key: string, value: any) => void;
  };
}

export class PluginSystem {
  private eventBus: EventBus;
  private plugins: Map<string, Plugin> = new Map();
  private componentRegistry: Map<string, any> = new Map();
  private toolRegistry: Map<string, any> = new Map();
  private themeRegistry: Map<string, any> = new Map();
  private pluginAPI: PluginAPI;

  constructor(eventBus?: EventBus) {
    this.eventBus = eventBus || new EventBus();
    this.pluginAPI = this.createPluginAPI();
  }

  private createPluginAPI(): PluginAPI {
    return {
      registerComponent: (component: any) => {
        this.componentRegistry.set(component.id || component.name, component);
        this.eventBus.emit('plugin:component-registered', component);
      },
      registerTool: (tool: any) => {
        this.toolRegistry.set(tool.id || tool.name, tool);
        this.eventBus.emit('plugin:tool-registered', tool);
      },
      registerTheme: (theme: any) => {
        this.themeRegistry.set(theme.id || theme.name, theme);
        this.eventBus.emit('plugin:theme-registered', theme);
      },
      emit: (event: string, data?: any) => {
        this.eventBus.emit(event, data);
      },
      on: (event: string, callback: (data?: any) => void) => {
        return this.eventBus.on(event, callback);
      },
      storage: {
        get: async (key: string) => {
          const stored = localStorage.getItem(`plugin_${key}`);
          return stored ? JSON.parse(stored) : null;
        },
        set: async (key: string, value: any) => {
          localStorage.setItem(`plugin_${key}`, JSON.stringify(value));
        }
      },
      config: {
        get: (key: string) => {
          return localStorage.getItem(`plugin_config_${key}`);
        },
        set: (key: string, value: any) => {
          localStorage.setItem(`plugin_config_${key}`, String(value));
        }
      }
    };
  }

  /**
   * Register a plugin
   */
  async register(pluginData: { manifest: PluginManifest; instance: PluginInstance }): Promise<boolean> {
    const { manifest, instance } = pluginData;

    if (this.plugins.has(manifest.id)) {
      console.warn(`Plugin ${manifest.id} already registered`);
      return false;
    }

    try {
      const plugin: Plugin = {
        manifest,
        instance,
        enabled: false
      };

      this.plugins.set(manifest.id, plugin);
      console.log(`📦 Plugin registered: ${manifest.name} v${manifest.version}`);
      this.eventBus.emit('plugin:registered', manifest);

      return true;
    } catch (error) {
      console.error(`Failed to register plugin ${manifest.id}:`, error);
      return false;
    }
  }

  /**
   * Load and enable a plugin
   */
  async enable(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      console.warn(`Plugin ${pluginId} not found`);
      return false;
    }

    if (plugin.enabled) {
      return true;
    }

    try {
      // Execute onLoad
      if (plugin.instance.onLoad) {
        await plugin.instance.onLoad();
      }

      // Execute onEnable
      if (plugin.instance.onEnable) {
        await plugin.instance.onEnable();
      }

      plugin.enabled = true;
      plugin.loadedAt = Date.now();

      console.log(`✅ Plugin enabled: ${plugin.manifest.name}`);
      this.eventBus.emit('plugin:enabled', plugin.manifest);

      return true;
    } catch (error) {
      console.error(`Failed to enable plugin ${pluginId}:`, error);
      return false;
    }
  }

  /**
   * Disable a plugin
   */
  async disable(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;

    if (!plugin.enabled) return true;

    try {
      if (plugin.instance.onDisable) {
        await plugin.instance.onDisable();
      }

      plugin.enabled = false;
      console.log(`⏸️ Plugin disabled: ${plugin.manifest.name}`);
      this.eventBus.emit('plugin:disabled', plugin.manifest);

      return true;
    } catch (error) {
      console.error(`Failed to disable plugin ${pluginId}:`, error);
      return false;
    }
  }

  /**
   * Unregister a plugin
   */
  async unregister(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;

    if (plugin.enabled) {
      await this.disable(pluginId);
    }

    try {
      if (plugin.instance.onUnload) {
        await plugin.instance.onUnload();
      }

      this.plugins.delete(pluginId);
      console.log(`🗑️ Plugin unregistered: ${plugin.manifest.name}`);
      this.eventBus.emit('plugin:unregistered', plugin.manifest);

      return true;
    } catch (error) {
      console.error(`Failed to unregister plugin ${pluginId}:`, error);
      return false;
    }
  }

  /**
   * Get all plugins
   */
  getPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugin by ID
   */
  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get enabled plugins
   */
  getEnabledPlugins(): Plugin[] {
    return this.getPlugins().filter(p => p.enabled);
  }

  /**
   * Get plugin API
   */
  getAPI(): PluginAPI {
    return this.pluginAPI;
  }

  /**
   * Get registered components
   */
  getComponents(): Map<string, any> {
    return this.componentRegistry;
  }

  /**
   * Get registered tools
   */
  getTools(): Map<string, any> {
    return this.toolRegistry;
  }

  /**
   * Get registered themes
   */
  getThemes(): Map<string, any> {
    return this.themeRegistry;
  }

  /**
   * Load plugin from URL
   */
  async loadFromURL(url: string): Promise<boolean> {
    try {
      const response = await fetch(url);
      const data = await response.json();

      // Fetch the actual plugin code
      const manifestResponse = await fetch(url.replace('.json', `/${data.main}`));
      const pluginCode = await manifestResponse.text();

      // Create plugin instance from code (simplified)
      // In production, use proper sandboxing
      const instanceFactory = new Function('api', 'eventBus', `
        ${pluginCode}
        return { manifest, instance: new PluginClass(api, eventBus) };
      `);

      const { manifest, instance } = instanceFactory(this.pluginAPI, this.eventBus);
      
      return await this.register({ manifest, instance });
    } catch (error) {
      console.error('Failed to load plugin from URL:', error);
      return false;
    }
  }

  /**
   * Export plugin list
   */
  exportManifests(): PluginManifest[] {
    return this.getPlugins().map(p => p.manifest);
  }

  /**
   * Enable all plugins
   */
  async enableAll(): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (!plugin.enabled) {
        await this.enable(plugin.manifest.id);
      }
    }
  }

  /**
   * Disable all plugins
   */
  async disableAll(): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.enabled) {
        await this.disable(plugin.manifest.id);
      }
    }
  }
}

// Plugin template/example
export const examplePluginManifest: PluginManifest = {
  id: 'example-plugin',
  name: 'Example Plugin',
  version: '1.0.0',
  description: 'An example plugin demonstrating the plugin system',
  author: 'Aether OS Team',
  type: 'feature',
  main: 'index.js',
  icon: 'extension',
  permissions: ['storage', 'events']
};

export class ExamplePluginClass {
  private api: PluginAPI;
  private eventBus: EventBus;

  constructor(api: PluginAPI, eventBus: EventBus) {
    this.api = api;
    this.eventBus = eventBus;
  }

  async onLoad(): Promise<void> {
    console.log('Example plugin loading...');
  }

  async onEnable(): Promise<void> {
    console.log('Example plugin enabled!');
    
    // Register a custom tool
    this.api.registerTool({
      id: 'example-tool',
      name: 'Example Tool',
      execute: async (input: string) => {
        return { result: `Processed: ${input}` };
      }
    });
  }

  async onDisable(): Promise<void> {
    console.log('Example plugin disabled');
  }
}
