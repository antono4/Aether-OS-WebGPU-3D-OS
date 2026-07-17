/**
 * Aether OS - Ecosystem & Marketplace
 * Plugin store, themes, templates, community features
 */

import { EventBus } from '../core/EventBus';
import { PluginSystem } from '../plugins/PluginSystem';

export interface MarketplaceItem {
  id: string;
  type: 'plugin' | 'theme' | 'template' | 'model';
  name: string;
  description: string;
  author: string;
  authorAvatar?: string;
  version: string;
  downloads: number;
  rating: number;
  reviews: Review[];
  price: number; // 0 = free
  images: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
  dependencies?: string[];
  compatibility: string; // e.g., "1.0.0+"
  requirements?: { vram: string; ram: string; disk: string };
}

export interface Review {
  id: string;
  author: string;
  authorAvatar?: string;
  rating: number;
  content: string;
  createdAt: number;
  helpful: number;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  preview: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  effects: ThemeEffects;
  author: string;
  version: string;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  success: string;
  warning: string;
  error: string;
  glass?: string;
}

export interface ThemeTypography {
  fontFamily: string;
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    xxl: string;
  };
  fontWeight: {
    light: number;
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };
}

export interface ThemeSpacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  xxl: string;
}

export interface ThemeEffects {
  blur: string;
  shadow: string;
  borderRadius: string;
  transitions: string;
  animations: boolean;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail: string;
  author: string;
  version: string;
  nodes: TemplateNode[];
  edges: TemplateEdge[];
  settings: Record<string, any>;
}

export interface TemplateNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, any>;
}

export interface TemplateEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
}

export interface AIIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  size: string;
  quantization: string;
  requirements: {
    vram: string;
    ram: string;
    disk: string;
  };
  Ollama: boolean;
  HuggingFace?: string;
}

