/**
 * Aether OS - Main Entry Point
 * Spatial Operating System with Zero-App Architecture
 */

import { SpatialScene } from './core/Scene';
import { EventBus, Events } from './core/EventBus';
import { AIOrchestrator } from './intelligence/AIOrchestrator';
import { AIIntegration } from './intelligence/AIIntegration';
import { MemoryGraph } from './memory/MemoryGraph';
import { PersistentStorage } from './storage/PersistentStorage';
import { WebGPURenderer } from './renderer/WebGPURenderer';
import { VoiceInput, VoiceOutput } from './voice/VoiceInput';
import { CollaborationManager } from './collaboration/Collaboration';
import { CollaborationUI } from './collaboration/CollaborationUI';
import { PluginSystem } from './plugins/PluginSystem';
import { ShaderPlayground } from './shader/ShaderPlayground';
import { AgentDelegation } from './agents/AgentDelegation';
import './styles/main.css';
import './styles/mobile.css';

class AetherOS {
  // Phase 2 & 3 Modules
  aiIntegration: AIIntegration;
  storage: PersistentStorage;
  renderer: WebGPURenderer | null = null;
  voiceInput: VoiceInput | null = null;
  voiceOutput: VoiceOutput | null = null;
  collaboration: CollaborationManager | null = null;
  collaborationUI: CollaborationUI | null = null;
  plugins: PluginSystem;
  shaderPlayground: ShaderPlayground | null = null;
  agentDelegation: AgentDelegation | null = null;
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
    this.storage = new PersistentStorage({}, this.eventBus);
    this.plugins = new PluginSystem(this.eventBus);

    // Phase 2: Initialize AI integration
    this.aiIntegration = new AIIntegration(this.eventBus);

    // Phase 2: Initialize voice input/output
    this.voiceInput = new VoiceInput(this.eventBus);
    this.voiceOutput = new VoiceOutput(this.eventBus);

    // Phase 2: Initialize WebGPU renderer
    const container = document.getElementById('canvas-container')!;
    this.renderer = new WebGPURenderer(container);

    // Phase 2: Initialize collaboration
    this.collaboration = new CollaborationManager(this.eventBus);
    this.collaborationUI = new CollaborationUI(this.collaboration, this.eventBus);

    // Phase 3: Initialize agent delegation
    this.agentDelegation = new AgentDelegation(this.eventBus, this.aiIntegration);

    // Phase 3: Initialize shader playground
    this.initShaderPlayground();

