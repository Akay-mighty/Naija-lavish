// Shared avatar factory — used by both local + remote players.
// Tries to load GLB models (from /models/male.glb, /models/female.glb).
// Falls back to procedural primitives if GLB not loaded yet.

import * as THREE from "three";
import { hexToInt } from "../lib/format";
import type { Look } from "../data/items";
import { getCharacterModel } from "./models";

export interface AvatarParts {
  group: THREE.Group;
  head: THREE.Mesh;
  body: THREE.Mesh;
  legL: THREE.Mesh;
  legR: THREE.Mesh;
  armL: THREE.Mesh;
  armR: THREE.Mesh;
  hair?: THREE.Mesh;
  isGLB: boolean;
  /** GLB only: the model inside `group` (so the name tag does not bob with it). */
  inner?: THREE.Object3D;
  /** GLB only: holds hats, glasses, chains... so they can be swapped without touching the model. */
  acc?: THREE.Group;
  /** GLB only: the skeleton bones we pose by hand (these models have no built-in animations). */
  bones?: Record<string, Array<{ bone: THREE.Object3D; rest: THREE.Quaternion }>>;
}

/** Build an avatar from a Look. Uses GLB model if loaded, else procedural. */
export function buildAvatar(look: Look): AvatarParts {
  // Try GLB model first
  const glbModel = getCharacterModel(look.gender);
  if (glbModel) {
    return buildFromGLB(glbModel, look);
  }
  return buildProcedural(look);
}

/** Build from a loaded GLB model. */
function buildFromGLB(model: THREE.Group, look: Look): AvatarParts {
  // The model sits inside a wrapper group. The wrapper is what gets moved around the city
  // (and carries the name tag); the model inside is what we bob/sway to fake a walk.
  const group = new THREE.Group();
  group.add(model);
  const acc = new THREE.Group();
  group.add(acc);

  // These GLB characters are one rigged mesh with no separate arms/legs to wiggle,
  // so the "parts" are inert placeholders and animateAvatar moves the whole model instead.
  const dummy = () => new THREE.Mesh();
  const parts: AvatarParts = {
    group,
    inner: model,
    acc,
    head: dummy(),
    body: dummy(),
    legL: dummy(),
    legR: dummy(),
    armL: dummy(),
    armR: dummy(),
    isGLB: true,
  };
  // Find the Mixamo bones we want to pose (names look like "mixamorigLeftArm").
  const want = ["LeftArm", "RightArm", "LeftForeArm", "RightForeArm", "LeftUpLeg", "RightUpLeg", "LeftLeg", "RightLeg", "Spine", "Head"];
  const bones: NonNullable<AvatarParts["bones"]> = {};
  // The converter that made these GLBs repeats each bone as a nested chain
  // (mixamorigLeftArm < mixamorigLeftArm_1 < mixamorigLeftArm_2), and the skeleton hangs off
  // the OUTERMOST one. Turning only that outer bone moves every copy inside it.
  const baseName = (n: string) => n.replace(/^mixamorig[:_]?/i, "").replace(/_\d+$/, "");
  model.traverse((o) => {
    if (!(o as THREE.Bone).isBone) return;
    const key = baseName(o.name);
    if (!want.includes(key)) return;
    if (o.parent && baseName(o.parent.name) === key) return; // not the outer one
    (bones[key] ||= []).push({ bone: o, rest: o.quaternion.clone() });
  });
  parts.bones = bones;
  animateGLB(parts, 0, false, "idle");
  recolorAvatar(parts, look);
  return parts;
}

/** Build procedural avatar (fallback when GLB not loaded). */
function buildProcedural(look: Look): AvatarParts {
  const group = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({ color: hexToInt(look.skin), roughness: 0.75 });
  const topMat = new THREE.MeshStandardMaterial({ color: hexToInt(look.top), roughness: 0.85 });
  const bottomMat = new THREE.MeshStandardMaterial({ color: hexToInt(look.bottom), roughness: 0.9 });

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), skinMat);
  head.position.y = 1.45;
  head.castShadow = true;
  group.add(head);

  // Hair (simple cap)
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95 })
  );
  hair.position.y = 1.5;
  hair.castShadow = true;
  group.add(hair);

  // Neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.1, 6), skinMat);
  neck.position.y = 1.15;
  group.add(neck);

  // Body (torso)
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.65, 8), topMat);
  body.position.y = 0.85;
  body.castShadow = true;
  group.add(body);

  // Arms
  const armGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.55, 6);
  const armL = new THREE.Mesh(armGeo, topMat);
  armL.position.set(-0.36, 0.85, 0);
  armL.castShadow = true;
  group.add(armL);
  const armR = new THREE.Mesh(armGeo, topMat);
  armR.position.set(0.36, 0.85, 0);
  armR.castShadow = true;
  group.add(armR);

  // Legs
  const legGeo = new THREE.CylinderGeometry(0.12, 0.10, 0.65, 6);
  const legL = new THREE.Mesh(legGeo, bottomMat);
  legL.position.set(-0.14, 0.30, 0);
  legL.castShadow = true;
  group.add(legL);
  const legR = new THREE.Mesh(legGeo, bottomMat);
  legR.position.set(0.14, 0.30, 0);
  legR.castShadow = true;
  group.add(legR);

  // Shadow blob
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 12),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.15 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  return { group, head, body, legL, legR, armL, armR, hair, isGLB: false };
}


