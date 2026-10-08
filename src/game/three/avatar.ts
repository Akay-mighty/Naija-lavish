// Shared avatar factory — used by both local + remote players.
// Builds a low-poly humanoid from grouped primitives (no GLB).

import * as THREE from "three";
import { hexToInt } from "../lib/format";
import type { Look } from "../data/items";

export interface AvatarParts {
  group: THREE.Group;
  head: THREE.Mesh;
  body: THREE.Mesh;
  legL: THREE.Mesh;
  legR: THREE.Mesh;
  armL: THREE.Mesh;
  armR: THREE.Mesh;
  hair?: THREE.Mesh;
}

/** Build an avatar from a Look. Reusable for local + N remote players. */
export function buildAvatar(look: Look): AvatarParts {
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

  return { group, head, body, legL, legR, armL, armR, hair };
}

/** Update avatar animation given a phase (seconds) + walking flag. */
export function animateAvatar(parts: AvatarParts, t: number, walking: boolean, anim: string = "idle") {
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

/** Update avatar colors when look changes. */
export function recolorAvatar(parts: AvatarParts, look: Look) {
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
