"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { PLACES, KADUNA_PLACES, ALL_PLACES } from "../data/places";
import { hexToInt } from "../lib/format";
import { usePlayer, activeLook } from "../store/usePlayer";
import { useAuth } from "../store/useAuth";
import { rtdb } from "@/lib/firebase";
import {
  ref as dbRef,
  set as dbWrite,
  serverTimestamp as dbNow,
  onDisconnect as dbOnDisconnect,
} from "firebase/database";
import { buildAvatar, recolorAvatar, animateAvatar, buildNameTag, applyOutfit } from "../three/avatar";
import { buildPlace } from "../three/city";
import { buildGround, buildInstancedProps, buildBillboards, buildAmbientTraffic, type TrafficSystem } from "../three/props";
import { RemotePlayers } from "../three/remotePlayers";
import { QUALITY_CONFIG, loadQuality, FpsMonitor, type Quality } from "../three/quality";
import { buildHomeInterior, buildOwambeInterior, createSprayEffect, type SprayEffect } from "../three/interiors";

interface Scene3DProps {
  targetPlaceId: string | null;
  /** When set, switch to interior view ("home" or "owambe"). null = city view. */
  interior: "home" | "owambe" | null;
}

const BOUNDS = { minX: -22, maxX: 22, minZ: -16, maxZ: 16 };

