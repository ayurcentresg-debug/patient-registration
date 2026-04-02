"use client";

import { useEffect } from "react";

interface ToastProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [onClose, duration]);

  return (
    <div
      className="fixed top-5 right-5 z-[200] flex items-center gap-2 px-4 py-3 text-[15px] font-semibold yoda-slide-in"
      style={{
        background: type === "success" ? "var(--green)" : "var(--red)",
        color: "#fff",
        borderRadius: "var(--radius-sm)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        minWidth: 240,
      }}
    >
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-80 hover:opacity-100">&times;</button>
    </div>
  );
}
