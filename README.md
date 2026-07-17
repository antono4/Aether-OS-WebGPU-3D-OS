# 🌀 Aether OS - Spatial Operating System

![Aether OS Banner](https://raw.githubusercontent.com/antono4/Aether-OS-WebGPU-3D-OS/main/docs/banner.png)

> **Next-Generation Spatial Operating System** dengan paradigma Zero-App Architecture dan Associative Memory Database. Mendobrak batasan antarmuka WIMP (Windows, Icons, Menus, Pointer) tradisional.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/typescript-5.3-blue)](package.json)
[![Three.js](https://img.shields.io/badge/three.js-r160-orange)](package.json)
[![Vite](https://img.shields.io/badge/vite-5.0-646cff)](package.json)

---

## 🎯 Overview

Aether OS adalah sistem operasi spasial yang berjalan di atas **Web-Native Spatial Canvas** dengan kemampuan:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐   │
│   │   LIQUID    │    │     AI      │    │     MEMORY      │   │
│   │   CANVAS    │◄──►│  ORCHESTRATOR│◄──►│      GRAPH      │   │
│   │  (3D UI)    │    │ (Micro-Tools)│    │  (Vector DB)    │   │
│   └──────┬──────┘    └──────┬───────┘    └────────┬────────┘   │
│          │                   │                      │             │
│          │    ┌──────────────┴──────────────────────┘             │
│          │    │                                                  │
│          ▼    ▼                                                  │
│   ┌─────────────────────────────────────────────────────────┐    │
│   │              EVENT BUS (Communication Layer)            │    │
│   │  • NODE_CREATED  • AI_INTENT_RECEIVED  • MEMORY_STORED │    │
│   └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Paradigma Utama

| Paradigma | Deskripsi |
|----------|-----------|
| **Zero-App Architecture** | Tidak ada aplikasi statis. UI komponen dibuat secara dinamis berdasarkan instruksi pengguna |
| **Liquid Nodes** | Panel UI yang berbentuk kapsul/floating, ukuran dan tata letaknya berubah dinamis |
| **Associative Memory** | Penyimpanan data sebagai graph dengan koneksi semantik, bukan file/folder tradisional |
| **Generative Micro-Tools** | Tool sekali-pakai yang dibuat AI berdasarkan kebutuhan spesifik |

---

## ✨ Fitur Utama

### 1. 🌀 Spatial 3D Canvas

Ruang kerja 3D tanpa batas dengan Three.js:

```
                    ┌────────────────────────────────────┐
                    │          INFINITE 3D SPACE         │
                    │                                     │
                    │     ●─────────●─────────●           │
                    │    /│        /│        /│           │
                    │   ●─────────●─────────● │           │
                    │   │  ┌─────┼─────┐    │ │           │
                    │   │  │NODE │     │    │ │           │
                    │   │  │ AI  │     │    │/            │
                    │   ●──┼─────┼─────┼────●             │
                    │   │  └─────┘     │                 │
                    │   │/             │/                  │
                    │   ●─────────●─────────●               │
                    │                                     │
                    │    [Particles / Starfield Effect]      │
                    └────────────────────────────────────┘
```

**Fitur:**
- ✅ Orbit camera dengan drag & scroll zoom
- ✅ Particle field dengan efek starfield
- ✅ Dynamic lighting (ambient + point lights)
- ✅ Infinite spatial workspace

### 2. 🔮 Liquid Nodes

Panel glassmorphic 3D dengan shader kustom:

```
┌─────────────────────────────────────────┐
│  ╭─────────────────────────────────╮   │
│  │    GLASSMORPHISM SHADER         │   │
│  │  ┌───────────────────────────┐  │   │
│  │  │ • Fresnel Edge Highlight  │  │   │
│  │  │ • Neon Glow Border        │  │   │
│  │  │ • Transparency Layer      │  │   │
│  │  │ • Pulse Animation         │  │   │
│  │  └───────────────────────────┘  │   │
│  ╰─────────────────────────────────╯   │
│                                         │
│  GLSL Vertex Shader:                   │
│  ┌─────────────────────────────────┐   │
│  │ varying vec3 vNormal;           │   │
│  │ varying vec3 vViewPosition;     │   │
│  │ void main() {                   │   │
│  │   vNormal = normalMatrix * n;   │   │
│  │   ...                           │   │
│  │ }                               │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**Komponen Shader:**
- **Fresnel Effect**: Efek cahaya di tepi untuk efek kaca
- **Neon Pulse**: Animasi glow yang berdenyut
- **Focus Highlight**: Penanda saat node difokuskan
- **Physics Simulation**: Spring forces antar node

### 3. ⚡ AI Orchestrator (Generative Micro-Tools)

Sistem AI yang membuat tool UI secara dinamis:

```
┌──────────────────────────────────────────────────────────────┐
│                    AI ORCHESTRATOR PIPELINE                  │
│                                                              │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────────┐ │
│  │   NATURAL   │───►│    INTENT    │───►│    COMPONENT   │ │
│  │   LANGUAGE  │    │    PARSER    │    │    LIBRARY     │ │
│  │   INPUT     │    │              │    │                │ │
│  └─────────────┘    └──────────────┘    └────────────────┘ │
│        │                   │                    │           │
│        ▼                   ▼                    ▼           │
│  "Hitung                   │                    │           │
│   pengeluaran              calculate            [Calculator]  │
│   proyek X"                                        │         │
│                                                   ▼         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 MICRO-TOOL OUTPUT                   │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │  🧮 Calculator                              │    │   │
│  │  │  ┌───────────────────────────────────────┐ │    │   │
│  │  │  │          12,500,000                   │ │    │   │
│  │  │  │  ┌──┬──┬──┬──┐                       │ │    │   │
│  │  │  │  │7 │8 │9 │/ │                       │ │    │   │
│  │  │  │  ├──┼──┼──┼──┤                       │ │    │   │
│  │  │  │  │4 │5 │6 │* │                       │ │    │   │
│  │  │  │  ├──┼──┼──┼──┤                       │ │    │   │
│  │  │  │  │1 │2 │3 │- │                       │ │    │   │
│  │  │  │  ├──┼──┼──┼──┤                       │ │    │   │
│  │  │  │  │0 │. │= │+ │                       │ │    │   │
│  │  │  │  └──┴──┴──┴──┘                       │ │    │   │
│  │  │  └───────────────────────────────────────┘ │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

**Intent Patterns:**
| Intent | Pattern | Contoh Input |
|--------|---------|--------------|
| `calculate` | `/calculate\|compute\|how much/i` | "calculate 500+300" |
| `visualize` | `/show.*chart\|visualize/i` | "show chart of sales data" |
| `create` | `/create\|make\|generate/i` | "create a new project" |
| `compare` | `/compare.*to\|difference/i` | "compare project A and B" |
| `analyze` | `/analyze\|what is\|summary/i` | "analyze my expenses" |
| `query` | `/search\|find\|list/i` | "search for meeting notes" |

**Component Library:**
- 📊 **Table**: Data tabular dengan sorting
- 📈 **Chart**: Bar, Line, Pie charts
- 🧮 **Calculator**: Kalkulator interaktif
- 📝 **Form**: Form input dinamis
- 📏 **Metric**: Card dengan tren naik/turun
- ✏️ **Editor**: Markdown/plain text editor
- 📋 **List**: Ordered/unordered list

### 4. 🧠 Associative Memory Graph

Graph database dengan vector embeddings untuk semantic search:

```
┌─────────────────────────────────────────────────────────────────┐
│                   MEMORY GRAPH VISUALIZATION                     │
│                                                                  │
│                         ● concept-1                              │
│                        /        \                                │
│                       /          \                               │
│                      /            \                              │
│            ● concept-3 ────────── ● concept-1                    │
│               (ML)                  (AI)                         │
│                  │                    │                            │
│                  │                    │                            │
│            ┌─────┴────┐        ┌────┴────┐                      │
│            │  task-*  │        │ concept-*│                      │
│            │  "budget │        │ "project │                      │
│            │   calc"  │        │    X"    │                      │
│            └───────────┘        └──────────┘                      │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  FORCE-DIRECTED LAYOUT ALGORITHM                         │   │
│  │  • Repulsion: 50 / distance²                             │   │
│  │  • Attraction: 0.1 × edge_weight × distance              │   │
│  │  • Damping: 0.9                                         │   │
│  │  • Iterations: 50                                       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Fitur Memory Graph:**
- ✅ **Node Types**: text, image, code, audio, data, task, concept
- ✅ **Edge Types**: temporal, semantic, causal, reference, association
- ✅ **Vector Embeddings**: 128-dimensi untuk semantic search
- ✅ **Cosine Similarity**: Pencarian berdasarkan makna
- ✅ **Path Finding**: BFS untuk menemukan hubungan antar node
- ✅ **Force-Directed Layout**: Visualisasi 3D otomatis

---

## 🏗️ Arsitektur Sistem

### System Design Document

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        AETHER OS - LAYERED ARCHITECTURE                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  PRESENTATION LAYER                                                 │ │
│  │  ├── Spatial 3D Canvas (Three.js / WebGL)                          │ │
│  │  ├── Liquid Nodes UI (GLSL Glassmorphism)                           │ │
│  │  ├── Command Bar (Natural Language Input)                           │ │
│  │  └── Overlay Panels (Memory Info, Toasts)                          │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                    │                                    │
│                                    ▼                                    │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  INTELLIGENCE LAYER                                                │ │
│  │  ├── AI Orchestrator (Intent Parser)                               │ │
│  │  ├── Generative Micro-Tools (Component Library)                    │ │
│  │  └── Response Generator                                            │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                    │                                    │
│                                    ▼                                    │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  MEMORY LAYER                                                      │ │
│  │  ├── Graph Database (Nodes & Edges)                                │ │
│  │  ├── Vector Store (Embeddings)                                     │ │
│  │  ├── Semantic Search Engine                                        │ │
│  │  └── Visualization Generator                                       │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                    │                                    │
│                                    ▼                                    │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  KERNEL LAYER                                                      │ │
│  │  ├── Event Bus (Pub/Sub System)                                    │ │
│  │  ├── Physics Engine (Spring Forces)                                 │ │
│  │  └── Scene Manager (Three.js)                                      │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                    │                                    │
│                                    ▼                                    │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  PLATFORM LAYER                                                    │ │
│  │  ├── Browser Runtime (WebGL/WebGPU)                                │ │
│  │  ├── Vite Build System                                             │ │
│  │  └── TypeScript Compiler                                           │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  USER    │────►│  INPUT   │────►│   AI     │────►│  MICRO   │
│  INPUT   │     │ PARSER   │     │ORCHESTR. │     │  TOOL    │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                             │              │
                                             │              ▼
                                             │         ┌──────────┐
                                             │         │  LIQUID  │
                                             │         │   NODE   │
                                             │         └──────────┘
                                             │              │
                                             ▼              │
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  MEMORY  │◄────│ GRAPH   │◄────│  STORE   │◄────│  EVENT   │
│  SEARCH  │     │ UPDATE  │     │   NODE   │     │   BUS    │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
```

---

## 📦 Installation

### Prerequisites

- Node.js 18+
- npm 9+
- Modern browser with WebGL support

### Steps

```bash
# Clone repository
git clone https://github.com/antono4/Aether-OS-WebGPU-3D-OS.git
cd Aether-OS-WebGPU-3D-OS/spatial-canvas

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Variables (Optional)

```bash
# Create .env file
cat > .env << 'EOF'
# AI API Configuration (for real AI integration)
VITE_AI_API_KEY=your_api_key_here
VITE_AI_ENDPOINT=https://api.anthropic.com/v1/messages

# Memory Graph Configuration
VITE_EMBEDDING_DIMENSION=128
VITE_MAX_NODES=10000
EOF
```

---

## 🎮 Usage Guide

### Camera Controls

| Action | Control |
|--------|---------|
| Rotate | Click + Drag |
| Zoom In/Out | Scroll Wheel |
| Focus Node | Click on Node |
| Clear Focus | Click Empty Space |

### Command Bar

Ketik perintah natural language di command bar untuk menghasilkan Micro-Tool:

```
┌─────────────────────────────────────────────────────────────────────┐
│  ⌘  │ Tampilkan chart penjualan bulanan                              │  Execute  │
└─────────────────────────────────────────────────────────────────────┘
```

**Contoh Perintah:**

| Perintah | Tool yang Dihasilkan |
|----------|---------------------|
| `calculate 500 + 300` | Calculator dengan hasil 800 |
| `show chart of sales` | Bar Chart dengan sample data |
| `create a todo list` | Interactive list editor |
| `analyze project expenses` | Metric cards dengan analysis |
| `compare A vs B` | Comparison tool dengan metrics |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + K` | Focus Command Bar |
| `Escape` | Clear Node Focus |
| `Ctrl + 1-3` | Focus Node 1-3 |

---

## 📂 Project Structure

```
spatial-canvas/
├── src/
│   ├── core/
│   │   ├── EventBus.ts          # Event-driven communication
│   │   └── Scene.ts             # Three.js scene & physics
│   │
│   ├── intelligence/
│   │   └── AIOrchestrator.ts    # AI tool generation
│   │
│   ├── memory/
│   │   └── MemoryGraph.ts       # Graph database
│   │
│   ├── styles/
│   │   └── main.css             # Glassmorphism styles
│   │
│   ├── main.ts                  # Application entry
│   └── vite-env.d.ts            # TypeScript definitions
│
├── dist/                        # Production build
├── index.html                   # Entry HTML
├── package.json                 # Dependencies
├── tsconfig.json               # TypeScript config
├── vite.config.ts              # Vite configuration
└── README.md                   # This file
```

---

## 🔧 API Reference

### EventBus

```typescript
import { EventBus, Events } from './core/EventBus';

const bus = new EventBus();

// Subscribe to event
const unsubscribe = bus.on(Events.NODE_FOCUSED, (data) => {
  console.log('Node focused:', data.id);
});

// Emit event
bus.emit(Events.NODE_CREATED, { id: 'node-1', title: 'New Node' });

// Unsubscribe
unsubscribe();
```

**Available Events:**
- `NODE_CREATED`, `NODE_DELETED`, `NODE_FOCUSED`, `NODE_MOVED`
- `CANVAS_CLICKED`, `CAMERA_MOVED`
- `INTENT_RECEIVED`, `TOOL_GENERATED`, `TOOL_ERROR`
- `MEMORY_STORED`, `MEMORY_RETRIEVED`, `MEMORY_SEARCH`
- `READY`, `ERROR`

### AIOrchestrator

```typescript
import { AIOrchestrator } from './intelligence/AIOrchestrator';

const ai = new AIOrchestrator();

// Generate tool from prompt
const tool = await ai.generateTool("calculate 100 + 200");

// Render tool to DOM
const element = ai.renderTool(tool);
document.body.appendChild(element);

// Get all generated tools
const allTools = ai.getAllTools();
```

### MemoryGraph

```typescript
import { MemoryGraph } from './memory/MemoryGraph';

const memory = new MemoryGraph();

// Create node
const node = memory.createNode({
  type: 'task',
  content: 'Complete project report',
  tags: ['work', 'urgent']
});

// Connect nodes
memory.connectNodes('node-1', 'node-2', 'semantic', 0.8);

// Search
const results = memory.search('project report');

// Get visualization data
const { nodes, edges } = memory.createVisualization();

// Get stats
const stats = memory.getStats();
// { totalNodes: 10, totalEdges: 15, nodesByType: {...}, avgConnections: 1.5 }
```

### SpatialScene

```typescript
import { SpatialScene } from './core/Scene';

const scene = new SpatialScene(document.getElementById('canvas'));

// Create node
scene.createNode({
  id: 'my-node',
  title: 'My Node',
  content: 'Description here',
  position: new THREE.Vector3(0, 0, 0)
});

// Focus node
scene.focusNode('my-node');

// World to screen coordinates
const screenPos = scene.worldToScreen(new THREE.Vector3(1, 2, 3));

// Start render loop
scene.start();

// Stop render loop
scene.stop();
```

---

## 📊 Screenshots

### Main Interface

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                           ┌──────────────────┐                              │
│                           │  🧠 MEMORY GRAPH │                              │
│                           │  Nodes: 12       │                              │
│                           │  Edges: 18       │                              │
│                           │  [Visualize]     │                              │
│                           └──────────────────┘                              │
│                                                                             │
│                        ●────────●                                           │
│                       /│        │\                                          │
│                      / │  Liquid│ \                                         │
│                     ●  │  Node  │  ●                                        │
│                     │  │  Glass │  │                                        │
│                     │  └────────┘  │                                        │
│                     │ /            \ │                                       │
│                     │/    ◉ 3D     \|                                       │
│                     ●  Particles   ●                                        │
│                          Canvas                                              │
│                                                                             │
│                                                                             │
│                                                                             │
│                                                                             │
│                                                                             │
│                                                                             │
│                                                                             │
│           [ Drag: Rotate  |  Scroll: Zoom  |  Click: Select ]                │
│                                                                             │
│                                                                             │
│         ┌───────────────────────────────────────────────────────────┐         │
│         │  ⌘  │ Tampilkan chart perbandingan proyek A dan B    │  Execute  │         │
│         └───────────────────────────────────────────────────────────┘         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Glassmorphism Effect

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│    ╭────────────────────────────────────────────────────────╮    │
│    │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │    │
│    │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │    │
│    │  ░░░░┌─────────────────────────────┐░░░░░░░░░░░░░░░  │    │
│    │  ░░░░│    FRESNEL EDGE EFFECT      │░░░░░░░░░░░░░░░  │    │
│    │  ░░░░│   ═══════════════════════   │░░░░░░░░░░░░░░░  │    │
│    │  ░░░░│    • Edge Glow (Cyan)       │░░░░░░░░░░░░░░░  │    │
│    │  ░░░░│    • Center: Semi-transparent░░░░░░░░░░░░░░░  │    │
│    │  ░░░░│    • Pulse Animation         │░░░░░░░░░░░░░░░  │    │
│    │  ░░░░│    • Focus: Bright Highlight │░░░░░░░░░░░░░░░  │    │
│    │  ░░░░└─────────────────────────────┘░░░░░░░░░░░░░░░  │    │
│    │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │    │
│    ╰────────────────────────────────────────────────────────╯    │
│                         ▲                                             │
│                         │                                             │
│                    Glass Node                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Micro-Tool Generation

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  🧮 Calculator                                    [×]         │  │
│  │  ─────────────────────────────────────────────────────────────│  │
│  │                                                              │  │
│  │  ┌─────────────────────────────────────────────────────────┐ │  │
│  │  │                        12,500,000                       │ │  │
│  │  └─────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  │  ┌────┬────┬────┬────┐                                     │  │
│  │  │ 7  │ 8  │ 9  │ /  │                                     │  │
│  │  ├────┼────┼────┼────┤                                     │  │
│  │  │ 4  │ 5  │ 6  │ *  │                                     │  │
│  │  ├────┼────┼────┼────┤                                     │  │
│  │  │ 1  │ 2  │ 3  │ -  │                                     │  │
│  │  ├────┼────┼────┼────┤                                     │  │
│  │  │ 0  │ .  │ =  │ +  │                                     │  │
│  │  └────┴────┴────┴────┘                                     │  │
│  │                                                              │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  📊 Sales Comparison                               [×]         │  │
│  │  ─────────────────────────────────────────────────────────────│  │
│  │                                                              │  │
│  │      Project A                    Project B                   │  │
│  │         ▼                            ▼                       │  │
│  │  ┌──────────────────┐      ┌──────────────────┐           │  │
│  │  │      85%          │      │      72%          │           │  │
│  │  │   ████████████     │      │   ██████████      │           │  │
│  │  │   ████████████     │      │   ██████████      │           │  │
│  │  │   ████████████     │      │   ██████████      │           │  │
│  │  └──────────────────┘      └──────────────────┘           │  │
│  │                                                              │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🧪 Testing

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Manual Testing Checklist

- [ ] 3D Canvas renders correctly
- [ ] Camera controls (drag, scroll) work
- [ ] Liquid nodes display with glassmorphism
- [ ] Physics simulation (spring forces) active
- [ ] Command bar accepts input
- [ ] AI orchestrator generates tools
- [ ] Micro-tools render correctly
- [ ] Memory graph initializes with sample data
- [ ] Memory search returns results
- [ ] Toast notifications appear
- [ ] Help tooltip displays

---

## 🚀 Roadmap

### Phase 1 (Current) ✅
- [x] 3D Spatial Canvas dengan Three.js
- [x] Liquid Nodes dengan Glassmorphism
- [x] AI Orchestrator (simulated)
- [x] Memory Graph (simulated)
- [x] Command Bar interface

### Phase 2 (Planned)
- [ ] Real AI integration (Claude/GPT API)
- [ ] Persistent storage (IndexedDB)
- [ ] WebGPU renderer
- [ ] Multi-user collaboration
- [ ] Voice input

### Phase 3 (Future)
- [ ] Desktop app (Tauri/Electron)
- [ ] Mobile support
- [ ] Plugin system
- [ ] Custom shader playground
- [ ] AI agent delegation

---

## 🤝 Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📄 License

MIT License - lihat [LICENSE](LICENSE) untuk detail.

---

## 🙏 Acknowledgments

- [Three.js](https://threejs.org/) - 3D rendering library
- [Vite](https://vitejs.dev/) - Build tool
- [TypeScript](https://www.typescriptlang.org/) - Type safety

---

## 📞 Contact

- **GitHub**: [antono4](https://github.com/antono4)
- **Project**: [Aether-OS-WebGPU-3D-OS](https://github.com/antono4/Aether-OS-WebGPU-3D-OS)

---

<div align="center">

**🌀 Aether OS - Mendobrak Batasan Antarmuka Tradisional**

*Built with ❤️ by AI Agent (OpenHands)*

</div>
