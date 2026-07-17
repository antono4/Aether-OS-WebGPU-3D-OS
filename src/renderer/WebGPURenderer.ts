/**
 * Aether OS - WebGPU Renderer
 * Enhanced rendering with WebGPU API (fallback to WebGL2)
 */

import * as THREE from 'three';

export interface RenderStats {
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangles: number;
  memory: number;
}

export class WebGPURenderer {
  private renderer: THREE.WebGLRenderer | null = null;
  private isWebGPU: boolean = false;
  private container: HTMLElement;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private currentFps: number = 60;
  private onStatsUpdate?: (stats: RenderStats) => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if ('gpu' in navigator) {
      try {
        const adapter = await (navigator as any).gpu.requestAdapter();
        if (adapter) {
          console.log('🚀 WebGPU available');
          this.isWebGPU = true;
        }
      } catch (e) {
        console.warn('WebGPU not available, using WebGL2:', e);
      }
    }
    this.createWebGLRenderer();
  }

  private createWebGLRenderer(): void {
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.capabilities.getMaxAnisotropy();
    this.renderer.info.autoReset = false;

    this.container.appendChild(this.renderer.domElement);
    console.log('✅ WebGL2 renderer initialized');
  }

  getRenderer(): THREE.WebGLRenderer | null {
    return this.renderer;
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.renderer?.domElement || null;
  }

  render(scene: THREE.Scene, camera: THREE.Camera): void {
    if (this.renderer) {
      this.renderer.render(scene, camera);
      this.renderer.info.reset();
      this.updateStats();
    }
  }

  private updateStats(): void {
    this.frameCount++;
    const now = performance.now();

    if (now - this.lastFpsUpdate >= 500) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      this.lastFpsUpdate = now;
      this.frameCount = 0;

      if (this.onStatsUpdate && this.renderer) {
        const info = this.renderer.info;
        this.onStatsUpdate({
          fps: this.currentFps,
          frameTime: 1000 / this.currentFps,
          drawCalls: info.render.calls,
          triangles: info.render.triangles,
          memory: (info.memory.geometries + info.memory.textures) * 1000
        });
      }
    }
  }

  onFpsUpdate(callback: (stats: RenderStats) => void): void {
    this.onStatsUpdate = callback;
  }

  resize(width: number, height: number): void {
    this.renderer?.setSize(width, height);
  }

  isUsingWebGPU(): boolean {
    return this.isWebGPU;
  }

  dispose(): void {
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
    this.renderer = null;
  }

  screenshot(type: 'png' | 'jpeg' = 'png', quality: number = 0.9): string {
    const canvas = this.renderer?.domElement;
    if (!canvas) return '';
    return type === 'png' ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', quality);
  }
}

export class AdaptiveQualityManager {
  private targetFps: number = 60;
  private currentQuality: number = 1;
  private fpsHistory: number[] = [];

  adjustQuality(fps: number): number {
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > 60) this.fpsHistory.shift();
    
    const avgFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;

    if (avgFps < 30 && this.currentQuality > 0.25) {
      this.currentQuality = Math.max(0.25, this.currentQuality - 0.1);
    } else if (avgFps > 55 && this.currentQuality < 1) {
      this.currentQuality = Math.min(1, this.currentQuality + 0.05);
    }

    return this.currentQuality;
  }

  getQuality(): number { return this.currentQuality; }
  getPixelRatio(): number { return Math.min(window.devicePixelRatio, 2) * this.currentQuality; }
}
