# Aether OS - Technical Architecture Document

## 1. Overview

Aether OS adalah sistem operasi spasial prototype yang dibangun di atas teknologi web modern. Dokumen ini menjelaskan arsitektur teknis secara detail.

---

## 2. System Architecture

### 2.1 Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Spatial 3D │  │   Liquid    │  │     Overlay UI          │  │
│  │   Canvas    │  │   Nodes     │  │  (Command, Panels)      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                     INTELLIGENCE LAYER                          │
│  ┌─────────────────┐  ┌──────────────────────────────────────┐  │
│  │ AI Orchestrator │  │     Generative Micro-Tools Engine    │  │
│  │ (Intent Parser) │  │  (Component Library + Renderer)      │  │
│  └─────────────────┘  └──────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                       MEMORY LAYER                              │
│  ┌──────────────┐  ┌───────────────┐  ┌────────────────────┐  │
│  │ Graph Store  │  │ Vector Store  │  │  Search Engine     │  │
│  │ (Nodes/Edges)│  │ (Embeddings)  │  │ (Cosine Sim.)     │  │
│  └──────────────┘  └───────────────┘  └────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                       KERNEL LAYER                              │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │  Event Bus  │  │Physics Engine│  │   Scene Manager     │   │
│  │ (Pub/Sub)   │  │(Spring/Coul.)│  │   (Three.js)        │   │
│  └─────────────┘  └──────────────┘  └─────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                      PLATFORM LAYER                             │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────┐   │
│  │   Browser   │  │   Vite      │  │   TypeScript          │   │
│  │   Runtime   │  │   Build     │  │   Compiler            │   │
│  └─────────────┘  └─────────────┘  └───────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Components

### 3.1 SpatialScene (`src/core/Scene.ts`)

**Responsibility**: Managing Three.js scene, camera, renderer, and physics.

```typescript
class SpatialScene {
  scene: THREE.Scene;      // Three.js scene
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  physicsWorld: PhysicsWorld;
  eventBus: EventBus;
  
  nodes: Map<string, LiquidNode>;
  
  // Methods
  createNode(data: NodeData): LiquidNode;
  deleteNode(nodeId: string): void;
  focusNode(nodeId: string): void;
  worldToScreen(position: Vector3): {x, y};
  start(): void;
  stop(): void;
}
```

**Key Features:**
- WebGL rendering dengan antialiasing
- Orbit camera dengan custom controls
- Particle system (2000 particles)
- Dynamic lighting (ambient + 3 point lights)

### 3.2 LiquidNode (`src/core/Scene.ts`)

**Responsibility**: Individual 3D UI node dengan glassmorphism shader.

```typescript
class LiquidNode {
  id: string;
  title: string;
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  physics: {
    position: Vector3;
    velocity: Vector3;
    force: Vector3;
    mass: number;
  };
  
  setFocus(focused: boolean): void;
  update(time: number): void;
}
```

**GLSL Shader:**
```glsl
// Vertex Shader
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}

// Fragment Shader
uniform vec3 uColor;
uniform vec3 uGlowColor;
uniform float uTime;
uniform float uFocus;

void main() {
  float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 3.0);
  vec3 finalColor = mix(uColor, uGlowColor, fresnel);
  float alpha = (0.3 + fresnel * 0.5 + uFocus * 0.2);
  gl_FragColor = vec4(finalColor, alpha);
}
```

### 3.3 PhysicsWorld (`src/core/Scene.ts`)

**Responsibility**: Simulating physics forces antar nodes.

```typescript
class PhysicsWorld {
  nodes: LiquidNode[];
  
  // Physics constants
  springConstant: number = 0.02;
  repulsionConstant: number = 50;
  idealDistance: number = 8;
  damping: number = 0.92;
  
  update(deltaTime: number): void;
  applyForceToNode(nodeId: string, force: Vector3): void;
}
```

**Physics Model:**

