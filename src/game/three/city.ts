// Procedural Abuja city builders.
// Each place gets a unique silhouette (not a box). All geometry is grouped
// primitives or merged; textures are CanvasTextures (no GLB).

import * as THREE from "three";
import type { Place } from "../data/places";
import { hexToInt } from "../lib/format";
import {
  makeBuildingFace,
  makeZincTexture,
  makePlazaTexture,
  makeGrassTexture,
  makeAnkaraTexture,
  cached,
} from "./textures";

// ============================================================
// SHARED MATERIAL CACHE (avoid creating materials per place)
// ============================================================
const matCache = new Map<string, THREE.Material>();
export function stdMat(color: string | number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial {
  const key = `std:${color}:${JSON.stringify(opts)}`;
  if (matCache.has(key)) return matCache.get(key) as THREE.MeshStandardMaterial;
  const m = new THREE.MeshStandardMaterial({ color: typeof color === "string" ? hexToInt(color) : color, roughness: 0.85, ...opts });
  matCache.set(key, m);
  return m;
}

// ============================================================
// PLACE BUILDERS — each returns a Group with the silhouette
// ============================================================

export function buildPlace(p: Place): THREE.Group {
  const g = new THREE.Group();
  const [x, z] = p.pos;
  g.position.set(x, 0, z);
  const baseHex = p.color;
  const accentHex = p.accent;

  switch (p.id) {
    case "wuse-market":      buildWuseMarket(g, baseHex, accentHex); break;
    case "area1":            buildArea1(g, baseHex, accentHex); break;
    case "garki-market":     buildGarkiMarket(g, baseHex, accentHex); break;
    case "maitama":          buildMaitama(g, baseHex, accentHex); break;
    case "berger":           buildBerger(g, baseHex, accentHex); break;
    case "jabi":             buildJabi(g, baseHex, accentHex); break;
    case "millennium":       buildMillennium(g, baseHex, accentHex); break;
    case "transcorp":        buildTranscorp(g, baseHex, accentHex); break;
    case "magicland":        buildMagicland(g, baseHex, accentHex); break;
    case "home":             buildHome(g, baseHex, accentHex); break;
    case "unity":            buildUnity(g, baseHex, accentHex); break;
    case "national-mosque":  buildNationalMosque(g, baseHex, accentHex); break;
    case "aso-rock":         buildAsoRock(g, baseHex, accentHex); break;
    case "night-market":     buildNightMarket(g, baseHex, accentHex); break;
    case "city-gate":        buildCityGate(g, baseHex, accentHex); break;
    case "national-assembly":buildNationalAssembly(g, baseHex, accentHex); break;
    default:                 buildDefault(g, baseHex, accentHex);
  }

  // Floating marker ring (tap target) — shared by all places
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.0, 2.3, 24),
    new THREE.MeshBasicMaterial({ color: hexToInt(baseHex), side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.06;
  ring.userData.isMarker = true;
  g.add(ring);

  // Pulsing pin (vertical pole + sphere on top)
  const pinGroup = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 2.5, 6),
    new THREE.MeshBasicMaterial({ color: hexToInt(baseHex), transparent: true, opacity: 0.8 })
  );
  pole.position.y = 1.25;
  pinGroup.add(pole);
  const pinBall = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 12, 8),
    new THREE.MeshStandardMaterial({ color: hexToInt(accentHex), emissive: hexToInt(baseHex), emissiveIntensity: 0.4 })
  );
  pinBall.position.y = 2.6;
  pinGroup.add(pinBall);
  pinGroup.userData.isPin = true;
  g.add(pinGroup);

  return g;
}

// ============================================================
// INDIVIDUAL BUILDERS
// ============================================================