export class Marketplace {
  private eventBus: EventBus;
  private items: MarketplaceItem[] = [];
  private installed: Set<string> = new Set();
  private favorites: Set<string> = new Set();

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.initializeMockData();
  }

  private initializeMockData(): void {
    // Mock plugins
    this.items = [
      {
        id: 'plugin-analytics',
        type: 'plugin',
        name: 'Analytics Dashboard',
        description: 'Real-time analytics and insights for your workspace',
        author: 'Aether Team',
        version: '1.0.0',
        downloads: 15420,
        rating: 4.8,
        reviews: [],
        price: 0,
        images: ['https://picsum.photos/400/300?random=1'],
        tags: ['analytics', 'dashboard', 'stats'],
        createdAt: Date.now() - 86400000 * 30,
        updatedAt: Date.now() - 86400000 * 5,
        compatibility: '1.0.0+'
      },
      {
        id: 'plugin-github',
        type: 'plugin',
        name: 'GitHub Integration',
        description: 'Connect your GitHub repos and manage PRs',
        author: 'DevTools Inc',
        version: '2.1.0',
        downloads: 8932,
        rating: 4.6,
        reviews: [],
        price: 0,
        images: ['https://picsum.photos/400/300?random=2'],
        tags: ['github', 'integration', 'development'],
        createdAt: Date.now() - 86400000 * 60,
        updatedAt: Date.now() - 86400000 * 10,
        compatibility: '1.0.0+'
      },
      {
        id: 'theme-cyberpunk',
        type: 'theme',
        name: 'Cyberpunk Dark',
        description: 'Futuristic neon cyberpunk theme with glowing accents',
        author: 'NeonDesigns',
        version: '1.2.0',
        downloads: 23100,
        rating: 4.9,
        reviews: [],
        price: 0,
        images: ['https://picsum.photos/400/300?random=3'],
        tags: ['dark', 'cyberpunk', 'neon'],
        createdAt: Date.now() - 86400000 * 45,
        updatedAt: Date.now() - 86400000 * 3,
        compatibility: '1.0.0+'
      },
      {
        id: 'theme-minimal',
        type: 'theme',
        name: 'Minimal Light',
        description: 'Clean, minimalist light theme for productivity',
        author: 'CleanUI',
        version: '1.0.0',
        downloads: 31200,
        rating: 4.7,
        reviews: [],
        price: 0,
        images: ['https://picsum.photos/400/300?random=4'],
        tags: ['minimal', 'light', 'productivity'],
        createdAt: Date.now() - 86400000 * 90,
        updatedAt: Date.now() - 86400000 * 15,
        compatibility: '1.0.0+'
      },
      {
        id: 'template-project',
        type: 'template',
        name: 'Project Management',
        description: 'Complete project management workspace with kanban board',
        author: 'ProductivityHub',
        version: '1.1.0',
        downloads: 12400,
        rating: 4.5,
        reviews: [],
        price: 0,
        images: ['https://picsum.photos/400/300?random=5'],
        tags: ['project', 'kanban', 'management'],
        createdAt: Date.now() - 86400000 * 20,
        updatedAt: Date.now() - 86400000 * 2,
        compatibility: '1.0.0+'
      },
      {
        id: 'template-research',
        type: 'template',
        name: 'Research Notebook',
        description: 'Template for academic research and note-taking',
        author: 'ScholarTools',
        version: '2.0.0',
        downloads: 7800,
        rating: 4.8,
        reviews: [],
        price: 0,
        images: ['https://picsum.photos/400/300?random=6'],
        tags: ['research', 'academic', 'notes'],
        createdAt: Date.now() - 86400000 * 55,
        updatedAt: Date.now() - 86400000 * 8,
        compatibility: '1.0.0+'
      },
      {
        id: 'model-llama3',
        type: 'model',
        name: 'Llama 3 8B',
        description: 'Meta\'s latest open-source LLM for local inference',
        author: 'Meta AI',
        version: '8B-Instruct',
        downloads: 45000,
        rating: 4.7,
        reviews: [],
        price: 0,
        images: ['https://picsum.photos/400/300?random=7'],
        tags: ['llm', 'llama', 'local'],
        createdAt: Date.now() - 86400000 * 15,
        updatedAt: Date.now() - 86400000 * 1,
        compatibility: '1.0.0+',
        requirements: { vram: '6GB', ram: '8GB', disk: '15GB' }
      }
    ];

    // Load installed and favorites from localStorage
    const storedInstalled = localStorage.getItem('aether_installed');
    const storedFavorites = localStorage.getItem('aether_favorites');

    if (storedInstalled) {
      JSON.parse(storedInstalled).forEach((id: string) => this.installed.add(id));
    }
    if (storedFavorites) {
      JSON.parse(storedFavorites).forEach((id: string) => this.favorites.add(id));
    }
  }

  getItems(type?: string, category?: string): MarketplaceItem[] {
    let items = [...this.items];

    if (type) {
      items = items.filter(i => i.type === type);
    }

    if (category) {
      items = items.filter(i => i.tags.includes(category));
    }

    return items.sort((a, b) => b.downloads - a.downloads);
  }

  getItem(id: string): MarketplaceItem | undefined {
    return this.items.find(i => i.id === id);
  }

  searchItems(query: string): MarketplaceItem[] {
    const queryLower = query.toLowerCase();
    return this.items.filter(item =>
      item.name.toLowerCase().includes(queryLower) ||
      item.description.toLowerCase().includes(queryLower) ||
      item.tags.some(tag => tag.toLowerCase().includes(queryLower))
    );
  }

  getFeatured(): MarketplaceItem[] {
    return this.items.filter(i => i.downloads > 10000).slice(0, 6);
  }

  getTrending(): MarketplaceItem[] {
    return [...this.items].sort((a, b) => b.rating - a.rating).slice(0, 6);
  }

  isInstalled(id: string): boolean {
    return this.installed.has(id);
  }

  isFavorite(id: string): boolean {
    return this.favorites.has(id);
  }

  toggleFavorite(id: string): boolean {
    if (this.favorites.has(id)) {
      this.favorites.delete(id);
    } else {
      this.favorites.add(id);
    }
    localStorage.setItem('aether_favorites', JSON.stringify([...this.favorites]));
    return this.favorites.has(id);
  }

  async install(id: string): Promise<boolean> {
    const item = this.getItem(id);
    if (!item) return false;

    // Simulate installation delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    this.installed.add(id);
    localStorage.setItem('aether_installed', JSON.stringify([...this.installed]));

    this.eventBus.emit('marketplace:installed', item);
    console.log(`📦 Installed: ${item.name}`);

    return true;
  }

  async uninstall(id: string): Promise<boolean> {
    const item = this.getItem(id);
    if (!item) return false;

    this.installed.delete(id);
    localStorage.setItem('aether_installed', JSON.stringify([...this.installed]));

    this.eventBus.emit('marketplace:uninstalled', item);
    console.log(`🗑️ Uninstalled: ${item.name}`);

    return true;
  }

  getCategories(): { type: string; name: string; count: number }[] {
    const categories: Record<string, { name: string; count: number }> = {
      plugin: { name: 'Plugins', count: 0 },
      theme: { name: 'Themes', count: 0 },
      template: { name: 'Templates', count: 0 },
      model: { name: 'AI Models', count: 0 }
    };

    this.items.forEach(item => {
      categories[item.type].count++;
    });

    return Object.entries(categories).map(([type, data]) => ({
      type,
      ...data
    }));
  }

  getInstalled(): MarketplaceItem[] {
    return this.items.filter(i => this.installed.has(i.id));
  }

  getFavorites(): MarketplaceItem[] {
    return this.items.filter(i => this.favorites.has(i.id));
  }
}

