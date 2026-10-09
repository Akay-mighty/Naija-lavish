'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * A small low-poly Abuja you can walk around in.
 *
 * - Everything is built from boxes, cylinders and spheres. No model files.
 * - Flat colours on Lambert materials, one sun with shadows, sky-coloured fog.
 * - Crowds, traffic, trees and buildings are InstancedMesh, so the draw call count stays low.
 * - Narrow-FOV follow camera for the "toy city" look.
 * - Move with WASD / arrow keys, or the on-screen stick on touch devices.
 */

type Props = {
  className?: string;
  /** Switch rain on or off while the scene is running. */
  rain?: boolean;
  /** Called once, after the first frame is drawn. */
  onReady?: () => void;
};

const PITCH = 36; // distance between road centre lines
const ROAD_W = 9;
const SIDEWALK_W = 13.4;
const GRID = 4; // roads run from -GRID to +GRID on both axes
const EDGE = GRID * PITCH + 24; // the walkable world is +/- EDGE

type Box = { minX: number; maxX: number; minZ: number; maxZ: number };

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(r: () => number, list: T[]): T {
  return list[Math.floor(r() * list.length)];
}

/** Text that always faces the camera. */
function makeLabel(text: string, textures: THREE.Texture[]) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = 'rgba(250,244,230,0.95)';
  g.beginPath();
  if (typeof g.roundRect === 'function') g.roundRect(8, 16, 496, 96, 28);
  else g.rect(8, 16, 496, 96);
  g.fill();
  g.fillStyle = '#1B2A22';
  g.font = '700 46px system-ui, -apple-system, "Segoe UI", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, 66);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  textures.push(tex);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })
  );
  sprite.scale.set(16, 4, 1);
  return sprite;
}

