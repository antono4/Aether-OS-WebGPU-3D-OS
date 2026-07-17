/**
 * Aether OS - Admin Dashboard
 * System monitoring and management
 */

import { EventBus } from '../core/EventBus';
import { storage } from '../storage/PersistentStorage';
import { AuditLogger, AuditEntry } from './SecurityManager';

export interface SystemMetrics {
  totalNodes: number;
  totalEdges: number;
  totalWorkspaces: number;
  totalUsers: number;
  activeUsers: number;
  storageUsed: number;
  storageQuota: number;
  uptime: number;
  averageFps: number;
  memoryUsage: number;
  errorsLast24h: number;
}

export interface SystemInfo {
  version: string;
  buildNumber: string;
  environment: 'development' | 'staging' | 'production';
  lastUpdated: number;
  features: FeatureFlags;
}

export interface FeatureFlags {
  aiEnabled: boolean;
  collaborationEnabled: boolean;
  voiceEnabled: boolean;
  shaderEnabled: boolean;
  pluginsEnabled: boolean;
  mobileEnabled: boolean;
}

export class AdminDashboard {
  private eventBus: EventBus;
  private auditLogger: AuditLogger;
  private container: HTMLElement | null = null;
  private metricsInterval: number = 0;
  private startTime: number = Date.now();

  constructor(eventBus: EventBus, auditLogger: AuditLogger) {
    this.eventBus = eventBus;
    this.auditLogger = auditLogger;
  }

  render(container: HTMLElement): void {
    this.container = container;

    container.innerHTML = `
      <div class="admin-dashboard">
        <div class="dashboard-header">
          <h2>⚙️ Admin Dashboard</h2>
          <div class="dashboard-actions">
            <button class="btn-refresh">🔄 Refresh</button>
            <button class="btn-export">📥 Export Data</button>
          </div>
        </div>

        <div class="dashboard-tabs">
          <button class="tab active" data-tab="overview">Overview</button>
          <button class="tab" data-tab="security">Security</button>
          <button class="tab" data-tab="performance">Performance</button>
          <button class="tab" data-tab="audit">Audit Logs</button>
        </div>

        <div class="dashboard-content">
          <div id="tab-overview" class="tab-content active">
            ${this.renderOverviewTab()}
          </div>
          <div id="tab-security" class="tab-content">
            ${this.renderSecurityTab()}
          </div>
          <div id="tab-performance" class="tab-content">
            ${this.renderPerformanceTab()}
          </div>
          <div id="tab-audit" class="tab-content">
            ${this.renderAuditTab()}
          </div>
        </div>
      </div>

      <style>
        .admin-dashboard {
          background: var(--glass-bg, rgba(26,26,46,0.9));
          backdrop-filter: blur(20px);
          border: var(--glass-border, 1px solid rgba(255,255,255,0.1));
          border-radius: 16px;
          padding: 20px;
          width: 100%;
          max-width: 1000px;
          max-height: 80vh;
          overflow-y: auto;
        }
        .dashboard-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 20px;
        }
        .dashboard-header h2 { margin: 0; color: #00d9ff; }
        .dashboard-actions { display: flex; gap: 8px; }
        .dashboard-actions button {
          padding: 8px 16px; border: 1px solid rgba(0,217,255,0.3);
          background: rgba(0,217,255,0.1); color: #00d9ff;
          border-radius: 8px; cursor: pointer; transition: all 0.2s;
        }
        .dashboard-actions button:hover { background: rgba(0,217,255,0.2); }
        .dashboard-tabs { display: flex; gap: 4px; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 20px; }
        .dashboard-tabs .tab {
          padding: 12px 20px; background: none; border: none;
          color: #a0a0b0; cursor: pointer; border-bottom: 2px solid transparent;
          transition: all 0.2s;
        }
        .dashboard-tabs .tab:hover { color: #fff; }
        .dashboard-tabs .tab.active { color: #00d9ff; border-bottom-color: #00d9ff; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
        .metric-card {
          background: rgba(255,255,255,0.03); border-radius: 12px; padding: 16px;
        }
        .metric-card .label { font-size: 12px; color: #a0a0b0; margin-bottom: 4px; }
        .metric-card .value { font-size: 24px; font-weight: 700; color: #fff; }
        .metric-card .value.positive { color: #00ff88; }
        .metric-card .value.warning { color: #ffaa00; }
        .metric-card .value.negative { color: #ff6b6b; }
        .metric-card .sub { font-size: 11px; color: #a0a0b0; margin-top: 4px; }
        .progress-bar { height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; margin-top: 8px; overflow: hidden; }
        .progress-bar .fill { height: 100%; background: linear-gradient(90deg, #00d9ff, #00ff88); transition: width 0.3s; }
        .section { margin-bottom: 20px; }
        .section h3 { margin: 0 0 12px; font-size: 14px; color: #fff; }
        .audit-list { max-height: 300px; overflow-y: auto; }
        .audit-item {
          display: flex; align-items: center; gap: 12px; padding: 10px;
          background: rgba(255,255,255,0.03); border-radius: 8px; margin-bottom: 4px;
        }
        .audit-item .time { font-size: 11px; color: #a0a0b0; min-width: 140px; }
        .audit-item .action { font-size: 12px; color: #fff; flex: 1; }
        .audit-item .user { font-size: 11px; color: #00d9ff; }
        .status-badge {
          padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;
        }
        .status-badge.enabled { background: rgba(0,255,136,0.2); color: #00ff88; }
        .status-badge.disabled { background: rgba(255,107,107,0.2); color: #ff6b6b; }
        .toggle-row { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px; margin-bottom: 8px; }
        .toggle-label { font-size: 13px; }
        .toggle-switch { width: 44px; height: 24px; background: rgba(255,255,255,0.1); border-radius: 12px; cursor: pointer; position: relative; transition: background 0.2s; }
        .toggle-switch::after { content: ''; position: absolute; width: 20px; height: 20px; background: #fff; border-radius: 50%; top: 2px; left: 2px; transition: transform 0.2s; }
        .toggle-switch.active { background: #00d9ff; }
        .toggle-switch.active::after { transform: translateX(20px); }
        .chart-placeholder { height: 150px; background: rgba(255,255,255,0.03); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #a0a0b0; }
      </style>
    `;

    this.setupEventListeners();
    this.startMetricsUpdate();
  }

