# Aether OS - API Documentation

## Table of Contents

1. [Getting Started](#getting-started)
2. [Core Classes](#core-classes)
3. [Storage API](#storage-api)
4. [AI Orchestrator](#ai-orchestrator)
5. [Memory Graph](#memory-graph)
6. [Event Bus](#event-bus)
7. [Plugins](#plugins)
8. [UI Components](#ui-components)

---

## Getting Started

### Initialize Aether OS

```typescript
import { AetherOS } from './main';

// Create instance
const aether = new AetherOS();

// Access via global
window.aetherOS.initialize();
```

### Configuration

```typescript
const config = {
  // AI Settings
  ai: {
    provider: 'claude', // 'claude' | 'openai' | 'gemini' | 'ollama'
    apiKey: 'your-api-key',
    model: 'claude-3-sonnet'
  },
  
  // Storage
  storage: {
    type: 'indexeddb', // 'indexeddb' | 'sqlite'
    encryption: true
  },
  
  // Canvas
  canvas: {
    background: '#0a0a0f',
    fov: 60,
    near: 0.1,
    far: 1000
  }
};
```

---

## Core Classes

### AetherOS

Main application class.

```typescript
class AetherOS {
  scene: SpatialScene;
  aiOrchestrator: AIOrchestrator;
  memoryGraph: MemoryGraph;
  pluginSystem: PluginSystem;
  eventBus: EventBus;
  storage: StorageBackend;
  
  // Methods
  initialize(): void;
  createCommandBar(): void;
  createMemoryPanel(): void;
  renderTool(tool: GeneratedTool): void;
  showToast(type: 'info' | 'success' | 'warning' | 'error', title: string, message: string): void;
}
```

---

## Storage API

### PersistentStorage

```typescript
import { storage } from './storage/PersistentStorage';

// Put data
await storage.put('nodes', {
  id: 'node-1',
  type: 'text',
  content: 'Hello World',
  tags: ['greeting'],
  importance: 0.8
});

// Get data
const node = await storage.get<Node>('nodes', 'node-1');

// Get all
const allNodes = await storage.getAll<Node>('nodes');

// Count
const count = await storage.count('nodes');

// Delete
await storage.delete('nodes', 'node-1');

// Export all
const exportData = await storage.export();

// Import data
await storage.import({ nodes: [...], edges: [...] });
```

### Store Types

```typescript
type StoreType = 'nodes' | 'edges' | 'workspaces' | 'plugins' | 'settings' | 'cache';

// Each store can contain multiple items with unique IDs
```

---

## AI Orchestrator

### AIIntegration

```typescript
import { AIIntegration } from './intelligence/AIIntegration';

const ai = new AIIntegration(eventBus);

// Configure provider
ai.configure({
  provider: 'claude',
  apiKey: 'your-key'
});

// Generate completion
const response = await ai.complete({
  prompt: 'Explain quantum computing',
  maxTokens: 500,
  temperature: 0.7
});

// Stream completion
await ai.completeStream({
  prompt: 'Write a story',
  onChunk: (text) => console.log(text)
});
```

### LocalLLMManager

```typescript
import { LocalLLMManager } from './ai/AdvancedAI';

const llm = new LocalLLMManager(eventBus);

// Check Ollama status
const status = await llm.checkOllamaStatus();
console.log(status.available); // true/false

// Generate with local model
const response = await llm.generateWithOllama('Hello', 'llama3');

// Generate embeddings
const embedding = await llm.embedText('Your text here');
```

### AutonomousAgentSystem

```typescript
import { AutonomousAgentSystem } from './ai/AdvancedAI';

const agents = new AutonomousAgentSystem(eventBus, llm);

// Assign task to agent
const task = await agents.assignTask('agent-1', {
  description: 'Research AI trends',
  priority: 'high'
});

// Get agent
const agent = agents.getAgent('agent-1');
console.log(agent.status); // 'idle' | 'working' | 'waiting'

// Get all agents
const allAgents = agents.getAllAgents();
```

---

## Memory Graph

### MemoryGraph

```typescript
import { MemoryGraph } from './core/MemoryGraph';

const graph = new MemoryGraph(eventBus, storage);

// Create node
const node = graph.createNode({
  type: 'text',
  content: 'My idea',
  tags: ['creative', 'project'],
  importance: 0.9
});

// Create edge
graph.createEdge({
  source: node.id,
  target: 'existing-node-id',
  type: 'relates_to'
});

// Search
const results = graph.searchNodes({
  query: 'creative ideas',
  limit: 10
});

// Get node
const foundNode = graph.getNode(node.id);

// Delete
graph.deleteNode(node.id);
```

### Node Structure

```typescript
interface MemoryNode {
  id: string;
  type: 'text' | 'image' | 'code' | 'audio' | 'task' | 'tool';
  content: any;
  tags: string[];
  importance: number; // 0-1
  position?: { x: number; y: number; z: number };
  connections: string[];
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, any>;
}

interface MemoryEdge {
  id: string;
  source: string;
  target: string;
  type: 'relates_to' | 'depends_on' | 'created_by' | 'part_of';
  strength: number; // 0-1
  createdAt: number;
}
```

---

## Event Bus

```typescript
import { EventBus, Events } from './core/EventBus';

const eventBus = new EventBus();

// Subscribe
const unsubscribe = eventBus.on('node:created', (data) => {
  console.log('Node created:', data.id);
});

// Subscribe once
eventBus.once('ready', () => {
  console.log('System ready!');
});

// Emit
eventBus.emit('node:created', { id: 'node-1' });

// Remove listener
unsubscribe();

// Events List
Events = {
  NODE_CREATED: 'node:created',
  NODE_DELETED: 'node:deleted',
  NODE_FOCUSED: 'node:focused',
  NODE_UPDATED: 'node:updated',
  
  EDGE_CREATED: 'edge:created',
  EDGE_DELETED: 'edge:deleted',
  
  CANVAS_CLICKED: 'canvas:clicked',
  CAMERA_MOVED: 'camera:moved',
  
  AI_INTENT_RECEIVED: 'ai:intent-received',
  AI_TOOL_GENERATED: 'ai:tool-generated',
  
  PLUGIN_LOADED: 'plugin:loaded',
  PLUGIN_UNLOADED: 'plugin:unloaded',
  
  THEME_CHANGED: 'theme:changed',
  
  SYNC_STARTED: 'sync:started',
  SYNC_COMPLETED: 'sync:completed',
  
  READY: 'system:ready',
  ERROR: 'system:error'
};
```

---

## Plugins

### PluginSystem

```typescript
import { PluginSystem } from './plugins/PluginSystem';

const plugins = new PluginSystem(eventBus, storage);

// Register plugin
plugins.register({
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  author: 'Developer',
  description: 'A sample plugin',
  
  onLoad: () => {
    console.log('Plugin loaded');
  },
  
  onUnload: () => {
    console.log('Plugin unloaded');
  },
  
  commands: [
    {
      id: 'hello',
      name: 'Hello Command',
      execute: async (args) => {
        return 'Hello, World!';
      }
    }
  ],
  
  hooks: {
    beforeNodeCreate: (node) => node,
    afterNodeCreate: (node) => node
  }
});

// Load plugin from URL
await plugins.loadFromURL('https://example.com/plugin.js');

// Get plugin
const plugin = plugins.getPlugin('my-plugin');

// Unload
await plugins.unload('my-plugin');
```

### Plugin Structure

```typescript
interface AetherPlugin {
  id: string;
  name: string;
  version: string;
  author: string;
  description?: string;
  icon?: string;
  
  // Lifecycle
  onLoad?(): void | Promise<void>;
  onUnload?(): void | Promise<void>;
  
  // Commands
  commands?: PluginCommand[];
  
  // Hooks
  hooks?: PluginHooks;
  
  // Settings
  settings?: PluginSettings[];
}

interface PluginCommand {
  id: string;
  name: string;
  shortcut?: string;
  icon?: string;
  execute(args: any): any | Promise<any>;
}

interface PluginHooks {
  beforeNodeCreate?(node: MemoryNode): MemoryNode;
  afterNodeCreate?(node: MemoryNode): void;
  beforeSearch?(query: SearchQuery): SearchQuery;
  afterSearch?(results: MemoryNode[]): MemoryNode[];
}
```

---

## UI Components

### SpatialScene

```typescript
import { SpatialScene } from './core/Scene';

const scene = new SpatialScene(container, eventBus);

// Create node
const node = scene.createNode({
  id: 'my-node',
  title: 'My Node',
  content: 'Node content',
  position: { x: 0, y: 0, z: 0 }
});

// Get node
const foundNode = scene.getNode('my-node');

// Camera control
scene.focusOn(node.id);
scene.resetCamera();

// Start render loop
scene.start();
```

### Toast Notifications

```typescript
// Info toast
aether.showToast('info', 'Title', 'Message');

// Success toast
aether.showToast('success', 'Saved!', 'Your data has been saved.');

// Error toast
aether.showToast('error', 'Error', 'Something went wrong.');
```

### Memory Visualization

```typescript
// Open memory visualization panel
aether.showMemoryVisualization();

// Memory panel data
{
  totalNodes: number,
  totalEdges: number,
  recentNodes: MemoryNode[],
  tagCounts: Record<string, number>,
  nodeTimeline: TimelineEntry[]
}
```

---

## Performance APIs

### WASMModule

```typescript
import { Vector3D, Matrix4, levenshtein, simulatePhysics } from './performance/WASMModule';

// Vector operations
const v1 = new Vector3D(1, 2, 3);
const v2 = new Vector3D(4, 5, 6);
const sum = v1.add(v2);
const dot = v1.dot(v2);
const cross = v1.cross(v2);

// Matrix operations
const mat = Matrix4.perspective(Math.PI / 3, 1.5, 0.1, 1000);
mat.translate({ x: 1, y: 2, z: 3 });

// String similarity
const dist = levenshtein('hello', 'hallo'); // 1

// Physics simulation
const positions = simulatePhysics(
  [0, 0, 10, 0], // x, y for each node
  [0, 0, 0, 0],   // velocities
  [1, 1],          // masses
  2,               // numNodes
  50               // iterations
);
```

### SharedArrayBufferManager

```typescript
import { SharedBufferManager } from './performance/SharedArrayBufferManager';

const buffer = new SharedBufferManager({
  maxNodes: 10000,
  enableParallelRendering: true,
  workerCount: 4
});

// Set node position
buffer.setPosition(0, 10, 20, 5);

// Set color
buffer.setColor(0, 255, 128, 64, 255);

// Set metadata
buffer.setMetadata(0, 0.9, Date.now());

// Dispatch to worker
buffer.dispatchToWorker('physics', 100);
```

---

## Enterprise APIs

### MultiWorkspace

```typescript
import { MultiWorkspace } from './enterprise/MultiWorkspace';

const workspace = new MultiWorkspace(eventBus);

// Create workspace
const ws = await workspace.createWorkspace({
  name: 'Project Alpha',
  description: 'Development workspace',
  icon: '🚀',
  color: '#00ff88'
});

// Switch workspace
await workspace.switchWorkspace(ws.id);

// Export/Import
const json = await workspace.exportWorkspace(ws.id);
await workspace.importWorkspace(json);

// Subscribe to events
workspace.on('workspace:created', (ws) => console.log('Created:', ws.name));
```

### SecurityManager

```typescript
import { SecurityManager } from './enterprise/SecurityManager';

const security = new SecurityManager(eventBus);

// Login
await security.login('user@example.com', 'password');

// Check permissions
if (security.hasPermission('workspace:delete')) {
  // Delete workspace
}

// Encryption
await security.initializeEncryption('my-passphrase');
const encrypted = await security.encrypt('sensitive data');
const decrypted = await security.decrypt(encrypted);
```

### AuditLogger

```typescript
import { AuditLogger } from './enterprise/SecurityManager';

const audit = new AuditLogger(eventBus);

// Log action
audit.log('user:login', { method: 'oauth' });

// Query logs
const logs = audit.query({
  action: 'user:login',
  limit: 100
});

// Export logs
const json = audit.exportLogs();
```

---

## Type Definitions

### Core Types

```typescript
interface Vector3D {
  x: number;
  y: number;
  z: number;
}

interface Color {
  r: number;
  g: number;
  b: number;
  a?: number;
}

interface TimeRange {
  start: number;
  end: number;
}

type NodeType = 'text' | 'image' | 'code' | 'audio' | 'task' | 'tool' | 'folder';

type EdgeType = 'relates_to' | 'depends_on' | 'created_by' | 'part_of';

type ToastType = 'info' | 'success' | 'warning' | 'error';
```

---

## Examples

### Complete Example: Create and Search Nodes

```typescript
import { AetherOS } from './main';
import { storage } from './storage/PersistentStorage';

async function main() {
  // Initialize
  const aether = new AetherOS();
  
  // Create some nodes
  const node1 = aether.memoryGraph.createNode({
    type: 'text',
    content: 'Important project idea',
    tags: ['project', 'idea'],
    importance: 0.9
  });
  
  const node2 = aether.memoryGraph.createNode({
    type: 'text',
    content: 'Meeting notes',
    tags: ['meeting', 'notes'],
    importance: 0.7
  });
  
  // Connect them
  aether.memoryGraph.createEdge({
    source: node1.id,
    target: node2.id,
    type: 'relates_to'
  });
  
  // Search
  const results = aether.memoryGraph.searchNodes({
    query: 'project ideas',
    limit: 10
  });
  
  console.log(`Found ${results.length} nodes`);
  
  // Show toast
  aether.showToast('success', 'Done!', `Created ${results.length} results.`);
}

main();
```

---

*For more examples, see the `/examples` directory.*