const _q = new THREE.Quaternion();
const _ax = new THREE.Vector3();
/** Pose a bone: its original rotation, then an extra turn of `angle` radians around axis (x|y|z). */
function turn(parts: AvatarParts, name: string, axis: "x" | "y" | "z", angle: number) {
  const list = parts.bones?.[name];
  if (!list) return;
  _ax.set(axis === "x" ? 1 : 0, axis === "y" ? 1 : 0, axis === "z" ? 1 : 0);
  _q.setFromAxisAngle(_ax, angle);
  for (const b of list) b.bone.quaternion.copy(b.rest).multiply(_q);
}

/** Hand-made animation for the rigged GLB characters (they ship in a T-pose with no clips). */
// Axis notes (found by test renders): turning an arm bone about X lowers/raises it
// (+1.2 = hanging at the side), turning a leg bone about X swings it forward/back.
const ARM_DOWN = 1.25;
function animateGLB(parts: AvatarParts, t: number, walking: boolean, anim: string) {
  const m = parts.inner!;
  // (accessories are synced to the body bob at the end of this function)
  try { animateGLBInner(parts, t, walking, anim); } finally {
    if (parts.acc) { parts.acc.position.y = m.position.y; parts.acc.rotation.x = m.rotation.x; parts.acc.rotation.z = m.rotation.z; }
  }
}
function animateGLBInner(parts: AvatarParts, t: number, walking: boolean, anim: string) {
  const m = parts.inner!;
  if (anim === "dance") {
    const d = Math.sin(t * 8);
    m.position.y = Math.abs(d) * 0.08;
    m.rotation.z = Math.sin(t * 4) * 0.1;
    m.rotation.x = 0;
    turn(parts, "LeftArm", "x", -0.9 + d * 0.5);   // arms up and pumping
    turn(parts, "RightArm", "x", -0.9 - d * 0.5);
    turn(parts, "LeftUpLeg", "x", d * 0.3);
    turn(parts, "RightUpLeg", "x", -d * 0.3);
    turn(parts, "LeftLeg", "x", Math.max(0, -d) * 0.5);
    turn(parts, "RightLeg", "x", Math.max(0, d) * 0.5);
    return;
  }
  m.rotation.z = 0;
  if (walking) {
    const sw = Math.sin(t * 9);
    m.position.y = Math.abs(Math.sin(t * 9)) * 0.04;
    m.rotation.x = 0.04;
    turn(parts, "LeftUpLeg", "x", sw * 0.55);
    turn(parts, "RightUpLeg", "x", -sw * 0.55);
    turn(parts, "LeftLeg", "x", Math.max(0, -sw) * 0.7);
    turn(parts, "RightLeg", "x", Math.max(0, sw) * 0.7);
    turn(parts, "LeftArm", "x", ARM_DOWN - sw * 0.45);
    turn(parts, "RightArm", "x", ARM_DOWN + sw * 0.45);
  } else {
    m.position.y = Math.sin(t * 2) * 0.008;
    m.rotation.x = 0;
    turn(parts, "LeftUpLeg", "x", 0);
    turn(parts, "RightUpLeg", "x", 0);
    turn(parts, "LeftLeg", "x", 0);
    turn(parts, "RightLeg", "x", 0);
    turn(parts, "LeftArm", "x", ARM_DOWN + Math.sin(t * 2) * 0.03);
    turn(parts, "RightArm", "x", ARM_DOWN + Math.sin(t * 2) * 0.03);
  }
}