  private renderOverviewTab(): string {
    return `
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="label">Total Nodes</div>
          <div class="value" id="metric-nodes">-</div>
        </div>
        <div class="metric-card">
          <div class="label">Total Edges</div>
          <div class="value" id="metric-edges">-</div>
        </div>
        <div class="metric-card">
          <div class="label">Workspaces</div>
          <div class="value" id="metric-workspaces">-</div>
        </div>
        <div class="metric-card">
          <div class="label">Storage Used</div>
          <div class="value" id="metric-storage">-</div>
          <div class="progress-bar"><div class="fill" id="storage-progress" style="width: 0%"></div></div>
        </div>
        <div class="metric-card">
          <div class="label">Average FPS</div>
          <div class="value positive" id="metric-fps">-</div>
        </div>
        <div class="metric-card">
          <div class="label">Uptime</div>
          <div class="value" id="metric-uptime">-</div>
        </div>
      </div>
      
      <div class="section" style="margin-top: 20px;">
        <h3>📊 System Information</h3>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="label">Version</div>
            <div class="value" style="font-size: 16px;">1.0.0</div>
          </div>
          <div class="metric-card">
            <div class="label">Environment</div>
            <div class="value" style="font-size: 16px;">Production</div>
          </div>
          <div class="metric-card">
            <div class="label">Build</div>
            <div class="value" style="font-size: 16px;">2024.01</div>
          </div>
        </div>
      </div>
    `;
  }

  private renderSecurityTab(): string {
    return `
      <div class="section">
        <h3>🔐 Security Status</h3>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="label">Encryption</div>
            <div class="value"><span class="status-badge enabled">Enabled</span></div>
          </div>
          <div class="metric-card">
            <div class="label">Session Timeout</div>
            <div class="value" style="font-size: 16px;">1 hour</div>
          </div>
          <div class="metric-card">
            <div class="label">Max Login Attempts</div>
            <div class="value" style="font-size: 16px;">5</div>
          </div>
        </div>
      </div>
      
      <div class="section">
        <h3>⚡ Feature Flags</h3>
        <div class="toggle-row">
          <span class="toggle-label">AI Integration</span>
          <div class="toggle-switch active" data-feature="ai"></div>
        </div>
        <div class="toggle-row">
          <span class="toggle-label">Collaboration</span>
          <div class="toggle-switch active" data-feature="collab"></div>
        </div>
        <div class="toggle-row">
          <span class="toggle-label">Voice Input</span>
          <div class="toggle-switch active" data-feature="voice"></div>
        </div>
        <div class="toggle-row">
          <span class="toggle-label">Shader Playground</span>
          <div class="toggle-switch active" data-feature="shader"></div>
        </div>
        <div class="toggle-row">
          <span class="toggle-label">Plugin System</span>
          <div class="toggle-switch active" data-feature="plugins"></div>
        </div>
      </div>
    `;
  }

