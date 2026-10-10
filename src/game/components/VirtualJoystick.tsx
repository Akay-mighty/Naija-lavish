"use client";

import { useEffect, useRef, useState } from "react";

interface JoystickProps {
  onMove: (dx: number, dy: number) => void;
  onEnd: () => void;
}

export default function VirtualJoystick({ onMove, onEnd }: JoystickProps) {
  const [active, setActive] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const baseRef = useRef<HTMLDivElement>(null);
  const touchId = useRef<number | null>(null);

  // Base position (bottom-left of screen)
  const baseX = 70;
  const baseY = -70; // 70px from bottom
  const maxDist = 45;

  useEffect(() => {
    function handleStart(e: TouchEvent) {
      const rect = baseRef.current?.getBoundingClientRect();
      if (!rect) return;
      // Check if touch is near the joystick area (bottom-left)
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        if (t.clientX < window.innerWidth * 0.4 && t.clientY > window.innerHeight * 0.5) {
          touchId.current = t.identifier;
          setActive(true);
          break;
        }
      }
    }

    function handleMove(e: TouchEvent) {
      if (!active || touchId.current === null) return;
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        if (t.identifier === touchId.current) {
          const rect = baseRef.current?.getBoundingClientRect();
          if (!rect) return;
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          let dx = t.clientX - cx;
          let dy = t.clientY - cy;
          const len = Math.hypot(dx, dy);
          if (len > maxDist) {
            dx = (dx / len) * maxDist;
            dy = (dy / len) * maxDist;
          }
          setPos({ x: dx, y: dy });
          onMove(dx / maxDist, dy / maxDist);
          break;
        }
      }
    }

    function handleEnd(e: TouchEvent) {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchId.current) {
          touchId.current = null;
          setActive(false);
          setPos({ x: 0, y: 0 });
          onEnd();
          break;
        }
      }
    }

    window.addEventListener("touchstart", handleStart, { passive: false });
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleEnd);
    window.addEventListener("touchcancel", handleEnd);
    return () => {
      window.removeEventListener("touchstart", handleStart);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
      window.removeEventListener("touchcancel", handleEnd);
    };
  }, [active, onMove, onEnd]);

  return (
    <div
      ref={baseRef}
      style={{
        position: "fixed",
        left: 20,
        bottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
        width: 100,
        height: 100,
        zIndex: 25,
        pointerEvents: "none",
      }}
    >
      {/* Outer ring */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.3)",
          background: "rgba(0,0,0,0.15)",
          backdropFilter: "blur(4px)",
        }}
      />
      {/* Inner knob */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 40,
          height: 40,
          marginLeft: -20,
          marginTop: -20,
          borderRadius: "50%",
          background: active ? "rgba(0,135,90,0.8)" : "rgba(255,255,255,0.5)",
          border: "2px solid white",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          transform: `translate(${pos.x}px, ${pos.y}px)`,
          transition: active ? "none" : "transform 0.15s ease",
        }}
      />
    </div>
  );
}
