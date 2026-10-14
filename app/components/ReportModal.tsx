"use client";

import { useState } from "react";
import { ACCENTS, type DayLog, type Person, type Workout } from "@/lib/types";
import { MONTHS, todayKey } from "@/lib/dates";
import { goalOf } from "@/lib/points";
import { daysTogether, periodRange, personReport } from "@/lib/report";
import { ChevronLeft, ChevronRight, DumbbellIcon, SaladIcon } from "./icons";
import Sheet from "./Sheet";
import BarChart from "./BarChart";

type Mode = "month" | "year";
const fmt = (n: number) => n.toLocaleString("pt-BR");

export default function ReportModal({
  people, logs, workouts, initialYear, initialMonth, onClose,
}: {
  people: Person[];
  logs: Record<string, DayLog>;
  workouts: Workout[];
  initialYear: number;
  initialMonth: number;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<Mode>("month");
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);

  const today = todayKey();
  const now = new Date();
  const atLatest = mode === "month"
    ? year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth())
    : year >= now.getFullYear();

  const step = (delta: number) => {
    if (mode === "year") { setYear((y) => y + delta); return; }
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const { from, to } = periodRange(mode, year, month);
  const workoutName = new Map(workouts.map((w) => [w.id, w.name]));
  const reports = people.map((p) => ({
    person: p,
    goal: goalOf(p),
    r: personReport(p.id, logs, goalOf(p), mode, year, month, today),
  }));
  const together = daysTogether(people.map((p) => p.id), logs, from, to, today);
  const totalGym = reports.reduce((s, x) => s + x.r.gym, 0);
  const anyData = reports.some((x) => x.r.hasData);

  const periodTitle = mode === "month" ? `${MONTHS[month]} ${year}` : `${year}`;

  return (
    <Sheet eyebrow="Relatório" title={periodTitle} onClose={onClose}>
      {/* Mês / Ano */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 rounded-xl border border-border bg-surface-2 p-1">
          {(["month", "year"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="flex-1 rounded-lg py-1.5 text-sm font-semibold transition"
              style={mode === m
                ? { background: "var(--surface-3)", color: "var(--foreground)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)" }
                : { color: "var(--muted)" }}
            >
              {m === "month" ? "Mês" : "Ano"}
            </button>
          ))}
        </div>
        <button onClick={() => step(-1)} className="card rounded-full p-2 transition active:scale-90" aria-label="Período anterior">
          <ChevronLeft size={18} />
        </button>
        <button onClick={() => step(1)} disabled={atLatest}
          className="card rounded-full p-2 transition active:scale-90 disabled:opacity-30" aria-label="Próximo período">
          <ChevronRight size={18} />
        </button>
      </div>

      {!anyData ? (
        <div className="card mt-4 rounded-2xl px-4 py-10 text-center">
          <p className="text-3xl">📭</p>
          <p className="mt-2 text-sm font-medium">Nada registrado em {periodTitle.toLowerCase()}</p>
          <p className="mt-1 text-xs text-muted">Use as setas pra ver outro período.</p>
        </div>
      ) : (
        <>
          {/* Resumo do casal */}
          {people.length > 1 && (
            <div className="card mt-4 grid grid-cols-2 divide-x divide-border rounded-2xl py-3">
              <Stat value={fmt(totalGym)} label="treinos somados" />
              <Stat value={fmt(together)} label={together === 1 ? "dia treinaram juntos" : "dias treinaram juntos"} />
            </div>
          )}

          <div className="mt-3 flex flex-col gap-3">
            {reports.map(({ person, goal, r }) => {
              const c = ACCENTS[person.accent];
              const top = Object.entries(r.workouts)
                .map(([id, n]) => ({ name: workoutName.get(id) ?? "Treino removido", n }))
                .sort((a, b) => b.n - a.n);

              return (
                <section key={person.id} className="card rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                        style={{ background: c.soft, color: c.base }}>
                        {person.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="truncate">{person.name}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-lg font-bold leading-none tabular-nums">⭐ {fmt(r.points)}</span>
                      <span className="text-[10px] uppercase tracking-wider text-muted">pontos</span>
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-4 gap-1 rounded-xl bg-surface py-2.5">
                    <Stat value={fmt(r.gym)} label="treinos" icon={<DumbbellIcon size={12} />} iconColor={c.base} />
                    <Stat value={fmt(r.diet)} label="comi bem" icon={<SaladIcon size={12} />} iconColor={c.base} />
                    <Stat value={fmt(r.perfect)} label="perfeitos" />
                    <Stat value={r.weeksCounted ? `${r.weeksHit}/${r.weeksCounted}` : "—"} label="metas" />
                  </div>

                  <p className="mb-1 mt-4 text-[11px] font-medium uppercase tracking-wider text-muted">
                    Treinos por {mode === "month" ? "semana" : "mês"}
                  </p>
                  <BarChart
                    buckets={r.buckets}
                    color={c.chart}
                    goal={mode === "month" ? goal : undefined}
                  />

                  {top.length > 0 && (
                    <div className="mt-3 border-t border-border pt-3">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted">Treinos mais feitos</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {top.map((t) => (
                          <span key={t.name} className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs">
                            {t.name} <b className="tabular-nums">{t.n}x</b>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          <p className="mt-3 text-center text-[10px] text-muted">
            Pontos e metas contam por semana. Cada semana entra no mês da sua quarta-feira.
          </p>
        </>
      )}
    </Sheet>
  );
}

function Stat({ value, label, icon, iconColor }: {
  value: string; label: string; icon?: React.ReactNode; iconColor?: string;
}) {
  return (
    <div className="flex flex-col items-center px-1 text-center">
      <span className="flex items-center gap-1 text-base font-bold tabular-nums">
        {icon && <span style={{ color: iconColor }}>{icon}</span>}
        {value}
      </span>
      <span className="mt-0.5 text-[10px] leading-tight text-muted">{label}</span>
    </div>
  );
}