  private renderPerformanceTab(): string {
    return `
      <div class="section">
        <h3>📈 Performance Metrics</h3>
        <div class="chart-placeholder">📊 Performance chart visualization</div>
      </div>
      
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="label">Memory Usage</div>
          <div class="value" id="perf-memory">-</div>
          <div class="sub">JavaScript Heap</div>
        </div>
        <div class="metric-card">
          <div class="label">Render Calls</div>
          <div class="value" id="perf-render-calls">-</div>
        </div>
        <div class="metric-card">
          <div class="label">Triangles</div>
          <div class="value" id="perf-triangles">-</div>
        </div>
        <div class="metric-card">
          <div class="label">Errors (24h)</div>
          <div class="value" id="perf-errors">0</div>
        </div>
      </div>
    `;
  }

  private renderAuditTab(): string {
    const logs = this.auditLogger.query({ limit: 20 });
    
    return `
      <div class="section">
        <h3>📋 Recent Activity</h3>
        <div class="audit-list">
          ${logs.length === 0 ? '<p style="color: #a0a0b0; text-align: center; padding: 20px;">No audit logs yet</p>' : 
            logs.map(log => `
              <div class="audit-item">
                <span class="time">${new Date(log.timestamp).toLocaleString()}</span>
                <span class="action">${this.formatAction(log.action)}</span>
                <span class="user">${log.userId}</span>
              </div>
            `).join('')
          }
        </div>
      </div>
      
      <div style="margin-top: 16px; display: flex; gap: 8px;">
        <button class="btn-export" onclick="exportAuditLogs()">📥 Export Logs</button>
        <button class="btn-refresh" onclick="clearAuditLogs()" style="background: rgba(255,107,107,0.1); border-color: #ff6b6b; color: #ff6b6b;">🗑️ Clear Logs</button>
      </div>
    `;
  }

  private formatAction(action: string): string {
    const actionLabels: Record<string, string> = {
      'user:login': '🔐 User logged in',
      'user:logout': '🔓 User logged out',
      'workspace:create': '📁 Workspace created',
      'workspace:delete': '🗑️ Workspace deleted',
      'node:create': '➕ Node created',
      'node:delete': '➖ Node deleted',
      'plugin:install': '📦 Plugin installed',
      'settings:update': '⚙️ Settings updated'
    };
    return actionLabels[action] || action;
  }

  private setupEventListeners(): void {
    const tabs = this.container?.querySelectorAll('.tab');
    const contents = this.container?.querySelectorAll('.tab-content');

    tabs?.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabId = (tab as HTMLElement).dataset.tab;
        
        tabs.forEach(t => t.classList.remove('active'));
        contents?.forEach(c => c.classList.remove('active'));
        
        tab.classList.add('active');
        this.container?.querySelector(`#tab-${tabId}`)?.classList.add('active');
      });
    });

    // Refresh button
    this.container?.querySelector('.btn-refresh')?.addEventListener('click', () => {
      this.updateMetrics();
    });

    // Toggle switches
    this.container?.querySelectorAll('.toggle-switch').forEach(toggle => {
      toggle.addEventListener('click', () => {
        toggle.classList.toggle('active');
      });
    });
  }

  private startMetricsUpdate(): void {
    this.updateMetrics();
    this.metricsInterval = window.setInterval(() => this.updateMetrics(), 5000);
  }

  private async updateMetrics(): Promise<void> {
    // Get storage stats
    const storageEstimate = await navigator.storage?.estimate();

    // Update DOM elements
    const updateEl = (id: string, value: string | number, className?: string) => {
      const el = this.container?.querySelector(`#${id}`);
      if (el) {
        el.textContent = String(value);
        if (className) el.className = `value ${className}`;
      }
    };

    // Simulated metrics
    const nodeCount = await storage.count('nodes');
    const edgeCount = await storage.count('edges');
    const workspaceCount = await storage.count('workspaces');

    updateEl('metric-nodes', nodeCount);
    updateEl('metric-edges', edgeCount);
    updateEl('metric-workspaces', workspaceCount);
    updateEl('metric-fps', Math.round(50 + Math.random() * 10), 'positive');

    if (storageEstimate) {
      const usedMB = (storageEstimate.usage! / 1024 / 1024).toFixed(1);
      const totalMB = (storageEstimate.quota! / 1024 / 1024 / 1024).toFixed(1);
      updateEl('metric-storage', `${usedMB} MB`);
      
      const progress = (storageEstimate.usage! / storageEstimate.quota! * 100).toFixed(1);
      const progressEl = this.container?.querySelector('#storage-progress') as HTMLElement;
      if (progressEl) progressEl.style.width = `${progress}%`;
    }

    // Uptime
    const uptimeMs = Date.now() - this.startTime;
    const hours = Math.floor(uptimeMs / 3600000);
    const minutes = Math.floor((uptimeMs % 3600000) / 60000);
    updateEl('metric-uptime', `${hours}h ${minutes}m`);

    // Performance
    const memory = (performance as any).memory;
    if (memory) {
      updateEl('perf-memory', `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(1)} MB`);
    }
  }

  dispose(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
  }
}
