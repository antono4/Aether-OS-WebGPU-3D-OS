/**
 * Aether OS - SharedArrayBuffer Manager
 * Multi-threaded rendering and computation
 */

// Shared buffer layout constants
export const BUFFER_LAYOUT = {
  POSITIONS: 0,
  VELOCITIES: 1,
  COLORS: 2,
  SCALES: 3,
  VISIBILITY: 4,
  TRANSFORMS: 5,
  METADATA: 6
};

export interface SharedBufferConfig {
  maxNodes: number;
  enableParallelRendering: boolean;
  workerCount: number;
}

export class SharedBufferManager {
  private buffers: Map<number, ArrayBufferLike> = new Map();
  private views: Map<number, any> = new Map();
  private config: SharedBufferConfig;
  private workers: Worker[] = [];
  private isSupported: boolean = false;
  private lock: Int32Array | null = null;

  constructor(config: SharedBufferConfig) {
    this.config = config;
    this.checkSupport();
    if (this.isSupported) {
      this.initializeBuffers();
      this.initializeWorkers();
    }
  }

  private checkSupport(): void {
    this.isSupported = typeof SharedArrayBuffer !== 'undefined' && 
                       typeof Atomics !== 'undefined';
    
    console.log(`🔧 SharedArrayBuffer support: ${this.isSupported}`);
  }

  private initializeBuffers(): void {
    const { maxNodes } = this.config;

    const positionBuffer = new SharedArrayBuffer(maxNodes * 3 * 4);
    this.buffers.set(BUFFER_LAYOUT.POSITIONS, positionBuffer);
    this.views.set(BUFFER_LAYOUT.POSITIONS, new Float32Array(positionBuffer));

    const velocityBuffer = new SharedArrayBuffer(maxNodes * 3 * 4);
    this.buffers.set(BUFFER_LAYOUT.VELOCITIES, velocityBuffer);
    this.views.set(BUFFER_LAYOUT.VELOCITIES, new Float32Array(velocityBuffer));

    const colorBuffer = new SharedArrayBuffer(maxNodes * 4);
    this.buffers.set(BUFFER_LAYOUT.COLORS, colorBuffer);
    this.views.set(BUFFER_LAYOUT.COLORS, new Uint8Array(colorBuffer));

    const scaleBuffer = new SharedArrayBuffer(maxNodes * 4);
    this.buffers.set(BUFFER_LAYOUT.SCALES, scaleBuffer);
    this.views.set(BUFFER_LAYOUT.SCALES, new Float32Array(scaleBuffer));

    const visibilityBuffer = new SharedArrayBuffer(maxNodes);
    this.buffers.set(BUFFER_LAYOUT.VISIBILITY, visibilityBuffer);
    this.views.set(BUFFER_LAYOUT.VISIBILITY, new Uint8Array(visibilityBuffer));

    const transformBuffer = new SharedArrayBuffer(maxNodes * 16 * 4);
    this.buffers.set(BUFFER_LAYOUT.TRANSFORMS, transformBuffer);
    this.views.set(BUFFER_LAYOUT.TRANSFORMS, new Float32Array(transformBuffer));

    const metadataBuffer = new SharedArrayBuffer(maxNodes * 2 * 4);
    this.buffers.set(BUFFER_LAYOUT.METADATA, metadataBuffer);
    this.views.set(BUFFER_LAYOUT.METADATA, new Float32Array(metadataBuffer));

    const lockBuffer = new SharedArrayBuffer(4);
    this.buffers.set(-1, lockBuffer);
    this.lock = new Int32Array(lockBuffer);

    console.log(`📦 Initialized ${this.buffers.size} shared buffers for ${maxNodes} nodes`);
  }

  private initializeWorkers(): void {
    if (!this.isSupported) return;

    const workerCode = `
      self.onmessage = function(e) {
        const { type, buffers, nodeCount } = e.data;
        
        switch(type) {
          case 'physics':
            self.postMessage({ type: 'physics', result: computePhysics(buffers, nodeCount) });
            break;
          case 'render':
            self.postMessage({ type: 'render', result: prepareRender(buffers, nodeCount) });
            break;
          case 'cull':
            self.postMessage({ type: 'cull', result: frustumCull(buffers, nodeCount) });
            break;
        }
      };

      function computePhysics(buffers, nodeCount) {
        const positions = new Float32Array(buffers[0]);
        const velocities = new Float32Array(buffers[1]);
        const repulsion = 100;
        const damping = 0.85;
        
        for (let i = 0; i < nodeCount; i++) {
          for (let j = i + 1; j < nodeCount; j++) {
            const dx = positions[j*3] - positions[i*3];
            const dy = positions[j*3+1] - positions[i*3+1];
            const dz = positions[j*3+2] - positions[i*3+2];
            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz) || 0.001;
            const force = repulsion / (dist * dist);
            
            velocities[i*3] -= (dx/dist) * force;
            velocities[i*3+1] -= (dy/dist) * force;
            velocities[i*3+2] -= (dz/dist) * force;
            velocities[j*3] += (dx/dist) * force;
            velocities[j*3+1] += (dy/dist) * force;
            velocities[j*3+2] += (dz/dist) * force;
          }
        }
        
        for (let i = 0; i < nodeCount; i++) {
          velocities[i*3] *= damping;
          velocities[i*3+1] *= damping;
          velocities[i*3+2] *= damping;
          positions[i*3] += velocities[i*3];
          positions[i*3+1] += velocities[i*3+1];
          positions[i*3+2] += velocities[i*3+2];
        }
        
        return true;
      }

      function prepareRender(buffers, nodeCount) {
        const transforms = new Float32Array(buffers[5]);
        const positions = new Float32Array(buffers[0]);
        const scales = new Float32Array(buffers[3]);
        
        for (let i = 0; i < nodeCount; i++) {
          const idx = i * 16;
          const x = positions[i*3], y = positions[i*3+1], z = positions[i*3+2];
          const s = scales[i] || 1;
          
          // Simple scale + translate matrix
          transforms[idx] = s; transforms[idx+1] = 0; transforms[idx+2] = 0; transforms[idx+3] = 0;
          transforms[idx+4] = 0; transforms[idx+5] = s; transforms[idx+6] = 0; transforms[idx+7] = 0;
          transforms[idx+8] = 0; transforms[idx+9] = 0; transforms[idx+10] = s; transforms[idx+11] = 0;
          transforms[idx+12] = x; transforms[idx+13] = y; transforms[idx+14] = z; transforms[idx+15] = 1;
        }
        
        return true;
      }

      function frustumCull(buffers, nodeCount) {
        const visibility = new Uint8Array(buffers[4]);
        const positions = new Float32Array(buffers[0]);
        const metadata = new Float32Array(buffers[6]);
        
        // Simple sphere frustum culling (centered at origin)
        const radius = 50;
        
        for (let i = 0; i < nodeCount; i++) {
          const x = positions[i*3], y = positions[i*3+1], z = positions[i*3+2];
          const dist = Math.sqrt(x*x + y*y + z*z);
          visibility[i] = dist < radius ? 1 : 0;
        }
        
        return true;
      }
    `;

    for (let i = 0; i < this.config.workerCount; i++) {
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const worker = new Worker(URL.createObjectURL(blob));
      
      worker.onmessage = (e) => {
        this.handleWorkerMessage(e.data);
      };

      this.workers.push(worker);
    }

    console.log(`👷 Initialized ${this.workers.length} physics workers`);
  }

