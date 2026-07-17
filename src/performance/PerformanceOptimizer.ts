/**
 * Aether OS - Performance Optimizer
 * WebWorkers, WASM support, LOD rendering
 */

// WebWorker for heavy computation
export const computationWorkerCode = `
self.onmessage = function(e) {
  const { type, data, id } = e.data;
  
  switch(type) {
    case 'process-memory-graph':
      const result = processMemoryGraph(data);
      self.postMessage({ id, result });
      break;
      
    case 'calculate-layout':
      const layout = calculateLayout(data);
      self.postMessage({ id, result: layout });
      break;
      
    case 'search-nodes':
      const matches = searchNodes(data);
      self.postMessage({ id, result: matches });
      break;
      
    case 'generate-embeddings':
      const embeddings = generateEmbeddings(data);
      self.postMessage({ id, result: embeddings });
      break;
  }
};

function processMemoryGraph(data) {
  const { nodes, edges, algorithm } = data;
  
  switch(algorithm) {
    case 'page-rank':
      return calculatePageRank(nodes, edges);
    case 'community':
      return detectCommunities(nodes, edges);
    case 'centrality':
      return calculateCentrality(nodes, edges);
    default:
      return nodes;
  }
}

function calculatePageRank(nodes, edges, iterations = 20, damping = 0.85) {
  const n = nodes.length;
  if (n === 0) return [];
  
  // Initialize ranks
  let ranks = {};
  nodes.forEach(node => ranks[node.id] = 1 / n);
  
  // Build adjacency
  const adjacency = {};
  edges.forEach(edge => {
    if (!adjacency[edge.source]) adjacency[edge.source] = [];
    adjacency[edge.source].push(edge.target);
  });
  
  // Iterate
  for (let i = 0; i < iterations; i++) {
    const newRanks = {};
    const danglingSum = Object.keys(ranks).reduce((sum, node) => {
      return sum + (adjacency[node]?.length === 0 ? ranks[node] : 0);
    }, 0);
    
    nodes.forEach(node => {
      let rank = (1 - damping) / n;
      rank += damping * danglingSum / n;
      
      Object.keys(adjacency).forEach(source => {
        if (adjacency[source].includes(node.id)) {
          rank += damping * ranks[source] / adjacency[source].length;
        }
      });
      
      newRanks[node.id] = rank;
    });
    
    ranks = newRanks;
  }
  
  return nodes.map(node => ({ ...node, rank: ranks[node.id] }));
}

function detectCommunities(nodes, edges) {
  // Simple label propagation algorithm
  const labels = {};
  nodes.forEach((node, i) => labels[node.id] = i);
  
  const neighbors = {};
  edges.forEach(edge => {
    if (!neighbors[edge.source]) neighbors[edge.source] = [];
    if (!neighbors[edge.target]) neighbors[edge.target] = [];
    neighbors[edge.source].push(edge.target);
    neighbors[edge.target].push(edge.source);
  });
  
  for (let iter = 0; iter < 10; iter++) {
    nodes.forEach(node => {
      const nodeNeighbors = neighbors[node.id] || [];
      if (nodeNeighbors.length === 0) return;
      
      const labelCounts = {};
      nodeNeighbors.forEach(n => {
        const label = labels[n];
        labelCounts[label] = (labelCounts[label] || 0) + 1;
      });
      
      const maxLabel = Object.keys(labelCounts).reduce((a, b) => 
        labelCounts[a] > labelCounts[b] ? a : b
      );
      labels[node.id] = parseInt(maxLabel);
    });
  }
  
  return nodes.map(node => ({ ...node, community: labels[node.id] }));
}

function calculateCentrality(nodes, edges) {
  const betweenness = {};
  nodes.forEach(node => betweenness[node.id] = 0);
  
  // Simplified betweenness (full algorithm would be O(n^3))
  edges.forEach(edge => {
    betweenness[edge.source]++;
    betweenness[edge.target]++;
  });
  
  return nodes.map(node => ({ ...node, centrality: betweenness[node.id] || 0 }));
}

function calculateLayout(data) {
  const { nodes, width, height, type } = data;
  
  switch(type) {
    case 'force':
      return forceLayout(nodes, width, height);
    case 'radial':
      return radialLayout(nodes, width, height);
    case 'grid':
      return gridLayout(nodes, width, height);
    default:
      return nodes;
  }
}

function forceLayout(nodes, width, height) {
  const positions = {};
  const iterations = 50;
  
  nodes.forEach(node => {
    positions[node.id] = {
      x: Math.random() * width,
      y: Math.random() * height
    };
  });
  
  for (let i = 0; i < iterations; i++) {
    const forces = {};
    nodes.forEach(node => forces[node.id] = { x: 0, y: 0 });
    
    // Repulsion between nodes
    for (let a = 0; a < nodes.length; a++) {
      for (let b = a + 1; b < nodes.length; b++) {
        const nodeA = nodes[a];
        const nodeB = nodes[b];
        
        const dx = positions[nodeB.id].x - positions[nodeA.id].x;
        const dy = positions[nodeB.id].y - positions[nodeA.id].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        
        const force = 1000 / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        
        forces[nodeA.id].x -= fx;
        forces[nodeA.id].y -= fy;
        forces[nodeB.id].x += fx;
        forces[nodeB.id].y += fy;
      }
    }
    
    // Apply forces with damping
    const damping = 0.5;
    nodes.forEach(node => {
      positions[node.id].x += forces[node.id].x * damping;
      positions[node.id].y += forces[node.id].y * damping;
      
      // Keep in bounds
      positions[node.id].x = Math.max(50, Math.min(width - 50, positions[node.id].x));
      positions[node.id].y = Math.max(50, Math.min(height - 50, positions[node.id].y));
    });
  }
  
  return nodes.map(node => ({
    ...node,
    position: positions[node.id]
  }));
}

function radialLayout(nodes, width, height) {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 3;
  
  return nodes.map((node, i) => {
    const angle = (2 * Math.PI * i) / nodes.length;
    return {
      ...node,
      position: {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      }
    };
  });
}

function gridLayout(nodes, width, height) {
  const cols = Math.ceil(Math.sqrt(nodes.length));
  const spacing = Math.min(width, height) / (cols + 1);
  
  return nodes.map((node, i) => ({
    ...node,
    position: {
      x: spacing * ((i % cols) + 1),
      y: spacing * (Math.floor(i / cols) + 1)
    }
  }));
}

function searchNodes(data) {
  const { nodes, query, fields } = data;
  const queryLower = query.toLowerCase();
  
  return nodes.filter(node => {
    return fields.some(field => {
      const value = node[field];
      if (typeof value === 'string') {
        return value.toLowerCase().includes(queryLower);
      }
      return false;
    });
  });
}

function generateEmbeddings(data) {
  // Simplified embedding generation
  // Real implementation would use a proper embedding model
  const { texts, dimension = 128 } = data;
  
  return texts.map(text => {
    const embedding = new Float32Array(dimension);
    const words = text.toLowerCase().split(/\\s+/);
    
    words.forEach((word, i) => {
      const hash = hashString(word);
      for (let d = 0; d < dimension; d++) {
        embedding[d] += Math.sin(hash * (d + 1) + i) * 0.1;
      }
    });
    
    // Normalize
    let sum = 0;
    embedding.forEach(v => sum += v * v);
    const norm = Math.sqrt(sum);
    for (let d = 0; d < dimension; d++) {
      embedding[d] /= norm;
    }
    
    return Array.from(embedding);
  });
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
`;

