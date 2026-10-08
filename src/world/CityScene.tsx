"use client";

// src/world/CityScene.tsx — AfroRush 3D Abuja city scene.
// Based on Naija Lavish's Scene3D architecture but with AfroRush's
// "Abuja at golden hour" art direction + Harmattan Dusk theme.
//
// Features:
// - ~45° pitch camera with smooth damped follow + pinch-zoom
// - Hemisphere + warm sun with soft shadows + day/night cycle
// - 16 Abuja places with unique building silhouettes (not boxes!)
// - Walkable low-poly humanoid character with walk cycle + idle breathing
// - Floating marker rings + labels
// - Ambient traffic (instanced taxis on loops)
// - ACES tone mapping, fog, sRGB
// - Tap-to-walk with raycaster
// - Quality settings: Low/Med/High

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { PLACES_3D, BOUNDS, type Place3D } from "@/game/data/places-abuja";

export interface CitySceneProps {
  onArrive?: (placeId: string) => void;
  quality?: "low" | "medium" | "high";
  gameHour?: number;
  skinTone?: string;
  shirtColor?: string;
  pantsColor?: string;
}

export default function CityScene({
  onArrive,
  quality = "medium",
  gameHour = 9,
  skinTone = "#8d5524",
  shirtColor = "#0d7c4a",
  pantsColor = "#1e3a8a",
}: CitySceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // === SETUP ===
    const isHigh = quality === "high";
    const isLow = quality === "low";

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x1a0f1f, 30, 80);

    const camera = new THREE.PerspectiveCamera(
      42, // FOV 38-45 range, 42 is the sweet spot
      mount.clientWidth / mount.clientHeight,
      0.1, 200
    );
    camera.position.set(0, 30, 28);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isLow,
      powerPreference: "high-performance",
    });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isHigh ? 2 : 1.5));
    renderer.shadowMap.enabled = !isLow;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    // === LIGHTING ===
    const hemi = new THREE.HemisphereLight(0xfff7e8, 0x2b1810, 0.8);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffe4b5, 1.2);
    sun.position.set(20, 30, 10);
    sun.castShadow = !isLow;
    sun.shadow.mapSize.width = isHigh ? 2048 : 1024;
    sun.shadow.mapSize.height = isHigh ? 2048 : 1024;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 60;
    sun.shadow.camera.left = -25;
    sun.shadow.camera.right = 25;
    sun.shadow.camera.top = 25;
    sun.shadow.camera.bottom = -25;
    sun.shadow.bias = -0.0005;
    scene.add(sun);

    const ambient = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambient);

    const moon = new THREE.DirectionalLight(0x9eb5ff, 0);
    moon.position.set(-15, 20, -10);
    scene.add(moon);

    // === GROUND ===
    const groundGeo = new THREE.PlaneGeometry(60, 50);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x3a3a2e, roughness: 0.96 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Roads — cross pattern with lane dashes
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.9 });
    const roadH = new THREE.Mesh(new THREE.PlaneGeometry(50, 4), roadMat);
    roadH.rotation.x = -Math.PI / 2;
    roadH.position.y = 0.01;
    roadH.receiveShadow = true;
    scene.add(roadH);

    const roadV = new THREE.Mesh(new THREE.PlaneGeometry(4, 40), roadMat);
    roadV.rotation.x = -Math.PI / 2;
    roadV.position.y = 0.01;
    roadV.receiveShadow = true;
    scene.add(roadV);

    // Lane dashes
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xd4a017, transparent: true, opacity: 0.6 });
    for (let i = -20; i <= 20; i += 4) {
      const dash1 = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.2), dashMat);
      dash1.rotation.x = -Math.PI / 2;
      dash1.position.set(i, 0.02, 0);
      scene.add(dash1);
      const dash2 = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 2), dashMat);
      dash2.rotation.x = -Math.PI / 2;
      dash2.position.set(0, 0.02, i);
      scene.add(dash2);
    }

    // Sidewalks (slightly raised edges along roads)
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x6b6b5e, roughness: 0.85 });
    for (const [w, d, x, z] of [[50, 0.5, 0, 2.5], [50, 0.5, 0, -2.5], [0.5, 40, 2.5, 0], [0.5, 40, -2.5, 0]] as const) {
      const sw = new THREE.Mesh(new THREE.PlaneGeometry(w, d), sidewalkMat);
      sw.rotation.x = -Math.PI / 2;
      sw.position.set(x, 0.05, z);
      sw.receiveShadow = true;
      scene.add(sw);
    }

    // Grass patches (noisy green areas between buildings)
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x2d5a2d, roughness: 0.95 });
    for (let i = 0; i < 8; i++) {
      const gx = (Math.random() - 0.5) * 36;
      const gz = (Math.random() - 0.5) * 28;
      if (Math.abs(gx) < 4 || Math.abs(gz) < 4) continue; // not on roads
      const grass = new THREE.Mesh(new THREE.CircleGeometry(2 + Math.random() * 2, 8), grassMat);
      grass.rotation.x = -Math.PI / 2;
      grass.position.set(gx, 0.02, gz);
      grass.receiveShadow = true;
      scene.add(grass);
    }

    // Trees (instanced — simple cone + cylinder)
    const treeTrunkGeo = new THREE.CylinderGeometry(0.15, 0.2, 1.5, 6);
    const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.9 });
    const treeLeavesGeo = new THREE.ConeGeometry(1.2, 3, 6);
    const treeLeavesMat = new THREE.MeshStandardMaterial({ color: 0x2d6b1a, roughness: 0.85 });
    const treePositions = [
      [-18, -8], [18, 6], [-10, -14], [12, -12], [6, 12], [-16, 10], [16, -4], [-6, 14],
    ];
    treePositions.forEach(([x, z]) => {
      const trunk = new THREE.Mesh(treeTrunkGeo, treeTrunkMat);
      trunk.position.set(x, 0.75, z);
      trunk.castShadow = true;
      scene.add(trunk);
      const leaves = new THREE.Mesh(treeLeavesGeo, treeLeavesMat);
      leaves.position.set(x, 2.5, z);
      leaves.castShadow = true;
      scene.add(leaves);
    });

    // Aso Rock backdrop (two cones)
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x6b4f3f, roughness: 0.95, flatShading: true });
    const rock1 = new THREE.Mesh(new THREE.ConeGeometry(8, 14, 6), rockMat);
    rock1.position.set(-18, 7, -14);
    rock1.castShadow = true;
    scene.add(rock1);
    const rock2 = new THREE.Mesh(new THREE.ConeGeometry(5, 10, 5), rockMat);
    rock2.position.set(-12, 5, -16);
    rock2.castShadow = true;
    scene.add(rock2);

    // === BUILDINGS — each with unique silhouette ===
    const placeGroups: THREE.Group[] = [];

    PLACES_3D.forEach((place) => {
      const group = new THREE.Group();
      const [x, z] = place.pos;
      group.position.set(x, 0, z);

      buildSilhouette(group, place);

      // Floating marker ring (pulsates)
      const ringGeo = new THREE.RingGeometry(1.6, 1.85, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(place.accent),
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.05;
      group.add(ring);

      // Pole above building
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 1.4, 6),
        new THREE.MeshStandardMaterial({ color: new THREE.Color(place.accent) })
      );
      pole.position.y = place.height + 0.7;
      group.add(pole);

      scene.add(group);
      placeGroups.push(group);
    });

    // === CHARACTER ===
    const charGroup = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(skinTone), roughness: 0.5 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(shirtColor), roughness: 0.6 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(pantsColor), roughness: 0.7 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4 });

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 12), skinMat);
    head.position.y = 1.45;
    head.castShadow = true;
    charGroup.add(head);

    // Body
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.7, 8), shirtMat);
    body.position.y = 0.95;
    body.castShadow = true;
    charGroup.add(body);

    // Arms
    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.55, 6), shirtMat);
    armL.position.set(-0.38, 0.95, 0);
    armL.castShadow = true;
    charGroup.add(armL);
    const armR = armL.clone();
    armR.position.x = 0.38;
    charGroup.add(armR);

    // Legs
    const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.7, 6), pantsMat);
    legL.position.set(-0.15, 0.35, 0);
    legL.castShadow = true;
    charGroup.add(legL);
    const legR = legL.clone();
    legR.position.x = 0.15;
    charGroup.add(legR);

    // Shoes
    const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.28), shoeMat);
    shoeL.position.set(-0.15, 0.04, 0.06);
    shoeL.castShadow = true;
    charGroup.add(shoeL);
    const shoeR = shoeL.clone();
    shoeR.position.x = 0.15;
    charGroup.add(shoeR);

    // Fake shadow blob
    const shadowBlob = new THREE.Mesh(
      new THREE.CircleGeometry(0.55, 16),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 })
    );
    shadowBlob.rotation.x = -Math.PI / 2;
    shadowBlob.position.y = 0.02;
    charGroup.add(shadowBlob);

    // Start at Unity Fountain
    charGroup.position.set(0, 0, 2);
    scene.add(charGroup);

    // === INTERACTION ===
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const walkTarget = new THREE.Vector3(0, 0, 2);
    let isWalking = false;
    let facing = 0;

    function onPointerDown(e: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      // Test place markers first
      for (let i = 0; i < placeGroups.length; i++) {
        const hits = raycaster.intersectObject(placeGroups[i], true);
        if (hits.length > 0) {
          const place = PLACES_3D[i];
          walkTarget.set(place.pos[0], 0, place.pos[1] + 2.2);
          isWalking = true;
          return;
        }
      }

      // Test ground
      const groundHits = raycaster.intersectObject(ground);
      if (groundHits.length > 0) {
        const p = groundHits[0].point;
        walkTarget.set(
          Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, p.x)),
          0,
          Math.max(BOUNDS.minZ, Math.min(BOUNDS.maxZ, p.z))
        );
        isWalking = true;
      }
    }
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.style.touchAction = "none";

    // === DAY/NIGHT CYCLE ===
    function paramsForHour(hour: number) {
      const sunAngle = ((hour - 6) / 12) * Math.PI;
      const sunY = Math.sin(sunAngle);
      const sunX = Math.cos(sunAngle);
      const dayMix = Math.max(0, sunY);
      const horizonMix = Math.max(0, 1 - Math.abs(sunY) * 3);
      const nightCol = new THREE.Color(0x0b1a33);
      const dayCol = new THREE.Color(0x1a0f1f);
      const duskCol = new THREE.Color(0xf59e0b);
      const sky = nightCol.clone().lerp(dayCol, dayMix).lerp(duskCol, horizonMix * 0.5);
      return {
        sky,
        sunY: Math.max(0, sunY),
        sunX,
        sunIntensity: dayMix * 1.2 + 0.1,
        moonIntensity: (1 - dayMix) * 0.4,
        hemiIntensity: 0.4 + dayMix * 0.5,
        ambIntensity: 0.15 + dayMix * 0.2,
        sunCol: new THREE.Color(0xffe4b5).lerp(new THREE.Color(0xff9f43), horizonMix),
        isNight: sunY < 0,
      };
    }

    // === AMBIENT TRAFFIC (instanced taxis on loops) ===
    const taxiMat = new THREE.MeshStandardMaterial({ color: 0xf5ead0, roughness: 0.5 });
    const taxiGeo = new THREE.BoxGeometry(0.6, 0.3, 1.0);
    const taxiRoutes = [
      { axis: "x" as const, z: -1.5, speed: 3, range: [-22, 22] },
      { axis: "x" as const, z: 1.5, speed: -2.5, range: [-22, 22] },
      { axis: "z" as const, x: -1.5, speed: 2, range: [-16, 16] },
      { axis: "z" as const, x: 1.5, speed: -3, range: [-16, 16] },
    ];
    const taxis = taxiRoutes.map((route) => {
      const mesh = new THREE.Mesh(taxiGeo, taxiMat);
      mesh.position.y = 0.25;
      mesh.castShadow = true;
      if (route.axis === "x") { mesh.position.x = route.range[0]; mesh.position.z = route.z; }
      else { mesh.position.z = route.range[0]; mesh.position.x = route.x; }
      mesh.rotation.y = route.axis === "x" ? (route.speed > 0 ? 0 : Math.PI) : (route.speed > 0 ? Math.PI / 2 : -Math.PI / 2);
      scene.add(mesh);
      return { mesh, route, progress: Math.random() };
    });

    // === STREET LAMPS (emissive at night) ===
    const lampPosts: THREE.Mesh[] = [];
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0x2b1810,
      emissive: 0xf5d77a,
      emissiveIntensity: 0,
      roughness: 0.4,
    });
    const lampPositions = [
      [-5, -5], [5, 5], [-5, 5], [5, -5], [-10, 0], [10, 0], [0, -10], [0, 10],
    ];
    lampPositions.forEach(([x, z]) => {
      // Pole
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.08, 2.5, 6),
        new THREE.MeshStandardMaterial({ color: 0x2b1810, roughness: 0.8 })
      );
      pole.position.set(x, 1.25, z);
      pole.castShadow = true;
      scene.add(pole);
      // Lamp head (emissive sphere)
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), lampMat);
      head.position.set(x, 2.6, z);
      scene.add(head);
      lampPosts.push(head);
    });

    // === PINCH ZOOM ===
    let cameraDistance = 32; // current distance from target
    const minZoom = 18;
    const maxZoom = 48;
    const initialDistance = 32;
    let pinchStartDist = 0;
    let pinchStartZoom = cameraDistance;

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchStartDist = Math.sqrt(dx * dx + dy * dy);
        pinchStartZoom = cameraDistance;
      }
    }
    function onTouchMove(e: TouchEvent) {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const delta = (dist - pinchStartDist) * 0.1;
        cameraDistance = Math.max(minZoom, Math.min(maxZoom, pinchStartZoom - delta));
      }
    }
    // Wheel zoom for desktop
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      cameraDistance = Math.max(minZoom, Math.min(maxZoom, cameraDistance + e.deltaY * 0.02));
    }
    renderer.domElement.addEventListener("touchstart", onTouchStart, { passive: true });
    renderer.domElement.addEventListener("touchmove", onTouchMove, { passive: false });
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

    // === ANIMATION LOOP ===
    let raf = 0;
    const clock = new THREE.Clock();

    function animate() {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(0.05, clock.getDelta());
      const t = clock.elapsedTime;

      // Day/night
      const params = paramsForHour(gameHour);
      scene.background = params.sky;
      scene.fog!.color = params.sky;
      sun.position.set(params.sunX * 25, Math.max(2, params.sunY * 30), 10);
      sun.intensity = params.sunIntensity;
      sun.color = params.sunCol;
      moon.intensity = params.moonIntensity;
      hemi.intensity = params.hemiIntensity;
      ambient.intensity = params.ambIntensity;

      // Marker pulsing
      placeGroups.forEach((group, i) => {
        const ring = group.children.find((c) => c instanceof THREE.Mesh && c.geometry instanceof THREE.RingGeometry) as THREE.Mesh | undefined;
        if (ring) {
          const s = 1 + 0.1 * Math.sin(t * 2 + i);
          ring.scale.set(s, s, s);
          (ring.material as THREE.MeshBasicMaterial).opacity = 0.4 + 0.25 * Math.sin(t * 2 + i);
        }
      });

      // Character walk
      if (isWalking) {
        const dx = walkTarget.x - charGroup.position.x;
        const dz = walkTarget.z - charGroup.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < 0.2) {
          isWalking = false;
          // Check nearest place
          for (const place of PLACES_3D) {
            const pd = Math.sqrt(
              (place.pos[0] - charGroup.position.x) ** 2 +
              (place.pos[1] - charGroup.position.z) ** 2
            );
            if (pd < 3.5) {
              onArrive?.(place.id);
              break;
            }
          }
        } else {
          const speed = 6 * dt;
          const moveX = (dx / dist) * speed;
          const moveZ = (dz / dist) * speed;
          charGroup.position.x = Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, charGroup.position.x + moveX));
          charGroup.position.z = Math.max(BOUNDS.minZ, Math.min(BOUNDS.maxZ, charGroup.position.z + moveZ));
          facing = Math.atan2(dx, dz);
          charGroup.rotation.y = facing;
          // Walk animation
          head.position.y = 1.45 + Math.sin(t * 12) * 0.03;
          body.position.y = 0.95 + Math.sin(t * 12) * 0.02;
          legL.rotation.x = Math.sin(t * 12) * 0.5;
          legR.rotation.x = -Math.sin(t * 12) * 0.5;
          armL.rotation.x = -Math.sin(t * 12) * 0.3;
          armR.rotation.x = Math.sin(t * 12) * 0.3;
        }
      } else {
        // Idle breathing
        head.position.y = 1.45 + Math.sin(t * 2) * 0.015;
        body.position.y = 0.95 + Math.sin(t * 2) * 0.01;
        legL.rotation.x = 0;
        legR.rotation.x = 0;
        armL.rotation.x = 0;
        armR.rotation.x = 0;
      }

      // Street lamp glow (emissive at night)
      lampPosts.forEach((lamp) => {
        (lamp.material as THREE.MeshStandardMaterial).emissiveIntensity = params.isNight ? 0.8 : 0;
      });

      // Ambient traffic — taxis loop along roads
      taxis.forEach((taxi) => {
        const { route, mesh } = taxi;
        taxi.progress += dt * 0.01 * Math.abs(route.speed);
        if (taxi.progress > 1) taxi.progress -= 1;
        const pos = route.range[0] + (route.range[1] - route.range[0]) * taxi.progress;
        if (route.axis === "x") mesh.position.x = pos;
        else mesh.position.z = pos;
      });

      // Camera follow (damped) with pinch-zoom distance
      const targetCamX = charGroup.position.x * 0.5 + (isWalking ? 0 : Math.sin(t * 0.08) * 0.4);
      const targetCamZ = charGroup.position.z * 0.5 + cameraDistance * 0.88;
      const targetCamY = cameraDistance * 0.94;
      camera.position.x += (targetCamX - camera.position.x) * 0.04;
      camera.position.z += (targetCamZ - camera.position.z) * 0.04;
      camera.position.y += (targetCamY - camera.position.y) * 0.04;
      camera.lookAt(charGroup.position.x * 0.5, 1, charGroup.position.z * 0.5);

      // Building fade — buildings between camera and character become translucent
      const camPos = camera.position.clone();
      const charPos = new THREE.Vector3(charGroup.position.x, 1, charGroup.position.z);
      const camToChar = new THREE.Vector3().subVectors(charPos, camPos).normalize();
      placeGroups.forEach((group) => {
        const buildingPos = new THREE.Vector3(group.position.x, 2, group.position.z);
        const camToBuilding = new THREE.Vector3().subVectors(buildingPos, camPos);
        const distAlongRay = camToBuilding.dot(camToChar);
        const perpDist = camToBuilding.clone().sub(camToChar.clone().multiplyScalar(distAlongRay)).length();
        // If building is between camera and character (along the view ray) and close to the ray
        const isBlocking = distAlongRay > 2 && distAlongRay < camPos.distanceTo(charPos) - 1 && perpDist < 2.5;
        group.traverse((obj) => {
          if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
            const targetOpacity = isBlocking ? 0.3 : 1.0;
            const currentOpacity = obj.material.opacity;
            if (Math.abs(currentOpacity - targetOpacity) > 0.01) {
              obj.material.transparent = isBlocking || currentOpacity < 1;
              obj.material.opacity += (targetOpacity - currentOpacity) * 0.1;
              if (obj.material.opacity > 0.99 && !isBlocking) {
                obj.material.opacity = 1;
                obj.material.transparent = false;
              }
            }
          }
        });
      });

      renderer.render(scene, camera);
    }
    animate();

    // === RESIZE ===
    const ro = new ResizeObserver(() => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    });
    ro.observe(mount);

    // === CLEANUP ===
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("touchstart", onTouchStart);
      renderer.domElement.removeEventListener("touchmove", onTouchMove);
      renderer.domElement.removeEventListener("wheel", onWheel);
      mount.removeChild(renderer.domElement);
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      renderer.dispose();
    };
  }, [quality, gameHour, skinTone, shirtColor, pantsColor, onArrive]);

  return <div ref={mountRef} className="h-full w-full" style={{ touchAction: "none" }} />;
}

