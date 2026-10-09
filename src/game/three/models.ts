"use client";

// GLB model loader — loads + caches 3D models from /models/*.glb
// Used for characters (male/female), cars, etc.
// All models are loaded with ssr:false (browser-only).

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const cache = new Map<string, THREE.Group>();

const loader = new GLTFLoader();

/** Load a GLB model from /models/ path. Returns a Promise that resolves to a cloned Group. */
export async function loadModel(path: string): Promise<THREE.Group> {
  if (cache.has(path)) {
    return Promise.resolve(cache.get(path)!.clone(true));
  }
  return new Promise((resolve, reject) => {
    loader.load(
      path,
      (gltf) => {
        const model = gltf.scene;
        // Normalize scale + center
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const scale = 2 / maxDim; // ~2 units tall
        model.scale.setScalar(scale);
        model.position.x = -center.x * scale;
        model.position.y = -box.min.y * scale;
        model.position.z = -center.z * scale;
        // Enable shadows on all meshes
        model.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (mesh.isMesh) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
          }
        });
        cache.set(path, model);
        resolve(model.clone(true));
      },
      undefined,
      (err) => reject(err)
    );
  });
}

/** Preload multiple models at once. */
export async function preloadModels(paths: string[]): Promise<void> {
  await Promise.all(paths.map((p) => loadModel(p).catch(() => null)));
}

// ============================================================
// CHARACTER MODEL LOADER (replaces procedural avatar)
// ============================================================

let maleModel: THREE.Group | null = null;
let femaleModel: THREE.Group | null = null;

/** Load character models. Call once at game start. */
export async function preloadCharacters(): Promise<void> {
  try {
    const [m, f] = await Promise.all([
      loadModel("/models/male.glb").catch(() => null),
      loadModel("/models/female.glb").catch(() => null),
    ]);
    maleModel = m;
    femaleModel = f;
  } catch {
    // Fallback to procedural if GLB fails
  }
}

/** Get a character model by gender. Returns null if not loaded yet. */
export function getCharacterModel(gender: "man" | "woman"): THREE.Group | null {
  const base = gender === "woman" ? femaleModel : maleModel;
  if (!base) return null;
  return base.clone(true);
}

/** Check if character models are loaded. */
export function charactersLoaded(): boolean {
  return maleModel !== null && femaleModel !== null;
}

// ============================================================
// CAR/TRUCK MODEL LOADER
// ============================================================

let truckModel: THREE.Group | null = null;

/** Load the truck/car model. Call once at game start. */
export async function preloadCar(): Promise<void> {
  try {
    truckModel = await loadModel("/models/truck.glb").catch(() => null);
  } catch {
    // Fallback to procedural if GLB fails
  }
}

/** Get a truck model clone. Returns null if not loaded yet. */
export function getTruckModel(): THREE.Group | null {
  if (!truckModel) return null;
  return truckModel.clone(true);
}