// Theme Manager
export class ThemeManager {
  private eventBus: EventBus;
  private currentTheme: string = 'default';
  private customThemes: Map<string, Theme> = new Map();
  private root: HTMLElement = document.documentElement;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.loadThemes();
  }

  private loadThemes(): void {
    // Built-in themes
    this.customThemes.set('default', this.getDefaultTheme());
    this.customThemes.set('cyberpunk', this.getCyberpunkTheme());
    this.customThemes.set('minimal', this.getMinimalTheme());
    this.customThemes.set('ocean', this.getOceanTheme());
    this.customThemes.set('sunset', this.getSunsetTheme());

    // Load saved theme
    const savedTheme = localStorage.getItem('aether_theme');
    if (savedTheme && this.customThemes.has(savedTheme)) {
      this.applyTheme(savedTheme);
    }
  }

  private getDefaultTheme(): Theme {
    return {
      id: 'default',
      name: 'Aether Dark',
      description: 'The default Aether OS dark theme',
      preview: '',
      colors: {
        primary: '#00d9ff',
        secondary: '#00ff88',
        accent: '#ff00ff',
        background: '#0a0a0f',
        surface: '#1a1a2e',
        text: '#ffffff',
        textSecondary: '#a0a0b0',
        success: '#00ff88',
        warning: '#ffaa00',
        error: '#ff6b6b'
      },
      typography: {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: { xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem', xxl: '1.5rem' },
        fontWeight: { light: 300, normal: 400, medium: 500, semibold: 600, bold: 700 }
      },
      spacing: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem', xxl: '3rem' },
      effects: { blur: '20px', shadow: '0 4px 30px rgba(0,0,0,0.1)', borderRadius: '12px', transitions: '0.3s', animations: true },
      author: 'Aether OS',
      version: '1.0.0'
    };
  }

  private getCyberpunkTheme(): Theme {
    const theme = this.getDefaultTheme();
    theme.id = 'cyberpunk';
    theme.name = 'Cyberpunk Neon';
    theme.colors = {
      primary: '#00ffff',
      secondary: '#ff00ff',
      accent: '#ffff00',
      background: '#0a0010',
      surface: '#1a0025',
      text: '#ffffff',
      textSecondary: '#ff00ff',
      success: '#00ff00',
      warning: '#ffaa00',
      error: '#ff0000'
    };
    theme.effects.animations = true;
    theme.author = 'NeonDesigns';
    return theme;
  }

  private getMinimalTheme(): Theme {
    const theme = this.getDefaultTheme();
    theme.id = 'minimal';
    theme.name = 'Minimal Light';
    theme.colors = {
      primary: '#2563eb',
      secondary: '#10b981',
      accent: '#f59e0b',
      background: '#f8fafc',
      surface: '#ffffff',
      text: '#1e293b',
      textSecondary: '#64748b',
      success: '#22c55e',
      warning: '#eab308',
      error: '#ef4444'
    };
    theme.author = 'CleanUI';
    return theme;
  }

  private getOceanTheme(): Theme {
    const theme = this.getDefaultTheme();
    theme.id = 'ocean';
    theme.name = 'Ocean Deep';
    theme.colors = {
      primary: '#0ea5e9',
      secondary: '#06b6d4',
      accent: '#14b8a6',
      background: '#0c1222',
      surface: '#1e293b',
      text: '#e2e8f0',
      textSecondary: '#94a3b8',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#f43f5e'
    };
    theme.author = 'DeepBlue';
    return theme;
  }

  private getSunsetTheme(): Theme {
    const theme = this.getDefaultTheme();
    theme.id = 'sunset';
    theme.name = 'Sunset Glow';
    theme.colors = {
      primary: '#f97316',
      secondary: '#ec4899',
      accent: '#eab308',
      background: '#1c1917',
      surface: '#292524',
      text: '#fef3c7',
      textSecondary: '#d6d3d1',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444'
    };
    theme.author = 'WarmTones';
    return theme;
  }

  applyTheme(themeId: string): boolean {
    const theme = this.customThemes.get(themeId);
    if (!theme) return false;

    this.currentTheme = themeId;
    localStorage.setItem('aether_theme', themeId);

    // Apply CSS variables
    const root = document.documentElement;
    root.style.setProperty('--color-primary', theme.colors.primary);
    root.style.setProperty('--color-secondary', theme.colors.secondary);
    root.style.setProperty('--color-accent', theme.colors.accent);
    root.style.setProperty('--color-bg', theme.colors.background);
    root.style.setProperty('--color-surface', theme.colors.surface);
    root.style.setProperty('--color-text', theme.colors.text);
    root.style.setProperty('--color-text-secondary', theme.colors.textSecondary);
    root.style.setProperty('--color-success', theme.colors.success);
    root.style.setProperty('--color-warning', theme.colors.warning);
    root.style.setProperty('--color-error', theme.colors.error);

    this.eventBus.emit('theme:changed', theme);
    console.log(`🎨 Theme applied: ${theme.name}`);

    return true;
  }

  getCurrentTheme(): Theme | undefined {
    return this.customThemes.get(this.currentTheme);
  }

  getAvailableThemes(): Theme[] {
    return Array.from(this.customThemes.values());
  }

  addCustomTheme(theme: Theme): void {
    this.customThemes.set(theme.id, theme);
  }

  exportTheme(themeId: string): string | null {
    const theme = this.customThemes.get(themeId);
    if (!theme) return null;
    return JSON.stringify(theme, null, 2);
  }

  importTheme(json: string): boolean {
    try {
      const theme = JSON.parse(json) as Theme;
      if (!theme.id || !theme.name || !theme.colors) {
        throw new Error('Invalid theme format');
      }
      this.customThemes.set(theme.id, theme);
      return true;
    } catch (e) {
      console.error('Failed to import theme:', e);
      return false;
    }
  }
}