// === BUILDING SILHOUETTES ===
function buildSilhouette(group: THREE.Group, place: Place3D) {
  const h = place.height;
  const color = new THREE.Color(place.color);
  const accent = new THREE.Color(place.accent);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
  const accentMat = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.6 });

  switch (place.silhouette) {
    case "market": {
      // Zinc roof + stalls + umbrellas
      const base = new THREE.Mesh(new THREE.BoxGeometry(3, h, 3), mat);
      base.position.y = h / 2;
      base.castShadow = true;
      group.add(base);
      // Zinc roof (sloped)
      const roof = new THREE.Mesh(new THREE.ConeGeometry(2.5, 1.2, 4), accentMat);
      roof.position.y = h + 0.6;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      group.add(roof);
      // Umbrellas (colored circles on poles)
      const umbrellaColors = [0xff6a1a, 0xffc531, 0x0d7c4a];
      for (let i = 0; i < 3; i++) {
        const um = new THREE.Mesh(
          new THREE.CircleGeometry(0.4, 8),
          new THREE.MeshStandardMaterial({ color: umbrellaColors[i], roughness: 0.5 })
        );
        um.rotation.x = -Math.PI / 2 + 0.2;
        um.position.set(-1.5 + i * 1.2, 1.5, 1.5);
        group.add(um);
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5), new THREE.MeshStandardMaterial({ color: 0x4a3520 }));
        pole.position.set(-1.5 + i * 1.2, 0.75, 1.5);
        group.add(pole);
      }
      break;
    }
    case "tower": {
      // Tall tower with lit crown
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, h, 8), mat);
      tower.position.y = h / 2;
      tower.castShadow = true;
      group.add(tower);
      // Crown (emissive ring at top)
      const crown = new THREE.Mesh(
        new THREE.CylinderGeometry(1.6, 1.6, 0.4, 8),
        new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.5 })
      );
      crown.position.y = h - 0.5;
      group.add(crown);
      // Windows
      for (let i = 1; i < h - 1; i += 1.5) {
        const win = new THREE.Mesh(
          new THREE.PlaneGeometry(0.4, 0.6),
          new THREE.MeshStandardMaterial({ color: 0xfff5d6, emissive: 0xfff5d6, emissiveIntensity: 0.2 })
        );
        win.position.set(1.85, i, 0);
        win.rotation.y = Math.PI / 2;
        group.add(win);
      }
      break;
    }
    case "mosque": {
      // Golden dome + minarets
      const base = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, h * 0.5, 8), mat);
      base.position.y = h * 0.25;
      base.castShadow = true;
      group.add(base);
      // Dome
      const dome = new THREE.Mesh(new THREE.SphereGeometry(1.8, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), accentMat);
      dome.position.y = h * 0.5;
      dome.castShadow = true;
      group.add(dome);
      // Minarets (2 thin towers)
      for (const [mx, mz] of [[-2, -2], [2, 2]]) {
        const minaret = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, h, 6), mat);
        minaret.position.set(mx, h / 2, mz);
        minaret.castShadow = true;
        group.add(minaret);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.5, 6), accentMat);
        cap.position.set(mx, h + 0.25, mz);
        group.add(cap);
      }
      break;
    }
    case "rock": {
      // Rock mass (irregular cones)
      const rock1 = new THREE.Mesh(new THREE.ConeGeometry(3, h, 5), new THREE.MeshStandardMaterial({ color: color, roughness: 0.95, flatShading: true }));
      rock1.position.y = h / 2;
      rock1.castShadow = true;
      group.add(rock1);
      const rock2 = new THREE.Mesh(new THREE.ConeGeometry(2, h * 0.7, 4), new THREE.MeshStandardMaterial({ color: accent, roughness: 0.95, flatShading: true }));
      rock2.position.set(1.5, h * 0.35, 1);
      rock2.castShadow = true;
      group.add(rock2);
      break;
    }
    case "lake": {
      // Shimmering water plane
      const water = new THREE.Mesh(
        new THREE.PlaneGeometry(6, 4),
        new THREE.MeshStandardMaterial({ color: accent, roughness: 0.1, metalness: 0.6 })
      );
      water.rotation.x = -Math.PI / 2;
      water.position.y = 0.02;
      group.add(water);
      // Small boat
      const boat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.4), mat);
      boat.position.set(0.5, 0.2, 0);
      boat.castShadow = true;
      group.add(boat);
      break;
    }
    case "park": {
      // Fountains and gardens (low green area)
      const grass = new THREE.Mesh(new THREE.CircleGeometry(2.5, 8), new THREE.MeshStandardMaterial({ color: 0x2d6b1a, roughness: 0.9 }));
      grass.rotation.x = -Math.PI / 2;
      grass.position.y = 0.03;
      group.add(grass);
      // Fountain
      const fountain = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.3, 8), accentMat);
      fountain.position.y = 0.15;
      fountain.castShadow = true;
      group.add(fountain);
      // Trees
      for (const [tx, tz] of [[-1.5, -1], [1.5, 1], [-1, 1.5]]) {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 1), new THREE.MeshStandardMaterial({ color: 0x4a3520 }));
        trunk.position.set(tx, 0.5, tz);
        group.add(trunk);
        const leaves = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.2, 6), new THREE.MeshStandardMaterial({ color: 0x2d6b1a }));
        leaves.position.set(tx, 1.4, tz);
        leaves.castShadow = true;
        group.add(leaves);
      }
      break;
    }
    case "ferris": {
      // Rotating Ferris wheel
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1, 1.5), mat);
      base.position.y = 0.5;
      base.castShadow = true;
      group.add(base);
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(2, 0.1, 6, 16), accentMat);
      wheel.position.y = h - 1;
      wheel.rotation.y = Math.PI / 2;
      group.add(wheel);
      // Spokes
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.05, 4, 0.05), mat);
        spoke.position.y = h - 1;
        spoke.rotation.z = angle;
        group.add(spoke);
      }
      break;
    }
    case "flyover": {
      // Flyover bridge (elevated road)
      const pillar1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, h, 0.6), mat);
      pillar1.position.set(-2, h / 2, 0);
      pillar1.castShadow = true;
      group.add(pillar1);
      const pillar2 = new THREE.Mesh(new THREE.BoxGeometry(0.6, h, 0.6), mat);
      pillar2.position.set(2, h / 2, 0);
      pillar2.castShadow = true;
      group.add(pillar2);
      // Deck
      const deck = new THREE.Mesh(new THREE.BoxGeometry(5, 0.4, 1.5), accentMat);
      deck.position.y = h;
      deck.castShadow = true;
      group.add(deck);
      break;
    }
    case "mansion": {
      // Mansion with gates
      const main = new THREE.Mesh(new THREE.BoxGeometry(3, h, 2.5), mat);
      main.position.y = h / 2;
      main.castShadow = true;
      group.add(main);
      // Roof
      const roof = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1, 4), accentMat);
      roof.position.y = h + 0.5;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      group.add(roof);
      // Gate pillars
      for (const [gx] of [[-2], [2]]) {
        const gate = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.5, 0.4), new THREE.MeshStandardMaterial({ color: 0xd4a017 }));
        gate.position.set(gx, 0.75, 2);
        gate.castShadow = true;
        group.add(gate);
      }
      // Palm trees
      for (const [px, pz] of [[-2.5, -1], [2.5, -1]]) {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.5), new THREE.MeshStandardMaterial({ color: 0x4a3520 }));
        trunk.position.set(px, 1.25, pz);
        group.add(trunk);
        const leaves = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1, 6), new THREE.MeshStandardMaterial({ color: 0x2d6b1a }));
        leaves.position.set(px, 2.8, pz);
        leaves.castShadow = true;
        group.add(leaves);
      }
      break;
    }
    case "arch": {
      // Gate arch
      const left = new THREE.Mesh(new THREE.BoxGeometry(0.5, h, 0.5), mat);
      left.position.set(-1.5, h / 2, 0);
      left.castShadow = true;
      group.add(left);
      const right = new THREE.Mesh(new THREE.BoxGeometry(0.5, h, 0.5), mat);
      right.position.set(1.5, h / 2, 0);
      right.castShadow = true;
      group.add(right);
      const top = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.8, 0.5), accentMat);
      top.position.y = h;
      top.castShadow = true;
      group.add(top);
      break;
    }
    case "dome": {
      // Domed hall (National Assembly)
      const base = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, h * 0.5, 8), mat);
      base.position.y = h * 0.25;
      base.castShadow = true;
      group.add(base);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(1.5, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), accentMat);
      dome.position.y = h * 0.5;
      dome.castShadow = true;
      group.add(dome);
      // Columns
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, h * 0.5, 6), new THREE.MeshStandardMaterial({ color: 0xf5ead0 }));
        col.position.set(Math.cos(angle) * 2.2, h * 0.25, Math.sin(angle) * 2.2);
        col.castShadow = true;
        group.add(col);
      }
      break;
    }
    case "roundabout": {
      // Roundabout with taxis
      const center = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1, 1, 8), accentMat);
      center.position.y = 0.5;
      center.castShadow = true;
      group.add(center);
      // Ring road
      const ring = new THREE.Mesh(new THREE.RingGeometry(2, 2.5, 16), new THREE.MeshStandardMaterial({ color: 0x2a2a2a }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.04;
      group.add(ring);
      // Taxis (small boxes)
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2;
        const taxi = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.7), new THREE.MeshStandardMaterial({ color: 0xf5ead0 }));
        taxi.position.set(Math.cos(angle) * 2.2, 0.2, Math.sin(angle) * 2.2);
        taxi.rotation.y = angle + Math.PI / 2;
        taxi.castShadow = true;
        group.add(taxi);
      }
      break;
    }
    case "nightmarket": {
      // String lights + food carts
      const base = new THREE.Mesh(new THREE.BoxGeometry(2.5, h * 0.6, 2.5), mat);
      base.position.y = h * 0.3;
      base.castShadow = true;
      group.add(base);
      // String lights (small emissive spheres on a line)
      for (let i = 0; i < 6; i++) {
        const light = new THREE.Mesh(
          new THREE.SphereGeometry(0.08, 6, 6),
          new THREE.MeshStandardMaterial({ color: 0xf5d77a, emissive: 0xf5d77a, emissiveIntensity: 0.8 })
        );
        light.position.set(-1.5 + i * 0.6, h + 0.3, 0);
        group.add(light);
      }
      // Food cart
      const cart = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.4), accentMat);
      cart.position.set(1.5, 0.25, 1);
      cart.castShadow = true;
      group.add(cart);
      break;
    }
    case "home": {
      // Small compound with gate
      const wall = new THREE.Mesh(new THREE.BoxGeometry(3, h * 0.7, 2.5), mat);
      wall.position.y = h * 0.35;
      wall.castShadow = true;
      group.add(wall);
      // Roof (flat)
      const roof = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.2, 2.7), accentMat);
      roof.position.y = h * 0.75;
      group.add(roof);
      // Gate
      const gate = new THREE.Mesh(new THREE.BoxGeometry(1, h * 0.5, 0.1), new THREE.MeshStandardMaterial({ color: 0xd4a017 }));
      gate.position.set(0, h * 0.25, 1.3);
      group.add(gate);
      // Window
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshStandardMaterial({ color: 0xfff5d6, emissive: 0xfff5d6, emissiveIntensity: 0.15 }));
      win.position.set(0, h * 0.4, 1.31);
      group.add(win);
      break;
    }
    case "fountain": {
      // Particle water fountain
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, 0.5, 8), mat);
      base.position.y = 0.25;
      base.castShadow = true;
      group.add(base);
      const water = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.1, 8), new THREE.MeshStandardMaterial({ color: accent, transparent: true, opacity: 0.6, roughness: 0.1 }));
      water.position.y = 0.55;
      group.add(water);
      // Water jet (cone)
      const jet = new THREE.Mesh(new THREE.ConeGeometry(0.3, 2, 6), new THREE.MeshStandardMaterial({ color: accent, transparent: true, opacity: 0.3 }));
      jet.position.y = 1.5;
      group.add(jet);
      break;
    }
    default: {
      // Generic building (box + pyramid roof)
      const building = new THREE.Mesh(new THREE.BoxGeometry(3, h, 3), mat);
      building.position.y = h / 2;
      building.castShadow = true;
      group.add(building);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(2.5, 1.2, 4), accentMat);
      roof.position.y = h + 0.6;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      group.add(roof);
    }
  }
}