/** Update avatar animation given a phase (seconds) + walking flag. */
export function animateAvatar(parts: AvatarParts, t: number, walking: boolean, anim: string = "idle") {
  if (parts.isGLB && parts.inner) {
    animateGLB(parts, t, walking, anim);
    return;
  }
  if (anim === "dance") {
    parts.head.position.y = 1.45 + Math.sin(t * 8) * 0.08;
    parts.body.rotation.z = Math.sin(t * 6) * 0.15;
    parts.armL.rotation.z = Math.sin(t * 8) * 0.5 + 0.3;
    parts.armR.rotation.z = -Math.sin(t * 8) * 0.5 - 0.3;
    parts.legL.rotation.x = Math.sin(t * 8) * 0.2;
    parts.legR.rotation.x = -Math.sin(t * 8) * 0.2;
    return;
  }
  if (walking) {
    const bob = Math.sin(t * 12) * 0.05;
    parts.head.position.y = 1.45 + bob;
    parts.body.position.y = 0.85 + bob * 0.5;
    parts.legL.rotation.x = Math.sin(t * 12) * 0.5;
    parts.legR.rotation.x = -Math.sin(t * 12) * 0.5;
    parts.armL.rotation.x = -Math.sin(t * 12) * 0.3;
    parts.armR.rotation.x = Math.sin(t * 12) * 0.3;
  } else {
    parts.head.position.y = 1.45 + Math.sin(t * 2) * 0.02;
    parts.body.position.y = 0.85;
    parts.legL.rotation.x = 0;
    parts.legR.rotation.x = 0;
    parts.armL.rotation.x = 0;
    parts.armR.rotation.x = 0;
  }
}


// ---------------------------------------------------------------------------------------
// OUTFITS: what the player bought and is wearing (inventory items with equipped = true).
//  - outfit  -> changes the clothing colour
//  - footwear-> changes the shoe colour
//  - head / face / neck -> little 3D accessories sitting on the character
// Wrist items (watches), phones, cars and homes are not drawn on the character.
// ---------------------------------------------------------------------------------------
const OUTFIT_COLOR: Record<string, string> = { "ankara-set": "#d97706", agbada: "#f3e9d2", senator: "#2b2d42" };
const SHOE_COLOR: Record<string, string> = { slippers: "#f59e0b", "shoes-leather": "#3b2314" };

function std(color: string, metal = 0, rough = 0.7) {
  return new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: rough });
}

function makeAccessory(id: string, headY: number): THREE.Object3D | null {
  const g = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    g.add(m);
    return m;
  };
  const top = headY + 0.2; // roughly the top of the head
  switch (id) {
    case "cap-naija": {
      add(new THREE.SphereGeometry(0.135, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), std("#0a8f3c"), 0, top - 0.06, 0);
      add(new THREE.CylinderGeometry(0.137, 0.137, 0.03, 16), std("#ffffff"), 0, top - 0.065, 0);
      add(new THREE.CylinderGeometry(0.1, 0.1, 0.012, 16, 1, false, -Math.PI / 2, Math.PI), std("#0a8f3c"), 0, top - 0.07, 0.13);
      return g;
    }
    case "gele": {
      add(new THREE.TorusGeometry(0.13, 0.065, 10, 20), std("#c026d3", 0.1, 0.5), 0, top - 0.04, 0).rotation.x = Math.PI / 2;
      const knot = add(new THREE.SphereGeometry(0.11, 12, 10), std("#e879f9", 0.1, 0.5), 0.08, top + 0.05, 0);
      knot.scale.set(1.3, 0.8, 1);
      return g;
    }
    case "fedora": {
      add(new THREE.CylinderGeometry(0.25, 0.25, 0.015, 24), std("#111111"), 0, top - 0.07, 0);
      add(new THREE.CylinderGeometry(0.13, 0.15, 0.13, 20), std("#111111"), 0, top - 0.01, 0);
      add(new THREE.CylinderGeometry(0.152, 0.152, 0.03, 20), std("#b45309"), 0, top - 0.05, 0);
      return g;
    }
    case "shades":
    case "gold-shades": {
      const c = id === "shades" ? "#050505" : "#f5c518";
      const m = std(c, id === "shades" ? 0.3 : 0.9, 0.25);
      const y = headY + 0.115;
      add(new THREE.BoxGeometry(0.085, 0.05, 0.02), m, -0.055, y, 0.118);
      add(new THREE.BoxGeometry(0.085, 0.05, 0.02), m, 0.055, y, 0.118);
      add(new THREE.BoxGeometry(0.03, 0.012, 0.02), m, 0, y + 0.008, 0.118);
      return g;
    }
    case "chain-silver":
    case "chain-gold": {
      const m = id === "chain-gold" ? std("#f5c518", 1, 0.25) : std("#d4d4d8", 1, 0.25);
      const t = add(new THREE.TorusGeometry(0.115, id === "chain-gold" ? 0.013 : 0.008, 8, 24), m, 0, headY - 0.1, 0.02);
      t.rotation.x = Math.PI / 2 - 0.25;
      return g;
    }
    case "beads": {
      const t = add(new THREE.TorusGeometry(0.115, 0.018, 8, 24), std("#f59e0b", 0.1, 0.5), 0, headY - 0.1, 0.02);
      t.rotation.x = Math.PI / 2 - 0.25;
      add(new THREE.SphereGeometry(0.03, 8, 8), std("#ffffff"), 0, headY - 0.18, 0.125);
      return g;
    }
  }
  return null;
}

