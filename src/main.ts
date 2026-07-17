/**
 * Aether OS - Main Entry Point
 * Spatial Operating System with Zero-App Architecture
 */

import { SpatialScene } from './core/Scene';
import { EventBus, Events } from './core/EventBus';
import { AIOrchestrator } from './intelligence/AIOrchestrator';
import { MemoryGraph } from './memory/MemoryGraph';
import './styles/main.css';

class AetherOS {
  private scene: SpatialScene;
  private eventBus: EventBus;
  private aiOrchestrator: AIOrchestrator;
  private memoryGraph: MemoryGraph;
  
  private commandInput: HTMLInputElement | null = null;
  private memoryPanel: HTMLElement | null = null;
  private toastContainer: HTMLElement | null = null;
  private activeNodeContent: Map<string, HTMLElement> = new Map();

  constructor() {
    // Initialize core systems
    this.eventBus = new EventBus();
    this.scene = new SpatialScene(
      document.getElementById('canvas-container')!,
      this.eventBus
    );
    this.aiOrchestrator = new AIOrchestrator(this.eventBus);
    this.memoryGraph = new MemoryGraph(this.eventBus);

    this.setupUI();
    this.setupEventListeners();
    this.start();
  }

  private setupUI() {
    // Create Command Bar
    this.createCommandBar();

    // Create Memory Panel
    this.createMemoryPanel();

    // Create Toast Container
    this.createToastContainer();

    // Create Help Tooltip
    this.createHelpTooltip();
  }

