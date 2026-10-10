// Instanced ground props: trees, palms, lamps, billboards, ambient taxis.
// Uses InstancedMesh for ≤150 draw calls target on mid-range Android.

import * as THREE from "three";
import { stdMat } from "./city";
import { cached, makeGrassTexture, makeAsphaltTexture, makePlazaTexture, makeBillboardTexture } from "./textures";

// ============================================================
// GROUND — proper road with lanes, median, sidewalks, crossings
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

  // === MAIN ROAD (horizontal, multi-lane) ===
  buildMainRoad(scene, W);

  // === Secondary road (vertical, narrower) ===
  const roadV = new THREE.Mesh(new THREE.PlaneGeometry(6, H), new THREE.MeshStandardMaterial({
    map: cached("asphalt2", () => makeAsphaltTexture(false)),
    roughness: 0.95,
  }));
  roadV.rotation.x = -Math.PI / 2;
  roadV.position.y = 0.006;
  roadV.receiveShadow = true;
  scene.add(roadV);

  // === Sidewalks (plaza tiles) ===
  const plazaMat = new THREE.MeshStandardMaterial({
    map: cached("plaza", () => makePlazaTexture()),
    roughness: 0.85,
  });
  // Sidewalks along the main road
  for (const z of [4.5, -4.5]) {
    const sw = new THREE.Mesh(new THREE.PlaneGeometry(W, 2), plazaMat);
    sw.rotation.x = -Math.PI / 2;
    sw.position.set(0, 0.008, z);
    scene.add(sw);
  }
  // Sidewalks along the vertical road
  for (const x of [4.5, -4.5]) {
    const sw = new THREE.Mesh(new THREE.PlaneGeometry(2, H), plazaMat);
    sw.rotation.x = -Math.PI / 2;
    sw.position.set(x, 0.008, 0);
    scene.add(sw);
  }

  // === Kerbs (raised edges between road and sidewalk) ===
  const kerbMat = stdMat("#c0c0c0");
  // Horizontal kerbs
  for (const z of [3.2, -3.2]) {
    const kerb = new THREE.Mesh(new THREE.BoxGeometry(W, 0.15, 0.15), kerbMat);
    kerb.position.set(0, 0.075, z);
    kerb.receiveShadow = true;
    scene.add(kerb);
  }
  // Vertical kerbs
  for (const x of [3.2, -3.2]) {
    const kerb = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, H), kerbMat);
    kerb.position.set(x, 0.075, 0);
    kerb.receiveShadow = true;
    scene.add(kerb);
  }
}

// ============================================================
// MAIN ROAD — 2 lanes each direction, median, lane lines, crossings
// ============================================================

