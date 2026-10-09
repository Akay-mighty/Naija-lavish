// Interior scene builders for NaijaLavish.
// Two interiors: HOME (self-con room) and OWAMBE HALL (party venue).
// Cutaway isometric: two near walls lowered/transparent, tiled floors, warm lamp light.

import * as THREE from "three";
import { stdMat } from "./city";
import { cached, makeAnkaraTexture, makePlazaTexture } from "./textures";

// ============================================================
// HOME — Abuja self-con room
// ============================================================

export function buildHomeInterior(): THREE.Group {
  const g = new THREE.Group();
  const floorTex = cached("plaza", () => makePlazaTexture());
  const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.85 });

  // Floor (tiled)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = true;
  g.add(floor);

  // Back wall + left wall (cutaway — lowered height, transparent top)
  const wallMat = stdMat("#f5f0e8");
  const wallH = 3.0;
  // Back wall
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(8, wallH, 0.2), wallMat);
  backWall.position.set(0, wallH / 2, -4);
  backWall.castShadow = true;
  backWall.receiveShadow = true;
  g.add(backWall);
  // Left wall
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, wallH, 8), wallMat);
  leftWall.position.set(-4, wallH / 2, 0);
  leftWall.castShadow = true;
  leftWall.receiveShadow = true;
  g.add(leftWall);

  // ---- Furniture ----

  // Bed with Ankara sheet
  const bedGroup = new THREE.Group();
  const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.4, 1.5), stdMat("#8b6f47"));
  bedFrame.position.set(-2, 0.2, -2.5);
  bedFrame.castShadow = true;
  bedGroup.add(bedFrame);
  // Mattress
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.2, 1.4), stdMat("#fafafa"));
  mattress.position.set(-2, 0.5, -2.5);
  bedGroup.add(mattress);
  // Ankara sheet
  const sheet = new THREE.Mesh(
    new THREE.BoxGeometry(2.3, 0.05, 1.4),
    new THREE.MeshStandardMaterial({ map: cached("ankara", () => makeAnkaraTexture()), roughness: 0.95 })
  );
  sheet.position.set(-2, 0.62, -2.5);
  bedGroup.add(sheet);
  // Pillow
  const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.4), stdMat("#ffffff"));
  pillow.position.set(-2.8, 0.65, -2.5);
  bedGroup.add(pillow);
  g.add(bedGroup);

  // Wardrobe
  const wardrobe = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.6), stdMat("#6b4423"));
  wardrobe.position.set(3, 1.1, -3.5);
  wardrobe.castShadow = true;
  g.add(wardrobe);
  // Wardrobe doors (lines)
  const doorLine = new THREE.Mesh(new THREE.BoxGeometry(0.02, 2, 0.02), stdMat("#3a2a1a"));
  doorLine.position.set(3, 1.1, -3.19);
  g.add(doorLine);
  // Handles
  for (const hx of [-0.2, 0.2]) {
    const handle = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), stdMat("#fbbf24"));
    handle.position.set(3 + hx, 1.1, -3.19);
    g.add(handle);
  }

  // TV (animated screen at night)
  const tvGroup = new THREE.Group();
  const tvBody = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.6, 0.1), stdMat("#1a1a1a"));
  tvBody.position.set(2.5, 1.5, -3.95);
  tvGroup.add(tvBody);
  // Screen (emissive)
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.85, 0.48),
    new THREE.MeshStandardMaterial({ color: 0x1a3a5c, emissive: 0x4a90c2, emissiveIntensity: 0.3 })
  );
  screen.position.set(2.5, 1.5, -3.89);
  screen.userData.isTVScreen = true;
  tvGroup.add(screen);
  // TV stand
  const stand = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.5), stdMat("#3a2a1a"));
  stand.position.set(2.5, 0.4, -3.85);
  tvGroup.add(stand);
  g.add(tvGroup);

  // Rotating standing fan
  const fanGroup = new THREE.Group();
  const fanPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 6), stdMat("#9ca3af"));
  fanPole.position.set(3.5, 0.75, 2);
  fanGroup.add(fanPole);
  const fanHead = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 12), stdMat("#d4d4d4"));
  fanHead.position.set(3.5, 1.5, 2);
  fanHead.rotation.x = Math.PI / 2;
  fanGroup.add(fanHead);
  // Fan blades
  const blades = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.02, 0.08), stdMat("#9ca3af"));
    blade.rotation.z = (i / 3) * Math.PI * 2;
    blade.position.set(3.5 + Math.cos((i / 3) * Math.PI * 2) * 0.15, 1.5, 2);
    blades.add(blade);
  }
  blades.userData.isFanBlades = true;
  fanGroup.add(blades);
  g.add(fanGroup);

  // Window with burglar bars (casting striped light)
  const windowFrame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, 0.1), stdMat("#3a2a1a"));
  windowFrame.position.set(-3.95, 1.8, 1);
  g.add(windowFrame);
  // Window glass
  const windowGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 1.0),
    new THREE.MeshStandardMaterial({ color: 0x6cb4ee, transparent: true, opacity: 0.4 })
  );
  windowGlass.position.set(-3.9, 1.8, 1.05);
  windowGlass.rotation.y = Math.PI / 2;
  g.add(windowGlass);
  // Burglar bars
  for (let i = 0; i < 3; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.0, 0.03), stdMat("#3a3a3a"));
    bar.position.set(-3.88, 1.8, 0.5 + i * 0.5);
    g.add(bar);
  }

  // Rug (Ankara pattern)
  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.MeshStandardMaterial({ map: cached("ankara2", () => makeAnkaraTexture(["#dc2626", "#fbbf24", "#0a4a2a"])), roughness: 0.95 })
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0.5, 0.01, 0.5);
  g.add(rug);

  // Bucket + stool
  const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 0.5, 8), stdMat("#3b82f6"));
  bucket.position.set(-2, 0.25, 1.5);
  g.add(bucket);
  const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.4, 8), stdMat("#8b6f47"));
  stool.position.set(-1, 0.2, 2);
  g.add(stool);

  // Bag of pure-water sachets
  const sachetBag = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.3), stdMat("#e0f2fe"));
  sachetBag.position.set(2, 0.15, 2.5);
  g.add(sachetBag);

  // Wall calendar
  const calendar = new THREE.Mesh(
    new THREE.PlaneGeometry(0.4, 0.5),
    new THREE.MeshStandardMaterial({ color: 0xffffff })
  );
  calendar.position.set(0.5, 2.5, -3.95);
  g.add(calendar);

  // NEPA bulb (flickering)
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0xfde68a, emissive: 0xfde68a, emissiveIntensity: 0.8 })
  );
  bulb.position.set(0, 2.9, 0);
  bulb.userData.isNepaBulb = true;
  g.add(bulb);
  // Bulb cord
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.3, 4), stdMat("#3a3a3a"));
  cord.position.set(0, 2.95, 0);
  g.add(cord);

  // Generator outside (visible through cutaway)
  const genGroup = new THREE.Group();
  const genBody = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.4), stdMat("#f59e0b"));
  genBody.position.set(3.8, 0.25, 3.5);
  genGroup.add(genBody);
  // Gen handle
  const genHandle = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.03, 4, 8), stdMat("#1a1a1a"));
  genHandle.position.set(3.8, 0.55, 3.5);
  genHandle.rotation.x = Math.PI / 2;
  genGroup.add(genHandle);
  g.add(genGroup);

  return g;
}

