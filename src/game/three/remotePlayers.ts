// Remote players manager.
// Subscribes to RTDB presence for the current zone, builds avatars for each
// remote player, smoothly interpolates their position + animates walk cycle.

import * as THREE from "three";
import { usePlayer } from "../store/usePlayer";
import { useAuth } from "../store/useAuth";
import { listenToPresence, listenToChat, type PresenceEntry, type ChatDoc } from "@/lib/firestore";
import { LOOK_BY_ID } from "../data/items";
import { buildAvatar, buildNameTag, buildChatBubble, recolorAvatar, animateAvatar, type AvatarParts } from "./avatar";

interface RemotePlayer {
  uid: string;
  parts: AvatarParts;
  nameTag: THREE.Sprite;
  bubble?: THREE.Sprite;
  bubbleUntil: number;
  // Target position (latest from RTDB)
  tx: number;
  tz: number;
  try: number;
  // Current animated position
  cx: number;
  cz: number;
  cry: number;
  lookId: string;
  anim: string;
  lastUpdate: number;
}

export class RemotePlayers {
  private group = new THREE.Group();
  private players = new Map<string, RemotePlayer>();
  private unsub: (() => void) | null = null;
  private unsubChat: (() => void) | null = null;
  private chatLog: ChatDoc[] = [];
  private scene: THREE.Scene;
  private currentZone: string;

  constructor(scene: THREE.Scene, zone: string = "city") {
    this.scene = scene;
    this.currentZone = zone;
    scene.add(this.group);
    this.subscribe(zone);
    this.subscribeChat();
  }

  setZone(zone: string) {
    if (zone === this.currentZone) return;
    this.currentZone = zone;
    this.subscribe(zone);
  }

  private subscribe(zone: string) {
    if (this.unsub) this.unsub();
    // Clear existing avatars (zone changed)
    this.players.forEach((rp) => {
      this.group.remove(rp.parts.group);
      this.group.remove(rp.nameTag);
      if (rp.bubble) this.group.remove(rp.bubble);
    });
    this.players.clear();

    this.unsub = listenToPresence(zone, (entries) => {
      const myUid = useAuth.getState().uid;
      const seen = new Set<string>();
      for (const entry of entries) {
        if (entry.uid === myUid) continue; // skip self
        seen.add(entry.uid);
        const existing = this.players.get(entry.uid);
        if (existing) {
          // Update target position + look + anim
          existing.tx = entry.x || 0;
          existing.tz = entry.z || 0;
          existing.try = entry.ry || 0;
          (existing as any).anim = (entry as any).anim || "idle";
          existing.lastUpdate = Date.now();
          if (entry.lookId && entry.lookId !== existing.lookId) {
            const look = LOOK_BY_ID[entry.lookId];
            if (look) {
              recolorAvatar(existing.parts, look);
              existing.lookId = entry.lookId;
            }
          }
        } else {
          // New player — build avatar
          const look = LOOK_BY_ID[entry.lookId] || LOOK_BY_ID["man-1"];
          const parts = buildAvatar(look);
          parts.group.position.set(entry.x || 0, 0, entry.z || 0);
          parts.group.rotation.y = entry.ry || 0;
          this.group.add(parts.group);
          const nameTag = buildNameTag(entry.name || "Player", false);
          parts.group.add(nameTag);
          this.players.set(entry.uid, {
            uid: entry.uid,
            parts,
            nameTag,
            bubbleUntil: 0,
            tx: entry.x || 0,
            tz: entry.z || 0,
            try: entry.ry || 0,
            cx: entry.x || 0,
            cz: entry.z || 0,
            cry: entry.ry || 0,
            anim: (entry as any).anim || "idle",
            lookId: entry.lookId || "man-1",
            lastUpdate: Date.now(),
          });
        }
      }
      // Remove players not seen this update (or stale)
      for (const [uid, rp] of this.players) {
        if (!seen.has(uid) || Date.now() - rp.lastUpdate > 30_000) {
          this.group.remove(rp.parts.group);
          this.players.delete(uid);
        }
      }
    });
  }

  private subscribeChat() {
    this.unsubChat = listenToChat((msgs) => {
      this.chatLog = msgs;
      // Show bubble for any new message from a remote player
      const now = Date.now();
      for (const m of msgs) {
        if (m.uid === useAuth.getState().uid) continue;
        const rp = this.players.get(m.uid);
        if (!rp) continue;
        if (m.t > (rp.bubbleUntil - 5000)) {
          // Show bubble
          if (rp.bubble) {
            this.group.remove(rp.bubble);
          }
          rp.bubble = buildChatBubble(m.text);
          rp.parts.group.add(rp.bubble);
          rp.bubbleUntil = now + 5000;
        }
      }
    });
  }

  /** Update all remote players (called every frame). */
  update(t: number) {
    const now = Date.now();
    for (const rp of this.players.values()) {
      // Smooth interpolation (lerp)
      const lerpRate = 0.12;
      rp.cx += (rp.tx - rp.cx) * lerpRate;
      rp.cz += (rp.tz - rp.cz) * lerpRate;
      // Rotate toward target heading
      let dRot = rp.try - rp.cry;
      while (dRot > Math.PI) dRot -= Math.PI * 2;
      while (dRot < -Math.PI) dRot += Math.PI * 2;
      rp.cry += dRot * lerpRate;
      rp.parts.group.position.set(rp.cx, 0, rp.cz);
      rp.parts.group.rotation.y = rp.cry;

      // Walking detection (if target > 0.5 away from current)
      const dist = Math.hypot(rp.tx - rp.cx, rp.tz - rp.cz);
      const walking = dist > 0.05;
      // Use "dance" anim if presence says so, otherwise walk/idle
      const anim = (rp as any).anim === "dance" ? "dance" : "idle";
      animateAvatar(rp.parts, t, walking, anim);

      // Hide bubble after 5s
      if (rp.bubble && now > rp.bubbleUntil) {
        rp.parts.group.remove(rp.bubble);
        rp.bubble = undefined;
      }
    }
  }

  dispose() {
    if (this.unsub) this.unsub();
    if (this.unsubChat) this.unsubChat();
    this.scene.remove(this.group);
    this.players.clear();
  }
}
