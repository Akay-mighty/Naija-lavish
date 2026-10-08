// Instanced ground props: trees, palms, lamps, billboards, ambient taxis.
// Uses InstancedMesh for ≤150 draw calls target on mid-range Android.

import * as THREE from "three";
import { stdMat } from "./city";
import { cached, makeGrassTexture, makeAsphaltTexture, makePlazaTexture, makeBillboardTexture } from "./textures";

// ============================================================
// GROUND — asphalt + sidewalks + grass + plaza tiles
// ============================================================

export function buildGround(scene: THREE.Scene, BOUNDS: { minX: number; maxX: number; minZ: number; maxZ: number }) {
  const W = (BOUNDS.maxX - BOUNDS.minX) + 12;
  const H = (BOUNDS.maxZ - BOUNDS.minZ) + 12;

  // Grass base (covers everything)
  const grassMat = new THREE.MeshStandardMaterial({
    map: cached("grass", () => makeGrassTexture()),
    roughness: 0.95,
  });
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(W + 20, H + 20), grassMat);
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.02;
  grass.receiveShadow = true;
  scene.add(grass);

  // Asphalt cross-roads
  const roadMat = new THREE.MeshStandardMaterial({
    map: cached("asphalt", () => makeAsphaltTexture(true)),
    roughness: 0.95,
  });
  const roadH = new THREE.Mesh(new THREE.PlaneGeometry(W, 4), roadMat);
  roadH.rotation.x = -Math.PI / 2;
  roadH.position.y = 0.005;
  roadH.receiveShadow = true;
  scene.add(roadH);
  const roadV = new THREE.Mesh(new THREE.PlaneGeometry(4, H), roadMat);
  roadV.rotation.x = -Math.PI / 2;
  roadV.position.y = 0.006;
  roadV.receiveShadow = true;
  scene.add(roadV);

  // Sidewalks (plaza tiles around intersection)
  const plazaMat = new THREE.MeshStandardMaterial({
    map: cached("plaza", () => makePlazaTexture()),
    roughness: 0.85,
  });
  for (const [px, pz] of [[3, 3], [-3, 3], [3, -3], [-3, -3]] as const) {
    const sw = new THREE.Mesh(new THREE.PlaneGeometry(8, 2.5), plazaMat);
    sw.rotation.x = -Math.PI / 2;
    sw.position.set(px, 0.008, pz);
    scene.add(sw);
  }
}

// ============================================================
// INSTANCED PROPS — trees, palms, lamps
// ============================================================

export function buildInstancedProps(scene: THREE.Scene, BOUNDS: { minX: number; maxX: number; minZ: number; maxZ: number }) {
  // ---- Palm trees (instanced trunk + leaves) ----
  const palmCount = 24;
  const trunkGeo = new THREE.CylinderGeometry(0.15, 0.2, 3, 6);
  const trunkMat = stdMat("#6b4423");
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, palmCount);
  trunks.castShadow = true;
  trunks.receiveShadow = true;
  const leafGeo = new THREE.BoxGeometry(1, 0.05, 0.25);
  const leafMat = stdMat("#22c55e");
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, palmCount * 5);
  const m = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scl = new THREE.Vector3(1, 1, 1);
  let leafIdx = 0;

  for (let i = 0; i < palmCount; i++) {
    // Random position outside the road and away from places
    let x: number, z: number;
    do {
      x = BOUNDS.minX + Math.random() * (BOUNDS.maxX - BOUNDS.minX);
      z = BOUNDS.minZ + Math.random() * (BOUNDS.maxZ - BOUNDS.minZ);
    } while (Math.abs(x) < 3 || Math.abs(z) < 3); // avoid roads
    pos.set(x, 1.5, z);
    m.compose(pos, quat, scl);
    trunks.setMatrixAt(i, m);

    // 5 leaves on top
    for (let k = 0; k < 5; k++) {
      const ang = (k / 5) * Math.PI * 2;
      pos.set(x + Math.cos(ang) * 0.5, 3, z + Math.sin(ang) * 0.5);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ang, 0.5));
      m.compose(pos, q, scl);
      leaves.setMatrixAt(leafIdx++, m);
    }
  }
  trunks.instanceMatrix.needsUpdate = true;
  leaves.instanceMatrix.needsUpdate = true;
  scene.add(trunks);
  scene.add(leaves);

  // ---- Street lamps (instanced poles + bulbs) ----
  const lampCount = 8;
  const poleGeo = new THREE.CylinderGeometry(0.08, 0.1, 3, 6);
  const poleMat = stdMat("#3a3a3a");
  const poles = new THREE.InstancedMesh(poleGeo, poleMat, lampCount);
  const bulbGeo = new THREE.SphereGeometry(0.2, 8, 6);
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, emissive: 0xfde68a, emissiveIntensity: 0.6 });
  const bulbs = new THREE.InstancedMesh(bulbGeo, bulbMat, lampCount);
  const bulbPos = new THREE.Vector3();

  for (let i = 0; i < lampCount; i++) {
    const side = i % 2 ? 1 : -1;
    const x = (i / 2 - 1) * 8;
    pos.set(x, 1.5, side * 2.5);
    m.compose(pos, quat, scl);
    poles.setMatrixAt(i, m);
    bulbPos.set(x, 3.1, side * 2.5);
    m.compose(bulbPos, quat, scl);
    bulbs.setMatrixAt(i, m);
  }
  poles.instanceMatrix.needsUpdate = true;
  bulbs.instanceMatrix.needsUpdate = true;
  scene.add(poles);
  scene.add(bulbs);
}

