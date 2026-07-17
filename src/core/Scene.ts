/**
 * Aether OS - Spatial Scene
 * Three.js-based 3D spatial canvas with liquid nodes
 */

import * as THREE from 'three';
import { EventBus, Events } from './EventBus';

// Glassmorphism Shader
const glassmorphismVertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const glassmorphismFragmentShader = `
  uniform vec3 uColor;
  uniform vec3 uGlowColor;
  uniform float uTime;
  uniform float uFocus;
  uniform float uOpacity;
  
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec2 vUv;
  
  void main() {
    vec3 viewDir = normalize(vViewPosition);
    float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 3.0);
    
    vec3 baseColor = uColor;
    vec3 edgeColor = uGlowColor;
    
    // Pulse effect
    float pulse = sin(uTime * 2.0) * 0.5 + 0.5;
    float glow = fresnel * (1.0 + pulse * 0.3);
    
    // Focus highlight
    vec3 focusGlow = edgeColor * uFocus * 0.5;
    
    vec3 finalColor = mix(baseColor, edgeColor, glow);
    finalColor += focusGlow;
    
    float alpha = (0.3 + fresnel * 0.5 + uFocus * 0.2) * uOpacity;
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

export interface LiquidNodeData {
  id: string;
  title: string;
  content: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  mass: number;
  width: number;
  height: number;
  depth: number;
  isFocused: boolean;
}

export class LiquidNode {
  id: string;
  title: string;
  content: string;
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  physics: {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    force: THREE.Vector3;
    mass: number;
    width: number;
    height: number;
    depth: number;
  };
  isFocused: boolean = false;
  element: HTMLElement | null = null;

  constructor(data: Partial<LiquidNodeData> & { id: string; title: string }) {
    this.id = data.id;
    this.title = data.title;
    this.content = data.content || '';
    this.isFocused = data.isFocused || false;

    const width = data.width || 3;
    const height = data.height || 2;
    const depth = data.depth || 0.1;

    this.physics = {
      position: data.position || new THREE.Vector3(0, 0, 0),
      velocity: data.velocity || new THREE.Vector3(0, 0, 0),
      force: new THREE.Vector3(0, 0, 0),
      mass: data.mass || 1,
      width,
      height,
      depth
    };

    // Create geometry
    const geometry = new THREE.BoxGeometry(width, height, depth, 1, 1, 1);

    // Create shader material
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0x1a1a2e) },
        uGlowColor: { value: new THREE.Color(0x00d9ff) },
        uTime: { value: 0 },
        uFocus: { value: 0 },
        uOpacity: { value: 0.8 }
      },
      vertexShader: glassmorphismVertexShader,
      fragmentShader: glassmorphismFragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.copy(this.physics.position);
    this.mesh.userData = { nodeId: this.id };
  }

  setFocus(focused: boolean) {
    this.isFocused = focused;
    this.material.uniforms.uFocus.value = focused ? 1 : 0;
  }

  update(time: number) {
    this.material.uniforms.uTime.value = time;
    this.mesh.position.copy(this.physics.position);
    
    // Update DOM element position if exists
    if (this.element && this.element.style) {
      // DOM overlay position would be updated externally
    }
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}

export class PhysicsWorld {
  nodes: LiquidNode[] = [];
  private springConstant: number = 0.02;
  private repulsionConstant: number = 50;
  private idealDistance: number = 8;
  private damping: number = 0.92;
  private centerAttraction: number = 0.001;

  addNode(node: LiquidNode) {
    this.nodes.push(node);
  }

  removeNode(nodeId: string) {
    this.nodes = this.nodes.filter(n => n.id !== nodeId);
  }

  getNode(nodeId: string): LiquidNode | undefined {
    return this.nodes.find(n => n.id === nodeId);
  }

  update(deltaTime: number) {
    // Reset forces
    this.nodes.forEach(node => {
      node.physics.force.set(0, 0, 0);
    });

    // Apply spring forces between connected nodes
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const nodeA = this.nodes[i];
        const nodeB = this.nodes[j];

        const diff = new THREE.Vector3().subVectors(nodeB.physics.position, nodeA.physics.position);
        const distance = diff.length();
        
        if (distance === 0) continue;

        // Spring force
        const displacement = distance - this.idealDistance;
        const springForce = diff.clone().normalize().multiplyScalar(this.springConstant * displacement);
        
        nodeA.physics.force.add(springForce);
        nodeB.physics.force.sub(springForce);

        // Coulomb repulsion
        const repulsionForce = diff.clone().normalize().multiplyScalar(-this.repulsionConstant / (distance * distance));
        
        nodeA.physics.force.add(repulsionForce);
        nodeB.physics.force.sub(repulsionForce);
      }
    }

    // Center attraction to prevent drift
    this.nodes.forEach(node => {
      const toCenter = new THREE.Vector3().sub(node.physics.position).multiplyScalar(this.centerAttraction);
      node.physics.force.add(toCenter);
    });

    // Apply forces and update positions
    this.nodes.forEach(node => {
      // Apply force
      node.physics.velocity.add(node.physics.force.clone().divideScalar(node.physics.mass));
      
      // Apply damping
      node.physics.velocity.multiplyScalar(this.damping);
      
      // Update position
      node.physics.position.add(node.physics.velocity.clone().multiplyScalar(deltaTime * 60));
    });
  }

  applyForceToNode(nodeId: string, force: THREE.Vector3) {
    const node = this.getNode(nodeId);
    if (node) {
      node.physics.force.add(force);
    }
  }
}

export class SpatialScene {
  container: HTMLElement;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  physicsWorld: PhysicsWorld;
  eventBus: EventBus;
  
  private nodes: Map<string, LiquidNode> = new Map();
  private particles: THREE.Points | null = null;
  private clock: THREE.Clock;
  private animationId: number = 0;
  private isRunning: boolean = false;

  // Camera controls
  private cameraTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private cameraDistance: number = 20;
  private cameraTheta: number = Math.PI / 4;
  private cameraPhi: number = Math.PI / 4;
  private isDragging: boolean = false;
  private lastMouse: { x: number; y: number } = { x: 0, y: 0 };

  constructor(container: HTMLElement, eventBus?: EventBus) {
    this.container = container;
    this.eventBus = eventBus || new EventBus();
    this.clock = new THREE.Clock();

    // Initialize Three.js
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0f);

    // Camera
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.updateCameraPosition();

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    // Physics
    this.physicsWorld = new PhysicsWorld();

    // Setup scene
    this.setupLighting();
    this.setupParticles();
    this.setupEventListeners();

    // Create initial nodes
    this.createInitialNodes();
  }

  // Public methods for adding/removing objects
  addToScene(object: THREE.Object3D) {
    this.scene.add(object);
  }

  removeFromScene(object: THREE.Object3D) {
    this.scene.remove(object);
  }

  private setupLighting() {
    // Ambient light
    const ambient = new THREE.AmbientLight(0x404060, 0.5);
    this.scene.add(ambient);

    // Point lights
    const light1 = new THREE.PointLight(0x00d9ff, 1, 50);
    light1.position.set(10, 10, 10);
    this.scene.add(light1);

    const light2 = new THREE.PointLight(0xff00ff, 0.5, 50);
    light2.position.set(-10, -5, 10);
    this.scene.add(light2);

    const light3 = new THREE.PointLight(0x00ff88, 0.3, 50);
    light3.position.set(0, 15, -10);
    this.scene.add(light3);
  }

  private setupParticles() {
    const particleCount = 2000;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;

      // Random colors: cyan, magenta, white
      const colorChoice = Math.random();
      if (colorChoice < 0.33) {
        colors[i * 3] = 0; colors[i * 3 + 1] = 0.85; colors[i * 3 + 2] = 1;
      } else if (colorChoice < 0.66) {
        colors[i * 3] = 1; colors[i * 3 + 1] = 0; colors[i * 3 + 2] = 1;
      } else {
        colors[i * 3] = 1; colors[i * 3 + 1] = 1; colors[i * 3 + 2] = 1;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  private setupEventListeners() {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastMouse = { x: e.clientX, y: e.clientY };
    });

    canvas.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const deltaX = e.clientX - this.lastMouse.x;
        const deltaY = e.clientY - this.lastMouse.y;

        this.cameraTheta -= deltaX * 0.01;
        this.cameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraPhi + deltaY * 0.01));

        this.updateCameraPosition();
        this.lastMouse = { x: e.clientX, y: e.clientY };
      }
    });

    canvas.addEventListener('mouseup', () => { this.isDragging = false; });
    canvas.addEventListener('mouseleave', () => { this.isDragging = false; });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.cameraDistance = Math.max(5, Math.min(50, this.cameraDistance + e.deltaY * 0.05));
      this.updateCameraPosition();
    }, { passive: false });

    // Raycasting for node selection
    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, this.camera);

      const meshes = Array.from(this.nodes.values()).map(n => n.mesh);
      const intersects = raycaster.intersectObjects(meshes);

      if (intersects.length > 0) {
        const nodeId = intersects[0].object.userData.nodeId;
        this.focusNode(nodeId);
      } else {
        this.clearFocus();
        this.eventBus.emit(Events.CANVAS_CLICKED, { position: mouse });
      }
    });

    window.addEventListener('resize', () => this.onResize());
  }

  private updateCameraPosition() {
    this.camera.position.x = this.cameraTarget.x + this.cameraDistance * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
    this.camera.position.y = this.cameraTarget.y + this.cameraDistance * Math.cos(this.cameraPhi);
    this.camera.position.z = this.cameraTarget.z + this.cameraDistance * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);
    this.camera.lookAt(this.cameraTarget);
    
    this.eventBus.emit(Events.CAMERA_MOVED, {
      position: this.camera.position.clone(),
      target: this.cameraTarget.clone()
    });
  }

  private onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  createInitialNodes() {
    // Node 1: AI Assistant
    this.createNode({
      id: 'node-ai',
      title: 'AI Orchestrator',
      content: 'Natural language interface',
      position: new THREE.Vector3(-5, 2, 0)
    });

    // Node 2: Memory Graph
    this.createNode({
      id: 'node-memory',
      title: 'Memory Graph',
      content: 'Associative data store',
      position: new THREE.Vector3(5, 2, 0)
    });

    // Node 3: Canvas Controls
    this.createNode({
      id: 'node-canvas',
      title: 'Spatial Canvas',
      content: '3D workspace',
      position: new THREE.Vector3(0, -3, 0)
    });
  }

  createNode(data: { id: string; title: string; content?: string; position?: THREE.Vector3 }): LiquidNode {
    const node = new LiquidNode(data);
    this.nodes.set(data.id, node);
    this.physicsWorld.addNode(node);
    this.scene.add(node.mesh);
    
    this.eventBus.emit(Events.NODE_CREATED, {
      id: data.id,
      title: data.title,
      position: data.position
    });
    
    return node;
  }

  deleteNode(nodeId: string) {
    const node = this.nodes.get(nodeId);
    if (node) {
      this.scene.remove(node.mesh);
      this.physicsWorld.removeNode(nodeId);
      this.nodes.delete(nodeId);
      node.dispose();
      
      this.eventBus.emit(Events.NODE_DELETED, { id: nodeId });
    }
  }

  focusNode(nodeId: string) {
    // Clear previous focus
    this.nodes.forEach((node, id) => {
      node.setFocus(id === nodeId);
    });
    
    this.eventBus.emit(Events.NODE_FOCUSED, { id: nodeId });
  }

  clearFocus() {
    this.nodes.forEach(node => node.setFocus(false));
  }

  getNode(nodeId: string): LiquidNode | undefined {
    return this.nodes.get(nodeId);
  }

  getAllNodes(): LiquidNode[] {
    return Array.from(this.nodes.values());
  }

  update(deltaTime: number) {
    const time = this.clock.getElapsedTime();

    // Update physics
    this.physicsWorld.update(deltaTime);

    // Update nodes
    this.nodes.forEach(node => node.update(time));

    // Animate particles
    if (this.particles) {
      this.particles.rotation.y += deltaTime * 0.02;
      this.particles.rotation.x += deltaTime * 0.01;
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    const animate = () => {
      if (!this.isRunning) return;
      
      this.animationId = requestAnimationFrame(animate);
      const delta = this.clock.getDelta();
      this.update(delta);
      this.render();
    };
    
    animate();
    this.eventBus.emit(Events.READY);
  }

  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  dispose() {
    this.stop();
    this.nodes.forEach(node => node.dispose());
    this.nodes.clear();
    this.renderer.dispose();
    
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }

  // Convert 3D position to screen coordinates
  worldToScreen(position: THREE.Vector3): { x: number; y: number } {
    const vector = position.clone().project(this.camera);
    return {
      x: (vector.x * 0.5 + 0.5) * window.innerWidth,
      y: (-vector.y * 0.5 + 0.5) * window.innerHeight
    };
  }

  // Convert screen coordinates to 3D position
  screenToWorld(screenX: number, screenY: number, depth: number = 0): THREE.Vector3 {
    const vector = new THREE.Vector3(
      (screenX / window.innerWidth) * 2 - 1,
      -(screenY / window.innerHeight) * 2 + 1,
      depth
    );
    vector.unproject(this.camera);
    return vector;
  }
}
