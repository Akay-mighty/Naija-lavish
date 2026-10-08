"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { PLACES, type Place } from "../data/places";
import { hexToInt } from "../lib/format";
import { usePlayer, activeLook } from "../store/usePlayer";
import { useAuth } from "../store/useAuth";
import { rtdb } from "@/lib/firebase";
import { ref, set as rtdbSet, serverTimestamp as rtdbNow } from "firebase/database";

interface Scene3DProps {
  // Trigger a camera pan + character walk to this place id when changed
  targetPlaceId: string | null;
  onArrive?: (placeId: string) => void;
}

// Walkable bounds (Abuja "city" rectangle)
const BOUNDS = { minX: -22, maxX: 22, minZ: -16, maxZ: 16 };

export default function Scene3D({ targetPlaceId, onArrive }: Scene3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const charRef = useRef<THREE.Group | null>(null);
  const markersRef = useRef<Record<string, THREE.Group>>({});
  const placePosRef = useRef<Record<string, THREE.Vector3>>({});
  // Always keep the latest onArrive callback in a ref so the animation loop
  // (set up once) can always call the freshest version. (Kept for future use.)
  const onArriveRef = useRef(onArrive);
  useEffect(() => {
    onArriveRef.current = onArrive;
  });
  const walkTargetRef = useRef<THREE.Vector3 | null>(null);
  const rafRef = useRef<number>(0);
  const lastPresencePushRef = useRef<number>(0);
  // Use refs for things we don't want to trigger re-renders
  const setMoveChar = useRef(usePlayer.getState().moveCharacter).current;
  const setPlaceRef = useRef(usePlayer.getState().setPlace).current;
  const lastPlaceSentRef = useRef<string | null>(null);

  // ---- Three.js setup (runs once) ----
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const w = mount.clientWidth;
    const h = mount.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#eef7f1");
    scene.fog = new THREE.Fog("#eef7f1", 60, 110);
    sceneRef.current = scene;

    // Camera (isometric-ish, looking down at city)
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 250);
    camera.position.set(0, 30, 28);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ---- Lights (day/night cycle — updated every frame) ----
    const hemi = new THREE.HemisphereLight(0xfff7e8, 0xb8d4c8, 0.9);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(15, 30, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -30;
    sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 30;
    sun.shadow.camera.bottom = -30;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 80;
    sun.shadow.bias = -0.0005;
    scene.add(sun);
    const amb = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(amb);

    // Moon light (only visible at night)
    const moon = new THREE.DirectionalLight(0x9eb5ff, 0);
    moon.position.set(-15, 25, -12);
    scene.add(moon);

    // ---- Day/night cycle helper ----
    // Returns sky/fog/sun params for a given hour (0-24).
    function paramsForHour(hour: number) {
      // Map hour to sun elevation: 6=sunrise, 12=zenith, 18=sunset, 0/24=midnight
      const sunAngle = ((hour - 6) / 12) * Math.PI; // 0 at 6am, PI at 6pm
      const sunY = Math.sin(sunAngle);              // -1..1 (above horizon = positive)
      const sunX = Math.cos(sunAngle);              // east-to-west

      // Day/night blend: 0=full night, 1=full day
      let dayMix = Math.max(0, sunY);
      // Smooth transition near sunrise/sunset
      if (sunY > -0.2 && sunY < 0.4) {
        dayMix = Math.max(0, Math.min(1, (sunY + 0.2) / 0.6));
      }

      // Sky colors
      // Night: deep navy (#0b1a33)
      // Dawn/dusk: orange (#f59e0b)
      // Day: light blue (#eef7f1)
      const nightCol = new THREE.Color(0x0b1a33);
      const dayCol   = new THREE.Color(0xeef7f1);
      const duskCol  = new THREE.Color(0xf59e0b);

      // For dusk/dawn, blend toward orange when sun is near horizon
      const horizonMix = Math.max(0, 1 - Math.abs(sunY) * 3); // 1 at horizon, 0 elsewhere

      const sky = nightCol.clone().lerp(dayCol, dayMix);
      sky.lerp(duskCol, horizonMix * 0.4 * (sunY > -0.3 ? 1 : 0));

      // Sun intensity: bright at noon, dim at dusk, 0 at night
      const sunIntensity = dayMix * 1.1;

      // Moon intensity: 0 in day, 0.4 at night
      const moonIntensity = (1 - dayMix) * 0.4;

      // Hemisphere + ambient adjust
      const hemiIntensity = 0.3 + dayMix * 0.7;
      const ambIntensity = 0.15 + dayMix * 0.3;

      // Sun color: warm at sunrise/sunset, white at noon
      const sunCol = new THREE.Color(0xffffff).lerp(duskCol, horizonMix * 0.6);

      return {
        sky,
        sunY: Math.max(-0.5, sunY),
        sunX,
        sunIntensity,
        moonIntensity,
        hemiIntensity,
        ambIntensity,
        sunCol,
        isNight: dayMix < 0.25,
        dayMix,
      };
    }

    // ---- Ground ----
    const groundGeo = new THREE.PlaneGeometry(BOUNDS.maxX * 2 + 8, BOUNDS.maxZ * 2 + 8);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xa8d5b6,
      roughness: 0.96,
      metalness: 0,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // ---- Roads (cross + diagonal to places) ----
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x3a3a3a,
      roughness: 0.9,
      metalness: 0.05,
    });
    const roadStripeMat = new THREE.MeshBasicMaterial({ color: 0xfde68a });
    // Horizontal main road
    const roadH = new THREE.Mesh(
      new THREE.PlaneGeometry(BOUNDS.maxX * 2 + 8, 3.2),
      roadMat
    );
    roadH.rotation.x = -Math.PI / 2;
    roadH.position.set(0, 0.01, 0);
    roadH.receiveShadow = true;
    scene.add(roadH);
    // Vertical main road
    const roadV = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, BOUNDS.maxZ * 2 + 8),
      roadMat
    );
    roadV.rotation.x = -Math.PI / 2;
    roadV.position.set(0, 0.012, 0);
    roadV.receiveShadow = true;
    scene.add(roadV);
    // Lane stripes (simple dashes)
    for (let i = -BOUNDS.maxX; i <= BOUNDS.maxX; i += 6) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.18), roadStripeMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(i, 0.013, 0);
      scene.add(dash);
    }
    for (let i = -BOUNDS.maxZ; i <= BOUNDS.maxZ; i += 6) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 2), roadStripeMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.013, i);
      scene.add(dash);
    }

    // ---- Aso Rock silhouette (decorative backdrop) ----
    const rockGeo = new THREE.ConeGeometry(8, 14, 6);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x7e8a86,
      roughness: 0.95,
      flatShading: true,
    });
    const rock1 = new THREE.Mesh(rockGeo, rockMat);
    rock1.position.set(-18, 7, -14);
    rock1.castShadow = true;
    scene.add(rock1);
    const rock2 = new THREE.Mesh(
      new THREE.ConeGeometry(5, 10, 6),
      rockMat
    );
    rock2.position.set(-12, 5, -16);
    rock2.rotation.y = 0.7;
    rock2.castShadow = true;
    scene.add(rock2);

    // ---- Place markers ----
    PLACES.forEach((p: Place) => {
      const group = new THREE.Group();
      const [x, z] = p.pos;
      group.position.set(x, 0, z);

      // Building block (varying shape per category)
      const buildingH =
        p.category === "work" ? 5 : p.category === "social" ? 4.5 : 3;
      const buildingW = 3.2;
      const bldgGeo = new THREE.BoxGeometry(buildingW, buildingH, buildingW);
      const bldgMat = new THREE.MeshStandardMaterial({
        color: hexToInt(p.color),
        roughness: 0.7,
        metalness: 0.1,
      });
      const bldg = new THREE.Mesh(bldgGeo, bldgMat);
      bldg.position.y = buildingH / 2;
      bldg.castShadow = true;
      bldg.receiveShadow = true;
      group.add(bldg);

      // Roof cap
      const roofGeo = new THREE.ConeGeometry(2.5, 1.4, 4);
      const roofMat = new THREE.MeshStandardMaterial({
        color: hexToInt(p.accent),
        roughness: 0.6,
      });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.y = buildingH + 0.7;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      group.add(roof);

      // Floating marker ring (tap target visual)
      const ringGeo = new THREE.RingGeometry(1.6, 1.85, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: hexToInt(p.color),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.05;
      group.add(ring);

      // Pulsing pole to draw attention
      const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.4, 6);
      const poleMat = new THREE.MeshBasicMaterial({
        color: hexToInt(p.color),
        transparent: true,
        opacity: 0.7,
      });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = buildingH + 1.5;
      group.add(pole);

      scene.add(group);
      markersRef.current[p.id] = group;
      placePosRef.current[p.id] = new THREE.Vector3(x, 0, z);
    });

    // ---- Character (player) ----
    const charGroup = new THREE.Group();
    const look = activeLook(usePlayer.getState());
    const skinHex = hexToInt(look.skin);
    const topHex = hexToInt(look.top);
    const bottomHex = hexToInt(look.bottom);

    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 16, 16),
      new THREE.MeshStandardMaterial({ color: skinHex, roughness: 0.7 })
    );
    head.position.y = 1.45;
    head.castShadow = true;
    charGroup.add(head);

    // Body
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.38, 0.7, 12),
      new THREE.MeshStandardMaterial({ color: topHex, roughness: 0.8 })
    );
    body.position.y = 0.95;
    body.castShadow = true;
    charGroup.add(body);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.7, 8);
    const legMat = new THREE.MeshStandardMaterial({ color: bottomHex, roughness: 0.85 });
    const legL = new THREE.Mesh(legGeo, legMat);
    legL.position.set(-0.14, 0.35, 0);
    legL.castShadow = true;
    const legR = new THREE.Mesh(legGeo, legMat);
    legR.position.set(0.14, 0.35, 0);
    legR.castShadow = true;
    charGroup.add(legL, legR);

    // Shadow blob (in case shadow camera misses)
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.55, 16),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    charGroup.add(shadow);

    charGroup.position.set(0, 0, 0);
    scene.add(charGroup);
    charRef.current = charGroup;

    // ---- Animation loop ----
    const startTime = performance.now();
    let lastTime = startTime;
    const animate = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const t = (now - startTime) / 1000;

      // Pulse rings on markers
      Object.values(markersRef.current).forEach((g, i) => {
        const ring = g.children[2] as THREE.Mesh;
        if (ring) {
          const s = 1 + 0.1 * Math.sin(t * 2 + i);
          ring.scale.set(s, s, 1);
          (ring.material as THREE.MeshBasicMaterial).opacity =
            0.55 + 0.25 * Math.sin(t * 2 + i);
        }
      });

      // Walk the character toward target
      if (charGroup && walkTargetRef.current) {
        const target = walkTargetRef.current;
        const cur = charGroup.position;
        const dx = target.x - cur.x;
        const dz = target.z - cur.z;
        const d = Math.hypot(dx, dz);
        const speed = 6 * dt;
        if (d < 0.2) {
          // Arrived — snap to target
          charGroup.position.x = target.x;
          charGroup.position.z = target.z;
          walkTargetRef.current = null;
          // Notify which place we're at (closest) — use snapped position
          const snapX = target.x;
          const snapZ = target.z;
          let closest: { id: string; dist: number } | null = null;
          for (const [id, pos] of Object.entries(placePosRef.current)) {
            const dd = Math.hypot(pos.x - snapX, pos.z - snapZ);
            if (!closest || dd < closest.dist) closest = { id, dist: dd };
          }
          if (closest && closest.dist < 3.5 && closest.id !== lastPlaceSentRef.current) {
            lastPlaceSentRef.current = closest.id;
            setMoveChar(target.x, target.z, charGroup.rotation.y);
            setPlaceRef(closest.id);
            // Update RTDB presence (placeId + position)
            const s = usePlayer.getState();
            const a = useAuth.getState();
            if (a.uid) {
              void rtdbSet(ref(rtdb, `presence/${a.uid}`), {
                uid: a.uid,
                name: s.name || "Player",
                lookId: s.lookId,
                placeId: closest.id,
                x: target.x, z: target.z, ry: charGroup.rotation.y,
                anim: "idle",
                t: rtdbNow(),
              });
            }
            // Notify listeners (e.g. Game.tsx) that the character has arrived.
            try {
              window.dispatchEvent(
                new CustomEvent("naijalavish:arrive", { detail: { placeId: closest.id } })
              );
            } catch (e) {
              console.error("[NaijaLavish] arrival dispatch failed:", e);
            }
          }
        } else {
          // Don't overshoot — clamp step to remaining distance
          const step = Math.min(speed, d);
          const nx = cur.x + (dx / d) * step;
          const nz = cur.z + (dz / d) * step;
          // Clamp to bounds
          charGroup.position.x = Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, nx));
          charGroup.position.z = Math.max(BOUNDS.minZ, Math.min(BOUNDS.maxZ, nz));
          // Face direction
          const angle = Math.atan2(dx, dz);
          charGroup.rotation.y = angle;
          // Bob the head/body slightly (walking)
          const bob = Math.sin(t * 12) * 0.05;
          head.position.y = 1.45 + bob;
          body.position.y = 0.95 + bob * 0.5;
          legL.rotation.x = Math.sin(t * 12) * 0.5;
          legR.rotation.x = -Math.sin(t * 12) * 0.5;
          // Sync store
          setMoveChar(charGroup.position.x, charGroup.position.z, angle);
          // Throttled RTDB presence update (max 4/sec while walking)
          const nowMs = performance.now();
          if (nowMs - lastPresencePushRef.current > 250) {
            lastPresencePushRef.current = nowMs;
            const s = usePlayer.getState();
            const a = useAuth.getState();
            if (a.uid) {
              void rtdbSet(ref(rtdb, `presence/${a.uid}`), {
                uid: a.uid,
                name: s.name || "Player",
                lookId: s.lookId,
                placeId: s.placeId,
                x: charGroup.position.x, z: charGroup.position.z, ry: angle,
                anim: "walk",
                t: rtdbNow(),
              });
            }
          }
        }
      } else {
        // Idle breathing
        head.position.y = 1.45 + Math.sin(t * 2) * 0.02;
      }

      // Camera slight orbit when idle for visual interest
      if (!walkTargetRef.current) {
        const cx = Math.sin(t * 0.08) * 0.4;
        camera.position.x = cx;
        camera.lookAt(charGroup.position.x, 0, charGroup.position.z);
      } else {
        // Follow character with slight lead
        const tx = charGroup.position.x * 0.5;
        const tz = charGroup.position.z * 0.5 + 28;
        camera.position.x += (tx - camera.position.x) * 0.04;
        camera.position.z += (tz - camera.position.z) * 0.04;
        camera.lookAt(charGroup.position.x, 0, charGroup.position.z);
      }

      // ---- Day/night cycle: update sky, lights, sun position ----
      const hour = usePlayer.getState().gameHour;
      const p = paramsForHour(hour);

      // Smoothly transition sky + fog
      (scene.background as THREE.Color).copy(p.sky);
      (scene.fog as THREE.Fog).color.copy(p.sky);

      // Sun position: orbits based on hour
      sun.position.set(p.sunX * 30, Math.max(2, p.sunY * 30), 12);
      sun.intensity = p.sunIntensity;
      (sun.color as THREE.Color).copy(p.sunCol);

      // Moon
      moon.intensity = p.moonIntensity;

      // Hemisphere + ambient
      hemi.intensity = p.hemiIntensity;
      amb.intensity = p.ambIntensity;

      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    // ---- Tap/click to walk ----
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onClick = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      // Try intersecting place markers (their building box) first
      const markerObjs: THREE.Object3D[] = Object.values(markersRef.current);
      const hits = raycaster.intersectObjects(markerObjs, true);
      if (hits.length > 0) {
        // Walk to the place's center (in front of building)
        let groupId: string | null = null;
        let cur: THREE.Object3D | null = hits[0].object;
        while (cur && !groupId) {
          for (const [id, g] of Object.entries(markersRef.current)) {
            if (g === cur) groupId = id;
          }
          cur = cur.parent;
        }
        if (groupId && placePosRef.current[groupId]) {
          const pos = placePosRef.current[groupId];
          // Walk to slightly in front of the building (toward camera)
          walkTargetRef.current = new THREE.Vector3(pos.x, 0, pos.z + 2.2);
          return;
        }
      }

      // Else: walk to clicked ground point
      const groundHits = raycaster.intersectObject(ground);
      if (groundHits.length > 0) {
        const p = groundHits[0].point;
        // Clamp
        const x = Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, p.x));
        const z = Math.max(BOUNDS.minZ, Math.min(BOUNDS.maxZ, p.z));
        walkTargetRef.current = new THREE.Vector3(x, 0, z);
      }
    };
    renderer.domElement.addEventListener("pointerdown", onClick);

    // ---- Resize ----
    const onResize = () => {
      if (!mount || !renderer || !camera) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    // ---- Cleanup ----
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onClick);
      renderer.dispose();
      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement);
      }
      // Dispose geometries & materials
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).geometry) {
          (obj as THREE.Mesh).geometry.dispose();
        }
        const m = (obj as THREE.Mesh).material;
        if (Array.isArray(m)) m.forEach((mm) => mm.dispose());
        else if (m) (m as THREE.Material).dispose();
      });
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      charRef.current = null;
      markersRef.current = {};
      placePosRef.current = {};
    };
  }, []);

  // ---- React to "targetPlaceId" prop: walk character to that place ----
  useEffect(() => {
    if (!targetPlaceId) return;
    const pos = placePosRef.current[targetPlaceId];
    if (pos) {
      walkTargetRef.current = new THREE.Vector3(pos.x, 0, pos.z + 2.2);
    }
  }, [targetPlaceId]);

  // ---- Update character look when player changes look ----
  const lookId = usePlayer((s) => s.lookId);
  useEffect(() => {
    if (!charRef.current) return;
    const state = usePlayer.getState();
    const look = activeLook(state);
    // children: 0=head, 1=body, 2=legL, 3=legR, 4=shadow
    const head = charRef.current.children[0] as THREE.Mesh;
    const body = charRef.current.children[1] as THREE.Mesh;
    const legL = charRef.current.children[2] as THREE.Mesh;
    const legR = charRef.current.children[3] as THREE.Mesh;
    (head.material as THREE.MeshStandardMaterial).color.set(look.skin);
    (body.material as THREE.MeshStandardMaterial).color.set(look.top);
    (legL.material as THREE.MeshStandardMaterial).color.set(look.bottom);
    (legR.material as THREE.MeshStandardMaterial).color.set(look.bottom);
  }, [lookId]);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0"
      style={{ touchAction: "none", userSelect: "none" }}
      aria-label="Abuja city 3D map. Tap a place marker to walk there."
    />
  );
}