function buildWuseMarket(g: THREE.Group, base: string, accent: string) {
  // Stalls (zinc roofs + open fronts + colourful umbrellas)
  const stallMat = stdMat("#b08968");
  const zincMat = new THREE.MeshStandardMaterial({ map: cached("zinc1", () => makeZincTexture("#9ca3af")), roughness: 0.9 });
  for (let i = 0; i < 6; i++) {
    const stall = new THREE.Group();
    // Posts
    const postMat = stdMat("#3a2a1a");
    for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.2, 0.15), postMat);
      post.position.set(px, 1.1, pz);
      stall.add(post);
    }
    // Zinc roof (slanted)
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 2.4), zincMat);
    roof.position.y = 2.2;
    roof.rotation.z = 0.08;
    stall.add(roof);
    // Counter (front)
    const counter = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.6, 0.3), stallMat);
    counter.position.set(0, 0.8, 1.05);
    stall.add(counter);
    // Umbrella (colourful)
    const umbColor = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6"][i % 4];
    const umb = new THREE.Mesh(
      new THREE.ConeGeometry(1.0, 0.5, 8),
      new THREE.MeshStandardMaterial({ color: hexToInt(umbColor), roughness: 0.7 })
    );
    umb.position.set(0, 2.8, 0);
    stall.add(umb);
    // Position in a 2x3 grid
    stall.position.set((i % 3 - 1) * 3.2 - 1, 0, Math.floor(i / 3) * 3.2 - 1.5);
    g.add(stall);
  }
  // Crates scattered
  const crateMat = stdMat("#8b6f47");
  for (let i = 0; i < 4; i++) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), crateMat);
    crate.position.set((Math.random() - 0.5) * 6, 0.35, (Math.random() - 0.5) * 6);
    crate.rotation.y = Math.random() * Math.PI;
    g.add(crate);
  }
}

function buildArea1(g: THREE.Group, base: string, accent: string) {
  // Roundabout with taxis
  const roundabout = new THREE.Mesh(
    new THREE.CylinderGeometry(2, 2, 0.3, 16),
    stdMat("#4a4a4a")
  );
  roundabout.position.y = 0.15;
  g.add(roundabout);
  // Center planter
  const planter = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 1.0, 1.0, 8),
    stdMat("#6b4423")
  );
  planter.position.y = 0.8;
  g.add(planter);
  // Palm on top
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.2, 2.0, 6),
    stdMat("#6b4423")
  );
  trunk.position.y = 2.3;
  g.add(trunk);
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.05, 0.3),
      stdMat("#22c55e")
    );
    leaf.position.y = 3.3;
    leaf.rotation.y = (i / 6) * Math.PI * 2;
    leaf.position.x = Math.cos((i / 6) * Math.PI * 2) * 0.6;
    leaf.position.z = Math.sin((i / 6) * Math.PI * 2) * 0.6;
    leaf.rotation.z = 0.5;
    g.add(leaf);
  }
  // Taxis (green-and-white) parked around
  const taxiMat = stdMat("#22c55e");
  const taxiRoofMat = stdMat("#ffffff");
  for (let i = 0; i < 3; i++) {
    const taxi = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 0.7), taxiMat);
    body.position.y = 0.5;
    taxi.add(body);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.6), taxiRoofMat);
    roof.position.y = 1.0;
    taxi.add(roof);
    const angle = (i / 3) * Math.PI * 2;
    taxi.position.set(Math.cos(angle) * 4, 0, Math.sin(angle) * 4);
    taxi.rotation.y = -angle + Math.PI / 2;
    g.add(taxi);
  }
}

function buildGarkiMarket(g: THREE.Group, base: string, accent: string) {
  // Modern market — enclosed building with AC, signboard, glass front
  const faceTex = makeBuildingFace({ baseColor: "#e5e7eb", rows: 2, cols: 4, awningColor: "#22c55e", signText: "GARKI MODERN MARKET", signColor: "#0a4a2a", hasAC: true });
  const bldgMat = new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.85 });
  const bldg = new THREE.Mesh(new THREE.BoxGeometry(5, 3.5, 4), bldgMat);
  bldg.position.y = 1.75;
  bldg.castShadow = true;
  bldg.receiveShadow = true;
  g.add(bldg);
  // Glass entrance
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(2, 2, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x6cb4ee, metalness: 0.3, roughness: 0.1, transparent: true, opacity: 0.7 })
  );
  glass.position.set(0, 1.0, 2.05);
  g.add(glass);
  // AC units on side
  const acMat = stdMat("#7a7a7a");
  for (let i = 0; i < 2; i++) {
    const ac = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.5), acMat);
    ac.position.set(2.55, 2.5 + i * 0.5, 0);
    g.add(ac);
  }
}