export interface WorkerTask {
  id: string;
  type: string;
  data: any;
  resolve: (result: any) => void;
  reject: (error: any) => void;
}

export class ComputationWorker {
  private worker: Worker | null = null;
  private pendingTasks: Map<string, WorkerTask> = new Map();
  private taskId: number = 0;

  constructor() {
    this.initializeWorker();
  }

  private initializeWorker(): void {
    try {
      const blob = new Blob([computationWorkerCode], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      this.worker = new Worker(url);

      this.worker.onmessage = (e) => {
        const { id, result, error } = e.data;
        const task = this.pendingTasks.get(id);

        if (task) {
          if (error) {
            task.reject(error);
          } else {
            task.resolve(result);
          }
          this.pendingTasks.delete(id);
        }
      };

      this.worker.onerror = (e) => {
        console.error('Worker error:', e);
      };

      console.log('⚡ Computation worker initialized');
    } catch (e) {
      console.error('Failed to initialize worker:', e);
    }
  }

  async postTask(type: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not available'));
        return;
      }

      const id = `task-${++this.taskId}`;
      
      this.pendingTasks.set(id, { id, type, data, resolve, reject });
      this.worker.postMessage({ type, data, id });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingTasks.has(id)) {
          this.pendingTasks.delete(id);
          reject(new Error('Task timeout'));
        }
      }, 30000);
    });
  }

  processMemoryGraph(nodes: any[], edges: any[], algorithm: string): Promise<any[]> {
    return this.postTask('process-memory-graph', { nodes, edges, algorithm });
  }

  calculateLayout(nodes: any[], width: number, height: number, type: string): Promise<any[]> {
    return this.postTask('calculate-layout', { nodes, width, height, type });
  }

  searchNodes(nodes: any[], query: string, fields: string[]): Promise<any[]> {
    return this.postTask('search-nodes', { nodes, query, fields });
  }

  generateEmbeddings(texts: string[], dimension?: number): Promise<number[][]> {
    return this.postTask('generate-embeddings', { texts, dimension });
  }

  terminate(): void {
    this.worker?.terminate();
    this.worker = null;
    this.pendingTasks.clear();
  }
}