/** Put on exactly what the player has equipped (call whenever the equipped items change). */
export function applyOutfit(parts: AvatarParts, equippedIds: string[]) {
  if (!parts.isGLB || !parts.inner || !parts.acc) return;

  // 1) clothes + shoes colours
  const outfitId = equippedIds.find((id) => OUTFIT_COLOR[id]);
  const shoeId = equippedIds.find((id) => SHOE_COLOR[id]);
  parts.inner.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats as THREE.MeshStandardMaterial[]) {
      const n = (mat.name || "").toLowerCase();
      if ((n === "clothing" || n === "clothes") && outfitId && mat.color) mat.color.set(OUTFIT_COLOR[outfitId]);
      if (n === "shoes" && mat.color) mat.color.set(shoeId ? SHOE_COLOR[shoeId] : "#ffffff");
    }
  });

  // 2) accessories - rebuilt from scratch each time
  while (parts.acc.children.length) {
    const c = parts.acc.children.pop()!;
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); }
    });
  }
  const headBone = parts.bones?.Head?.[0]?.bone;
  let headY = 1.62; // fallback if the head bone is missing
  if (headBone) {
    parts.group.updateWorldMatrix(true, true);
    const v = new THREE.Vector3();
    headBone.getWorldPosition(v);
    parts.group.worldToLocal(v);
    headY = v.y;
  }
  for (const id of equippedIds) {
    const a = makeAccessory(id, headY);
    if (a) parts.acc.add(a);
  }
}

/** Update avatar colors when look changes. */
export function recolorAvatar(parts: AvatarParts, look: Look) {
  if (parts.isGLB && parts.inner) {
    // Colour the GLB by material name: "skin" gets the skin tone, "clothing" the outfit colour.
    parts.inner.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of mats as THREE.MeshStandardMaterial[]) {
        const n = (mat.name || "").toLowerCase();
        if (n === "skin" && mat.color) mat.color.set(look.skin);
        else if ((n === "clothing" || n === "clothes") && mat.color) mat.color.set(look.top);
      }
    });
    return;
  }
  (parts.head.material as THREE.MeshStandardMaterial).color.set(look.skin);
  (parts.body.material as THREE.MeshStandardMaterial).color.set(look.top);
  (parts.legL.material as THREE.MeshStandardMaterial).color.set(look.bottom);
  (parts.legR.material as THREE.MeshStandardMaterial).color.set(look.bottom);
  (parts.armL.material as THREE.MeshStandardMaterial).color.set(look.top);
  (parts.armR.material as THREE.MeshStandardMaterial).color.set(look.top);
}

/** Build a floating name tag sprite using CanvasTexture. */
export function buildNameTag(name: string, isYou: boolean = false): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;

  const pillW = 220;
  const pillH = 44;
  const pillX = (canvas.width - pillW) / 2;
  const pillY = (canvas.height - pillH) / 2;
  ctx.fillStyle = "rgba(15, 28, 22, 0.85)";
  roundRect(ctx, pillX, pillY, pillW, pillH, 22);
  ctx.fill();

  ctx.fillStyle = isYou ? "#fbbf24" : "#22c55e";
  ctx.beginPath();
  ctx.arc(pillX + 18, pillY + pillH / 2, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px Poppins, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(name.slice(0, 14), pillX + 32, pillY + pillH / 2 + 1);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.5, 0.625, 1);
  sprite.position.set(0, 2.2, 0);
  sprite.renderOrder = 999;
  return sprite;
}

/** Build a chat bubble sprite. */
export function buildChatBubble(text: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;

  ctx.font = "24px Poppins, system-ui, sans-serif";
  const metrics = ctx.measureText(text);
  const w = Math.min(460, metrics.width + 40);
  const h = 56;
  const x = (canvas.width - w) / 2;
  const y = (canvas.height - h) / 2;

  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(canvas.width / 2 - 10, y + h);
  ctx.lineTo(canvas.width / 2, y + h + 12);
  ctx.lineTo(canvas.width / 2 + 10, y + h);
  ctx.fill();

  ctx.fillStyle = "#1a1a1a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text.slice(0, 50), canvas.width / 2, y + h / 2);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(3, 0.75, 1);
  sprite.position.set(0, 2.9, 0);
  sprite.renderOrder = 999;
  return sprite;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