export default function Scene3D({ targetPlaceId, interior }: Scene3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const charRef = useRef<THREE.Group | null>(null);
  const avatarPartsRef = useRef<ReturnType<typeof buildAvatar> | null>(null);
  const nameTagRef = useRef<THREE.Sprite | null>(null);
  const markersRef = useRef<Record<string, THREE.Group>>({});
  const placePosRef = useRef<Record<string, THREE.Vector3>>({});
  const walkTargetRef = useRef<THREE.Vector3 | null>(null);
  const pathLineRef = useRef<THREE.Line | null>(null);
  const rafRef = useRef<number>(0);
  const trafficRef = useRef<TrafficSystem | null>(null);
  const remotePlayersRef = useRef<RemotePlayers | null>(null);
  const fpsMonitorRef = useRef<FpsMonitor | null>(null);
  const qualityRef = useRef<Quality>(loadQuality());
  const lastPresencePushRef = useRef<number>(0);
  const cameraDistanceRef = useRef<number>(18);
  const cameraYawRef = useRef(0);     // horizontal angle
  const cameraPitchRef = useRef(0.7); // vertical angle
  const dragStartRef = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);
  const pointerDownPos = useRef<{ x: number; y: number; time: number } | null>(null);
  const isDragging = useRef(false);
  const joystickRef = useRef({ active: false, x: 0, y: 0, dx: 0, dy: 0 });
  const pinchStartRef = useRef<{ dist: number; zoom: number } | null>(null);
  // Interior refs
  const interiorGroupRef = useRef<THREE.Group | null>(null);
  const cityGroupRef = useRef<THREE.Group | null>(null);
  const interiorModeRef = useRef<"home" | "owambe" | null>(null);
  // Spray effect (naira notes raining down)
  const sprayEffectRef = useRef<SprayEffect | null>(null);
  // Dance emote flag (toggles local avatar to "dance" animation)
  const dancingRef = useRef(false);
  const setMoveChar = useRef(usePlayer.getState().moveCharacter).current;
  const setPlaceRef = useRef(usePlayer.getState().setPlace).current;
  const lastPlaceSentRef = useRef<string | null>(null);

  // ---- Three.js setup (runs once) ----
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const w = mount.clientWidth;
    const h = mount.clientHeight;
    const q = qualityRef.current;
    const cfg = QUALITY_CONFIG[q];

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f3e8c8"); // warm dusk
    scene.fog = new THREE.Fog("#f3e8c8", 40, 110 * cfg.fogDensity);
    sceneRef.current = scene;

    // Camera — ~45° pitch, FOV 40, damped follow
    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 300);
    camera.position.set(0, 18, 18);
    camera.lookAt(0, 1, 0);
    cameraRef.current = camera;

    // Renderer — ACES tone mapping, sRGB
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, cfg.pixelRatio));
    renderer.setSize(w, h);
    if (cfg.shadowsEnabled) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
    }
    if (cfg.toneMapping) {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
    }
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ---- Lights (day/night cycle) ----
    const hemi = new THREE.HemisphereLight(0xfff7e8, 0xb8d4c8, 0.9);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffd9a0, 1.1); // warm golden hour
    sun.position.set(15, 30, 12);
    if (cfg.shadowsEnabled) {
      sun.castShadow = true;
      sun.shadow.mapSize.set(cfg.shadowMapSize, cfg.shadowMapSize);
      sun.shadow.camera.left = -20;
      sun.shadow.camera.right = 20;
      sun.shadow.camera.top = 20;
      sun.shadow.camera.bottom = -20;
      sun.shadow.camera.near = 1;
      sun.shadow.camera.far = 80;
      sun.shadow.bias = -0.0005;
    }
    scene.add(sun);
    const amb = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(amb);
    const moon = new THREE.DirectionalLight(0x9eb5ff, 0);
    moon.position.set(-15, 25, -12);
    scene.add(moon);

    // 4 street-lamp point lights (max) — positioned at intersections
    const lampPositions: Array<[number, number, number]> = [
      [4, 3.5, 4], [-4, 3.5, 4], [4, 3.5, -4], [-4, 3.5, -4],
    ];
    const lampLights: THREE.PointLight[] = [];
    for (const [lx, ly, lz] of lampPositions) {
      const light = new THREE.PointLight(0xfde68a, 0, 12, 2);
      light.position.set(lx, ly, lz);
      scene.add(light);
      lampLights.push(light);
    }

    // ---- Ground ----
    buildGround(scene, BOUNDS);
    buildInstancedProps(scene, BOUNDS);
    buildBillboards(scene);
    trafficRef.current = buildAmbientTraffic(scene);

    // ---- Places (unique silhouettes) ----
    // Override "home" position with the player's unique housePos
    const playerHousePos = usePlayer.getState().housePos || [14, 8];

    // Load ALL places (Abuja + Kaduna)
    ALL_PLACES.forEach((p) => {
      const placeData = { ...p };
      // Use player's unique house position for the "home" marker
      if (p.id === "home") {
        placeData.pos = playerHousePos as [number, number];
      }
      const g = buildPlace(placeData);
      scene.add(g);
      markersRef.current[p.id] = g;
      placePosRef.current[p.id] = new THREE.Vector3(placeData.pos[0], 0, placeData.pos[1]);
    });

    // ---- Local character (avatar factory) ----
    const look = activeLook(usePlayer.getState());
    const parts = buildAvatar(look);
    parts.group.position.set(0, 0, 0);
    scene.add(parts.group);
    charRef.current = parts.group;
    avatarPartsRef.current = parts;
    applyOutfit(parts, usePlayer.getState().inventory.filter((i) => i.equipped).map((i) => i.id));

    // Name tag above local player
    const nameTag = buildNameTag(usePlayer.getState().name || "You", true);
    parts.group.add(nameTag);
    nameTagRef.current = nameTag;

    // ---- Dotted path line (hidden by default) ----
    const pathGeo = new THREE.BufferGeometry();
    pathGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(60 * 3), 3));
    const pathMat = new THREE.LineDashedMaterial({
      color: 0x00875a,
      dashSize: 0.2,
      gapSize: 0.15,
      transparent: true,
      opacity: 0.7,
    });
    const pathLine = new THREE.Line(pathGeo, pathMat);
    pathLine.visible = false;
    scene.add(pathLine);
    pathLineRef.current = pathLine;

    // ---- Remote players ----
    remotePlayersRef.current = new RemotePlayers(scene, "city");

    // ---- Spray effect (naira notes raining down) ----
    const spray = createSprayEffect();
    scene.add(spray.group);
    sprayEffectRef.current = spray;

    // Listen for spray events (from PlaceSheet)
    const onSpray = (e: Event) => {
      const detail = (e as CustomEvent).detail as { amount: number };
      spray.trigger(detail.amount);
    };
    window.addEventListener("naijalavish:spray", onSpray as EventListener);

    // ---- Day/night cycle helper ----
    function paramsForHour(hour: number) {
      const sunAngle = ((hour - 6) / 12) * Math.PI;
      const sunY = Math.sin(sunAngle);
      const sunX = Math.cos(sunAngle);
      let dayMix = Math.max(0, sunY);
      if (sunY > -0.2 && sunY < 0.4) {
        dayMix = Math.max(0, Math.min(1, (sunY + 0.2) / 0.6));
      }
      const nightCol = new THREE.Color(0x0b1a33);
      const dayCol = new THREE.Color(0xf3e8c8); // warm gold
      const duskCol = new THREE.Color(0xf59e0b);
      const horizonMix = Math.max(0, 1 - Math.abs(sunY) * 3);
      const sky = nightCol.clone().lerp(dayCol, dayMix);
      sky.lerp(duskCol, horizonMix * 0.4 * (sunY > -0.3 ? 1 : 0));
      return {
        sky,
        sunY: Math.max(-0.5, sunY),
        sunX,
        sunIntensity: dayMix * 1.1,
        moonIntensity: (1 - dayMix) * 0.4,
        hemiIntensity: 0.3 + dayMix * 0.7,
        ambIntensity: 0.15 + dayMix * 0.3,
        sunCol: new THREE.Color(0xffd9a0).lerp(duskCol, horizonMix * 0.6),
        isNight: dayMix < 0.25,
        dayMix,
      };
    }

    // ---- Camera orbit + follow (drag to orbit, pinch/button to zoom) ----
    function updateCamera(target: THREE.Vector3) {
      const dist = cameraDistanceRef.current;
      const yaw = cameraYawRef.current;
      const pitch = cameraPitchRef.current;
      const desiredX = target.x + Math.sin(yaw) * dist * Math.cos(pitch);
      const desiredZ = target.z + Math.cos(yaw) * dist * Math.cos(pitch);
      const desiredY = dist * Math.sin(pitch);
      camera.position.x += (desiredX - camera.position.x) * 0.1;
      camera.position.y += (desiredY - camera.position.y) * 0.1;
      camera.position.z += (desiredZ - camera.position.z) * 0.1;
      camera.lookAt(target.x, 1, target.z);
    }

    // ---- Weather: simple rain particles ----
    const rainCount = 200;
    const rainGeo = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      rainPositions[i * 3] = (Math.random() - 0.5) * 40;
      rainPositions[i * 3 + 1] = Math.random() * 20;
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPositions, 3));
    const rainMat = new THREE.PointsMaterial({ color: 0xaaccff, size: 0.08, transparent: true, opacity: 0 });
    const rain = new THREE.Points(rainGeo, rainMat);
    scene.add(rain);

    // Weather state (clear by default, rain when gameHour is 6-8 or 14-16)
    function isRaining(hour: number): boolean {
      return (hour >= 6 && hour <= 8) || (hour >= 14 && hour <= 16);
    }

    // ---- Animation loop ----
    const startTime = performance.now();
    let lastTime = startTime;
    const animate = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const t = (now - startTime) / 1000;

      fpsMonitorRef.current?.tick();

      // Pulse markers
      Object.values(markersRef.current).forEach((g, i) => {
        const pinGroup = g.children.find((c) => c.userData.isPin);
        if (pinGroup) {
          pinGroup.position.y = Math.sin(t * 2 + i) * 0.15;
        }
      });

      // ---- Joystick movement (camera-relative) ----
      if (charRef.current && avatarPartsRef.current && joystickRef.current.active) {
        const jx = joystickRef.current.dx / 50; // -1..1
        const jy = joystickRef.current.dy / 50; // -1..1 (up = negative = forward)
        const speed = 6 * dt;
        // Camera-relative: forward = direction from camera to character (XZ)
        const camForward = new THREE.Vector3();
        camera.getWorldDirection(camForward);
        camForward.y = 0;
        camForward.normalize();
        const camRight = new THREE.Vector3().crossVectors(camForward, new THREE.Vector3(0, 1, 0));
        // Move character: jy = forward/back, jx = left/right
        const moveX = camForward.x * (-jy) + camRight.x * jx;
        const moveZ = camForward.z * (-jy) + camRight.z * jx;
        charRef.current.position.x = Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, charRef.current.position.x + moveX * speed));
        charRef.current.position.z = Math.max(BOUNDS.minZ, Math.min(BOUNDS.maxZ, charRef.current.position.z + moveZ * speed));
        // Face movement direction
        if (Math.abs(jx) > 0.1 || Math.abs(jy) > 0.1) {
          const angle = Math.atan2(moveX, moveZ);
          charRef.current.rotation.y = angle;
          animateAvatar(avatarPartsRef.current, t, true, "walk");
          setMoveChar(charRef.current.position.x, charRef.current.position.z, angle);
        } else {
          animateAvatar(avatarPartsRef.current, t, false, "idle");
        }
        // Cancel any tap-to-walk target
        walkTargetRef.current = null;
        if (pathLineRef.current) pathLineRef.current.visible = false;
      }
      // ---- Walk character toward tap target ----
      else if (charRef.current && walkTargetRef.current && avatarPartsRef.current) {
        const target = walkTargetRef.current;
        const cur = charRef.current.position;
        const dx = target.x - cur.x;
        const dz = target.z - cur.z;
        const d = Math.hypot(dx, dz);
        const speed = 6 * dt;
        if (d < 0.2) {
          charRef.current.position.x = target.x;
          charRef.current.position.z = target.z;
          walkTargetRef.current = null;
          // Hide path line on arrival
          if (pathLineRef.current) pathLineRef.current.visible = false;
          // Determine closest place + dispatch arrival event
          let closest: { id: string; dist: number } | null = null;
          for (const [id, pos] of Object.entries(placePosRef.current)) {
            const dd = Math.hypot(pos.x - target.x, pos.z - target.z);
            if (!closest || dd < closest.dist) closest = { id, dist: dd };
          }
          if (closest && closest.dist < 3.5 && closest.id !== lastPlaceSentRef.current) {
            lastPlaceSentRef.current = closest.id;
            setMoveChar(target.x, target.z, charRef.current.rotation.y);
            setPlaceRef(closest.id);
            try {
              window.dispatchEvent(new CustomEvent("naijalavish:arrive", { detail: { placeId: closest.id } }));
            } catch (e) {
              console.error("[Scene3D] arrival dispatch:", e);
            }
          }
          // Always tell everyone where we stopped (also in the open street, not only at a place),
          // otherwise other players see us frozen a few steps short, still "walking".
          {
            const s = usePlayer.getState();
            const a = useAuth.getState();
            if (a.uid) {
              void dbWrite(dbRef(rtdb, `presence/${a.uid}`), {
                uid: a.uid, name: s.name || "Player", lookId: s.lookId,
                placeId: s.placeId, x: target.x, z: target.z, ry: charRef.current.rotation.y,
                anim: "idle", t: dbNow(),
              });
            }
          }
          animateAvatar(avatarPartsRef.current, t, false, "idle");
        } else {
          // Don't overshoot
          const step = Math.min(speed, d);
          charRef.current.position.x = Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, cur.x + (dx / d) * step));
          charRef.current.position.z = Math.max(BOUNDS.minZ, Math.min(BOUNDS.maxZ, cur.z + (dz / d) * step));
          const angle = Math.atan2(dx, dz);
          charRef.current.rotation.y = angle;
          animateAvatar(avatarPartsRef.current, t, true, "walk");
          setMoveChar(charRef.current.position.x, charRef.current.position.z, angle);
          // Update path line to point at remaining distance
          if (pathLineRef.current) {
            const pts = [cur.clone(), target.clone()];
            pathLineRef.current.geometry.setFromPoints(pts);
            (pathLineRef.current.material as THREE.LineDashedMaterial).needsUpdate = true;
            pathLineRef.current.computeLineDistances();
            pathLineRef.current.visible = true;
          }
          // Throttled RTDB presence (4Hz)
          const nowMs = performance.now();
          if (nowMs - lastPresencePushRef.current > 250) {
            lastPresencePushRef.current = nowMs;
            const s = usePlayer.getState();
            const a = useAuth.getState();
            if (a.uid) {
              void dbWrite(dbRef(rtdb, `presence/${a.uid}`), {
                uid: a.uid, name: s.name || "Player", lookId: s.lookId,
                placeId: s.placeId, x: charRef.current.position.x, z: charRef.current.position.z, ry: angle,
                anim: "walk", t: dbNow(),
              });
            }
          }
        }
      } else if (avatarPartsRef.current) {
        const anim = dancingRef.current ? "dance" : "idle";
        animateAvatar(avatarPartsRef.current, t, false, anim);
      }

      // Camera follow
      if (charRef.current) updateCamera(charRef.current.position);

      // Day/night cycle
      const hour = usePlayer.getState().gameHour;
      const p = paramsForHour(hour);
      (scene.background as THREE.Color).copy(p.sky);
      (scene.fog as THREE.Fog).color.copy(p.sky);
      sun.position.set(p.sunX * 30, Math.max(2, p.sunY * 30), 12);
      sun.intensity = p.sunIntensity;
      (sun.color as THREE.Color).copy(p.sunCol);
      moon.intensity = p.moonIntensity;
      hemi.intensity = p.hemiIntensity;
      amb.intensity = p.ambIntensity;
      // Street lamps on at night
      const lampIntensity = p.isNight ? 1.0 : 0;
      for (const l of lampLights) l.intensity = lampIntensity;

      // ---- Weather: rain particles + wet road tint ----
      const raining = isRaining(hour);
      if (raining) {
        rainMat.opacity = 0.4;
        // Animate rain falling
        const positions = rainGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < rainCount; i++) {
          positions[i * 3 + 1] -= 15 * dt; // fall speed
          if (positions[i * 3 + 1] < 0) {
            positions[i * 3 + 1] = 20;
            positions[i * 3] = (Math.random() - 0.5) * 40;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
          }
        }
        rainGeo.attributes.position.needsUpdate = true;
        // Follow camera
        if (charRef.current) {
          rain.position.x = charRef.current.position.x;
          rain.position.z = charRef.current.position.z;
        }
        // Wet road: increase fog + darken slightly
        scene.fog!.far = 50;
      } else {
        rainMat.opacity = Math.max(0, rainMat.opacity - 0.01);
        scene.fog!.far = 110 * (QUALITY_CONFIG[qualityRef.current]?.fogDensity || 1);
      }

      // Buildings that hide the player fade translucent
      // (Check occluders between camera + character)
      if (charRef.current) {
        const dir = new THREE.Vector3().subVectors(camera.position, charRef.current.position);
        const ray = new THREE.Raycaster(charRef.current.position, dir.clone().normalize(), 0.5, dir.length());
        const hits = ray.intersectObjects(Object.values(markersRef.current), true);
        // Fade any building the ray hits (restore others)
        Object.values(markersRef.current).forEach((g) => {
          g.traverse((obj) => {
            const mesh = obj as THREE.Mesh;
            if (mesh.isMesh && mesh.material && (mesh.material as THREE.Material).transparent !== undefined) {
              const m = mesh.material as THREE.MeshStandardMaterial;
              if (!m._originalOpacity) m._originalOpacity = m.opacity;
            }
          });
        });
        hits.forEach((hit) => {
          const m = (hit.object as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (m && m.transparent === false) {
            m.transparent = true;
            m.opacity = 0.35;
          }
        });
      }

      // Ferris wheel rotation (Magicland)
      Object.values(markersRef.current).forEach((g) => {
        const wheel = g.children.find((c) => c.userData.isFerris);
        if (wheel) wheel.rotation.z += dt * 0.3;
      });

      // Traffic update
      trafficRef.current?.update(dt, t, camera.position);

      // Remote players
      remotePlayersRef.current?.update(t);

      // Spray effect (naira notes)
      sprayEffectRef.current?.update(dt, t);

      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    // ---- FPS monitor + auto-downgrade ----
    fpsMonitorRef.current = new FpsMonitor(q, (newQ) => {
      // Drop shadow quality / pixel ratio live
      const newCfg = QUALITY_CONFIG[newQ];
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, newCfg.pixelRatio));
      if (!newCfg.shadowsEnabled) {
        renderer.shadowMap.enabled = false;
        sun.castShadow = false;
      }
      qualityRef.current = newQ;
    });

    // ---- Pointer handling: tap=walk, drag=orbit, 2-finger=zoom ----
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    // Pointer down — record start position (could be tap, drag, or joystick)
    const onPointerDown = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      pointerDownPos.current = { x: px, y: py, time: Date.now() };

      // If touch is in bottom-left quadrant → joystick
      if (e.pointerType === "touch" && px < rect.width * 0.4 && py > rect.height * 0.5) {
        joystickRef.current.active = true;
        joystickRef.current.x = px;
        joystickRef.current.y = py;
        joystickRef.current.dx = 0;
        joystickRef.current.dy = 0;
        return;
      }

      // Else → start drag-orbit
      dragStartRef.current = { x: px, y: py, yaw: cameraYawRef.current, pitch: cameraPitchRef.current };
      isDragging.current = false;
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      // Joystick movement
      if (joystickRef.current.active) {
        const dx = px - joystickRef.current.x;
        const dy = py - joystickRef.current.y;
        const maxDist = 50;
        const len = Math.hypot(dx, dy);
        if (len > maxDist) {
          joystickRef.current.dx = (dx / len) * maxDist;
          joystickRef.current.dy = (dy / len) * maxDist;
        } else {
          joystickRef.current.dx = dx;
          joystickRef.current.dy = dy;
        }
        return;
      }

      // Drag orbit
      if (dragStartRef.current && pointerDownPos.current) {
        const dx = px - dragStartRef.current.x;
        const dy = py - dragStartRef.current.y;
        if (Math.hypot(dx, dy) > 5) isDragging.current = true;
        cameraYawRef.current = dragStartRef.current.yaw + dx * 0.005;
        cameraPitchRef.current = Math.max(0.2, Math.min(1.3, dragStartRef.current.pitch + dy * 0.005));
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      // Joystick release
      if (joystickRef.current.active) {
        joystickRef.current.active = false;
        joystickRef.current.dx = 0;
        joystickRef.current.dy = 0;
        return;
      }

      // If was a tap (not drag) → walk to point
      if (pointerDownPos.current && !isDragging.current) {
        const dt = Date.now() - pointerDownPos.current.time;
        if (dt < 300) {
          pointer.x = (px / rect.width) * 2 - 1;
          pointer.y = -(py / rect.height) * 2 + 1;
          raycaster.setFromCamera(pointer, camera);

          // Try place markers first
          const markerObjs = Object.values(markersRef.current);
          const hits = raycaster.intersectObjects(markerObjs, true);
          if (hits.length > 0) {
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
              walkTargetRef.current = new THREE.Vector3(pos.x, 0, pos.z + 2.2);
              pointerDownPos.current = null;
              return;
            }
          }

          // Else: walk to ground point
          const groundMesh = scene.children.find((c) => c instanceof THREE.Mesh && c.geometry instanceof THREE.PlaneGeometry);
          if (groundMesh) {
            const groundHits = raycaster.intersectObject(groundMesh);
            if (groundHits.length > 0) {
              const pt = groundHits[0].point;
              const x = Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, pt.x));
              const z = Math.max(BOUNDS.minZ, Math.min(BOUNDS.maxZ, pt.z));
              walkTargetRef.current = new THREE.Vector3(x, 0, z);
            }
          }
        }
      }

      pointerDownPos.current = null;
      dragStartRef.current = null;
      isDragging.current = false;
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", onPointerUp);

    // ---- Pinch zoom ----
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchStartRef.current = { dist: Math.hypot(dx, dy), zoom: cameraDistanceRef.current };
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchStartRef.current) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const newDist = Math.hypot(dx, dy);
        const ratio = newDist / pinchStartRef.current.dist;
        cameraDistanceRef.current = Math.max(8, Math.min(30, pinchStartRef.current.zoom / ratio));
      }
    };
    const onWheel = (e: WheelEvent) => {
      cameraDistanceRef.current = Math.max(8, Math.min(30, cameraDistanceRef.current + e.deltaY * 0.02));
    };
    renderer.domElement.addEventListener("touchstart", onTouchStart, { passive: true });
    renderer.domElement.addEventListener("touchmove", onTouchMove, { passive: true });
    renderer.domElement.addEventListener("wheel", onWheel, { passive: true });

    // ---- Resize ----
    const onResize = () => {
      if (!mount || !renderer || !camera) return;
      const ww = mount.clientWidth;
      const hh = mount.clientHeight;
      renderer.setSize(ww, hh);
      camera.aspect = ww / hh;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    // ---- onDisconnect for presence ----
    const a = useAuth.getState();
    if (a.uid) {
      dbOnDisconnect(dbRef(rtdb, `presence/${a.uid}`)).remove();
    }

    // ---- Cleanup ----
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onPointerUp);
      renderer.domElement.removeEventListener("touchstart", onTouchStart);
      renderer.domElement.removeEventListener("touchmove", onTouchMove);
      renderer.domElement.removeEventListener("wheel", onWheel);
      window.removeEventListener("naijalavish:spray", onSpray as EventListener);
      remotePlayersRef.current?.dispose();
      trafficRef.current?.dispose();
      sprayEffectRef.current?.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement);
      }
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const m = mesh.material;
        if (Array.isArray(m)) m.forEach((mm) => mm.dispose());
        else if (m) (m as THREE.Material).dispose();
      });
    };
  }, []);

  // ---- Dance emote: update RTDB presence anim field ----
  useEffect(() => {
    const onDance = () => {
      const a = useAuth.getState();
      if (a.uid) {
        void dbWrite(dbRef(rtdb, `presence/${a.uid}/anim`), "dance");
      }
      // Animate local avatar
      if (avatarPartsRef.current) {
        // Will be picked up by the animation loop via a ref flag
        dancingRef.current = true;
      }
    };
    const onStopDance = () => {
      const a = useAuth.getState();
      if (a.uid) {
        void dbWrite(dbRef(rtdb, `presence/${a.uid}/anim`), "idle");
      }
      dancingRef.current = false;
    };
    window.addEventListener("naijalavish:dance", onDance);
    window.addEventListener("naijalavish:stop-dance", onStopDance);
    return () => {
      window.removeEventListener("naijalavish:dance", onDance);
      window.removeEventListener("naijalavish:stop-dance", onStopDance);
    };
  }, []);

  // ---- React to targetPlaceId ----
  useEffect(() => {
    if (!targetPlaceId) return;
    const pos = placePosRef.current[targetPlaceId];
    if (pos) {
      walkTargetRef.current = new THREE.Vector3(pos.x, 0, pos.z + 2.2);
    }
  }, [targetPlaceId]);

  // ---- Interior mode switch ----
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // If same mode, do nothing
    if (interiorModeRef.current === interior) return;
    interiorModeRef.current = interior;

    // Remove existing interior group
    if (interiorGroupRef.current) {
      scene.remove(interiorGroupRef.current);
      interiorGroupRef.current = null;
    }

    if (interior) {
      // Hide city (all place markers + ground + props)
      Object.values(markersRef.current).forEach((g) => { g.visible = false; });
      // Build + add interior
      if (interior === "home") {
        interiorGroupRef.current = buildHomeInterior();
      } else if (interior === "owambe") {
        interiorGroupRef.current = buildOwambeInterior();
      }
      if (interiorGroupRef.current) {
        scene.add(interiorGroupRef.current);
      }
      // Move camera closer for interior
      cameraDistanceRef.current = 10;
      // Position character in room center
      if (charRef.current) {
        charRef.current.position.set(0, 0, 1);
        walkTargetRef.current = null;
      }
    } else {
      // Show city again
      Object.values(markersRef.current).forEach((g) => { g.visible = true; });
      cameraDistanceRef.current = 18;
    }
  }, [interior]);

  // ---- Update avatar look when player lookId changes ----
  const lookId = usePlayer((s) => s.lookId);
  // What the player is wearing right now, as one string so React only reacts when it really changes.
  const wornKey = usePlayer((s) => s.inventory.filter((i) => i.equipped).map((i) => i.id).sort().join(","));
  useEffect(() => {
    if (!avatarPartsRef.current) return;
    const look = activeLook(usePlayer.getState());
    recolorAvatar(avatarPartsRef.current, look);
    // bought clothes go on top of the base look
    applyOutfit(avatarPartsRef.current, wornKey ? wornKey.split(",") : []);
  }, [lookId, wornKey]);

  // ---- Update name tag when name changes ----
  const name = usePlayer((s) => s.name);
  useEffect(() => {
    if (!charRef.current || !nameTagRef.current) return;
    charRef.current.remove(nameTagRef.current);
    const tag = buildNameTag(name || "You", true);
    charRef.current.add(tag);
    nameTagRef.current = tag;
  }, [name]);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0"
      style={{ touchAction: "none", userSelect: "none" }}
      aria-label="Abuja city 3D map. Tap a place marker to walk there. Pinch to zoom."
    />
  );
}
