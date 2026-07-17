/**
 * Aether OS - Custom Shader Playground
 * GLSL Editor with live preview
 */

import * as THREE from 'three';

export interface ShaderPreset {
  id: string;
  name: string;
  category: 'glass' | 'glow' | 'noise' | 'animation' | 'custom';
  vertexShader: string;
  fragmentShader: string;
  uniforms?: Record<string, any>;
}

export class ShaderPlayground {
  private container: HTMLElement;
  private previewMesh: THREE.Mesh | null = null;
  private material: THREE.ShaderMaterial | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.init();
  }

  private init(): void {
    this.createPreviewMesh();
    this.renderUI();
  }

  private createPreviewMesh(): void {
    const geometry = new THREE.SphereGeometry(1, 64, 64);
    
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x00d9ff) },
        uGlowColor: { value: new THREE.Color(0xff00ff) },
        uFocus: { value: 0 }
      },
      vertexShader: this.getDefaultVertexShader(),
      fragmentShader: this.getDefaultFragmentShader(),
      transparent: true,
      side: THREE.DoubleSide
    });

    this.previewMesh = new THREE.Mesh(geometry, this.material);
  }

  private getDefaultVertexShader(): string {
    return `varying vec3 vNormal; varying vec3 vViewPosition; varying vec2 vUv;
void main() { vUv = uv; vNormal = normalize(normalMatrix * normal);
vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); vViewPosition = -mvPosition.xyz;
gl_Position = projectionMatrix * mvPosition; }`;
  }

  private getDefaultFragmentShader(): string {
    return `uniform vec3 uColor; uniform vec3 uGlowColor; uniform float uTime; uniform float uFocus;
varying vec3 vNormal; varying vec3 vViewPosition; varying vec2 vUv;
void main() { vec3 viewDir = normalize(vViewPosition);
float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 3.0);
vec3 finalColor = mix(uColor, uGlowColor, fresnel * (1.0 + sin(uTime * 2.0) * 0.3));
float alpha = (0.3 + fresnel * 0.5 + uFocus * 0.2);
gl_FragColor = vec4(finalColor, alpha); }`;
  }

  private renderUI(): void {
    this.container.innerHTML = `
      <div class="shader-playground">
        <div class="shader-header">
          <h3>🎨 Shader Playground</h3>
          <div class="shader-actions">
            <button id="compile-btn" class="btn-compile">Compile</button>
            <button id="preset-btn" class="btn-preset">Presets</button>
          </div>
        </div>
        <div class="shader-editor-container">
          <div class="shader-section">
            <div class="section-header"><span>Vertex Shader</span></div>
            <textarea id="vertex-shader" class="shader-code" spellcheck="false"></textarea>
          </div>
          <div class="shader-section">
            <div class="section-header"><span>Fragment Shader</span></div>
            <textarea id="fragment-shader" class="shader-code" spellcheck="false"></textarea>
          </div>
        </div>
        <div class="shader-output">
          <div class="output-header"><span>Console</span><span id="compile-status"></span></div>
          <div id="console-output" class="console-output"></div>
        </div>
      </div>
      <style>
        .shader-playground { font-family: 'SF Mono', Monaco, monospace; background: #0a0a0f; color: #fff; height: 100%; display: flex; flex-direction: column; }
        .shader-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .shader-header h3 { margin: 0; color: #00d9ff; }
        .shader-actions button { margin-left: 8px; padding: 6px 12px; border: 1px solid rgba(0,217,255,0.3); background: rgba(0,217,255,0.1); color: #00d9ff; border-radius: 4px; cursor: pointer; }
        .shader-actions button:hover { background: rgba(0,217,255,0.2); }
        .shader-editor-container { flex: 1; display: flex; gap: 8px; padding: 8px; min-height: 0; }
        .shader-section { flex: 1; display: flex; flex-direction: column; min-width: 0; }
        .section-header { display: flex; justify-content: space-between; padding: 8px; background: rgba(255,255,255,0.05); font-size: 12px; color: #a0a0b0; }
        .shader-code { flex: 1; background: #12121a; border: none; color: #00ff88; padding: 12px; font-size: 13px; line-height: 1.5; resize: none; outline: none; font-family: inherit; }
        .shader-output { height: 100px; border-top: 1px solid rgba(255,255,255,0.1); }
        .output-header { display: flex; justify-content: space-between; padding: 8px 12px; background: rgba(255,255,255,0.05); font-size: 12px; }
        .console-output { padding: 12px; height: calc(100% - 36px); overflow-y: auto; font-size: 12px; }
        .console-success { color: #00ff88; }
      </style>
    `;

    const vertexEl = this.container.querySelector('#vertex-shader') as HTMLTextAreaElement;
    const fragmentEl = this.container.querySelector('#fragment-shader') as HTMLTextAreaElement;
    
    if (vertexEl) vertexEl.value = this.getDefaultVertexShader();
    if (fragmentEl) fragmentEl.value = this.getDefaultFragmentShader();

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const vertexEl = this.container.querySelector('#vertex-shader') as HTMLTextAreaElement;
    const fragmentEl = this.container.querySelector('#fragment-shader') as HTMLTextAreaElement;
    const compileBtn = this.container.querySelector('#compile-btn');

    compileBtn?.addEventListener('click', () => this.compile());
  }

  compile(): boolean {
    const vertexEl = this.container.querySelector('#vertex-shader') as HTMLTextAreaElement;
    const fragmentEl = this.container.querySelector('#fragment-shader') as HTMLTextAreaElement;
    const consoleEl = this.container.querySelector('#console-output') as HTMLElement;
    const statusEl = this.container.querySelector('#compile-status') as HTMLElement;

    if (!this.material || !vertexEl || !fragmentEl) return false;

    try {
      this.material.vertexShader = vertexEl.value;
      this.material.fragmentShader = fragmentEl.value;
      this.material.needsUpdate = true;

      if (statusEl) statusEl.innerHTML = '<span class="console-success">✓ Compiled</span>';
      if (consoleEl) consoleEl.innerHTML += '<div class="console-success">Shader compiled successfully</div>';
      return true;
    } catch (e) {
      if (statusEl) statusEl.innerHTML = '<span style="color:#ff6b6b">✗ Failed</span>';
      if (consoleEl) consoleEl.innerHTML += `<div style="color:#ff6b6b">Error: ${e}</div>`;
      return false;
    }
  }

  setUniform(name: string, value: any): void {
    if (this.material?.uniforms[name]) {
      this.material.uniforms[name].value = value;
    }
  }

  getPreviewMesh(): THREE.Mesh | null { return this.previewMesh; }
  getMaterial(): THREE.ShaderMaterial | null { return this.material; }

  getPresets(): ShaderPreset[] {
    return [
      { id: 'glassmorphism', name: 'Glassmorphism', category: 'glass', vertexShader: this.getDefaultVertexShader(), fragmentShader: this.getDefaultFragmentShader() },
      { id: 'neon-glow', name: 'Neon Glow', category: 'glow', vertexShader: this.getDefaultVertexShader(), fragmentShader: `uniform float uTime; uniform vec3 uColor; varying vec3 vNormal;
void main() { float glow = sin(uTime * 3.0) * 0.5 + 0.5; gl_FragColor = vec4(uColor * (1.0 + glow), 0.8); }` },
      { id: 'noise', name: 'Noise', category: 'noise', vertexShader: this.getDefaultVertexShader(), fragmentShader: `uniform float uTime; uniform vec3 uColor; varying vec2 vUv;
float random(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123); }
void main() { float n = random(vUv * 10.0 + uTime); gl_FragColor = vec4(uColor * n, 0.8); }` }
    ];
  }

  loadPreset(presetId: string): void {
    const preset = this.getPresets().find(p => p.id === presetId);
    if (!preset) return;

    const vertexEl = this.container.querySelector('#vertex-shader') as HTMLTextAreaElement;
    const fragmentEl = this.container.querySelector('#fragment-shader') as HTMLTextAreaElement;

    if (vertexEl) vertexEl.value = preset.vertexShader;
    if (fragmentEl) fragmentEl.value = preset.fragmentShader;
    this.compile();
  }

  dispose(): void {
    this.previewMesh?.geometry.dispose();
    this.material?.dispose();
  }
}
