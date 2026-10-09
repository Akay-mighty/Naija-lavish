"use client";

// GLB model loader — loads + caches 3D models from /models/*.glb
// Used for characters (male/female), cars, etc.
// All models are loaded with ssr:false (browser-only).

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";

const cache = new Map<string, THREE.Group>();

const loader = new GLTFLoader();

/**
 * Make an independent copy of a loaded model.
 * IMPORTANT: a plain Object3D .clone() does NOT work for rigged (skinned) characters - every
 * copy shares the SAME skeleton, so only one person shows up properly and the rest look
 * broken. SkeletonUtils.clone gives each copy its own skeleton. We also give each copy its own
 * materials so changing one player's colours never changes everybody else's.
 */
export function cloneModel(base: THREE.Object3D): THREE.Group {
  const copy = cloneSkinned(base) as THREE.Group;
  copy.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map((m) => m.clone())
        : (mesh.material as THREE.Material).clone();
      mesh.frustumCulled = false; // skinned meshes can be wrongly hidden by culling
    }
  });
  return copy;
}


/** Load a GLB model from /models/ path. Returns a Promise that resolves to a cloned Group. */
export async function loadModel(path: string): Promise<THREE.Group> {
  if (cache.has(path)) {
    return Promise.resolve(cloneModel(cache.get(path)!));
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
        resolve(cloneModel(model));
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
  return cloneModel(base);
}

/** Check if character models are loaded. */
export function charactersLoaded(): boolean {
  return maleModel !== null && femaleModel !== null;
}

// ============================================================
// CAR/TRUCK + INTERIOR PROPS
// ============================================================

let truckModel: THREE.Group | null = null;
let dishwasherModel: THREE.Group | null = null;
let stoveModel: THREE.Group | null = null;

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
  return cloneModel(truckModel);
}

/** Load interior prop models (dishwasher, stove). Call once at game start. */
export async function preloadProps(): Promise<void> {
  try {
    const [d, s] = await Promise.all([
      loadModel("/models/dishwasher.glb").catch(() => null),
      loadModel("/models/stove.glb").catch(() => null),
    ]);
    dishwasherModel = d;
    stoveModel = s;
  } catch {
    // Fallback to procedural
  }
}

export function getDishwasherModel(): THREE.Group | null {
  return dishwasherModel ? cloneModel(dishwasherModel) : null;
}

export function getStoveModel(): THREE.Group | null {
  return stoveModel ? cloneModel(stoveModel) : null;
}