// LOD (Level of Detail) Manager
export interface LODLevel {
  distance: number;
  geometry: 'high' | 'medium' | 'low';
  texture: 'high' | 'medium' | 'low' | 'none';
  shader: 'full' | 'simple' | 'basic';
}

export class LODManager {
  private levels: LODLevel[] = [
    { distance: 0, geometry: 'high', texture: 'high', shader: 'full' },
    { distance: 20, geometry: 'medium', texture: 'medium', shader: 'simple' },
    { distance: 50, geometry: 'low', texture: 'low', shader: 'basic' },
    { distance: 100, geometry: 'low', texture: 'none', shader: 'basic' }
  ];

  getLevelForDistance(distance: number): LODLevel {
    for (const level of this.levels) {
      if (distance <= level.distance) {
        return level;
      }
    }
    return this.levels[this.levels.length - 1];
  }

  setLevels(levels: LODLevel[]): void {
    this.levels = levels.sort((a, b) => a.distance - b.distance);
  }

  getLevels(): LODLevel[] {
    return [...this.levels];
  }
}

// Memory Pool for object reuse
export class ObjectPool<T> {
  private available: T[] = [];
  private inUse: Set<T> = new Set();
  private factory: () => T;
  private maxSize: number;

  constructor(factory: () => T, initialSize: number = 10, maxSize: number = 100) {
    this.factory = factory;
    this.maxSize = maxSize;

    for (let i = 0; i < initialSize; i++) {
      this.available.push(factory());
    }
  }

  acquire(): T {
    let obj: T;

    if (this.available.length > 0) {
      obj = this.available.pop()!;
    } else if (this.inUse.size < this.maxSize) {
      obj = this.factory();
    } else {
      // Wait or create anyway
      obj = this.factory();
    }

    this.inUse.add(obj);
    return obj;
  }

  release(obj: T): void {
    if (this.inUse.has(obj)) {
      this.inUse.delete(obj);
      if (this.available.length < this.maxSize) {
        this.available.push(obj);
      }
    }
  }

  clear(): void {
    this.available = [];
    this.inUse.clear();
  }

  getStats(): { available: number; inUse: number; total: number } {
    return {
      available: this.available.length,
      inUse: this.inUse.size,
      total: this.available.length + this.inUse.size
    };
  }
}

// Performance Monitor
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private frameCount: number = 0;
  private lastTime: number = 0;
  private fps: number = 60;
  private observers: ((metrics: PerformanceMetrics) => void)[] = [];

  constructor() {
    this.lastTime = performance.now();
    this.startMonitoring();
  }

  private startMonitoring(): void {
    const loop = () => {
      this.frameCount++;
      const now = performance.now();
      const delta = now - this.lastTime;

      if (delta >= 1000) {
        this.fps = Math.round((this.frameCount * 1000) / delta);
        this.frameCount = 0;
        this.lastTime = now;
        this.notifyObservers();
      }

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const values = this.metrics.get(name)!;
    values.push(value);

    // Keep last 60 values
    if (values.length > 60) {
      values.shift();
    }
  }

  getMetric(name: string): { current: number; average: number; min: number; max: number } | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return null;

    return {
      current: values[values.length - 1],
      average: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }

  getFPS(): number {
    return this.fps;
  }

  observe(callback: (metrics: PerformanceMetrics) => void): () => void {
    this.observers.push(callback);
    return () => {
      const index = this.observers.indexOf(callback);
      if (index > -1) this.observers.splice(index, 1);
    };
  }

  private notifyObservers(): void {
    const metrics = this.getAllMetrics();
    this.observers.forEach(cb => cb(metrics));
  }

  getAllMetrics(): PerformanceMetrics {
    return {
      fps: this.fps,
      memory: this.getMemoryUsage(),
      renderTime: this.getMetric('renderTime')?.average || 0,
      updateTime: this.getMetric('updateTime')?.average || 0,
      geometryCount: this.getMetric('geometryCount')?.current || 0,
      textureCount: this.getMetric('textureCount')?.current || 0,
      drawCalls: this.getMetric('drawCalls')?.current || 0,
      triangles: this.getMetric('triangles')?.current || 0
    };
  }

  private getMemoryUsage(): number {
    const memory = (performance as any).memory;
    if (memory) {
      return memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  }
}

export interface PerformanceMetrics {
  fps: number;
  memory: number;
  renderTime: number;
  updateTime: number;
  geometryCount: number;
  textureCount: number;
  drawCalls: number;
  triangles: number;
}
