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
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-10 bg-background px-6 animate-fade">
      <div className="text-center animate-rise">
        <div className="mb-4 text-6xl drop-shadow-[0_8px_24px_rgba(255,255,255,0.08)]">🐣</div>
        <h1 className="text-3xl font-bold tracking-tight">Quem é você?</h1>
        <p className="mt-1.5 text-sm text-muted">Escolha seu perfil pra começar</p>
      </div>

      <div className="grid w-full max-w-sm gap-3">
        {people.map((p, i) => {
          const c = ACCENTS[p.accent];
          return (
            <button
              key={p.id}
              onClick={() => onPick(p.id)}
              className="card flex items-center gap-4 rounded-2xl p-4 text-left transition active:scale-[0.98] animate-rise"
              style={{ animationDelay: `${80 + i * 60}ms`, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 1px ${c.soft}` }}
            >
              <span
                className="flex h-13 w-13 items-center justify-center rounded-full text-xl font-bold"
                style={{ background: c.soft, color: c.base, boxShadow: `0 0 24px -4px ${c.base}55` }}
              >
                {p.name.trim().charAt(0).toUpperCase() || "?"}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-lg font-semibold">{p.name}</span>
                <span className="text-xs text-muted">Sou eu</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
