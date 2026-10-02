"use client";
import { useEffect } from "react";

export function Toast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  if (!message) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: 24,
      right: 24,
      background: "var(--ink-2)",
      border: "1px solid var(--border-hover)",
      color: "var(--text)",
      padding: "12px 20px",
      borderRadius: 8,
      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
      zIndex: 9999,
      fontSize: 13,
      display: "flex",
      alignItems: "center",
      gap: 10,
    }}>
      <span>⚠️ {message}</span>
    </div>
  );
}