// ============================================================
// OWAMBE HALL — party venue
// ============================================================

export function buildOwambeInterior(): THREE.Group {
  const g = new THREE.Group();
  const floorTex = cached("plaza", () => makePlazaTexture());
  const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.85 });

  // Floor (dance floor tiles)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  g.add(floor);

  // Dance floor (pulsing colour tiles)
  const danceFloor = new THREE.Group();
  const danceColors = [0xef4444, 0xf59e0b, 0x22c55e, 0x3b82f6, 0xa855f7, 0xec4899];
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      const tile = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.05, 0.8),
        new THREE.MeshStandardMaterial({
          color: danceColors[(i + j) % danceColors.length],
          emissive: danceColors[(i + j) % danceColors.length],
          emissiveIntensity: 0.3,
        })
      );
      tile.position.set(-2.4 + i * 0.85, 0.03, -0.4 + j * 0.85);
      tile.userData.isDanceTile = true;
      danceFloor.add(tile);
    }
  }
  g.add(danceFloor);

  // Stage with thrones
  const stageGroup = new THREE.Group();
  const stage = new THREE.Mesh(new THREE.BoxGeometry(4, 0.5, 2), stdMat("#6b4423"));
  stage.position.set(0, 0.25, -4.5);
  stage.castShadow = true;
  stageGroup.add(stage);
  // Two thrones
  for (const tx of [-1, 1]) {
    const throne = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.8), stdMat("#fbbf24"));
    throne.position.set(tx, 1.1, -4.5);
    throne.castShadow = true;
    stageGroup.add(throne);
  }
  g.add(stageGroup);

  // DJ booth with animated equaliser
  const djGroup = new THREE.Group();
  const djBooth = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.0, 0.8), stdMat("#1a1a1a"));
  djBooth.position.set(4, 0.5, -3);
  djGroup.add(djBooth);
  // Equaliser bars (animated)
  const eqGroup = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.3, 0.05),
      new THREE.MeshStandardMaterial({
        color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.5,
      })
    );
    bar.position.set(3.4 + i * 0.16, 1.2, -2.6);
    bar.userData.isEqBar = true;
    bar.userData.eqIndex = i;
    eqGroup.add(bar);
  }
  djGroup.add(eqGroup);
  g.add(djGroup);

  // Round tables with aso-ebi chair covers
  for (const [tx, tz] of [[-3, 2], [3, 2], [-3, -1], [3, -1]] as const) {
    const table = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.1, 12), stdMat("#fafafa"));
    table.position.set(tx, 0.7, tz);
    g.add(table);
    // Table leg
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.7, 6), stdMat("#9ca3af"));
    leg.position.set(tx, 0.35, tz);
    g.add(leg);
    // Aso-ebi chair covers (4 chairs per table)
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2;
      const chair = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.4), stdMat("#a855f7"));
      chair.position.set(tx + Math.cos(ang) * 1.0, 0.25, tz + Math.sin(ang) * 1.0);
      g.add(chair);
    }
  }

  // Jollof and small-chops table
  const foodTable = new THREE.Mesh(new THREE.BoxGeometry(2, 0.08, 0.8), stdMat("#fafafa"));
  foodTable.position.set(0, 0.7, 3.5);
  g.add(foodTable);
  // Food bowls
  for (let i = 0; i < 3; i++) {
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.15, 8), stdMat(i === 0 ? "#f59e0b" : "#ef4444"));
    bowl.position.set(-0.6 + i * 0.6, 0.82, 3.5);
    g.add(bowl);
  }

  // Balloon arch (entrance)
  const balloonGroup = new THREE.Group();
  for (let i = 0; i < 12; i++) {
    const balloon = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 8, 6),
      new THREE.MeshStandardMaterial({
        color: [0xef4444, 0xfbbf24, 0x22c55e, 0x3b82f6][i % 4],
        emissive: [0xef4444, 0xfbbf24, 0x22c55e, 0x3b82f6][i % 4],
        emissiveIntensity: 0.2,
      })
    );
    const ang = (i / 12) * Math.PI;
    balloon.position.set(-2 + Math.cos(ang) * 2, 1 + Math.sin(ang) * 1.5, 5);
    balloonGroup.add(balloon);
  }
  g.add(balloonGroup);

  // Red carpet (entrance to dance floor)
  const carpet = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 4),
    new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.9 })
  );
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.set(0, 0.02, 3);
  g.add(carpet);

  // Spotlights (4 coloured)
  for (let i = 0; i < 4; i++) {
    const spot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.3, 0.4, 6),
      new THREE.MeshStandardMaterial({
        color: [0xef4444, 0xfbbf24, 0x22c55e, 0x3b82f6][i],
        emissive: [0xef4444, 0xfbbf24, 0x22c55e, 0x3b82f6][i],
        emissiveIntensity: 0.8,
      })
    );
    spot.position.set(-3 + i * 2, 3.5, -2);
    spot.userData.isSpotlight = true;
    g.add(spot);
  }

  return g;
}

