/**
 * Aether OS - Associative Memory Graph
 * Graph database simulation with vector embeddings
 */

import { EventBus, Events } from '../core/EventBus';

// Memory Node Interface
export interface MemoryNode {
  id: string;
  type: 'text' | 'image' | 'code' | 'audio' | 'data' | 'task' | 'concept';
  content: string;
  metadata: {
    created: number;
    modified: number;
    tags: string[];
    embedding?: number[]; // Vector representation
    importance: number;
    source?: string;
  };
  connections: string[]; // IDs of connected nodes
}

// Memory Edge Interface
export interface MemoryEdge {
  id: string;
  source: string;
  target: string;
  weight: number; // Connection strength 0-1
  type: 'temporal' | 'semantic' | 'causal' | 'reference' | 'association';
  label?: string;
}

// Search Result Interface
export interface SearchResult {
  node: MemoryNode;
  score: number;
  matchedTerms: string[];
}

// Visualization Node for 3D rendering
export interface VisualizationNode {
  id: string;
  position: { x: number; y: number; z: number };
  color: string;
  size: number;
  label: string;
  type: MemoryNode['type'];
}

// Visualization Edge
export interface VisualizationEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
}

export class MemoryGraph {
  private nodes: Map<string, MemoryNode> = new Map();
  private edges: Map<string, MemoryEdge> = new Map();
  private adjacencyList: Map<string, Set<string>> = new Map();
  eventBus: EventBus;
  
  private embeddingDimension: number = 128;
  private nodeIdCounter: number = 0;
  private edgeIdCounter: number = 0;

  constructor(eventBus?: EventBus) {
    this.eventBus = eventBus || new EventBus();
    this.initializeSampleData();
  }

  /**
   * Initialize with sample data for demonstration
   */
  private initializeSampleData() {
    // Sample concept nodes
    const concepts = [
      { id: 'concept-1', name: 'Machine Learning', tags: ['ai', 'data', 'ml'] },
      { id: 'concept-2', name: 'Web Development', tags: ['web', 'frontend', 'backend'] },
      { id: 'concept-3', name: 'Neural Networks', tags: ['ai', 'deep-learning', 'nn'] },
      { id: 'concept-4', name: 'React', tags: ['web', 'frontend', 'js'] },
      { id: 'concept-5', name: 'Three.js', tags: ['web', '3d', 'graphics'] }
    ];

    concepts.forEach(c => {
      this.createNode({
        type: 'concept',
        content: c.name,
        tags: c.tags,
        importance: 0.8
      });
    });

    // Create connections
    this.connectNodes('concept-1', 'concept-3', 'semantic', 0.9, 'related');
    this.connectNodes('concept-2', 'concept-4', 'semantic', 0.85, 'tech stack');
    this.connectNodes('concept-2', 'concept-5', 'semantic', 0.7, '3D web');
    this.connectNodes('concept-3', 'concept-1', 'causal', 0.9, 'subset');
  }

  /**
   * Generate a simulated embedding vector
   */
  private generateEmbedding(content: string, tags: string[]): number[] {
    const words = content.toLowerCase().split(/\s+/);
    const embedding = new Array(this.embeddingDimension).fill(0);
    
    // Simple hash-based embedding generation
    words.forEach((word, i) => {
      let hash = 0;
      for (let j = 0; j < word.length; j++) {
        hash = ((hash << 5) - hash) + word.charCodeAt(j);
        hash |= 0;
      }
      
      const index = Math.abs(hash) % this.embeddingDimension;
      embedding[index] += 1;
    });

    // Add tag influence
    tags.forEach(tag => {
      let hash = 0;
      for (let i = 0; i < tag.length; i++) {
        hash = ((hash << 5) - hash) + tag.charCodeAt(i);
      }
      const index = Math.abs(hash) % this.embeddingDimension;
      embedding[index] += 2;
    });

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }

    return embedding;
  }

  /**
   * Create a new memory node
   */
  createNode(data: {
    type: MemoryNode['type'];
    content: string;
    tags?: string[];
    importance?: number;
    source?: string;
  }): MemoryNode {
    const id = `node-${++this.nodeIdCounter}`;
    const now = Date.now();

    const node: MemoryNode = {
      id,
      type: data.type,
      content: data.content,
      metadata: {
        created: now,
        modified: now,
        tags: data.tags || this.extractTags(data.content),
        embedding: this.generateEmbedding(data.content, data.tags || []),
        importance: data.importance || 0.5,
        source: data.source
      },
      connections: []
    };

    this.nodes.set(id, node);
    this.adjacencyList.set(id, new Set());

    this.eventBus.emit(Events.MEMORY_STORED, { node });
    
    return node;
  }

  /**
   * Extract tags from content
   */
  private extractTags(content: string): string[] {
    const keywords = [
      'important', 'urgent', 'meeting', 'project', 'task', 'idea',
      'question', 'note', 'link', 'code', 'design', 'bug', 'feature'
    ];
    
    const lower = content.toLowerCase();
    return keywords.filter(k => lower.includes(k));
  }

  /**
   * Connect two nodes
   */
  connectNodes(
    sourceId: string,
    targetId: string,
    type: MemoryEdge['type'] = 'association',
    weight: number = 0.5,
    label?: string
  ): MemoryEdge | null {
    const source = this.nodes.get(sourceId);
    const target = this.nodes.get(targetId);

    if (!source || !target) {
      console.error('Cannot connect: node not found');
      return null;
    }

    // Check if connection already exists
    const existingEdge = this.findEdge(sourceId, targetId);
    if (existingEdge) {
      existingEdge.weight = weight;
      return existingEdge;
    }

    const id = `edge-${++this.edgeIdCounter}`;
    const edge: MemoryEdge = {
      id,
      source: sourceId,
      target: targetId,
      weight: Math.max(0, Math.min(1, weight)),
      type,
      label
    };

    this.edges.set(id, edge);
    
    // Update adjacency list
    this.adjacencyList.get(sourceId)?.add(targetId);
    this.adjacencyList.get(targetId)?.add(sourceId);

    // Update node connections
    source.connections.push(targetId);
    target.connections.push(sourceId);

    this.eventBus.emit(Events.NODE_CONNECTED, { edge });

    return edge;
  }

  /**
   * Find edge between two nodes
   */
  private findEdge(sourceId: string, targetId: string): MemoryEdge | undefined {
    for (const edge of this.edges.values()) {
      if ((edge.source === sourceId && edge.target === targetId) ||
          (edge.source === targetId && edge.target === sourceId)) {
        return edge;
      }
    }
    return undefined;
  }

  /**
   * Search nodes by content, tags, or semantic similarity
   */
  search(query: string, limit: number = 10): SearchResult[] {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/);
    const queryEmbedding = this.generateEmbedding(query, queryWords);

    const results: SearchResult[] = [];

    this.nodes.forEach(node => {
      let score = 0;
      const matchedTerms: string[] = [];

      // Content match
      if (node.content.toLowerCase().includes(queryLower)) {
        score += 0.4;
        matchedTerms.push('content');
      }

      // Tag match
      node.metadata.tags.forEach(tag => {
        if (queryLower.includes(tag.toLowerCase())) {
          score += 0.2;
          matchedTerms.push(`tag:${tag}`);
        }
      });

      // Semantic similarity (cosine similarity)
      if (node.metadata.embedding && queryEmbedding) {
        const similarity = this.cosineSimilarity(node.metadata.embedding, queryEmbedding);
        score += similarity * 0.4;
        if (similarity > 0.3) {
          matchedTerms.push(`semantic:${(similarity * 100).toFixed(0)}%`);
        }
      }

      // Importance boost
      score *= (0.5 + node.metadata.importance * 0.5);

      if (score > 0.1) {
        results.push({ node, score, matchedTerms });
      }
    });

    // Sort by score
    results.sort((a, b) => b.score - a.score);

    this.eventBus.emit(Events.MEMORY_SEARCH, { query, results: results.length });

    return results.slice(0, limit);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }

    const magA = Math.sqrt(magnitudeA);
    const magB = Math.sqrt(magnitudeB);

    if (magA === 0 || magB === 0) return 0;

    return dotProduct / (magA * magB);
  }

  /**
   * Get node by ID
   */
  getNode(id: string): MemoryNode | undefined {
    return this.nodes.get(id);
  }

  /**
   * Get all nodes
   */
  getAllNodes(): MemoryNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Get all edges
   */
  getAllEdges(): MemoryEdge[] {
    return Array.from(this.edges.values());
  }

  /**
   * Get connected nodes
   */
  getConnectedNodes(nodeId: string): MemoryNode[] {
    const node = this.nodes.get(nodeId);
    if (!node) return [];

    return node.connections
      .map(id => this.nodes.get(id))
      .filter((n): n is MemoryNode => n !== undefined);
  }

  /**
   * Find path between two nodes (BFS)
   */
  findPath(startId: string, endId: string): string[] | null {
    if (!this.nodes.has(startId) || !this.nodes.has(endId)) {
      return null;
    }

    const visited = new Set<string>();
    const queue: Array<{ id: string; path: string[] }> = [{ id: startId, path: [startId] }];

    while (queue.length > 0) {
      const { id, path } = queue.shift()!;

      if (id === endId) {
        return path;
      }

      if (visited.has(id)) continue;
      visited.add(id);

      const neighbors = this.adjacencyList.get(id) || new Set();
      neighbors.forEach(neighborId => {
        if (!visited.has(neighborId)) {
          queue.push({ id: neighborId, path: [...path, neighborId] });
        }
      });
    }

    return null;
  }

  /**
   * Delete a node and its connections
   */
  deleteNode(id: string): boolean {
    const node = this.nodes.get(id);
    if (!node) return false;

    // Remove from adjacency lists
    node.connections.forEach(connId => {
      this.adjacencyList.get(connId)?.delete(id);
    });

    // Remove connected edges
    this.edges.forEach((edge, edgeId) => {
      if (edge.source === id || edge.target === id) {
        this.edges.delete(edgeId);
      }
    });

    // Remove from adjacency
    this.adjacencyList.delete(id);

    // Remove node
    this.nodes.delete(id);

    return true;
  }

  /**
   * Update node content and recalculate embedding
   */
  updateNode(id: string, updates: { content?: string; tags?: string[]; importance?: number }): MemoryNode | null {
    const node = this.nodes.get(id);
    if (!node) return null;

    if (updates.content !== undefined) {
      node.content = updates.content;
    }
    if (updates.tags !== undefined) {
      node.metadata.tags = updates.tags;
    }
    if (updates.importance !== undefined) {
      node.metadata.importance = updates.importance;
    }

    node.metadata.modified = Date.now();

    // Recalculate embedding
    node.metadata.embedding = this.generateEmbedding(node.content, node.metadata.tags);

    this.eventBus.emit(Events.MEMORY_RETRIEVED, { node });

    return node;
  }

  /**
   * Create visualization data for 3D rendering
   */
  createVisualization(): {
    nodes: VisualizationNode[];
    edges: VisualizationEdge[];
  } {
    const visNodes: VisualizationNode[] = [];
    const visEdges: VisualizationEdge[] = [];

    // Color map for node types
    const typeColors: Record<MemoryNode['type'], string> = {
      text: '#00d9ff',
      image: '#ff00ff',
      code: '#00ff88',
      audio: '#ffaa00',
      data: '#ff6b6b',
      task: '#6b6bff',
      concept: '#d9ff00'
    };

    // Create nodes with force-directed layout simulation
    const positions = this.forceDirectedLayout();
    
    this.nodes.forEach(node => {
      const pos = positions.get(node.id) || { x: 0, y: 0, z: 0 };
      visNodes.push({
        id: node.id,
        position: pos,
        color: typeColors[node.type],
        size: 0.3 + node.metadata.importance * 0.5,
        label: node.content.substring(0, 20),
        type: node.type
      });
    });

    // Create edges
    this.edges.forEach(edge => {
      visEdges.push({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        weight: edge.weight
      });
    });

    return { nodes: visNodes, edges: visEdges };
  }

  /**
   * Simple force-directed layout simulation
   */
  private forceDirectedLayout(): Map<string, { x: number; y: number; z: number }> {
    const positions = new Map<string, { x: number; y: number; z: number }>();
    
    // Initialize random positions
    this.nodes.forEach((_, id) => {
      positions.set(id, {
        x: (Math.random() - 0.5) * 10,
        y: (Math.random() - 0.5) * 10,
        z: (Math.random() - 0.5) * 10
      });
    });

    // Run simulation iterations
    const iterations = 50;
    const repulsion = 5;
    const attraction = 0.1;
    const damping = 0.9;

    for (let iter = 0; iter < iterations; iter++) {
      const forces = new Map<string, { x: number; y: number; z: number }>();

      // Initialize forces
      this.nodes.forEach((_, id) => {
        forces.set(id, { x: 0, y: 0, z: 0 });
      });

      // Repulsion between all nodes
      const nodeIds = Array.from(this.nodes.keys());
      for (let i = 0; i < nodeIds.length; i++) {
        for (let j = i + 1; j < nodeIds.length; j++) {
          const posA = positions.get(nodeIds[i])!;
          const posB = positions.get(nodeIds[j])!;

          const dx = posB.x - posA.x;
          const dy = posB.y - posA.y;
          const dz = posB.z - posA.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;

          const force = repulsion / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          const fz = (dz / dist) * force;

          const forceA = forces.get(nodeIds[i])!;
          const forceB = forces.get(nodeIds[j])!;

          forceA.x -= fx; forceA.y -= fy; forceA.z -= fz;
          forceB.x += fx; forceB.y += fy; forceB.z += fz;
        }
      }

      // Attraction along edges
      this.edges.forEach(edge => {
        const posA = positions.get(edge.source);
        const posB = positions.get(edge.target);
        if (!posA || !posB) return;

        const dx = posB.x - posA.x;
        const dy = posB.y - posA.y;
        const dz = posB.z - posA.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;

        const force = dist * attraction * edge.weight;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        const fz = (dz / dist) * force;

        const forceA = forces.get(edge.source)!;
        const forceB = forces.get(edge.target)!;

        forceA.x += fx; forceA.y += fy; forceA.z += fz;
        forceB.x -= fx; forceB.y -= fy; forceB.z -= fz;
      });

      // Apply forces
      this.nodes.forEach((_, id) => {
        const pos = positions.get(id)!;
        const force = forces.get(id)!;

        pos.x += force.x * damping;
        pos.y += force.y * damping;
        pos.z += force.z * damping;
      });
    }

    return positions;
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalNodes: number;
    totalEdges: number;
    nodesByType: Record<string, number>;
    avgConnections: number;
    mostConnected: string | null;
  } {
    const nodesByType: Record<string, number> = {};
    let totalConnections = 0;
    let mostConnectedId: string | null = null;
    let maxConnections = 0;

    this.nodes.forEach(node => {
      nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;
      totalConnections += node.connections.length;
      
      if (node.connections.length > maxConnections) {
        maxConnections = node.connections.length;
        mostConnectedId = node.id;
      }
    });

    return {
      totalNodes: this.nodes.size,
      totalEdges: this.edges.size,
      nodesByType,
      avgConnections: this.nodes.size > 0 ? totalConnections / this.nodes.size : 0,
      mostConnected: mostConnectedId
    };
  }

  /**
   * Clear all data
   */
  clear() {
    this.nodes.clear();
    this.edges.clear();
    this.adjacencyList.clear();
    this.nodeIdCounter = 0;
    this.edgeIdCounter = 0;
  }
}