function buildMaitama(g: THREE.Group, base: string, accent: string) {
  // Mansions with gates + palms
  for (let i = 0; i < 2; i++) {
    const mansion = new THREE.Group();
    const faceTex = makeBuildingFace({ baseColor: i ? "#fef3c7" : "#fee2e2", rows: 3, cols: 3, awningColor: "#0a4a2a", withDoor: true });
    const wallMat = new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.8 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(3.5, 4, 3), wallMat);
    b.position.y = 2;
    b.castShadow = true;
    mansion.add(b);
    // Gate (black iron)
    const gate = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 1.5, 0.1),
      stdMat("#1a1a1a")
    );
    gate.position.set(0, 0.75, 1.55);
    mansion.add(gate);
    // Gate posts
    for (const px of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2, 0.2), stdMat("#fafafa"));
      post.position.set(px * 0.85, 1, 1.55);
      mansion.add(post);
    }
    // Palm
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 3, 6), stdMat("#6b4423"));
    trunk.position.set(2, 1.5, 0);
    mansion.add(trunk);
    for (let k = 0; k < 5; k++) {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(1, 0.05, 0.25), stdMat("#22c55e"));
      leaf.position.set(2, 3, 0);
      leaf.rotation.y = (k / 5) * Math.PI * 2;
      leaf.position.x += Math.cos((k / 5) * Math.PI * 2) * 0.5;
      leaf.position.z += Math.sin((k / 5) * Math.PI * 2) * 0.5;
      leaf.rotation.z = 0.5;
      mansion.add(leaf);
    }
    mansion.position.set(i ? 3 : -3, 0, 0);
    g.add(mansion);
  }
}

function buildBerger(g: THREE.Group, base: string, accent: string) {
  // Flyover (elevated road) over a junction
  const flyover = new THREE.Mesh(
    new THREE.BoxGeometry(10, 0.4, 2.5),
    stdMat("#6b7280")
  );
  flyover.position.y = 3;
  flyover.castShadow = true;
  g.add(flyover);
  // Pillars
  const pillarMat = stdMat("#9ca3af");
  for (const px of [-3, 0, 3]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3, 0.5), pillarMat);
    pillar.position.set(px, 1.5, 0);
    g.add(pillar);
  }
  // Danfo buses parked below
  for (let i = 0; i < 2; i++) {
    const danfo = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 0.8), stdMat("#fbbf24"));
    body.position.y = 0.5;
    danfo.add(body);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.81, 0.15, 0.81), stdMat("#0a0a0a"));
    stripe.position.y = 0.6;
    danfo.add(stripe);
    danfo.position.set((i ? 1 : -1) * 2, 0, 1.5);
    g.add(danfo);
  }
}

function buildJabi(g: THREE.Group, base: string, accent: string) {
  // Shimmering water plane + boat
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x4a90c2,
    metalness: 0.7,
    roughness: 0.2,
    transparent: true,
    opacity: 0.85,
  });
  const water = new THREE.Mesh(new THREE.CircleGeometry(5, 32), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.05;
  g.add(water);
  // Boat
  const boat = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.4, 0.6), stdMat("#8b4513"));
  hull.position.y = 0.3;
  boat.add(hull);
  // Boat canopy
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 0.5), stdMat("#dc2626"));
  canopy.position.y = 0.7;
  boat.add(canopy);
  boat.position.set(1.5, 0.15, 0.5);
  boat.rotation.y = 0.5;
  g.add(boat);
  // Palm trees
  for (const [px, pz] of [[-3, -3], [3, -3]] as const) {
    buildPalm(g, px, pz);
  }
}

