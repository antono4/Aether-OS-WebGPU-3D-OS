/**
 * Aether OS - WASM Module Bindings
 * High-performance math and algorithms with WASM acceleration
 */

export interface Vec2D {
  x: number;
  y: number;
  add(other: Vec2D): Vec2D;
  subtract(other: Vec2D): Vec2D;
  multiply(scalar: number): Vec2D;
  magnitude(): number;
  normalize(): Vec2D;
  dot(other: Vec2D): number;
  distance(other: Vec2D): number;
}

export interface Vec3D {
  x: number;
  y: number;
  z: number;
  add(other: Vec3D): Vec3D;
  subtract(other: Vec3D): Vec3D;
  multiply(scalar: number): Vec3D;
  magnitude(): number;
  normalize(): Vec3D;
  dot(other: Vec3D): number;
  cross(other: Vec3D): Vec3D;
  distance(other: Vec3D): number;
}

// Vector2D implementation
export class Vector2D implements Vec2D {
  constructor(public x: number, public y: number) {}
  add(other: Vec2D) { return new Vector2D(this.x + other.x, this.y + other.y); }
  subtract(other: Vec2D) { return new Vector2D(this.x - other.x, this.y - other.y); }
  multiply(scalar: number) { return new Vector2D(this.x * scalar, this.y * scalar); }
  magnitude() { return Math.sqrt(this.x * this.x + this.y * this.y); }
  normalize() { const m = this.magnitude(); return m === 0 ? new Vector2D(0, 0) : new Vector2D(this.x / m, this.y / m); }
  dot(other: Vec2D) { return this.x * other.x + this.y * other.y; }
  distance(other: Vec2D) { return this.subtract(other).magnitude(); }
}

// Vector3D implementation
export class Vector3D implements Vec3D {
  constructor(public x: number, public y: number, public z: number) {}
  add(other: Vec3D) { return new Vector3D(this.x + other.x, this.y + other.y, this.z + other.z); }
  subtract(other: Vec3D) { return new Vector3D(this.x - other.x, this.y - other.y, this.z - other.z); }
  multiply(scalar: number) { return new Vector3D(this.x * scalar, this.y * scalar, this.z * scalar); }
  magnitude() { return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z); }
  normalize() { const m = this.magnitude(); return m === 0 ? new Vector3D(0, 0, 0) : new Vector3D(this.x / m, this.y / m, this.z / m); }
  dot(other: Vec3D) { return this.x * other.x + this.y * other.y + this.z * other.z; }
  cross(other: Vec3D) { return new Vector3D(this.y * other.z - this.z * other.y, this.z * other.x - this.x * other.z, this.x * other.y - this.y * other.x); }
  distance(other: Vec3D) { return this.subtract(other).magnitude(); }
}

// Matrix4 implementation
export class Matrix4 {
  constructor(public data: Float64Array = new Float64Array(16)) {
    this.data.fill(0);
    this.data[0] = this.data[5] = this.data[10] = this.data[15] = 1;
  }
  get_data() { return this.data; }
  translate(v: Vec3D) { this.data[12] += v.x; this.data[13] += v.y; this.data[14] += v.z; return this; }
  scale(v: Vec3D) { this.data[0] *= v.x; this.data[5] *= v.y; this.data[10] *= v.z; return this; }
  static perspective(fov: number, aspect: number, near: number, far: number) {
    const m = new Matrix4();
    const tan = Math.tan(fov / 2);
    const zr = far - near;
    m.data[0] = 1 / (aspect * tan);
    m.data[5] = 1 / tan;
    m.data[10] = -(far + near) / zr;
    m.data[11] = -1;
    m.data[14] = -(2 * far * near) / zr;
    return m;
  }
  static lookAt(eye: Vec3D, center: Vec3D, up: Vec3D) {
    const f = new Vector3D(center.x - eye.x, center.y - eye.y, center.z - eye.z).normalize();
    const s = f.cross(up).normalize();
    const u = s.cross(f);
    const m = new Matrix4();
    m.data[0] = s.x; m.data[4] = s.y; m.data[8] = s.z;
    m.data[1] = u.x; m.data[5] = u.y; m.data[9] = u.z;
    m.data[2] = -f.x; m.data[6] = -f.y; m.data[10] = -f.z;
    m.data[12] = -s.dot(eye); m.data[13] = -u.dot(eye); m.data[14] = f.dot(eye);
    return m;
  }
}