```
┌─────────────────────────────────────────────────────────┐
│                  PHYSICS SIMULATION                       │
│                                                          │
│  Spring Force (Hooke's Law):                            │
│  ┌────────────────────────────────────────────────────┐  │
│  │  F = -k × (distance - ideal_distance)             │  │
│  │                                                     │  │
│  │  k = springConstant = 0.02                        │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  Coulomb Repulsion:                                     │
│  ┌────────────────────────────────────────────────────┐  │
│  │  F = -C / distance²                                │  │
│  │                                                     │  │
│  │  C = repulsionConstant = 50                       │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  Net Force:                                             │
│  ┌────────────────────────────────────────────────────┐  │
│  │  F_net = F_spring + F_repulsion + F_center        │  │
│  │                                                     │  │
│  │  velocity += F_net / mass                          │  │
│  │  velocity *= damping (0.92)                        │  │
│  │  position += velocity × Δt                         │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  Visualization:                                         │
│                                                          │
│      Node A          Node B                              │
│         ●═════════════●                                  │
│              ↕ Force                                    │
│              │                                          │
│         ← F_repulsion                                  │
│              │                                          │
│         F_spring →                                     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 3.4 AIOrchestrator (`src/intelligence/AIOrchestrator.ts`)

**Responsibility**: Parsing natural language dan generating Micro-Tools.

```typescript
class AIOrchestrator {
  eventBus: EventBus;
  tools: Map<string, GeneratedTool>;
  
  parseIntent(input: string): { intent, entities, confidence };
  generateTool(input: string): Promise<GeneratedTool>;
  renderTool(tool: GeneratedTool): HTMLElement;
}
```

**Intent Parsing Flow:**

```
┌────────────────────────────────────────────────────────────┐
│                  INTENT PARSING PIPELINE                   │
│                                                             │
│  Input: "show chart of monthly sales"                      │
│                                                             │
│  ┌──────────────┐                                          │
│  │   Normalize   │  "show chart of monthly sales"         │
│  │   Input       │  → "show chart of monthly sales"       │
│  └──────┬───────┘                                         │
│         │                                                  │
│         ▼                                                  │
│  ┌──────────────┐                                          │
│  │    Match     │  Patterns:                              │
│  │   Patterns   │  /show.*chart/i ✓ MATCH               │
│  └──────┬───────┘                                         │
│         │                                                  │
│         ▼                                                  │
│  ┌──────────────┐                                          │
│  │   Extract    │  entities: ["monthly sales"]            │
│  │   Entities   │  intent: "visualize"                    │
│  └──────┬───────┘  confidence: 0.9                        │
│         │                                                  │
│         ▼                                                  │
│  ┌──────────────┐                                          │
│  │    Generate  │  → Chart Component                       │
│  │    Tool      │  → Table Component                       │
│  └──────────────┘                                          │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

**Component Library:**

| Component | Render | Purpose |
|-----------|--------|---------|
| `table` | `<table>` | Data tabular |
| `chart` | `<div>` with bars | Visualisasi data |
| `calculator` | `<input>` + buttons | Perhitungan |
| `form` | `<form>` + inputs | Input data |
| `metric` | `<div>` | Metric cards |
| `editor` | `<textarea>` | Text editing |
| `list` | `<ul>/<ol>` | List items |

### 3.5 MemoryGraph (`src/memory/MemoryGraph.ts`)

**Responsibility**: Graph database dengan semantic search.

```typescript
class MemoryGraph {
  nodes: Map<string, MemoryNode>;
  edges: Map<string, MemoryEdge>;
  adjacencyList: Map<string, Set<string>>;
  
  createNode(data): MemoryNode;
  connectNodes(source, target, type, weight): MemoryEdge;
  search(query): SearchResult[];
  createVisualization(): { nodes, edges };
  getStats(): Stats;
}
```

**Data Model:**

```typescript
interface MemoryNode {
  id: string;
  type: 'text' | 'image' | 'code' | 'audio' | 'data' | 'task' | 'concept';
  content: string;
  metadata: {
    created: number;
    modified: number;
    tags: string[];
    embedding: number[];  // 128-dimension vector
    importance: number;   // 0-1
  };
  connections: string[];
}

interface MemoryEdge {
  id: string;
  source: string;
  target: string;
  weight: number;      // 0-1
  type: 'temporal' | 'semantic' | 'causal' | 'reference' | 'association';
}
```

