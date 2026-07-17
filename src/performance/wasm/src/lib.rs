//! Aether OS WASM Module - High-performance Rust code compiled to WebAssembly

use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct Vec2D { pub x: f64, pub y: f64 }

#[wasm_bindgen]
impl Vec2D {
    #[wasm_bindgen(constructor)]
    pub fn new(x: f64, y: f64) -> Vec2D { Vec2D { x, y } }
    pub fn add(&self, other: &Vec2D) -> Vec2D { Vec2D { x: self.x + other.x, y: self.y + other.y } }
    pub fn subtract(&self, other: &Vec2D) -> Vec2D { Vec2D { x: self.x - other.x, y: self.y - other.y } }
    pub fn multiply(&self, scalar: f64) -> Vec2D { Vec2D { x: self.x * scalar, y: self.y * scalar } }
    pub fn magnitude(&self) -> f64 { (self.x * self.x + self.y * self.y).sqrt() }
    pub fn normalize(&self) -> Vec2D { let m = self.magnitude(); if m == 0.0 { Vec2D::new(0.0, 0.0) } else { Vec2D { x: self.x / m, y: self.y / m } } }
    pub fn dot(&self, other: &Vec2D) -> f64 { self.x * other.x + self.y * other.y }
    pub fn distance(&self, other: &Vec2D) -> f64 { self.subtract(other).magnitude() }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct Vec3D { pub x: f64, pub y: f64, pub z: f64 }

#[wasm_bindgen]
impl Vec3D {
    #[wasm_bindgen(constructor)]
    pub fn new(x: f64, y: f64, z: f64) -> Vec3D { Vec3D { x, y, z } }
    pub fn add(&self, other: &Vec3D) -> Vec3D { Vec3D { x: self.x + other.x, y: self.y + other.y, z: self.z + other.z } }
    pub fn subtract(&self, other: &Vec3D) -> Vec3D { Vec3D { x: self.x - other.x, y: self.y - other.y, z: self.z - other.z } }
    pub fn multiply(&self, scalar: f64) -> Vec3D { Vec3D { x: self.x * scalar, y: self.y * scalar, z: self.z * scalar } }
    pub fn magnitude(&self) -> f64 { (self.x * self.x + self.y * self.y + self.z * self.z).sqrt() }
    pub fn normalize(&self) -> Vec3D { let m = self.magnitude(); if m == 0.0 { Vec3D::new(0.0, 0.0, 0.0) } else { Vec3D { x: self.x / m, y: self.y / m, z: self.z / m } } }
    pub fn dot(&self, other: &Vec3D) -> f64 { self.x * other.x + self.y * other.y + self.z * other.z }
    pub fn cross(&self, other: &Vec3D) -> Vec3D { Vec3D { x: self.y * other.z - self.z * other.y, y: self.z * other.x - self.x * other.z, z: self.x * other.y - self.y * other.x } }
    pub fn distance(&self, other: &Vec3D) -> f64 { self.subtract(other).magnitude() }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Matrix4 { data: [f64; 16] }

#[wasm_bindgen]
impl Matrix4 {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Matrix4 { Matrix4 { data: [1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0] } }
    pub fn identity() -> Matrix4 { Matrix4::new() }
    pub fn perspective(fov: f64, aspect: f64, near: f64, far: f64) -> Matrix4 {
        let tan_half = (fov / 2.0).tan();
        let zr = far - near;
        Matrix4 { data: [1.0/(aspect*tan_half), 0.0, 0.0, 0.0, 0.0, 1.0/tan_half, 0.0, 0.0, 0.0, 0.0, -(far+near)/zr, -1.0, 0.0, 0.0, -(2.0*far*near)/zr, 0.0] }
    }
    pub fn look_at(eye: &Vec3D, center: &Vec3D, up: &Vec3D) -> Matrix4 {
        let f = center.subtract(eye).normalize();
        let s = f.cross(up).normalize();
        let u = s.cross(&f);
        Matrix4 { data: [s.x, u.x, -f.x, 0.0, s.y, u.y, -f.y, 0.0, s.z, u.z, -f.z, 0.0, -s.dot(eye), -u.dot(eye), f.dot(eye), 1.0] }
    }
    pub fn get_data(&self) -> Vec<f64> { self.data.to_vec() }
    pub fn translate(&self, v: &Vec3D) -> Matrix4 {
        let mut d = self.data;
        d[12] = self.data[0]*v.x + self.data[4]*v.y + self.data[8]*v.z + self.data[12];
        d[13] = self.data[1]*v.x + self.data[5]*v.y + self.data[9]*v.z + self.data[13];
        d[14] = self.data[2]*v.x + self.data[6]*v.y + self.data[10]*v.z + self.data[14];
        Matrix4 { data: d }
    }
    pub fn scale(&self, v: &Vec3D) -> Matrix4 {
        let mut d = [0.0; 16];
        d[0] = self.data[0]*v.x; d[1] = self.data[1]*v.x; d[2] = self.data[2]*v.x; d[3] = self.data[3]*v.x;
        d[4] = self.data[4]*v.y; d[5] = self.data[5]*v.y; d[6] = self.data[6]*v.y; d[7] = self.data[7]*v.y;
        d[8] = self.data[8]*v.z; d[9] = self.data[9]*v.z; d[10] = self.data[10]*v.z; d[11] = self.data[11]*v.z;
        d[12] = self.data[12]; d[13] = self.data[13]; d[14] = self.data[14]; d[15] = self.data[15];
        Matrix4 { data: d }
    }
}

#[wasm_bindgen]
pub fn levenshtein_distance(s1: &str, s2: &str) -> usize {
    let c1: Vec<char> = s1.chars().collect();
    let c2: Vec<char> = s2.chars().collect();
    let (l1, l2) = (c1.len(), c2.len());
    if l1 == 0 { return l2; }
    if l2 == 0 { return l1; }
    let mut m = vec![vec![0usize; l2 + 1]; l1 + 1];
    for i in 0..=l1 { m[i][0] = i; }
    for j in 0..=l2 { m[0][j] = j; }
    for i in 1..=l1 {
        for j in 1..=l2 {
            let cost = if c1[i-1] == c2[j-1] { 0 } else { 1 };
            m[i][j] = std::cmp::min(std::cmp::min(m[i-1][j] + 1, m[i][j-1] + 1), m[i-1][j-1] + cost);
        }
    }
    m[l1][l2]
}

#[wasm_bindgen]
pub fn string_similarity(s1: &str, s2: &str) -> f64 {
    use std::collections::HashSet;
    let set1: HashSet<char> = s1.chars().collect();
    let set2: HashSet<char> = s2.chars().collect();
    let inter = set1.intersection(&set2).count() as f64;
    let union = set1.union(&set2).count() as f64;
    if union == 0.0 { 0.0 } else { inter / union }
}

#[wasm_bindgen]
pub fn simulate_physics(positions: Vec<f64>, velocities: Vec<f64>, masses: Vec<f64>, num_nodes: usize, iterations: usize, repulsion: f64, ideal_dist: f64, damping: f64) -> Vec<f64> {
    let mut pos = positions;
    let mut vel = velocities;
    for _ in 0..iterations {
        let mut forces = vec![0.0; num_nodes * 2];
        for i in 0..num_nodes {
            for j in (i + 1)..num_nodes {
                let dx = pos[j * 2] - pos[i * 2];
                let dy = pos[j * 2 + 1] - pos[i * 2 + 1];
                let dist = (dx * dx + dy * dy).sqrt().max(0.001);
                let force = repulsion / (dist * dist);
                forces[i * 2] -= (dx / dist) * force;
                forces[i * 2 + 1] -= (dy / dist) * force;
                forces[j * 2] += (dx / dist) * force;
                forces[j * 2 + 1] += (dy / dist) * force;
            }
        }
        for i in 0..num_nodes {
            let mass = if masses.len() > i { masses[i] } else { 1.0 };
            vel[i * 2] = (vel[i * 2] + forces[i * 2] / mass) * damping;
            vel[i * 2 + 1] = (vel[i * 2 + 1] + forces[i * 2 + 1] / mass) * damping;
            pos[i * 2] += vel[i * 2];
            pos[i * 2 + 1] += vel[i * 2 + 1];
        }
    }
    pos
}

#[wasm_bindgen]
pub fn calculate_pagerank(edges: Vec<usize>, num_nodes: usize, damping: f64, iterations: usize) -> Vec<f64> {
    let num_edges = edges.len() / 2;
    let mut ranks = vec![1.0 / num_nodes as f64; num_nodes];
    let mut new_ranks = vec![0.0; num_nodes];
    let mut outgoing = vec![vec![]; num_nodes];
    for i in 0..num_edges {
        let s = edges[i * 2];
        let t = edges[i * 2 + 1];
        if s < num_nodes && t < num_nodes { outgoing[s].push(t); }
    }
    for _ in 0..iterations {
        for i in 0..num_nodes { new_ranks[i] = (1.0 - damping) / num_nodes as f64; }
        for i in 0..num_nodes {
            if outgoing[i].is_empty() {
                let share = damping * ranks[i] / num_nodes as f64;
                for j in 0..num_nodes { new_ranks[j] += share; }
            } else {
                let share = damping * ranks[i] / outgoing[i].len() as f64;
                for &t in &outgoing[i] { new_ranks[t] += share; }
            }
        }
        ranks.copy_from_slice(&new_ranks);
    }
    ranks
}