    this.setupUI();
    this.setupEventListeners();
    this.setupVoiceControls();
    this.setupCollaborationPanel();
    this.setupAgentPanel();
    this.start();
  }

  private initShaderPlayground(): void {
    // Shader playground will be initialized when opened
    console.log('🎨 Shader Playground ready');
  }

  private setupVoiceControls(): void {
    // Voice input is available globally
    console.log('🎤 Voice Input ready');
  }

  private setupCollaborationPanel(): void {
    // Collaboration panel will be rendered on demand
    console.log('👥 Collaboration ready');
  }

  private setupAgentPanel(): void {
    // Agent delegation is running
    this.eventBus.on('agent:task-completed', (data: any) => {
      this.showToast('success', 'Task Completed', data.task.title);
    });
    console.log('🤖 Agent Delegation ready');
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
      <button class="voice-toggle" title="Voice Input">🎤</button>
      <button class="collab-toggle" title="Collaboration">👥</button>
      <button class="shader-toggle" title="Shader Playground">🎨</button>
      <button class="agents-toggle" title="AI Agents">🤖</button>
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

    // Voice toggle
    const voiceBtn = commandBar.querySelector('.voice-toggle');
    voiceBtn?.addEventListener('click', () => {
      if (this.voiceInput) {
        const isListening = this.voiceInput.toggle();
        (voiceBtn as HTMLElement).style.color = isListening ? '#00ff88' : '';
      }
    });

    // Collaboration toggle
    const collabBtn = commandBar.querySelector('.collab-toggle');
    collabBtn?.addEventListener('click', () => this.toggleCollaborationPanel());

    // Shader toggle
    const shaderBtn = commandBar.querySelector('.shader-toggle');
    shaderBtn?.addEventListener('click', () => this.toggleShaderPlayground());

    // Agents toggle
    const agentsBtn = commandBar.querySelector('.agents-toggle');
    agentsBtn?.addEventListener('click', () => this.toggleAgentPanel());
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

  private toggleCollaborationPanel(): void {
    let panel = document.querySelector('.collab-panel');
    
    if (panel) {
      panel.remove();
    } else {
      const panelContainer = document.createElement('div');
      panelContainer.className = 'collab-panel-container';
      panelContainer.style.cssText = 'position: fixed; right: 20px; bottom: 100px; z-index: 1000;';
      document.body.appendChild(panelContainer);
      this.collaborationUI?.render(panelContainer);
    }
  }

  private shaderPanel: HTMLElement | null = null;

  private toggleShaderPlayground(): void {
    if (this.shaderPanel) {
      this.shaderPanel.remove();
      this.shaderPanel = null;
    } else {
      this.shaderPanel = document.createElement('div');
      this.shaderPanel.className = 'shader-panel';
      this.shaderPanel.style.cssText = `
        position: fixed;
        left: 20px;
        top: 20px;
        width: calc(100% - 40px);
        height: calc(100% - 140px);
        max-width: 900px;
        max-height: 600px;
        z-index: 1000;
        border-radius: 16px;
        overflow: hidden;
      `;
      
      const playground = new ShaderPlayground(this.shaderPanel);
      // Add preview mesh to scene if available
      const mesh = playground.getPreviewMesh();
      if (mesh) {
        this.scene.addToScene(mesh);
      }
      
      document.body.appendChild(this.shaderPanel);
    }
  }

  private agentPanel: HTMLElement | null = null;

  private toggleAgentPanel(): void {
    if (this.agentPanel) {
      this.agentPanel.remove();
      this.agentPanel = null;
      return;
    }

    this.agentPanel = document.createElement('div');
    this.agentPanel.className = 'agent-panel glass-panel';
    this.agentPanel.style.cssText = `
      position: fixed;
      left: 20px;
      top: 20px;
      width: 320px;
      max-height: 500px;
      padding: 16px;
      z-index: 1000;
      overflow-y: auto;
    `;

    const agents = this.agentDelegation?.getAgents() || [];
    const tasks = this.agentDelegation?.getTasks() || [];
    const pendingTasks = tasks.filter(t => t.status === 'pending');

    this.agentPanel.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h3 style="margin: 0; color: #00d9ff;">🤖 AI Agents</h3>
        <button class="agent-panel-close" style="background: none; border: none; color: #fff; cursor: pointer; font-size: 20px;">×</button>
      </div>
      
      <div style="margin-bottom: 16px;">
        <h4 style="margin: 0 0 8px; font-size: 12px; color: #a0a0b0; text-transform: uppercase;">Active Agents</h4>
        ${agents.map(a => `
          <div class="agent-item" style="display: flex; align-items: center; gap: 8px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; margin-bottom: 4px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: ${a.status === 'idle' ? '#00ff88' : a.status === 'working' ? '#ffaa00' : '#ff6b6b'};"></span>
            <span style="flex: 1; font-size: 13px;">${a.name}</span>
            <span style="font-size: 11px; color: #a0a0b0;">${a.completedTasks} tasks</span>
          </div>
        `).join('')}
      </div>
      
      <div>
        <h4 style="margin: 0 0 8px; font-size: 12px; color: #a0a0b0; text-transform: uppercase;">Task Queue (${pendingTasks.length})</h4>
        ${pendingTasks.length === 0 ? '<p style="font-size: 12px; color: #a0a0b0;">No pending tasks</p>' : 
          pendingTasks.slice(0, 5).map(t => `
            <div class="task-item" style="padding: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; margin-bottom: 4px;">
              <div style="font-size: 12px; font-weight: 600;">${t.title}</div>
              <div style="font-size: 11px; color: #a0a0b0;">Priority: ${t.priority}</div>
            </div>
          `).join('')
        }
      </div>
    `;

    this.agentPanel.querySelector('.agent-panel-close')?.addEventListener('click', () => {
      this.agentPanel?.remove();
      this.agentPanel = null;
    });

    document.body.appendChild(this.agentPanel);
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
