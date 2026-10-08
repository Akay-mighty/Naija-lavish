"use client";

import { useToasts } from "../store/useToasts";

export default function Toasts() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);

  if (toasts.length === 0) return null;
  return (
    <div id="toasts" style={{ pointerEvents: "auto" }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast ${t.kind}`}
          onClick={() => dismiss(t.id)}
          role="status"
        >
          {t.icon && <span className="text-base">{t.icon}</span>}
          <span className="flex-1">{t.text}</span>
        </div>
      ))}
    </div>
  );
}