function buildMillennium(g: THREE.Group, base: string, accent: string) {
  // Fountains + gardens
  const fountainBase = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 1.8, 0.4, 16),
    stdMat("#9ca3af")
  );
  fountainBase.position.y = 0.2;
  g.add(fountainBase);
  // Water in basin
  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(1.4, 1.4, 0.1, 16),
    new THREE.MeshStandardMaterial({ color: 0x4a90c2, metalness: 0.6, roughness: 0.2, transparent: true, opacity: 0.8 })
  );
  water.position.y = 0.4;
  g.add(water);
  // Center spout
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.5, 8), stdMat("#9ca3af"));
  spout.position.y = 0.95;
  g.add(spout);
  // Particle water (cone of "spray")
  const spray = new THREE.Mesh(
    new THREE.ConeGeometry(0.5, 1.5, 8, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xa5d8ff, transparent: true, opacity: 0.4, side: THREE.DoubleSide })
  );
  spray.position.y = 2.0;
  spray.userData.isSpray = true;
  g.add(spray);
  // Garden plots (Ankara-patterned flower beds)
  for (const [px, pz] of [[-3, 2], [3, 2], [-3, -3], [3, -3]] as const) {
    const bed = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.2, 1.5),
      new THREE.MeshStandardMaterial({ map: cached("ankara", () => makeAnkaraTexture()), roughness: 0.95 })
    );
    bed.position.set(px, 0.1, pz);
    g.add(bed);
  }
}

function buildTranscorp(g: THREE.Group, base: string, accent: string) {
  // Tall tower with lit crown
  const faceTex = makeBuildingFace({ baseColor: "#dbeafe", rows: 8, cols: 4 });
  const wallMat = new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.6, metalness: 0.2 });
  const tower = new THREE.Mesh(new THREE.BoxGeometry(3, 12, 3), wallMat);
  tower.position.y = 6;
  tower.castShadow = true;
  g.add(tower);
  // Lit crown (top)
  const crown = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 1.5, 3.4),
    new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 1.5 })
  );
  crown.position.y = 12.5;
  crown.userData.isLit = true;
  g.add(crown);
  // Antenna
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2, 6), stdMat("#9ca3af"));
  antenna.position.y = 14;
  g.add(antenna);
  // Red beacon on top
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1.5 })
  );
  beacon.position.y = 15.2;
  beacon.userData.isBeacon = true;
  g.add(beacon);
}

function buildMagicland(g: THREE.Group, base: string, accent: string) {
  // Rotating Ferris wheel
  const wheelGroup = new THREE.Group();
  // Wheel rim
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(2.5, 0.1, 8, 24),
    stdMat("#dc2626")
  );
  rim.rotation.y = Math.PI / 2;
  rim.position.y = 3;
  wheelGroup.add(rim);
  // Spokes
  for (let i = 0; i < 8; i++) {
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 5, 0.05),
      stdMat("#fbbf24")
    );
    spoke.position.y = 3;
    spoke.rotation.z = (i / 8) * Math.PI * 2;
    wheelGroup.add(spoke);
  }
  // Cabins
  for (let i = 0; i < 8; i++) {
    const cab = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 8, 6),
      stdMat(["#ef4444", "#f59e0b", "#22c55e", "#3b82f6"][i % 4])
    );
    const angle = (i / 8) * Math.PI * 2;
    cab.position.set(0, 3 + Math.cos(angle) * 2.5, Math.sin(angle) * 2.5);
    wheelGroup.add(cab);
  }
  // Support
  const support = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3, 0.3), stdMat("#4a4a4a"));
  support.position.y = 1.5;
  wheelGroup.add(support);
  wheelGroup.userData.isFerris = true;
  g.add(wheelGroup);
}