**Embedding Generation:**

```
┌─────────────────────────────────────────────────────────────┐
│              VECTOR EMBEDDING GENERATION                    │
│                                                              │
│  Input: "Machine Learning Project"                          │
│  Tags: ["ai", "ml", "project"]                             │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Step 1: Tokenize                                      │  │
│  │  words = ["machine", "learning", "project"]           │  │
│  └───────────────────────────────────────────────────────┘  │
│                          │                                  │
│                          ▼                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Step 2: Hash each word to index                      │  │
│  │  hash("machine") → index 42                          │  │
│  │  hash("learning") → index 17                         │  │
│  │  hash("project") → index 89                          │  │
│  └───────────────────────────────────────────────────────┘  │
│                          │                                  │
│                          ▼                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Step 3: Fill embedding vector                        │  │
│  │  embedding[42] += 1  // machine                       │  │
│  │  embedding[17] += 1  // learning                       │  │
│  │  embedding[89] += 1  // project                       │  │
│  │  embedding[42] += 2  // tag "ai"                      │  │
│  │  embedding[17] += 2  // tag "ml"                      │  │
│  │  embedding[89] += 2  // tag "project"                 │  │
│  └───────────────────────────────────────────────────────┘  │
│                          │                                  │
│                          ▼                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Step 4: Normalize (L2)                               │  │
│  │  magnitude = sqrt(sum(embedding²))                    │  │
│  │  embedding = embedding / magnitude                    │  │
│  └───────────────────────────────────────────────────────┘  │
│                          │                                  │
│                          ▼                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Output: 128-dimensional unit vector                   │  │
│  │  [0.1, 0.0, ..., 0.3, ..., 0.2]                     │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Cosine Similarity Search:**

```
┌─────────────────────────────────────────────────────────────┐
│               SEMANTIC SEARCH (COSINE SIMILARITY)            │
│                                                              │
│  Query: "deep learning algorithms"                          │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Query Embedding: Q = [0.2, 0.1, 0.3, ..., 0.1]     │  │
│  │  Node Embedding:  N = [0.1, 0.2, 0.2, ..., 0.3]     │  │
│  └───────────────────────────────────────────────────────┘  │
│                          │                                  │
│                          ▼                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Cosine Similarity Formula:                           │  │
│  │                                                         │  │
│  │         Q · N                                          │  │
│  │  ─────────────  =  cos(θ)                             │  │
│  │  ||Q|| × ||N||                                        │  │
│  │                                                         │  │
│  │  =  Σ(Qᵢ × Nᵢ)                                        │  │
│  │  ──────────────────                                    │  │
│  │  √(ΣQᵢ²) × √(ΣNᵢ²)                                   │  │
│  │                                                         │  │
│  │  Result: 0.85 (high similarity)                        │  │
│  └───────────────────────────────────────────────────────┘  │
│                          │                                  │
│                          ▼                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Search Results (sorted by score):                    │  │
│  │  1. "Neural Networks" (0.92) ✓ MATCH                 │  │
│  │  2. "Deep Learning Basics" (0.87) ✓ MATCH            │  │
│  │  3. "Machine Learning Intro" (0.65)                  │  │
│  │  4. "Cooking Recipes" (0.12) ✗ NO MATCH             │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Event System

### 4.1 Event Bus

```typescript
class EventBus {
  private listeners: Map<string, Set<Handler>>;
  
  on(event: string, handler: Handler): () => void;
  once(event: string, handler: Handler): void;
  off(event: string, handler: Handler): void;
  emit(event: string, data?: any): void;
}
```

### 4.2 Event Types