  private handleWorkerMessage(data: any): void {
    // Handle results from workers
    console.log(`👷 Worker completed: ${data.type}`);
  }

  // Atomic operations
  acquireLock(): void {
    if (!this.lock) return;
    while (Atomics.compareExchange(this.lock, 0, 0, 1) !== 0) {
      // Spin wait
    }
  }

  releaseLock(): void {
    if (!this.lock) return;
    Atomics.store(this.lock, 0, 0);
  }

  // Update methods
  setPosition(nodeIndex: number, x: number, y: number, z: number): void {
    const positions = this.views.get(BUFFER_LAYOUT.POSITIONS);
    if (!positions) return;
    this.acquireLock();
    positions[nodeIndex * 3] = x;
    positions[nodeIndex * 3 + 1] = y;
    positions[nodeIndex * 3 + 2] = z;
    this.releaseLock();
  }

  setVelocity(nodeIndex: number, vx: number, vy: number, vz: number): void {
    const velocities = this.views.get(BUFFER_LAYOUT.VELOCITIES);
    if (!velocities) return;
    this.acquireLock();
    velocities[nodeIndex * 3] = vx;
    velocities[nodeIndex * 3 + 1] = vy;
    velocities[nodeIndex * 3 + 2] = vz;
    this.releaseLock();
  }

  setColor(nodeIndex: number, r: number, g: number, b: number, a: number = 255): void {
    const colors = this.views.get(BUFFER_LAYOUT.COLORS);
    if (!colors) return;
    this.acquireLock();
    colors[nodeIndex * 4] = r;
    colors[nodeIndex * 4 + 1] = g;
    colors[nodeIndex * 4 + 2] = b;
    colors[nodeIndex * 4 + 3] = a;
    this.releaseLock();
  }

  setScale(nodeIndex: number, scale: number): void {
    const scales = this.views.get(BUFFER_LAYOUT.SCALES);
    if (!scales) return;
    this.acquireLock();
    scales[nodeIndex] = scale;
    this.releaseLock();
  }

  setMetadata(nodeIndex: number, importance: number, timestamp: number): void {
    const metadata = this.views.get(BUFFER_LAYOUT.METADATA);
    if (!metadata) return;
    this.acquireLock();
    metadata[nodeIndex * 2] = importance;
    metadata[nodeIndex * 2 + 1] = timestamp;
    this.releaseLock();
  }

  // Batch operations
  setAllPositions(data: Float32Array): void {
    const positions = this.views.get(BUFFER_LAYOUT.POSITIONS);
    if (!positions) return;
    this.acquireLock();
    positions.set(data);
    this.releaseLock();
  }

  setAllColors(data: Uint8Array): void {
    const colors = this.views.get(BUFFER_LAYOUT.COLORS);
    if (!colors) return;
    this.acquireLock();
    colors.set(data);
    this.releaseLock();
  }

  // Get raw buffers for Three.js
  getBuffer(layout: number): ArrayBufferLike | undefined {
    return this.buffers.get(layout);
  }

  getView(layout: number): Float32Array | Uint8Array | undefined {
    return this.views.get(layout);
  }

  // Worker dispatch
  dispatchToWorker(type: 'physics' | 'render' | 'cull', nodeCount: number): void {
    if (!this.isSupported || this.workers.length === 0) return;

    const bufferList = Array.from(this.buffers.values());
    this.workers[0].postMessage({
      type,
      buffers: bufferList,
      nodeCount
    });
  }

  // Cleanup
  dispose(): void {
    this.workers.forEach(w => w.terminate());
    this.workers = [];
    this.buffers.clear();
    this.views.clear();
    console.log('🧹 SharedBufferManager disposed');
  }
}

// Atomics utilities
export function waitForCondition(condition: () => boolean, timeout: number = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - start > timeout) {
        reject(new Error('Timeout waiting for condition'));
      } else {
        setTimeout(check, 10);
      }
    };
    check();
  });
}

export function notifyAll(buffer: Int32Array): void {
  Atomics.notify(buffer, 0, Infinity);
}