export default function AbujaCityScene({ className, rain = false, onReady }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const rainRef = useRef(rain);
  const readyRef = useRef(onReady);
  const joyRef = useRef({ x: 0, z: 0 });
  const movedRef = useRef(false);
  const [failed, setFailed] = useState(false);
  const [touch, setTouch] = useState(false);
  const [moved, setMoved] = useState(false);

  useEffect(() => {
    rainRef.current = rain;
  }, [rain]);
  useEffect(() => {
    readyRef.current = onReady;
  }, [onReady]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTouch(window.matchMedia('(pointer: coarse)').matches);
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const phone = Math.min(window.innerWidth, window.innerHeight) < 560;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } catch {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, phone ? 1.75 : 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    const canvas = renderer.domElement;
    canvas.style.cssText =
      'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none';
    mount.appendChild(canvas);
    // Let three.js rebuild its state itself if a phone takes the GPU away.
    const onLost = (e: Event) => e.preventDefault();
    canvas.addEventListener('webglcontextlost', onLost);

    const SKY = 0xa9d4ee;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(SKY);
    scene.fog = new THREE.Fog(SKY, 110, 340);

    const camera = new THREE.PerspectiveCamera(34, 1, 0.5, 600);

    scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x9a7850, 0.7));
    const sun = new THREE.DirectionalLight(0xffe6bd, 1.0);
    sun.castShadow = true;
    sun.shadow.mapSize.set(phone ? 1024 : 2048, phone ? 1024 : 2048);
    const sc = sun.shadow.camera;
    sc.left = -52;
    sc.right = 52;
    sc.top = 52;
    sc.bottom = -52;
    sc.near = 10;
    sc.far = 260;
    sun.shadow.bias = -0.0008;
    sun.shadow.normalBias = 0.04;
    scene.add(sun, sun.target);

    const lambert = (color: number, flat = false) =>
      new THREE.MeshLambertMaterial({ color, flatShading: flat });
    const textures: THREE.Texture[] = [];
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    const rand = rng(2024);
    const boxes: Box[] = [];

    /* ---------- ground, sidewalks, roads ---------- */
    const flat = (
      w: number,
      l: number,
      color: number,
      y: number,
      alongX: boolean,
      at: number
    ) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(alongX ? l : w, alongX ? w : l),
        lambert(color)
      );
      m.rotation.x = -Math.PI / 2;
      m.position.set(alongX ? 0 : at, y, alongX ? at : 0);
      m.receiveShadow = true;
      scene.add(m);
    };

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), lambert(0x9db06a));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const ROAD_LEN = EDGE * 2 + 40;
    for (let k = -GRID; k <= GRID; k++) {
      for (const alongX of [true, false]) {
        flat(SIDEWALK_W, ROAD_LEN, 0xd8d2c4, 0.03, alongX, k * PITCH);
        flat(ROAD_W, ROAD_LEN, 0x3b3f45, 0.06, alongX, k * PITCH);
      }
    }

    const nearJunction = (t: number, margin: number) =>
      Math.abs(t - Math.round(t / PITCH) * PITCH) < margin;

    // dashed centre lines
    {
      const marks: { x: number; z: number; alongX: boolean }[] = [];
      for (let k = -GRID; k <= GRID; k++) {
        for (let t = -EDGE; t <= EDGE; t += 8) {
          if (nearJunction(t, ROAD_W / 2 + 1)) continue;
          marks.push({ x: t, z: k * PITCH, alongX: true });
          marks.push({ x: k * PITCH, z: t, alongX: false });
        }
      }
      const im = new THREE.InstancedMesh(
        new THREE.BoxGeometry(3, 0.02, 0.35),
        new THREE.MeshBasicMaterial({ color: 0xf1ead2 }),
        marks.length
      );
      marks.forEach((m, i) => {
        dummy.position.set(m.x, 0.09, m.z);
        dummy.rotation.set(0, m.alongX ? 0 : Math.PI / 2, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        im.setMatrixAt(i, dummy.matrix);
      });
      scene.add(im);
    }

    /* ---------- buildings ---------- */
    type Lot = { x: number; z: number; w: number; h: number; color: number };
    const lots: Lot[] = [];
    const treeSpots: { x: number; z: number; s: number }[] = [];
    const palette = [0xe8dcc4, 0xd9a58a, 0xc9d8e2, 0xefe7d6, 0xb9c9a8, 0xe2b96b, 0xf3f0ea, 0xcfa89b];

    const special = new Set(['1,-2', '-1,-1']); // mosque block, tower block
    for (let ix = -GRID; ix < GRID; ix++) {
      for (let iz = -GRID; iz < GRID; iz++) {
        if (special.has(`${ix},${iz}`)) continue;
        const cx = (ix + 0.5) * PITCH;
        const cz = (iz + 0.5) * PITCH;
        const dist = Math.hypot(cx, cz);
        for (const sx of [-1, 1]) {
          for (const sz of [-1, 1]) {
            const x = cx + sx * 6.25;
            const z = cz + sz * 6.25;
            if (rand() < 0.12) {
              if (rand() < 0.7) treeSpots.push({ x, z, s: 1.1 + rand() * 0.6 });
              continue;
            }
            const w = 9.5 + rand() * 1.5;
            const h = 5 + rand() * 8 + Math.max(0, 22 - dist / 6) * rand();
            lots.push({ x, z, w, h, color: pick(rand, palette) });
            boxes.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - w / 2, maxZ: z + w / 2 });
          }
        }
      }
    }

    {
      const body = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), lambert(0xffffff), lots.length);
      const roof = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), lambert(0x5a5f66), lots.length);
      lots.forEach((l, i) => {
        dummy.rotation.set(0, 0, 0);
        dummy.position.set(l.x, l.h / 2, l.z);
        dummy.scale.set(l.w, l.h, l.w);
        dummy.updateMatrix();
        body.setMatrixAt(i, dummy.matrix);
        body.setColorAt(i, col.setHex(l.color));
        dummy.position.set(l.x, l.h + 0.25, l.z);
        dummy.scale.set(l.w + 0.5, 0.5, l.w + 0.5);
        dummy.updateMatrix();
        roof.setMatrixAt(i, dummy.matrix);
      });
      for (const m of [body, roof]) {
        m.castShadow = true;
        m.receiveShadow = true;
        scene.add(m);
      }
    }

    /* ---------- landmarks ---------- */
    // Aso Rock, far to the north, mostly lost in the haze
    {
      const rock = new THREE.Group();
      const lumps: [number, number, number, number, number, number, number][] = [
        [0, 0, 0, 70, 50, 45, 0x8e7b68],
        [-45, 0, 8, 45, 34, 34, 0x7a6857],
        [48, 0, 6, 50, 30, 32, 0x85705e],
        [18, 4, -14, 38, 40, 30, 0x7a6857],
        [-18, 3, -10, 34, 32, 28, 0x93806c],
      ];
      for (const [x, y, z, sx, sy, sz, c] of lumps) {
        const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), lambert(c, true));
        m.position.set(x, y + sy * 0.3, z);
        m.scale.set(sx, sy, sz);
        rock.add(m);
      }
      rock.position.set(40, 0, -GRID * PITCH - 80);
      scene.add(rock);
      const label = makeLabel('Aso Rock', textures);
      label.scale.set(40, 10, 1);
      label.position.set(40, 62, -GRID * PITCH - 70);
      scene.add(label);
    }

    // National mosque: cream hall, gold dome, four minarets
    {
      const cx = 1.5 * PITCH;
      const cz = -1.5 * PITCH;
      const g = new THREE.Group();
      const hall = new THREE.Mesh(new THREE.BoxGeometry(15, 7, 15), lambert(0xf3ecdd));
      hall.position.y = 3.5;
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.6, 1.2, 20), lambert(0xf3ecdd));
      drum.position.y = 7.6;
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(5.5, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        lambert(0xd9a441)
      );
      dome.position.y = 8.2;
      g.add(hall, drum, dome);
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const mn = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 18, 10), lambert(0xf3ecdd));
          mn.position.set(sx * 8.8, 9, sz * 8.8);
          const cap = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.5, 10), lambert(0xd9a441));
          cap.position.set(sx * 8.8, 19.25, sz * 8.8);
          g.add(mn, cap);
        }
      }
      g.traverse((o) => {
        o.castShadow = true;
        o.receiveShadow = true;
      });
      g.position.set(cx, 0, cz);
      scene.add(g);
      boxes.push({ minX: cx - 7.8, maxX: cx + 7.8, minZ: cz - 7.8, maxZ: cz + 7.8 });
      const label = makeLabel('National Mosque', textures);
      label.position.set(cx, 26, cz);
      scene.add(label);
    }

    // Tall tower with a spire
    {
      const cx = -0.5 * PITCH;
      const cz = -0.5 * PITCH;
      const g = new THREE.Group();
      const parts: [THREE.BufferGeometry, number, number][] = [
        [new THREE.CylinderGeometry(4.2, 4.6, 3, 16), 1.5, 0x9aa0a6],
        [new THREE.CylinderGeometry(2.6, 3.4, 34, 16), 20, 0xf0ece2],
        [new THREE.CylinderGeometry(4.5, 4.5, 3, 16), 38.5, 0xe8d9a8],
        [new THREE.ConeGeometry(0.6, 10, 8), 45, 0xd9a441],
      ];
      for (const [geo, y, c] of parts) {
        const m = new THREE.Mesh(geo, lambert(c));
        m.position.y = y;
        m.castShadow = true;
        m.receiveShadow = true;
        g.add(m);
      }
      g.position.set(cx, 0, cz);
      scene.add(g);
      boxes.push({ minX: cx - 4.5, maxX: cx + 4.5, minZ: cz - 4.5, maxZ: cz + 4.5 });
      const label = makeLabel('Millennium Tower', textures);
      label.position.set(cx, 54, cz);
      scene.add(label);
    }

    /* ---------- trees along the sidewalks ---------- */
    for (let k = -GRID; k <= GRID; k++) {
      for (let t = -EDGE + 6; t < EDGE; t += 9) {
        if (nearJunction(t, ROAD_W / 2 + 2.5)) continue;
        for (const side of [-1, 1]) {
          if (rand() < 0.45) continue;
          const j = (rand() - 0.5) * 3;
          treeSpots.push({ x: t + j, z: k * PITCH + side * 5.7, s: 0.8 + rand() * 0.5 });
          if (rand() < 0.45) continue;
          treeSpots.push({ x: k * PITCH + side * 5.7, z: t + j, s: 0.8 + rand() * 0.5 });
        }
      }
    }
    {
      const n = treeSpots.length;
      const trunks = new THREE.InstancedMesh(
        new THREE.CylinderGeometry(0.18, 0.26, 1.6, 6),
        lambert(0x6b4a2f),
        n
      );
      const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.3, 0), lambert(0xffffff, true), n);
      const greens = [0x4f8a3c, 0x5c9a45, 0x3f7a35, 0x6aa84f];
      treeSpots.forEach((t, i) => {
        dummy.rotation.set(0, rand() * 6, 0);
        dummy.position.set(t.x, 0.8 * t.s, t.z);
        dummy.scale.set(t.s, t.s, t.s);
        dummy.updateMatrix();
        trunks.setMatrixAt(i, dummy.matrix);
        dummy.position.set(t.x, 2.6 * t.s, t.z);
        dummy.updateMatrix();
        crowns.setMatrixAt(i, dummy.matrix);
        crowns.setColorAt(i, col.setHex(pick(rand, greens)));
      });
      for (const m of [trunks, crowns]) {
        m.castShadow = true;
        scene.add(m);
      }
    }

    /* ---------- traffic ---------- */
    type Mover = { alongX: boolean; k: number; t: number; dir: number; speed: number; side: number };
    const CAR_N = 28;
    const cars: Mover[] = [];
    for (let i = 0; i < CAR_N; i++) {
      cars.push({
        alongX: rand() < 0.5,
        k: Math.floor(rand() * (GRID * 2 + 1)) - GRID,
        t: (rand() * 2 - 1) * EDGE,
        dir: rand() < 0.5 ? 1 : -1,
        speed: 6 + rand() * 6,
        side: 2.2,
      });
    }
    const carBody = new THREE.InstancedMesh(new THREE.BoxGeometry(2, 0.9, 4.2), lambert(0xffffff), CAR_N);
    const carCabin = new THREE.InstancedMesh(new THREE.BoxGeometry(1.7, 0.7, 2.2), lambert(0x33414d), CAR_N);
    const carColors = [0x1f8a4c, 0x1f8a4c, 0xf4f4f0, 0xf4f4f0, 0xf2b33d, 0xc0392b, 0x2f6db5, 0xb7bcc2];
    cars.forEach((_, i) => carBody.setColorAt(i, col.setHex(pick(rand, carColors))));
    for (const m of [carBody, carCabin]) {
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
      m.castShadow = true;
      scene.add(m);
    }

    /* ---------- people on the sidewalks ---------- */
    const WALK_N = 44;
    const walkers: (Mover & { phase: number })[] = [];
    for (let i = 0; i < WALK_N; i++) {
      walkers.push({
        alongX: rand() < 0.5,
        k: Math.floor(rand() * (GRID * 2 + 1)) - GRID,
        t: (rand() * 2 - 1) * EDGE,
        dir: rand() < 0.5 ? 1 : -1,
        speed: 1.3 + rand() * 0.9,
        side: rand() < 0.5 ? -5.6 : 5.6,
        phase: rand() * 6.28,
      });
    }
    const personBody = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.35, 0.9, 4, 8), lambert(0xffffff), WALK_N);
    const personHead = new THREE.InstancedMesh(new THREE.SphereGeometry(0.3, 10, 8), lambert(0xffffff), WALK_N);
    const clothes = [0xf4f4f0, 0x1f8a4c, 0xe2b96b, 0x2f6db5, 0xc0392b, 0x6b4a8a, 0x2b2f36, 0xd98a3a];
    const skins = [0x5b3a29, 0x7a4e35, 0x8a5a3c, 0x3f2a1f, 0x6a4430];
    walkers.forEach((_, i) => {
      personBody.setColorAt(i, col.setHex(pick(rand, clothes)));
      personHead.setColorAt(i, col.setHex(pick(rand, skins)));
    });
    for (const m of [personBody, personHead]) {
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
      m.castShadow = true;
      scene.add(m);
    }

    /* ---------- the player ---------- */
    const player = new THREE.Group();
    const pBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.95, 4, 10), lambert(0x1e9e5a));
    pBody.position.y = 0.95;
    const pHead = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), lambert(0x8a5a3c));
    pHead.position.y = 1.95;
    const pCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.36, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      lambert(0xf3f0ea)
    );
    pCap.position.y = 2.02;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.1, 28),
      new THREE.MeshBasicMaterial({ color: 0xf2b33d, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.1;
    for (const m of [pBody, pHead, pCap]) m.castShadow = true;
    player.add(pBody, pHead, pCap, ring);
    scene.add(player);

    let px = 0;
    let pz = 10;
    let heading = Math.PI;
    let bob = 0;
    const R = 0.6;

    /* ---------- rain ---------- */
    const RAIN_N = 700;
    const rainPos = new Float32Array(RAIN_N * 3);
    for (let i = 0; i < RAIN_N; i++) {
      rainPos[i * 3] = Math.random() * 80 - 40;
      rainPos[i * 3 + 1] = Math.random() * 40;
      rainPos[i * 3 + 2] = Math.random() * 80 - 40;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    const rainPts = new THREE.Points(
      rainGeo,
      new THREE.PointsMaterial({ color: 0xdce6ee, size: 0.35, transparent: true, opacity: 0.7 })
    );
    rainPts.frustumCulled = false;
    rainPts.visible = false;
    scene.add(rainPts);

    /* ---------- input ---------- */
    const keys = new Set<string>();
    const markMoved = () => {
      if (!movedRef.current) {
        movedRef.current = true;
        setMoved(true);
      }
    };
    const typing = (t: EventTarget | null) =>
      t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    const onDown = (e: KeyboardEvent) => {
      if (typing(e.target)) return;
      if (e.code.startsWith('Arrow')) e.preventDefault();
      keys.add(e.code);
    };
    const onUp = (e: KeyboardEvent) => keys.delete(e.code);
    const onBlur = () => keys.clear();
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);

    /* ---------- sizing ---------- */
    const resize = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = w / h < 0.8 ? 46 : 34; // widen the view on tall phone screens
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', resize);
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    const camTarget = new THREE.Vector3();
    camera.position.set(px, 32, pz + 38);

    /* ---------- loop ---------- */
    const placeOnLine = (m: Mover, y: number) => {
      const lane = m.side;
      if (m.alongX) {
        dummy.position.set(m.t, y, m.k * PITCH + (m.dir > 0 ? lane : -lane));
        return Math.atan2(m.dir, 0);
      }
      dummy.position.set(m.k * PITCH + (m.dir > 0 ? -lane : lane), y, m.t);
      return Math.atan2(0, m.dir);
    };

    let raf = 0;
    let last = performance.now();
    let first = true;
    let clock = 0;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      clock += dt;

      // player movement
      let ix = 0;
      let iz = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) ix -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) iz -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) iz += 1;
      ix += joyRef.current.x;
      iz += joyRef.current.z;
      const len = Math.hypot(ix, iz);
      if (len > 0.05) {
        markMoved();
        const f = Math.min(1, len) / len;
        const run = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 1.7 : 1;
        px += ix * f * 9 * run * dt;
        pz += iz * f * 9 * run * dt;
        const want = Math.atan2(ix, iz);
        let diff = want - heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        heading += diff * (1 - Math.exp(-14 * dt));
        bob += dt * 11 * Math.min(1, len) * run;
      } else {
        bob *= 0.9;
      }

      // keep out of buildings
      for (const b of boxes) {
        const cx = Math.max(b.minX, Math.min(px, b.maxX));
        const cz = Math.max(b.minZ, Math.min(pz, b.maxZ));
        const dx = px - cx;
        const dz = pz - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= R * R) continue;
        if (d2 > 1e-6) {
          const d = Math.sqrt(d2);
          px = cx + (dx / d) * R;
          pz = cz + (dz / d) * R;
        } else {
          const l = px - b.minX;
          const r = b.maxX - px;
          const t = pz - b.minZ;
          const bt = b.maxZ - pz;
          const m = Math.min(l, r, t, bt);
          if (m === l) px = b.minX - R;
          else if (m === r) px = b.maxX + R;
          else if (m === t) pz = b.minZ - R;
          else pz = b.maxZ + R;
        }
      }
      px = Math.max(-EDGE, Math.min(EDGE, px));
      pz = Math.max(-EDGE, Math.min(EDGE, pz));

      player.position.set(px, Math.abs(Math.sin(bob)) * 0.14, pz);
      player.rotation.y = heading;
      ring.position.y = 0.1 - player.position.y;

      // traffic
      cars.forEach((c, i) => {
        c.t += c.dir * c.speed * dt;
        if (c.t > EDGE) c.t = -EDGE;
        if (c.t < -EDGE) c.t = EDGE;
        const yaw = placeOnLine(c, 0.75);
        dummy.rotation.set(0, yaw, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        carBody.setMatrixAt(i, dummy.matrix);
        dummy.position.y = 1.45;
        dummy.position.x -= Math.sin(yaw) * 0.3;
        dummy.position.z -= Math.cos(yaw) * 0.3;
        dummy.updateMatrix();
        carCabin.setMatrixAt(i, dummy.matrix);
      });
      carBody.instanceMatrix.needsUpdate = true;
      carCabin.instanceMatrix.needsUpdate = true;

      // people
      walkers.forEach((w, i) => {
        w.t += w.dir * w.speed * dt;
        if (w.t > EDGE) w.t = -EDGE;
        if (w.t < -EDGE) w.t = EDGE;
        const step = Math.abs(Math.sin(clock * 6 * w.speed + w.phase)) * 0.08;
        const yaw = placeOnLine(w, 0.9 + step);
        dummy.rotation.set(0, yaw, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        personBody.setMatrixAt(i, dummy.matrix);
        dummy.position.y = 1.75 + step;
        dummy.updateMatrix();
        personHead.setMatrixAt(i, dummy.matrix);
      });
      personBody.instanceMatrix.needsUpdate = true;
      personHead.instanceMatrix.needsUpdate = true;

      // rain
      const raining = rainRef.current;
      rainPts.visible = raining;
      if (raining) {
        for (let i = 0; i < RAIN_N; i++) {
          rainPos[i * 3 + 1] -= 28 * dt;
          if (rainPos[i * 3 + 1] < 0) rainPos[i * 3 + 1] = 40;
        }
        rainGeo.attributes.position.needsUpdate = true;
        rainPts.position.set(px, 0, pz);
      }

      // sun and camera follow the player
      sun.position.set(px - 40, 80, pz + 55);
      sun.target.position.set(px, 0, pz);
      const k = 1 - Math.exp(-5 * dt);
      camTarget.set(px, 32, pz + 38);
      camera.position.lerp(camTarget, k);
      camera.lookAt(px, 0.5, pz);

      renderer.render(scene, camera);
      if (first) {
        first = false;
        readyRef.current?.();
      }
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
      canvas.removeEventListener('webglcontextlost', onLost);
      scene.traverse((o) => {
        if (o instanceof THREE.InstancedMesh) o.dispose();
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      });
      textures.forEach((t) => t.dispose());
      renderer.dispose();
      if (canvas.parentElement === mount) mount.removeChild(canvas);
    };
  }, []);

  /* on-screen stick for touch devices */
  const STICK = 56;
  const setStick = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > STICK) {
      dx = (dx / d) * STICK;
      dy = (dy / d) * STICK;
    }
    joyRef.current.x = dx / STICK;
    joyRef.current.z = dy / STICK;
    if (knobRef.current) knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
  };
  const endStick = () => {
    joyRef.current.x = 0;
    joyRef.current.z = 0;
    if (knobRef.current) knobRef.current.style.transform = 'translate(0px, 0px)';
  };

  return (
    <div
      ref={mountRef}
      className={className}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#a9d4ee' }}
    >
      {failed && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center', color: '#1b2a22', font: '500 16px system-ui, sans-serif' }}>
          The 3D city needs WebGL, and it is turned off on this device. Turn on hardware acceleration in your browser settings and reload.
        </div>
      )}

      {touch && !failed && (
        <div
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setStick(e);
          }}
          onPointerMove={(e) => {
            if (e.buttons || e.pointerType === 'touch') setStick(e);
          }}
          onPointerUp={endStick}
          onPointerCancel={endStick}
          style={{ position: 'absolute', left: 20, bottom: 28, width: STICK * 2 + 20, height: STICK * 2 + 20, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', border: '2px solid rgba(255,255,255,0.6)', touchAction: 'none', display: 'grid', placeItems: 'center' }}
        >
          <div ref={knobRef} style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', boxShadow: '0 2px 8px rgba(0,0,0,0.25)', pointerEvents: 'none' }} />
        </div>
      )}

      {!touch && !failed && !moved && (
        <div style={{ position: 'absolute', left: '50%', bottom: 24, transform: 'translateX(-50%)', padding: '8px 14px', borderRadius: 999, background: 'rgba(250,244,230,0.92)', color: '#1b2a22', font: '500 14px system-ui, sans-serif' }}>
          Move with W A S D or the arrow keys. Hold Shift to run.
        </div>
      )}
    </div>
  );
}