// ============================================================
// SPRAY EFFECT — naira notes raining down (instanced)
// ============================================================

export interface SprayEffect {
  group: THREE.Group;
  update: (dt: number, t: number) => void;
  trigger: (amount: number) => void;
  dispose: () => void;
}

export function createSprayEffect(): SprayEffect {
  const group = new THREE.Group();
  const MAX_NOTES = 80;
  const noteGeo = new THREE.PlaneGeometry(0.3, 0.15);
  const noteMat = new THREE.MeshStandardMaterial({
    color: 0x00875a,
    emissive: 0x00875a,
    emissiveIntensity: 0.2,
    side: THREE.DoubleSide,
  });
  const notes: Array<{ mesh: THREE.Mesh; vx: number; vy: number; vz: number; life: number; maxLife: number }> = [];

  // Pre-create the note meshes (hidden by default)
  for (let i = 0; i < MAX_NOTES; i++) {
    const m = new THREE.Mesh(noteGeo, noteMat);
    m.visible = false;
    m.rotation.x = Math.PI / 2;
    group.add(m);
    notes.push({ mesh: m, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 0 });
  }

  let nextNote = 0;

  function trigger(amount: number) {
    const count = Math.min(MAX_NOTES, Math.floor(amount / 100) + 10);
    for (let i = 0; i < count; i++) {
      const n = notes[nextNote];
      nextNote = (nextNote + 1) % MAX_NOTES;
      n.mesh.visible = true;
      n.mesh.position.set(
        (Math.random() - 0.5) * 3,
        4 + Math.random() * 2,
        (Math.random() - 0.5) * 3
      );
      n.vx = (Math.random() - 0.5) * 2;
      n.vy = -2 - Math.random() * 2;
      n.vz = (Math.random() - 0.5) * 2;
      n.life = 0;
      n.maxLife = 2 + Math.random() * 1.5;
      // Some notes are gold (for big sprays)
      if (amount >= 5000 && Math.random() < 0.3) {
        (n.mesh.material as THREE.MeshStandardMaterial).color.set(0xfbbf24);
        (n.mesh.material as THREE.MeshStandardMaterial).emissive.set(0xfbbf24);
      } else {
        (n.mesh.material as THREE.MeshStandardMaterial).color.set(0x00875a);
        (n.mesh.material as THREE.MeshStandardMaterial).emissive.set(0x00875a);
      }
    }
  }

  function update(dt: number, _t: number) {
    for (const n of notes) {
      if (!n.mesh.visible) continue;
      n.life += dt;
      if (n.life > n.maxLife || n.mesh.position.y < 0) {
        n.mesh.visible = false;
        continue;
      }
      n.mesh.position.x += n.vx * dt;
      n.mesh.position.y += n.vy * dt;
      n.mesh.position.z += n.vz * dt;
      n.vy += 5 * dt; // gravity (positive = downward in our setup)
      n.mesh.rotation.z += dt * 3;
      n.mesh.rotation.y += dt * 2;
    }
  }

  function dispose() {
    noteGeo.dispose();
    noteMat.dispose();
  }

  return { group, update, trigger, dispose };
}
