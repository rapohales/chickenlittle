"use client";

import { ACCENTS, type Person } from "@/lib/types";
import { MONTHS, fromKey, weekKeys } from "@/lib/dates";
import { CloseIcon, DumbbellIcon, SaladIcon } from "./icons";

type Stats = { gym: number; diet: number };

export default function WeekSummaryModal({
  people,
  statsFor,
  onClose,
}: {
  people: Person[];
  statsFor: (personId: string) => Stats;
  onClose: () => void;
}) {
  const wk = weekKeys();
  const start = fromKey(wk[0]);
  const end = fromKey(wk[wk.length - 1]);
  const rangeLabel = `${start.getDate()} de ${MONTHS[start.getMonth()]} — ${end.getDate()} de ${MONTHS[end.getMonth()]}`;

  const scored = people
    .map((p) => {
      const s = statsFor(p.id);
      return { person: p, ...s, total: s.gym + s.diet };
    })
    .sort((a, b) => b.total - a.total);

  const maxTotal = Math.max(1, ...scored.map((s) => s.total));
  const allZero = scored.every((s) => s.total === 0);
  const isTie = scored.length > 1 && scored[0].total === scored[1].total;
  const leader = scored[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 animate-fade sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl border border-border bg-surface p-5 pb-8 animate-pop sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Essa semana</p>
            <h2 className="text-lg font-bold">{rangeLabel}</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-muted transition active:scale-90 hover:text-foreground">
            <CloseIcon />
          </button>
        </div>

        <p className="mt-4 text-center text-sm">
          {allZero ? (
            "Ninguém marcou nada essa semana ainda"
          ) : isTie ? (
            "Empate por enquanto 🤝"
          ) : (
            <>
              <span className="font-semibold" style={{ color: ACCENTS[leader.person.accent].base }}>
                {leader.person.name}
              </span>{" "}
              está na frente 🏆
            </>
          )}
        </p>

        <div className="mt-4 flex flex-col gap-3">
          {scored.map(({ person, gym, diet, total }) => {
            const c = ACCENTS[person.accent];
            const pct = Math.round((total / maxTotal) * 100);
            return (
              <div key={person.id} className="rounded-2xl border border-border bg-surface-2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                      style={{ background: c.soft, color: c.base }}
                    >
                      {person.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="truncate">{person.name}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3 text-sm font-bold" style={{ color: c.base }}>
                    <span className="flex items-center gap-1"><DumbbellIcon size={14} />{gym}/7</span>
                    <span className="flex items-center gap-1"><SaladIcon size={14} />{diet}/7</span>
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: c.base }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