// Template Manager
export class TemplateManager {
  private eventBus: EventBus;
  private templates: Map<string, Template> = new Map();

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates(): void {
    this.templates.set('blank', {
      id: 'blank',
      name: 'Blank Workspace',
      description: 'Start with an empty canvas',
      category: 'general',
      thumbnail: '',
      author: 'Aether OS',
      version: '1.0.0',
      nodes: [],
      edges: [],
      settings: {}
    });

    this.templates.set('task-board', {
      id: 'task-board',
      name: 'Task Board',
      description: 'Organize tasks with kanban-style columns',
      category: 'productivity',
      thumbnail: '',
      author: 'Aether OS',
      version: '1.0.0',
      nodes: [
        { id: 'col-todo', type: 'column', position: { x: 0, y: 0 }, data: { title: 'To Do', color: '#ff6b6b' } },
        { id: 'col-progress', type: 'column', position: { x: 300, y: 0 }, data: { title: 'In Progress', color: '#ffaa00' } },
        { id: 'col-done', type: 'column', position: { x: 600, y: 0 }, data: { title: 'Done', color: '#00ff88' } }
      ],
      edges: [],
      settings: { layout: 'kanban' }
    });

    this.templates.set('meeting-notes', {
      id: 'meeting-notes',
      name: 'Meeting Notes',
      description: 'Structured template for meeting documentation',
      category: 'collaboration',
      thumbnail: '',
      author: 'Aether OS',
      version: '1.0.0',
      nodes: [
        { id: 'agenda', type: 'section', position: { x: 0, y: 0 }, data: { title: 'Agenda', content: '' } },
        { id: 'notes', type: 'section', position: { x: 0, y: 200 }, data: { title: 'Notes', content: '' } },
        { id: 'action-items', type: 'section', position: { x: 0, y: 400 }, data: { title: 'Action Items', content: '' } }
      ],
      edges: [],
      settings: { format: 'meeting' }
    });
  }

  getTemplates(category?: string): Template[] {
    let templates = Array.from(this.templates.values());
    if (category) {
      templates = templates.filter(t => t.category === category);
    }
    return templates;
  }

  getTemplate(id: string): Template | undefined {
    return this.templates.get(id);
  }

  createFromTemplate(templateId: string, name: string): string | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    // Generate workspace from template
    const workspaceId = `workspace-${Date.now()}`;
    console.log(`📋 Created workspace "${name}" from template "${template.name}"`);
    
    return workspaceId;
  }

  addCustomTemplate(template: Template): void {
    this.templates.set(template.id, template);
  }
}