// ============================================================
// BILLBOARDS (3 around the city with Naija slogans)
// ============================================================

export function buildBillboards(scene: THREE.Scene) {
  const slogans = ["NAIJA NO DEY CARRY LAST", "BIG BOY THINGS", "OWAMBE LOADING"];
  const positions: Array<[number, number, number, number]> = [
    [-12, 0, -10, 0],   // x, z, y-rotation
    [14, 0, -10, 0],
    [-15, 0, 12, Math.PI / 2],
  ];
  for (let i = 0; i < 3; i++) {
    const [x, _y, z, ry] = positions[i];
    const billboard = new THREE.Group();
    const tex = cached(`billboard-${i}`, () => makeBillboardTexture(slogans[i]));
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(4, 2),
      new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.7 })
    );
    panel.position.y = 4;
    billboard.add(panel);
    // Support posts
    for (const px of [-1.5, 1.5]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4, 6), stdMat("#3a3a3a"));
      post.position.set(px, 2, 0);
      billboard.add(post);
    }
    billboard.position.set(x, 0, z);
    billboard.rotation.y = ry;
    scene.add(billboard);
  }
}

// ============================================================
// AMBIENT TRAFFIC — instanced green-and-white taxis on loops
// ============================================================

export interface TrafficSystem {
  update: (dt: number, t: number) => void;
  dispose: () => void;
}

export function buildAmbientTraffic(scene: THREE.Scene): TrafficSystem {
  const taxiCount = 6;
  const taxiGeo = new THREE.BoxGeometry(1.4, 0.6, 0.7);
  const taxiMat = stdMat("#22c55e");
  const taxis = new THREE.InstancedMesh(taxiGeo, taxiMat, taxiCount);
  taxis.castShadow = true;
  const roofGeo = new THREE.BoxGeometry(1.2, 0.4, 0.6);
  const roofMat = stdMat("#ffffff");
  const roofs = new THREE.InstancedMesh(roofGeo, roofMat, taxiCount);

  const m = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scl = new THREE.Vector3(1, 1, 1);

  // Routes: alternate horizontal + vertical, different speeds/phases
  const routes = Array.from({ length: taxiCount }, (_, i) => ({
    horizontal: i % 2 === 0,
    offset: (i / taxiCount) * Math.PI * 2,
    speed: 0.3 + (i % 3) * 0.1,
    lane: (i % 2 ? 1 : -1) * 1.0, // alternate sides
  }));

  scene.add(taxis);
  scene.add(roofs);

  function update(_dt: number, t: number) {
    for (let i = 0; i < taxiCount; i++) {
      const r = routes[i];
      if (r.horizontal) {
        const u = ((t * r.speed + r.offset) % (Math.PI * 2)) / (Math.PI * 2); // 0..1
        pos.set(-20 + u * 40, 0.5, r.lane);
        quat.setFromEuler(new THREE.Euler(0, u > 0.5 ? -Math.PI / 2 : Math.PI / 2, 0));
      } else {
        const u = ((t * r.speed + r.offset) % (Math.PI * 2)) / (Math.PI * 2);
        pos.set(r.lane, 0.5, -15 + u * 30);
        quat.setFromEuler(new THREE.Euler(0, u > 0.5 ? 0 : Math.PI, 0));
      }
      m.compose(pos, quat, scl);
      taxis.setMatrixAt(i, m);
      pos.y = 1.0;
      m.compose(pos, quat, scl);
      roofs.setMatrixAt(i, m);
    }
    taxis.instanceMatrix.needsUpdate = true;
    roofs.instanceMatrix.needsUpdate = true;
  }

  function dispose() {
    scene.remove(taxis);
    scene.remove(roofs);
    taxiGeo.dispose();
    roofGeo.dispose();
  }

  return { update, dispose };
}