// Utility functions
export function levenshtein_distance(s1: string, s2: string): number {
  const m = s1.length, n = s2.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

export function string_similarity(s1: string, s2: string): number {
  const set1 = new Set(s1), set2 = new Set(s2);
  const inter = [...set1].filter(c => set2.has(c)).length;
  const union = new Set([...set1, ...set2]).size;
  return union === 0 ? 0 : inter / union;
}

export function simulate_physics(
  positions: Float64Array, velocities: Float64Array, masses: Float64Array,
  numNodes: number, iterations: number, repulsion: number, idealDist: number, damping: number
): Float64Array {
  const pos = new Float64Array(positions);
  const vel = new Float64Array(velocities);
  for (let iter = 0; iter < iterations; iter++) {
    const forces = new Float64Array(numNodes * 2);
    for (let i = 0; i < numNodes; i++) {
      for (let j = i + 1; j < numNodes; j++) {
        const dx = pos[j * 2] - pos[i * 2], dy = pos[j * 2 + 1] - pos[i * 2 + 1];
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 0.001);
        const force = repulsion / (dist * dist);
        forces[i * 2] -= (dx / dist) * force;
        forces[i * 2 + 1] -= (dy / dist) * force;
        forces[j * 2] += (dx / dist) * force;
        forces[j * 2 + 1] += (dy / dist) * force;
      }
    }
    for (let i = 0; i < numNodes; i++) {
      const mass = masses.length > i ? masses[i] : 1;
      vel[i * 2] = (vel[i * 2] + forces[i * 2] / mass) * damping;
      vel[i * 2 + 1] = (vel[i * 2 + 1] + forces[i * 2 + 1] / mass) * damping;
      pos[i * 2] += vel[i * 2];
      pos[i * 2 + 1] += vel[i * 2 + 1];
    }
  }
  return pos;
}

export function calculate_pagerank(edges: Uint32Array, numNodes: number, damping: number, iterations: number): Float64Array {
  const ranks = new Float64Array(numNodes).fill(1 / numNodes);
  const newRanks = new Float64Array(numNodes);
  const outgoing: number[][] = Array.from({ length: numNodes }, () => []);
  for (let i = 0; i < edges.length; i += 2) {
    const s = edges[i], t = edges[i + 1];
    if (s < numNodes && t < numNodes) outgoing[s].push(t);
  }
  for (let iter = 0; iter < iterations; iter++) {
    newRanks.fill((1 - damping) / numNodes);
    for (let i = 0; i < numNodes; i++) {
      if (outgoing[i].length === 0) {
        const share = damping * ranks[i] / numNodes;
        for (let j = 0; j < numNodes; j++) newRanks[j] += share;
      } else {
        const share = damping * ranks[i] / outgoing[i].length;
        for (const t of outgoing[i]) newRanks[t] += share;
      }
    }
    ranks.set(newRanks);
  }
  return ranks;
}

// Convenience functions
export function levenshtein(s1: string, s2: string): number {
  return levenshtein_distance(s1, s2);
}

export function stringSimilarity(s1: string, s2: string): number {
  return string_similarity(s1, s2);
}

export function simulatePhysics(
  positions: number[], velocities: number[], masses: number[],
  numNodes: number, iterations: number = 50, repulsion: number = 100, idealDistance: number = 100, damping: number = 0.85
): Float64Array {
  return simulate_physics(new Float64Array(positions), new Float64Array(velocities), new Float64Array(masses), numNodes, iterations, repulsion, idealDistance, damping);
}

export function calculatePageRank(edges: number[], numNodes: number, damping: number = 0.85, iterations: number = 20): Float64Array {
  return calculate_pagerank(new Uint32Array(edges), numNodes, damping, iterations);
}

