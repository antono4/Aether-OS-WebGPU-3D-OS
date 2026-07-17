/**
 * Aether OS - Multi-Workspace System
 * Enterprise-grade workspace management
 */

import { EventBus } from '../core/EventBus';
import { storage } from '../storage/PersistentStorage';

export interface Workspace {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  nodes: string[];
  settings: WorkspaceSettings;
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
}

export interface WorkspaceSettings {
  backgroundColor?: string;
  defaultLayout?: 'grid' | 'freeform' | 'focused';
  autoSave?: boolean;
  autoSaveInterval?: number;
  theme?: string;
  permissions?: WorkspacePermissions;
}

export interface WorkspacePermissions {
  public: boolean;
  allowGuests: boolean;
  requireAuth: boolean;
  shareable: boolean;
}

export interface WorkspaceMetadata {
  totalNodes: number;
  totalEdges: number;
  lastAccessed: number;
  createdBy: string;
  tags: string[];
}

export class MultiWorkspace {
  private eventBus: EventBus;
  private workspaces: Map<string, Workspace> = new Map();
  private activeWorkspace: Workspace | null = null;
  private listeners: Map<string, Function[]> = new Map();

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.loadWorkspaces();
  }

  private async loadWorkspaces(): Promise<void> {
    try {
      const stored = await storage.getAll<Workspace>('workspaces');
      stored.forEach(ws => {
        this.workspaces.set(ws.id, ws);
        if (ws.isActive) {
          this.activeWorkspace = ws;
        }
      });

      // Create default workspace if none exists
      if (this.workspaces.size === 0) {
        await this.createWorkspace({
          name: 'Personal',
          description: 'Your personal workspace',
          icon: '🏠',
          color: '#00d9ff'
        });
      }

      console.log(`📁 Loaded ${this.workspaces.size} workspaces`);
    } catch (e) {
      console.error('Failed to load workspaces:', e);
    }
  }

  async createWorkspace(data: {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
  }): Promise<Workspace> {
    const workspace: Workspace = {
      id: `workspace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: data.name,
      description: data.description || '',
      icon: data.icon || '📁',
      color: data.color || '#00d9ff',
      nodes: [],
      settings: {
        backgroundColor: '#0a0a0f',
        defaultLayout: 'freeform',
        autoSave: true,
        autoSaveInterval: 30000,
        theme: 'dark',
        permissions: {
          public: false,
          allowGuests: false,
          requireAuth: true,
          shareable: true
        }
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isActive: false
    };

    this.workspaces.set(workspace.id, workspace);
    await storage.put('workspaces', workspace);

    this.emit('workspace:created', workspace);
    console.log(`📁 Created workspace: ${workspace.name}`);

    return workspace;
  }

  async switchWorkspace(workspaceId: string): Promise<boolean> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return false;

    // Deactivate current
    if (this.activeWorkspace) {
      this.activeWorkspace.isActive = false;
      await storage.put('workspaces', this.activeWorkspace);
    }

    // Activate new
    workspace.isActive = true;
    workspace.updatedAt = Date.now();
    await storage.put('workspaces', workspace);

    this.activeWorkspace = workspace;
    this.emit('workspace:switched', workspace);

    console.log(`📁 Switched to workspace: ${workspace.name}`);
    return true;
  }

  async deleteWorkspace(workspaceId: string): Promise<boolean> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return false;

    // Don't delete last workspace
    if (this.workspaces.size <= 1) {
      console.warn('Cannot delete the last workspace');
      return false;
    }

    this.workspaces.delete(workspaceId);
    await storage.delete('workspaces', workspaceId);

    // Switch to another workspace if deleted was active
    if (this.activeWorkspace?.id === workspaceId) {
      const remaining = Array.from(this.workspaces.values())[0];
      if (remaining) {
        await this.switchWorkspace(remaining.id);
      }
    }

    this.emit('workspace:deleted', workspace);
    console.log(`📁 Deleted workspace: ${workspace.name}`);

    return true;
  }

  async updateWorkspace(workspaceId: string, updates: Partial<Workspace>): Promise<Workspace | null> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return null;

    const updated: Workspace = {
      ...workspace,
      ...updates,
      id: workspace.id, // Prevent ID change
      updatedAt: Date.now()
    };

    this.workspaces.set(workspaceId, updated);
    await storage.put('workspaces', updated);

    this.emit('workspace:updated', updated);

    return updated;
  }

  async duplicateWorkspace(workspaceId: string): Promise<Workspace | null> {
    const original = this.workspaces.get(workspaceId);
    if (!original) return null;

    return this.createWorkspace({
      name: `${original.name} (Copy)`,
      description: original.description,
      icon: original.icon,
      color: original.color
    });
  }

  async exportWorkspace(workspaceId: string): Promise<string> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return '';

    const data = {
      workspace,
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };

    return JSON.stringify(data, null, 2);
  }

  async importWorkspace(jsonData: string): Promise<Workspace | null> {
    try {
      const data = JSON.parse(jsonData);
      const imported = await this.createWorkspace({
        name: data.workspace?.name || 'Imported Workspace',
        description: data.workspace?.description,
        icon: data.workspace?.icon,
        color: data.workspace?.color
      });

      return imported;
    } catch (e) {
      console.error('Failed to import workspace:', e);
      return null;
    }
  }

  getWorkspace(workspaceId: string): Workspace | undefined {
    return this.workspaces.get(workspaceId);
  }

  getActiveWorkspace(): Workspace | null {
    return this.activeWorkspace;
  }

  getAllWorkspaces(): Workspace[] {
    return Array.from(this.workspaces.values());
  }

  getWorkspaceCount(): number {
    return this.workspaces.size;
  }

  on(event: string, callback: Function): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);

    return () => {
      const callbacks = this.listeners.get(event) || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    };
  }

  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(cb => cb(data));
  }
}

// Workspace UI Component
export class WorkspaceSwitcher {
  private multiWorkspace: MultiWorkspace;
  private container: HTMLElement | null = null;
  private isOpen: boolean = false;

  constructor(multiWorkspace: MultiWorkspace) {
    this.multiWorkspace = multiWorkspace;
  }

  render(container: HTMLElement): void {
    this.container = container;
    
    container.innerHTML = `
      <div class="workspace-switcher">
        <div class="workspace-header">
          <h3>📁 Workspaces</h3>
          <button class="workspace-add" title="New Workspace">+</button>
        </div>
        <div class="workspace-list"></div>
      </div>
      
      <style>
        .workspace-switcher {
          background: var(--glass-bg, rgba(26,26,46,0.8));
          backdrop-filter: blur(20px);
          border: var(--glass-border, 1px solid rgba(255,255,255,0.1));
          border-radius: 16px;
          padding: 16px;
          width: 280px;
          max-height: 400px;
          overflow-y: auto;
        }
        .workspace-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .workspace-header h3 { margin: 0; color: #00d9ff; font-size: 14px; }
        .workspace-add {
          width: 28px; height: 28px; border: none; border-radius: 8px;
          background: rgba(0,217,255,0.2); color: #00d9ff; font-size: 18px;
          cursor: pointer; transition: all 0.2s;
        }
        .workspace-add:hover { background: rgba(0,217,255,0.4); }
        .workspace-list { display: flex; flex-direction: column; gap: 4px; }
        .workspace-item {
          display: flex; align-items: center; gap: 10px; padding: 10px;
          background: rgba(255,255,255,0.03); border-radius: 10px; cursor: pointer;
          transition: all 0.2s; border: 2px solid transparent;
        }
        .workspace-item:hover { background: rgba(255,255,255,0.08); }
        .workspace-item.active { border-color: #00d9ff; background: rgba(0,217,255,0.1); }
        .workspace-item .icon { font-size: 20px; }
        .workspace-item .info { flex: 1; }
        .workspace-item .name { font-size: 13px; font-weight: 600; color: #fff; }
        .workspace-item .desc { font-size: 11px; color: #a0a0b0; margin-top: 2px; }
        .workspace-item .actions {
          display: flex; gap: 4px; opacity: 0; transition: opacity 0.2s;
        }
        .workspace-item:hover .actions { opacity: 1; }
        .workspace-item .action-btn {
          width: 24px; height: 24px; border: none; border-radius: 6px;
          background: rgba(255,255,255,0.1); color: #a0a0b0; font-size: 12px;
          cursor: pointer; transition: all 0.2s;
        }
        .workspace-item .action-btn:hover { background: rgba(255,255,255,0.2); color: #fff; }
        .workspace-item .action-btn.delete:hover { background: rgba(255,107,107,0.3); color: #ff6b6b; }
      </style>
    `;

    this.updateList();
    this.setupEventListeners();
  }

  private updateList(): void {
    const list = this.container?.querySelector('.workspace-list');
    if (!list) return;

    const workspaces = this.multiWorkspace.getAllWorkspaces();
    const activeId = this.multiWorkspace.getActiveWorkspace()?.id;

    list.innerHTML = workspaces.map(ws => `
      <div class="workspace-item ${ws.id === activeId ? 'active' : ''}" data-id="${ws.id}">
        <span class="icon">${ws.icon}</span>
        <div class="info">
          <div class="name">${ws.name}</div>
          <div class="desc">${ws.description || 'No description'}</div>
        </div>
        <div class="actions">
          <button class="action-btn edit" title="Edit">✏️</button>
          <button class="action-btn delete" title="Delete">🗑️</button>
        </div>
      </div>
    `).join('');
  }

  private setupEventListeners(): void {
    const addBtn = this.container?.querySelector('.workspace-add');
    const list = this.container?.querySelector('.workspace-list');

    addBtn?.addEventListener('click', () => {
      const name = prompt('Workspace name:');
      if (name) {
        this.multiWorkspace.createWorkspace({ name });
        this.updateList();
      }
    });

    list?.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement;
      const item = target.closest('.workspace-item') as HTMLElement;
      if (!item) return;

      const id = item.dataset.id!;

      if (target.closest('.edit')) {
        // Edit workspace
        const ws = this.multiWorkspace.getWorkspace(id);
        if (ws) {
          const name = prompt('New name:', ws.name);
          if (name) {
            this.multiWorkspace.updateWorkspace(id, { name });
            this.updateList();
          }
        }
      } else if (target.closest('.delete')) {
        // Delete workspace
        if (confirm('Delete this workspace?')) {
          this.multiWorkspace.deleteWorkspace(id);
          this.updateList();
        }
      } else {
        // Switch workspace
        this.multiWorkspace.switchWorkspace(id);
        this.updateList();
      }
    });
  }
}