```typescript
const Events = {
  // Node events
  NODE_CREATED: 'node:created',
  NODE_DELETED: 'node:deleted',
  NODE_FOCUSED: 'node:focused',
  NODE_MOVED: 'node:moved',
  
  // Canvas events
  CANVAS_CLICKED: 'canvas:clicked',
  CAMERA_MOVED: 'camera:moved',
  
  // AI events
  INTENT_RECEIVED: 'ai:intent-received',
  TOOL_GENERATED: 'ai:tool-generated',
  TOOL_ERROR: 'ai:tool-error',
  
  // Memory events
  MEMORY_STORED: 'memory:stored',
  MEMORY_RETRIEVED: 'memory:retrieved',
  MEMORY_SEARCH: 'memory:search',
  
  // System
  READY: 'system:ready',
  ERROR: 'system:error'
};
```

### 4.3 Event Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        EVENT FLOW                                    │
│                                                                      │
│   User Input                                                          │
│       │                                                               │
│       ▼                                                               │
│   ┌─────────┐     ┌─────────────┐     ┌──────────────────┐          │
│   │  DOM    │────►│  EventBus   │────►│  Subscribers     │          │
│   │ Event   │     │   emit()    │     │                  │          │
│   └─────────┘     └─────────────┘     └──────────────────┘          │
│                                              │                       │
│                                              ▼                       │
│   ┌────────────────────────────────────────────────────────────────┐ │
│   │                     EVENT BROADCAST                             │ │
│   │                                                                  │ │
│   │   SpatialScene ←─── NODE_FOCUSED ─── AIOrchestrator           │ │
│   │       │                           │                             │ │
│   │       │                           │                             │ │
│   │       ▼                           ▼                             │ │
│   │   Update                   Generate Tool                        │ │
│   │   Camera                                                   │ │
│   │                                                             │ │
│   └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Rendering Pipeline

### 5.1 Three.js Setup

```typescript
// Scene initialization
scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0f);

// Camera (Perspective)
camera = new THREE.PerspectiveCamera(
  60,                                    // FOV
  window.innerWidth / window.innerHeight, // Aspect
  0.1,                                   // Near
  1000                                   // Far
);

// Renderer (WebGL)
renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true
});
renderer.setSize(width, height);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
```

### 5.2 Lighting Setup

```typescript
// Ambient light (soft overall illumination)
const ambient = new THREE.AmbientLight(0x404060, 0.5);
scene.add(ambient);

// Point lights (accent lighting)
const light1 = new THREE.PointLight(0x00d9ff, 1, 50);  // Cyan
light1.position.set(10, 10, 10);
scene.add(light1);

const light2 = new THREE.PointLight(0xff00ff, 0.5, 50); // Magenta
light2.position.set(-10, -5, 10);
scene.add(light2);

const light3 = new THREE.PointLight(0x00ff88, 0.3, 50); // Green
light3.position.set(0, 15, -10);
scene.add(light3);
```

### 5.3 Particle System

```typescript
// Create 2000 particles
const particleCount = 2000;
const positions = new Float32Array(particleCount * 3);
const colors = new Float32Array(particleCount * 3);

for (let i = 0; i < particleCount; i++) {
  // Random positions in cube
  positions[i * 3] = (Math.random() - 0.5) * 100;
  positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
  positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
  
  // Random colors: cyan, magenta, or white
  const choice = Math.random();
  if (choice < 0.33) {
    colors[i * 3] = 0; colors[i * 3 + 1] = 0.85; colors[i * 3 + 2] = 1;
  } else if (choice < 0.66) {
    colors[i * 3] = 1; colors[i * 3 + 1] = 0; colors[i * 3 + 2] = 1;
  } else {
    colors[i * 3] = 1; colors[i * 3 + 1] = 1; colors[i * 3 + 2] = 1;
  }
}

// Create points with additive blending
const material = new THREE.PointsMaterial({
  size: 0.1,
  vertexColors: true,
  transparent: true,
  opacity: 0.6,
  blending: THREE.AdditiveBlending
});

particles = new THREE.Points(geometry, material);
scene.add(particles);
```

---

## 6. Camera Controls

### 6.1 Orbit Camera Implementation

