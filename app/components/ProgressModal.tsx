"use client";

import { ACCENTS, type DayLog, type Person } from "@/lib/types";
import { MONTHS, fromKey, todayKey, weekKeys, weekStartKey } from "@/lib/dates";
import {
  SCORING, allTimePoints, badgeStatus, goalOf, summarizeWeek, totalSessions, weeklyStreak,
} from "@/lib/points";
import { DumbbellIcon, SaladIcon } from "./icons";
import Sheet from "./Sheet";
import GoalSegments from "./GoalSegments";

const fmt = (n: number) => n.toLocaleString("pt-BR");

export default function ProgressModal({
  people,
  logs,
  onClose,
}: {
  people: Person[];
  logs: Record<string, DayLog>;
  onClose: () => void;
}) {
  const tKey = todayKey();
  const ws = weekStartKey(tKey);
  const wk = weekKeys();
  const start = fromKey(wk[0]);
  const end = fromKey(wk[6]);
  const rangeLabel = `${start.getDate()} de ${MONTHS[start.getMonth()]} — ${end.getDate()} de ${MONTHS[end.getMonth()]}`;

  const board = people
    .map((p) => {
      const goal = goalOf(p);
      const week = summarizeWeek(p.id, logs, ws, goal);
      const streak = weeklyStreak(p.id, logs, goal, tKey);
      const sessions = totalSessions(p.id, logs);
      const total = allTimePoints(p.id, logs, goal);
      return { person: p, goal, week, streak, sessions, total, badges: badgeStatus(streak.best, sessions) };
    })
    .sort((a, b) => b.week.points - a.week.points);

  const maxWeek = Math.max(1, ...board.map((b) => b.week.points));
  const allZero = board.every((b) => b.week.points === 0);
  const tie = board.length > 1 && board[0].week.points === board[1].week.points;
  const leader = board[0];

  return (
    <Sheet eyebrow="Essa semana" title={rangeLabel} onClose={onClose}>
      <p className="text-center text-sm">
        {allZero ? (
          <span className="text-muted">Ninguém marcou nada essa semana ainda</span>
        ) : tie ? (
          "Empate por enquanto"
        ) : (
          <>
            <span className="font-semibold" style={{ color: ACCENTS[leader.person.accent].base }}>{leader.person.name}</span>
            {" "}está na frente
          </>
        )}
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {board.map(({ person, goal, week, streak, sessions, total, badges }) => {
          const c = ACCENTS[person.accent];
          const pct = Math.round((week.points / maxWeek) * 100);
          const b = week.breakdown;

          return (
            <div key={person.id} className="card rounded-2xl p-4">
              {/* Nome + total geral */}
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{ background: c.soft, color: c.base }}>
                    {person.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="truncate">{person.name}</span>
                </span>
                <span className="shrink-0 text-sm font-bold tabular-nums" style={{ color: c.base }}>
                  ⭐ {fmt(total)}
                </span>
              </div>

              {/* Meta da semana */}
              <div className="mt-3.5 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted">Meta da semana</p>
                  <div className="mt-1.5 flex items-center gap-2.5">
                    <GoalSegments done={week.gym} goal={goal} color={c.base} size="lg" />
                    <span className="text-sm font-bold tabular-nums" style={{ color: week.hit ? c.base : "var(--foreground)" }}>
                      {week.gym}/{goal}
                    </span>
                    {week.hit && <span className="text-xs font-semibold" style={{ color: c.base }}>meta batida ✓</span>}
                  </div>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-sm font-semibold tabular-nums" style={{ color: c.base }}>
                  <SaladIcon size={14} /> {week.diet}<span className="text-xs font-normal text-muted">/7</span>
                </span>
              </div>

              {/* Pontos da semana */}
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-muted tabular-nums">
                  {b.goal} meta · {b.diet} dieta
                  {b.bonus > 0 && ` · +${b.bonus} bônus`}
                  {b.extra > 0 && ` · +${b.extra} extra`}
                </span>
                <span className="font-bold tabular-nums" style={{ color: c.base }}>{week.points} pts</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
                <div className="h-full rounded-full animate-grow" style={{ width: `${pct}%`, background: c.base }} />
              </div>

              {/* Streak semanal */}
              <div className="mt-3.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="font-bold" style={{ color: streak.current > 0 ? c.base : "var(--muted)" }}>
                  🔥 {streak.current} {streak.current === 1 ? "semana" : "semanas"} na meta
                </span>
                {streak.current > 0 && !streak.thisWeekHit && (
                  <span className="text-xs text-muted">— bata a meta essa semana pra manter</span>
                )}
                {streak.best > streak.current && (
                  <span className="text-xs text-muted">· recorde {streak.best}</span>
                )}
              </div>

              {/* Emblemas */}
              <div className="mt-3 border-t border-border pt-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {badges.earned.length === 0 ? (
                    <span className="text-xs text-muted">Nenhum emblema ainda</span>
                  ) : (
                    badges.earned.map((bd) => (
                      <span key={`${bd.kind}-${bd.threshold}`} title={bd.label}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-base leading-none"
                        style={{ background: c.soft }}>
                        {bd.emoji}
                      </span>
                    ))
                  )}
                </div>
                <div className="mt-2 flex flex-col gap-0.5 text-[11px] text-muted">
                  {badges.nextStreak && (
                    <span>
                      {badges.nextStreak.emoji} {badges.nextStreak.label}: faltam{" "}
                      <b className="text-foreground">{badges.nextStreak.threshold - streak.best}</b>{" "}
                      {badges.nextStreak.threshold - streak.best === 1 ? "semana" : "semanas"}
                    </span>
                  )}
                  {badges.nextVolume && (
                    <span>
                      {badges.nextVolume.emoji} {badges.nextVolume.label}: faltam{" "}
                      <b className="text-foreground">{badges.nextVolume.threshold - sessions}</b>{" "}
                      <DumbbellIcon size={10} className="inline" /> ({sessions} até agora)
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <details className="mt-4 rounded-xl border border-border bg-surface-2/50 px-3 py-2 text-xs text-muted">
        <summary className="cursor-pointer select-none font-medium text-foreground/80">Como funciona a pontuação</summary>
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-4">
          <li><b className="text-foreground">{SCORING.goal} pts</b> por bater a meta de academia da semana (proporcional se não bater: 2 de 3 = {Math.round((2 / 3) * SCORING.goal)}).</li>
          <li><b className="text-foreground">+{SCORING.goalBonus}</b> de bônus ao bater a meta.</li>
          <li><b className="text-foreground">+{SCORING.dietDay}</b> por dia comendo bem.</li>
          <li><b className="text-foreground">+{SCORING.extraSession}</b> por treino além da meta (máx. {SCORING.maxExtras}).</li>
          <li>Cada um define a própria meta no perfil. Quem bate 3 de 3 ganha o mesmo que quem bate 5 de 5 — o que vale é a constância.</li>
        </ul>
      </details>
    </Sheet>
  );
}