function buildMainRoad(scene: THREE.Scene, length: number) {
  const roadWidth = 8; // 4 lanes × 2 units each
  const roadMat = new THREE.MeshStandardMaterial({
    map: cached("asphalt", () => makeAsphaltTexture(false)),
    roughness: 0.95,
    color: 0x2a2a2a,
  });

  // Road surface
  const road = new THREE.Mesh(new THREE.PlaneGeometry(length, roadWidth), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.005;
  road.receiveShadow = true;
  scene.add(road);

  // === Lane markings (dashed white lines between lanes) ===
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const dashLen = 1.5;
  const gapLen = 1.5;
  const totalDash = dashLen + gapLen;
  const numDashes = Math.floor(length / totalDash);

  // Lane divider lines (2 lines: at x=-1 and x=1, splitting into 4 lanes)
  for (const x of [-1, 1]) {
    for (let i = 0; i < numDashes; i++) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(dashLen, 0.08), lineMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(-length / 2 + i * totalDash + dashLen / 2, 0.007, x);
      scene.add(dash);
    }
  }

  // === Centre median (green strip with palms) ===
  const medianMat = stdMat("#3a7a3a");
  const median = new THREE.Mesh(new THREE.PlaneGeometry(length, 1), medianMat);
  median.rotation.x = -Math.PI / 2;
  median.position.y = 0.01;
  median.receiveShadow = true;
  scene.add(median);

  // Solid yellow lines at median edges
  const yellowMat = new THREE.MeshBasicMaterial({ color: 0xfde68a });
  for (const z of [-0.5, 0.5]) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(length, 0.06), yellowMat);
    line.rotation.x = -Math.PI / 2;
    line.position.y = 0.012;
    line.position.z = z;
    scene.add(line);
  }

  // === Solid white edge lines (at road boundary) ===
  for (const z of [-4, 4]) {
    const edge = new THREE.Mesh(new THREE.PlaneGeometry(length, 0.08), lineMat);
    edge.rotation.x = -Math.PI / 2;
    edge.position.y = 0.007;
    edge.position.z = z;
    scene.add(edge);
  }

  // === Zebra crossings (at x=0 intersection) ===
  const stripeCount = 6;
  const stripeWidth = 0.3;
  const stripeGap = 0.15;
  for (const dir of [0, 1]) {
    // dir 0 = crossing the horizontal road (stripes along Z)
    // dir 1 = crossing the vertical road (stripes along X)
    for (let i = 0; i < stripeCount; i++) {
      const stripe = new THREE.Mesh(
        new THREE.PlaneGeometry(
          dir === 0 ? 0.3 : roadWidth * 0.8,
          dir === 0 ? roadWidth * 0.8 : 0.3
        ),
        lineMat
      );
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.y = 0.008;
      if (dir === 0) {
        // Horizontal road crossing at x = -10 and x = 10
        for (const cx of [-10, 10]) {
          const s = stripe.clone();
          s.position.set(cx + (i - stripeCount / 2) * (stripeWidth + stripeGap), 0.008, 0);
          scene.add(s);
        }
      }
    }
  }

  // === Lamp posts along the road (instanced) ===
  const lampCount = 8;
  const poleGeo = new THREE.CylinderGeometry(0.08, 0.1, 3, 6);
  const poleMat = stdMat("#3a3a3a");
  const poles = new THREE.InstancedMesh(poleGeo, poleMat, lampCount);
  const bulbGeo = new THREE.SphereGeometry(0.2, 8, 6);
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, emissive: 0xfde68a, emissiveIntensity: 0.5 });
  const bulbs = new THREE.InstancedMesh(bulbGeo, bulbMat, lampCount);
  const m = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scl = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < lampCount; i++) {
    const x = -length / 2 + (i + 0.5) * (length / lampCount);
    // Alternating sides
    const z = i % 2 === 0 ? 5 : -5;
    pos.set(x, 1.5, z);
    m.compose(pos, quat, scl);
    poles.setMatrixAt(i, m);
    pos.y = 3.1;
    m.compose(pos, quat, scl);
    bulbs.setMatrixAt(i, m);
  }
  poles.instanceMatrix.needsUpdate = true;
  bulbs.instanceMatrix.needsUpdate = true;
  scene.add(poles);
  scene.add(bulbs);

  // === Palms on median (instanced) ===
  const palmCount = Math.min(10, Math.floor(length / 8));
  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 3, 6);
  const trunkMat = stdMat("#6b4423");
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, palmCount);
  const leafGeo = new THREE.BoxGeometry(0.8, 0.05, 0.2);
  const leafMat = stdMat("#22c55e");
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, palmCount * 4);
  let leafIdx = 0;
  for (let i = 0; i < palmCount; i++) {
    const x = -length / 2 + (i + 0.5) * (length / palmCount);
    pos.set(x, 1.5, 0);
    m.compose(pos, quat, scl);
    trunks.setMatrixAt(i, m);
    for (let k = 0; k < 4; k++) {
      const ang = (k / 4) * Math.PI * 2;
      pos.set(x + Math.cos(ang) * 0.4, 3, Math.sin(ang) * 0.4);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ang, 0.4));
      m.compose(pos, q, scl);
      leaves.setMatrixAt(leafIdx++, m);
    }
  }
  trunks.instanceMatrix.needsUpdate = true;
  leaves.instanceMatrix.needsUpdate = true;
  scene.add(trunks);
  scene.add(leaves);

  // === Bus stop signs (2 along the road) ===
  const signMat = stdMat("#0a6c3a");
  for (const [sx, sz] of [[-length / 4, 5.5], [length / 4, -5.5]] as const) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.5, 4), signMat);
    pole.position.set(sx, 1.25, sz);
    scene.add(pole);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.03), signMat);
    sign.position.set(sx, 2.3, sz);
    scene.add(sign);
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