function buildHome(g: THREE.Group, base: string, accent: string) {
  // Small compound with gate
  const faceTex = makeBuildingFace({ baseColor: "#fef3c7", rows: 1, cols: 2, withDoor: true });
  const wallMat = new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.85 });
  const bldg = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.5, 3), wallMat);
  bldg.position.y = 1.25;
  bldg.castShadow = true;
  g.add(bldg);
  // Zinc roof (slanted)
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(2.8, 1.0, 4),
    new THREE.MeshStandardMaterial({ map: cached("zinc2", () => makeZincTexture("#6b7280")), roughness: 0.9 })
  );
  roof.position.y = 3.0;
  roof.rotation.y = Math.PI / 4;
  g.add(roof);
  // Compound wall (front)
  const wallMat2 = stdMat("#d4d4d4");
  for (const px of [-2, 2]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2, 0.5), wallMat2);
    wall.position.set(px, 0.6, 1.5);
    g.add(wall);
  }
  // Gate
  const gate = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, 0.05), stdMat("#1a1a1a"));
  gate.position.set(0, 0.6, 1.55);
  g.add(gate);
}

function buildUnity(g: THREE.Group, base: string, accent: string) {
  // Iconic roundabout fountain
  const basin = new THREE.Mesh(
    new THREE.CylinderGeometry(2, 2.3, 0.5, 24),
    stdMat("#9ca3af")
  );
  basin.position.y = 0.25;
  g.add(basin);
  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(1.9, 1.9, 0.15, 24),
    new THREE.MeshStandardMaterial({ color: 0x4a90c2, metalness: 0.7, roughness: 0.15, transparent: true, opacity: 0.8 })
  );
  water.position.y = 0.45;
  g.add(water);
  // Central column
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 2.5, 12), stdMat("#fbbf24"));
  col.position.y = 1.45;
  g.add(col);
  // Top spray
  const spray = new THREE.Mesh(
    new THREE.ConeGeometry(0.6, 2, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xa5d8ff, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
  );
  spray.position.y = 3;
  spray.userData.isSpray = true;
  g.add(spray);
}

function buildNationalMosque(g: THREE.Group, base: string, accent: string) {
  // Golden dome + minarets
  // Base building (square)
  const baseB = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 4), stdMat("#fef3c7"));
  baseB.position.y = 1.5;
  baseB.castShadow = true;
  g.add(baseB);
  // Dome (golden, hemisphere)
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1.8, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
    new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.6, roughness: 0.3, emissive: 0xfbbf24, emissiveIntensity: 0.15 })
  );
  dome.position.y = 3;
  g.add(dome);
  // Crescent on top
  const crescent = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), stdMat("#fbbf24"));
  crescent.position.y = 4.8;
  g.add(crescent);
  // 4 minarets (corners)
  for (const [mx, mz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]] as const) {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 5, 8), stdMat("#fef3c7"));
    tower.position.set(mx, 2.5, mz);
    tower.castShadow = true;
    g.add(tower);
    // Cap
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.8, 8), new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.5, roughness: 0.4 }));
    cap.position.set(mx, 5.4, mz);
    g.add(cap);
  }
}

function buildAsoRock(g: THREE.Group, base: string, accent: string) {
  // Massive rock mass (cone)
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.95, flatShading: true });
  const rock1 = new THREE.Mesh(new THREE.ConeGeometry(6, 8, 5), rockMat);
  rock1.position.set(0, 4, 0);
  rock1.rotation.y = 0.3;
  rock1.castShadow = true;
  g.add(rock1);
  // Smaller rock beside
  const rock2 = new THREE.Mesh(new THREE.ConeGeometry(3, 5, 5), rockMat);
  rock2.position.set(-3, 2.5, 1);
  rock2.rotation.y = 0.7;
  g.add(rock2);
  // Greenery at base
  for (let i = 0; i < 5; i++) {
    const bush = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), stdMat("#22c55e"));
    bush.position.set((Math.random() - 0.5) * 8, 0.3, (Math.random() - 0.5) * 6);
    g.add(bush);
  }
}