  private createCommandBar() {
    const commandBar = document.createElement('div');
    commandBar.className = 'command-bar';
    commandBar.innerHTML = `
      <input type="text" class="command-input" placeholder="Enter command or ask AI..." />
      <button class="command-submit">Execute</button>
    `;
    
    document.body.appendChild(commandBar);

    this.commandInput = commandBar.querySelector('.command-input');
    const submitBtn = commandBar.querySelector('.command-submit');

    const handleCommand = async () => {
      const input = this.commandInput?.value.trim();
      if (!input) return;

      this.showToast('info', 'Processing', `Executing: ${input.substring(0, 30)}...`);
      
      this.commandInput!.value = '';

      try {
        // Generate AI tool
        const tool = await this.aiOrchestrator.generateTool(input);
        
        if (tool) {
          // Store in memory
          this.memoryGraph.createNode({
            type: 'task',
            content: input,
            tags: [tool.intent],
            importance: 0.7
          });

          // Render tool
          this.renderTool(tool);
          
          this.showToast('success', 'Tool Generated', tool.name);
        }
      } catch (error) {
        this.showToast('error', 'Error', 'Failed to process command');
      }
    };

    submitBtn?.addEventListener('click', handleCommand);
    this.commandInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleCommand();
    });
  }

  private createMemoryPanel() {
    this.memoryPanel = document.createElement('div');
    this.memoryPanel.className = 'memory-panel';
    this.memoryPanel.innerHTML = `
      <h4>🧠 Memory Graph</h4>
      <div class="memory-stats">
        <div class="memory-stat">
          <span>Nodes</span>
          <span class="memory-stat-value" id="stat-nodes">0</span>
        </div>
        <div class="memory-stat">
          <span>Connections</span>
          <span class="memory-stat-value" id="stat-edges">0</span>
        </div>
        <div class="memory-stat">
          <span>Avg Connections</span>
          <span class="memory-stat-value" id="stat-avg">0</span>
        </div>
      </div>
      <button id="visualize-memory" style="margin-top: 12px; width: 100%; padding: 8px; background: rgba(0,217,255,0.1); border: 1px solid rgba(0,217,255,0.3); border-radius: 8px; color: #00d9ff; cursor: pointer;">Visualize Memory</button>
    `;
    
    document.body.appendChild(this.memoryPanel);

    // Update stats periodically
    this.updateMemoryStats();
    setInterval(() => this.updateMemoryStats(), 2000);

    // Visualize button
    document.getElementById('visualize-memory')?.addEventListener('click', () => {
      this.visualizeMemory();
    });
  }

  private updateMemoryStats() {
    const stats = this.memoryGraph.getStats();
    
    const nodesEl = document.getElementById('stat-nodes');
    const edgesEl = document.getElementById('stat-edges');
    const avgEl = document.getElementById('stat-avg');

    if (nodesEl) nodesEl.textContent = String(stats.totalNodes);
    if (edgesEl) edgesEl.textContent = String(stats.totalEdges);
    if (avgEl) avgEl.textContent = stats.avgConnections.toFixed(1);
  }

  private createToastContainer() {
    this.toastContainer = document.createElement('div');
    this.toastContainer.className = 'toast-container';
    document.body.appendChild(this.toastContainer);
  }

  private showToast(type: 'success' | 'error' | 'info', title: string, message: string) {
    if (!this.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
      success: '✓',
      error: '✗',
      info: 'ℹ'
    };

    toast.innerHTML = `
      <span class="toast-icon">${icons[type]}</span>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
    `;

    this.toastContainer.appendChild(toast);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      toast.style.animation = 'toastIn 0.3s ease reverse';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  private createHelpTooltip() {
    const help = document.createElement('div');
    help.className = 'help-tooltip';
    help.innerHTML = `
      <kbd>Drag</kbd> Rotate | <kbd>Scroll</kbd> Zoom | <kbd>Click</kbd> Select Node
    `;
    document.body.appendChild(help);
  }

  private setupEventListeners() {
    // Node focus event
    this.eventBus.on(Events.NODE_FOCUSED, (data: { id: string }) => {
      this.showNodeContent(data.id);
    });

    // Canvas click (clear focus)
    this.eventBus.on(Events.CANVAS_CLICKED, () => {
      this.hideAllNodeContent();
    });

    // System ready
    this.eventBus.on(Events.READY, () => {
      console.log('🎉 Aether OS initialized');
      this.showToast('success', 'System Ready', 'Spatial canvas initialized');
    });

    // Memory stored
    this.eventBus.on(Events.MEMORY_STORED, (data: { node: any }) => {
      console.log('💾 Memory stored:', data.node.content.substring(0, 50));
    });
  }

  private showNodeContent(nodeId: string) {
    this.hideAllNodeContent();

    const node = this.scene.getNode(nodeId);
    if (!node) return;

    // Get 3D position and convert to screen
    const screenPos = this.scene.worldToScreen(node.physics.position);

    const content = document.createElement('div');
    content.className = 'liquid-node-content';
    content.dataset.nodeId = nodeId;
    content.style.left = `${screenPos.x - 175}px`;
    content.style.top = `${screenPos.y - 100}px`;

    content.innerHTML = `
      <div class="node-header">
        <span class="node-title">${node.title}</span>
        <button class="node-close">×</button>
      </div>
      <div class="node-body">
        <p style="color: var(--color-text-secondary); font-size: 14px;">${node.content}</p>
        <div style="margin-top: 16px;">
          <button class="tool-generate-btn" style="padding: 8px 16px; background: linear-gradient(135deg, #00d9ff, #ff00ff); border: none; border-radius: 8px; color: white; font-weight: 600; cursor: pointer;">
            Generate Tool
          </button>
        </div>
      </div>
    `;

    // Event listeners
    content.querySelector('.node-close')?.addEventListener('click', () => {
      content.remove();
      this.scene.clearFocus();
    });

    content.querySelector('.tool-generate-btn')?.addEventListener('click', async () => {
      const tool = await this.aiOrchestrator.generateTool(`Show information about ${node.title}`);
      if (tool) {
        this.renderTool(tool);
        content.remove();
      }
    });

    document.body.appendChild(content);
    this.activeNodeContent.set(nodeId, content);
  }

  private hideAllNodeContent() {
    this.activeNodeContent.forEach(el => el.remove());
    this.activeNodeContent.clear();
  }

  private renderTool(tool: any) {
    const container = this.aiOrchestrator.renderTool(tool);
    
    // Position in center of screen
    container.style.position = 'fixed';
    container.style.left = '50%';
    container.style.top = '50%';
    container.style.transform = 'translate(-50%, -50%)';
    container.style.zIndex = '200';

    document.body.appendChild(container);

    // Add click outside to close
    const closeHandler = (e: MouseEvent) => {
      if (!container.contains(e.target as Node)) {
        container.remove();
        document.removeEventListener('click', closeHandler);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', closeHandler);
    }, 100);
  }

  private visualizeMemory() {
    const { nodes, edges } = this.memoryGraph.createVisualization();
    
    console.log('📊 Memory Visualization Data:', {
      nodes: nodes.length,
      edges: edges.length,
      data: { nodes, edges }
    });

    this.showToast('info', 'Visualization', `Generated ${nodes.length} nodes, ${edges.length} edges`);

    // Create visualization panel
    const vizPanel = document.createElement('div');
    vizPanel.className = 'liquid-node-content';
    vizPanel.style.left = '50%';
    vizPanel.style.top = '50%';
    vizPanel.style.transform = 'translate(-50%, -50%)';
    vizPanel.style.width = '500px';
    vizPanel.style.maxHeight = '70vh';
    vizPanel.innerHTML = `
      <div class="node-header">
        <span class="node-title">🧠 Memory Network</span>
        <button class="node-close">×</button>
      </div>
      <div class="node-body">
        <div style="font-size: 13px; color: var(--color-text-secondary); margin-bottom: 16px;">
          Showing force-directed graph layout of your memory connections.
        </div>
        <div id="viz-graph" style="min-height: 300px; display: flex; flex-wrap: wrap; gap: 8px;">
          ${nodes.map(n => `
            <div style="
              padding: 8px 12px;
              background: ${n.color}20;
              border: 1px solid ${n.color};
              border-radius: 8px;
              color: ${n.color};
              font-size: 12px;
            ">
              ${n.label}
              <span style="opacity: 0.6; margin-left: 4px;">(${this.memoryGraph.getNode(n.id)?.connections.length || 0})</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    vizPanel.querySelector('.node-close')?.addEventListener('click', () => vizPanel.remove());
    document.body.appendChild(vizPanel);
  }

  private start() {
    this.scene.start();
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Escape to clear focus
      if (e.key === 'Escape') {
        this.hideAllNodeContent();
        this.scene.clearFocus();
      }
      
      // Ctrl+K to focus command bar
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        this.commandInput?.focus();
      }
    });
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.aetherOS = new AetherOS();
});

// Also try to initialize immediately in case DOMContentLoaded already fired
if (document.readyState !== 'loading') {
  window.aetherOS = new AetherOS();
}

// Type declaration for global
declare global {
  interface Window {
    aetherOS: AetherOS;
  }
}

export { AetherOS };
