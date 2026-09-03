"use client";

import { ACCENTS, type DayLog, type Person } from "@/lib/types";
import { MONTHS, fromKey, todayKey, weekKeys } from "@/lib/dates";
import {
  activeDayKeys, allTimeTotals, bestStreak, currentStreak, earnedBadges, nextBadge, totalsForDays,
} from "@/lib/points";
import { CloseIcon, DumbbellIcon, SaladIcon } from "./icons";

export default function ProgressModal({
  people,
  logs,
  onClose,
}: {
  people: Person[];
  logs: Record<string, DayLog>;
  onClose: () => void;
}) {
  const wk = weekKeys();
  const start = fromKey(wk[0]);
  const end = fromKey(wk[wk.length - 1]);
  const rangeLabel = `${start.getDate()} de ${MONTHS[start.getMonth()]} — ${end.getDate()} de ${MONTHS[end.getMonth()]}`;
  const tKey = todayKey();

  const board = people
    .map((p) => {
      const week = totalsForDays(p.id, logs, wk);
      const active = activeDayKeys(p.id, logs);
      const streak = currentStreak(active, tKey);
      const best = bestStreak(active);
      const all = allTimeTotals(p.id, logs);
      return { person: p, week, streak, best, all };
    })
    .sort((a, b) => b.week.points - a.week.points);

  const maxWeekPoints = Math.max(1, ...board.map((b) => b.week.points));
  const allZero = board.every((b) => b.week.points === 0);
  const isTie = board.length > 1 && board[0].week.points === board[1].week.points;
  const leader = board[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 animate-fade sm:items-center" onClick={onClose}>
      <div
        className="flex max-h-[88vh] w-full max-w-md flex-col rounded-t-3xl border border-border bg-surface p-5 pb-8 animate-pop sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Essa semana</p>
            <h2 className="text-lg font-bold">{rangeLabel}</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-muted transition active:scale-90 hover:text-foreground">
            <CloseIcon />
          </button>
        </div>

        <p className="mt-3 shrink-0 text-center text-sm">
          {allZero ? (
            "Ninguém marcou nada essa semana ainda"
          ) : isTie ? (
            "Empate por enquanto"
          ) : (
            <>
              <span className="font-semibold" style={{ color: ACCENTS[leader.person.accent].base }}>
                {leader.person.name}
              </span>{" "}
              está na frente
            </>
          )}
        </p>

        <div className="mt-4 flex flex-col gap-4 overflow-y-auto">
          {board.map(({ person, week, streak, best, all }) => {
            const c = ACCENTS[person.accent];
            const pct = Math.round((week.points / maxWeekPoints) * 100);
            const earned = earnedBadges(best);
            const next = nextBadge(best);
            const streakDisplay = Math.max(streak.current, 0);

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
                  <span className="flex shrink-0 items-center gap-1 text-sm font-bold" style={{ color: c.base }}>
                    ⭐ {all.points}
                  </span>
                </div>

                {/* Streak */}
                <div className="mt-2.5 flex items-center gap-2 text-sm">
                  <span className="flex items-center gap-1 font-bold" style={{ color: streakDisplay > 0 ? c.base : "var(--muted)" }}>
                    🔥 {streakDisplay} {streakDisplay === 1 ? "dia" : "dias"}
                  </span>
                  {!streak.todayDone && streakDisplay > 0 && (
                    <span className="text-xs text-muted">— marque hoje pra manter</span>
                  )}
                  {best > streakDisplay && (
                    <span className="text-xs text-muted">recorde: {best}</span>
                  )}
                </div>

                {/* Progresso da semana */}
                <div className="mt-2.5 flex items-center justify-between text-xs text-muted">
                  <span className="flex items-center gap-3">
                    <span className="flex items-center gap-1" style={{ color: c.base }}><DumbbellIcon size={13} />{week.gym}/7</span>
                    <span className="flex items-center gap-1" style={{ color: c.base }}><SaladIcon size={13} />{week.diet}/7</span>
                  </span>
                  <span>{week.points} pts essa semana</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: c.base }} />
                </div>

                {/* Emblemas */}
                <div className="mt-3 flex items-center gap-1.5 border-t border-border pt-2.5">
                  {earned.length === 0 ? (
                    <span className="text-xs text-muted">Nenhum emblema ainda</span>
                  ) : (
                    earned.map((b) => (
                      <span key={b.days} title={b.label} className="text-base leading-none">{b.emoji}</span>
                    ))
                  )}
                  {next && (
                    <span className="ml-auto text-xs text-muted">
                      próximo: {next.emoji} em {next.days - best} {next.days - best === 1 ? "dia" : "dias"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
