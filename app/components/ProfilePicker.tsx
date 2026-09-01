"use client";

import { ACCENTS, type Person } from "@/lib/types";

export default function ProfilePicker({
  people,
  onPick,
}: {
  people: Person[];
  onPick: (id: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-background px-6 animate-fade">
      <div className="text-center">
        <div className="text-5xl mb-3">🐣</div>
        <h1 className="text-2xl font-bold tracking-tight">Quem é você?</h1>
        <p className="text-muted mt-1 text-sm">Escolha seu perfil pra começar</p>
      </div>

      <div className="grid w-full max-w-sm gap-3">
        {people.map((p) => {
          const c = ACCENTS[p.accent];
          return (
            <button
              key={p.id}
              onClick={() => onPick(p.id)}
              className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 text-left transition active:scale-[0.98]"
              style={{ borderColor: c.soft }}
            >
              <span
                className="flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold"
                style={{ background: c.soft, color: c.base }}
              >
                {p.name.trim().charAt(0).toUpperCase() || "?"}
              </span>
              <span className="flex flex-col">
                <span className="text-lg font-semibold">{p.name}</span>
                <span className="text-xs text-muted">Sou eu</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