```typescript
// Camera state
cameraTarget: Vector3 = (0, 0, 0);
cameraDistance: number = 20;
cameraTheta: number = Math.PI / 4;   // Horizontal angle
cameraPhi: number = Math.PI / 4;     // Vertical angle

// Update camera position from spherical coordinates
updateCameraPosition() {
  this.camera.position.x = this.cameraTarget.x + 
    this.cameraDistance * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
  this.camera.position.y = this.cameraTarget.y + 
    this.cameraDistance * Math.cos(this.cameraPhi);
  this.camera.position.z = this.cameraTarget.z + 
    this.cameraDistance * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);
  this.camera.lookAt(this.cameraTarget);
}

// Mouse drag: Rotate
canvas.addEventListener('mousemove', (e) => {
  if (isDragging) {
    cameraTheta -= deltaX * 0.01;
    cameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraPhi + deltaY * 0.01));
    updateCameraPosition();
  }
});

// Scroll wheel: Zoom
canvas.addEventListener('wheel', (e) => {
  cameraDistance = Math.max(5, Math.min(50, cameraDistance + e.deltaY * 0.05));
  updateCameraPosition();
});
```

---

## 7. Raycasting (Node Selection)

```typescript
// Click detection
canvas.addEventListener('click', (e) => {
  // Convert mouse to normalized device coordinates
  const mouse = new THREE.Vector2(
    (e.clientX / window.innerWidth) * 2 - 1,
    -(e.clientY / window.innerHeight) * 2 + 1
  );
  
  // Cast ray from camera
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);
  
  // Get all node meshes
  const meshes = Array.from(nodes.values()).map(n => n.mesh);
  
  // Check intersections
  const intersects = raycaster.intersectObjects(meshes);
  
  if (intersects.length > 0) {
    const nodeId = intersects[0].object.userData.nodeId;
    focusNode(nodeId);
    eventBus.emit(Events.NODE_FOCUSED, { id: nodeId });
  } else {
    clearFocus();
  }
});
```

---

## 8. Performance Considerations

### 8.1 Bundle Size

| Asset | Size | Gzipped |
|-------|------|---------|
| JavaScript | 490.28 KB | 126.66 KB |
| CSS | 11.33 KB | 2.62 KB |
| **Total** | **501.61 KB** | **129.28 KB** |

### 8.2 Optimization Strategies

1. **Tree Shaking**: Unused Three.js modules excluded
2. **Code Splitting**: Components lazy-loaded if needed
3. **Asset Optimization**: Particles use BufferGeometry
4. **Render Optimization**: Only update changed elements

### 8.3 Target Performance

| Metric | Target |
|--------|--------|
| FPS | 60 FPS |
| First Paint | < 1s |
| Time to Interactive | < 2s |
| Memory Usage | < 200MB |

---

## 9. Future Enhancements

### 9.1 WebGPU Renderer
```typescript
// Future: Replace WebGL with WebGPU for better performance
// const renderer = new THREE.WebGPURenderer();
```

### 9.2 Real AI Integration
```typescript
// Future: Connect to Claude/GPT API
const response = await fetch('https://api.anthropic.com/v1/messages', {
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'claude-3-sonnet',
    messages: [{ role: 'user', content: userInput }]
  })
});
```

### 9.3 Persistent Storage
```typescript
// Future: IndexedDB for offline storage
const db = await openDB('aether-os', 1, {
  upgrade(db) {
    db.createObjectStore('nodes');
    db.createObjectStore('edges');
  }
});
```

---

## 10. Glossary

| Term | Definition |
|------|------------|
| **Liquid Nodes** | Floating UI panels that morph and resize based on context |
| **Glassmorphism** | UI design style with frosted glass effect |
| **Micro-Tools** | One-time use UI components generated on-demand |
| **Associative Memory** | Memory system based on connections, not location |
| **Vector Embedding** | Numerical representation of data for similarity search |
| **Force-Directed Layout** | Graph layout algorithm based on physics simulation |

---

*Document Version: 1.0.0*  
*Last Updated: 2024*
