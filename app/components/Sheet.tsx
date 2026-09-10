"use client";

import { useEffect } from "react";
import { CloseIcon } from "./icons";

// Casca compartilhada dos modais: bottom sheet no celular, centralizado no
// desktop. Cuida do backdrop, do ESC, do "grabber" e de travar o scroll da
// página enquanto está aberto.
export default function Sheet({
  title,
  eyebrow,
  onClose,
  children,
}: {
  title: React.ReactNode;
  eyebrow?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-[2px] animate-fade sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="sheet flex max-h-[92vh] w-full max-w-md flex-col rounded-t-3xl px-5 pt-3 animate-pop sm:rounded-3xl sm:pt-5"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-border-strong sm:hidden" />

        <div className="flex shrink-0 items-start justify-between gap-3">
          <div className="min-w-0">
            {eyebrow && <p className="text-[11px] font-medium uppercase tracking-wider text-muted">{eyebrow}</p>}
            <h2 className="text-lg font-bold leading-tight tracking-tight">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="-mr-2 -mt-1 rounded-full p-2 text-muted transition active:scale-90 hover:text-foreground"
            aria-label="Fechar"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
