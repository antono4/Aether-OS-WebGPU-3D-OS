# 🚀 Quick Start Guide - Aether OS

## Prerequisites

- Node.js 18 or higher
- npm 9 or higher
- Modern browser with WebGL support (Chrome, Firefox, Edge, Safari)

## Installation

```bash
# Clone the repository
git clone https://github.com/antono4/Aether-OS-WebGPU-3D-OS.git
cd Aether-OS-WebGPU-3D-OS/spatial-canvas

# Install dependencies
npm install

# Start development server
npm run dev
```

Buka browser di `http://localhost:5173`

## Basic Controls

| Control | Action |
|---------|--------|
| 🖱️ **Drag** | Rotate camera around scene |
| 🔄 **Scroll** | Zoom in/out |
| 👆 **Click** | Select/focus a node |
| ⌨️ **Ctrl+K** | Focus command bar |
| ⌨️ **Escape** | Clear selection |

## Try These Commands

Ketik di command bar (bagian bawah layar):

### Calculations
```
calculate 500 + 300
compute 1000 / 25
how much is 42 * 7
```

### Visualizations
```
show chart of sales
visualize project data
display comparison as bar chart
```

### Creation
```
create a todo list
make a note
generate checklist
```

### Analysis
```
analyze my budget
what are my expenses
summary of spending
```

### Search
```
search for meeting notes
find project tasks
list all items
```

## Understanding the Interface

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  ┌─────────────────┐                                                 │
│  │ 🧠 MEMORY GRAPH │  ← Memory stats panel (top-right)              │
│  │ Nodes: 12       │                                                 │
│  │ Connections: 18 │                                                 │
│  └─────────────────┘                                                 │
│                                                                      │
│                    ●                                                  │
│                   /│\        ← 3D Liquid Nodes                      │
│                  ● │ ●       (glassmorphic panels)                   │
│                    │                                                 │
│               ═════●═════   ← Particle field (starfield)            │
│                    │                                                 │
│                                                                      │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  ⌘  │ Type a command or ask AI...                       │ Execute │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                        ↑ Command Bar                 │
└─────────────────────────────────────────────────────────────────────┘
```

## What's Happening Behind the Scenes

### 1. Your Command is Processed
```
Input: "show chart of sales"
         ↓
AI Orchestrator parses intent
         ↓
Intent: "visualize"
Entities: "sales"
```

### 2. Micro-Tool is Generated
```
Component Library selected: Chart Component
         ↓
Data populated: Sample sales data
         ↓
Tool rendered: Interactive bar chart
```

### 3. Memory Graph Updated
```
New node created: "show chart of sales"
         ↓
Tags added: ["visualize", "sales"]
         ↓
Connections formed based on context
```

## Exploring the Memory Graph

Klik tombol "Visualize Memory" di panel kanan atas untuk melihat:

```
┌─────────────────────────────────────────────────────────────┐
│  🧠 Memory Network                                          │
│  ───────────────────────────────────────────────────────────│
│                                                             │
│     [Machine Learning]  ─────  [Neural Networks]            │
│           │                       │                         │
│           │                       │                         │
│     [Deep Learning]  ─────  [AI Project]                   │
│                                                             │
│  Click any node to see details!                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Sample Workflow

### 1. Create a Task
```
Type: "create a todo list for my project"
Result: Interactive list editor appears
```

### 2. Add Items
```
Type: "add 'review code' to the list"
Result: List updated
```

### 3. Search Later
```
Type: "search for project tasks"
Result: Your created todo list found!
```

## Troubleshooting

### Canvas not rendering?
- Check browser console for errors
- Ensure WebGL is enabled: https://get.webgl.org/
- Try refreshing the page

### Command not working?
- Make sure you're typing in the command bar
- Press Enter to submit
- Check for typos

### Performance issues?
- Try zooming out (scroll down)
- Close other browser tabs
- Use a dedicated GPU if available

## Next Steps

- Read [ARCHITECTURE.md](ARCHITECTURE.md) for technical details
- Check out the full [README.md](../README.md) for features
- Experiment with different commands!

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + K` | Focus command bar |
| `Escape` | Clear focus |
| `Click + Drag` | Rotate camera |
| `Scroll` | Zoom |

---

**Enjoy exploring Aether OS!** 🌀