function buildNightMarket(g: THREE.Group, base: string, accent: string) {
  // String lights + food carts
  // Food carts
  for (let i = 0; i < 4; i++) {
    const cart = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.8, 0.8), stdMat("#8b4513"));
    body.position.y = 0.6;
    cart.add(body);
    // Awning
    const aw = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.9), stdMat(["#ef4444", "#f59e0b", "#22c55e", "#3b82f6"][i]));
    aw.position.y = 1.1;
    cart.add(aw);
    cart.position.set((i % 2 ? 1 : -1) * 2, 0, Math.floor(i / 2) * 2 - 1);
    g.add(cart);
  }
  // String lights (vertical poles with light bulbs)
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 1.5 });
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const r = 3;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.5, 6), stdMat("#3a3a3a"));
    pole.position.set(Math.cos(angle) * r, 1.25, Math.sin(angle) * r);
    g.add(pole);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), bulbMat);
    bulb.position.set(Math.cos(angle) * r, 2.5, Math.sin(angle) * r);
    bulb.userData.isLit = true;
    g.add(bulb);
  }
}

function buildCityGate(g: THREE.Group, base: string, accent: string) {
  // Three-arch gate
  const pillarMat = stdMat("#d4d4d4");
  // Two side pillars
  for (const px of [-2, 2]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(1, 4, 1), pillarMat);
    pillar.position.set(px, 2, 0);
    pillar.castShadow = true;
    g.add(pillar);
  }
  // Top beam (with coat of arms placeholder)
  const beam = new THREE.Mesh(new THREE.BoxGeometry(5, 1, 0.8), pillarMat);
  beam.position.set(0, 4.5, 0);
  g.add(beam);
  // Center arch (curved)
  const arch = new THREE.Mesh(
    new THREE.TorusGeometry(1.5, 0.3, 6, 12, Math.PI),
    pillarMat
  );
  arch.position.set(0, 3, 0);
  arch.rotation.y = Math.PI / 2;
  g.add(arch);
  // Nigerian flag (green-white-green) on top
  for (const [fx, fc] of [[-0.5, "#0a6c3a"], [0, "#fafafa"], [0.5, "#0a6c3a"]] as const) {
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.05), stdMat(fc));
    flag.position.set(fx, 5.5, 0);
    g.add(flag);
  }
}

function buildNationalAssembly(g: THREE.Group, base: string, accent: string) {
  // Domed hall
  const baseB = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.2, 2.5, 16), stdMat("#fef3c7"));
  baseB.position.y = 1.25;
  baseB.castShadow = true;
  g.add(baseB);
  // Dome
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(2.5, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
    new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.5, roughness: 0.4 })
  );
  dome.position.y = 2.5;
  g.add(dome);
  // Columns around base
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 2.5, 8), stdMat("#fafafa"));
    col.position.set(Math.cos(angle) * 3.3, 1.25, Math.sin(angle) * 3.3);
    g.add(col);
  }
}

function buildDefault(g: THREE.Group, base: string, accent: string) {
  // Fallback: simple building
  const b = new THREE.Mesh(
    new THREE.BoxGeometry(3, 3, 3),
    stdMat(base)
  );
  b.position.y = 1.5;
  b.castShadow = true;
  g.add(b);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.2, 4), stdMat(accent));
  roof.position.y = 3.6;
  roof.rotation.y = Math.PI / 4;
  g.add(roof);
}

// ============================================================
// HELPERS
// ============================================================

function buildPalm(parent: THREE.Group, x: number, z: number) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 3, 6), stdMat("#6b4423"));
  trunk.position.set(x, 1.5, z);
  parent.add(trunk);
  for (let k = 0; k < 5; k++) {
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(1, 0.05, 0.25), stdMat("#22c55e"));
    leaf.position.set(x, 3, z);
    leaf.rotation.y = (k / 5) * Math.PI * 2;
    leaf.position.x += Math.cos((k / 5) * Math.PI * 2) * 0.5;
    leaf.position.z += Math.sin((k / 5) * Math.PI * 2) * 0.5;
    leaf.rotation.z = 0.5;
    parent.add(leaf);
  }
}
