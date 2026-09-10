import type { DayLog, Person } from "./types";
import { fromKey, shiftKey, weekStartKey } from "./dates";

// ============================================================
//  Pontuação SEMANAL, normalizada pela meta de cada pessoa.
//
//  A ideia: quem tem meta de 3x e faz 3x ganha o mesmo que quem
//  tem meta de 5x e faz 5x. O que conta é bater a SUA meta, não
//  o volume bruto — assim a comparação entre os dois é justa.
// ============================================================

export const DEFAULT_GOAL = 3;
export const goalOf = (p: Person): number => Math.min(7, Math.max(1, p.weekly_goal ?? DEFAULT_GOAL));

export const SCORING = {
  goal: 100,        // bater a meta de academia = 100 (proporcional se não bater)
  goalBonus: 25,    // bônus por bater a meta
  dietDay: 10,      // cada dia comendo bem
  extraSession: 10, // cada treino além da meta...
  maxExtras: 2,     // ...até este limite (evita "meta 1x, faço 6x" pra farmar ponto)
} as const;

export type Breakdown = { goal: number; bonus: number; diet: number; extra: number };

export function weekPoints(gym: number, diet: number, goal: number) {
  const g = Math.max(1, goal);
  const goalPts = Math.round((Math.min(gym, g) / g) * SCORING.goal);
  const hit = gym >= g;
  const extras = Math.min(Math.max(gym - g, 0), SCORING.maxExtras);
  const breakdown: Breakdown = {
    goal: goalPts,
    bonus: hit ? SCORING.goalBonus : 0,
    diet: diet * SCORING.dietDay,
    extra: extras * SCORING.extraSession,
  };
  const total = breakdown.goal + breakdown.bonus + breakdown.diet + breakdown.extra;
  return { total, breakdown, hit };
}

export type WeekSummary = {
  weekStart: string; // chave do domingo
  gym: number;
  diet: number;
  goal: number;
  hit: boolean;
  points: number;
  breakdown: Breakdown;
};

export function summarizeWeek(
  pid: string, logs: Record<string, DayLog>, weekStart: string, goal: number,
): WeekSummary {
  let gym = 0, diet = 0;
  for (let i = 0; i < 7; i++) {
    const l = logs[`${pid}|${shiftKey(weekStart, i)}`];
    if (l?.gym) gym++;
    if (l?.diet) diet++;
  }
  const { total, breakdown, hit } = weekPoints(gym, diet, goal);
  return { weekStart, gym, diet, goal, hit, points: total, breakdown };
}

// Todas as semanas em que a pessoa registrou algo, em ordem crescente.
export function allWeeks(pid: string, logs: Record<string, DayLog>, goal: number): WeekSummary[] {
  const starts = new Set<string>();
  for (const key in logs) {
    if (!key.startsWith(`${pid}|`)) continue;
    const l = logs[key];
    if (l.gym || l.diet) starts.add(weekStartKey(l.day));
  }
  return [...starts].sort().map((ws) => summarizeWeek(pid, logs, ws, goal));
}

export function allTimePoints(pid: string, logs: Record<string, DayLog>, goal: number): number {
  return allWeeks(pid, logs, goal).reduce((sum, w) => sum + w.points, 0);
}

export function totalSessions(pid: string, logs: Record<string, DayLog>): number {
  let n = 0;
  for (const key in logs) if (key.startsWith(`${pid}|`) && logs[key].gym) n++;
  return n;
}

// ------------------------------------------------------------
//  Streak por SEMANAS batendo a meta (não por dias seguidos —
//  ninguém vai à academia 7 dias por semana).
//
//  A semana atual só entra na conta se já bateu a meta. Senão ela
//  fica "em aberto" e a sequência começa na semana passada.
// ------------------------------------------------------------
export function weeklyStreak(
  pid: string, logs: Record<string, DayLog>, goal: number, today: string,
): { current: number; best: number; thisWeekHit: boolean } {
  const hitSet = new Set(allWeeks(pid, logs, goal).filter((w) => w.hit).map((w) => w.weekStart));
  const thisWeek = weekStartKey(today);
  const thisWeekHit = hitSet.has(thisWeek);

  let cursor = thisWeekHit ? thisWeek : shiftKey(thisWeek, -7);
  let current = 0;
  while (hitSet.has(cursor)) { current++; cursor = shiftKey(cursor, -7); }

  let best = 0, run = 0, prev: string | null = null;
  for (const ws of [...hitSet].sort()) {
    run = prev !== null && shiftKey(prev, 7) === ws ? run + 1 : 1;
    if (run > best) best = run;
    prev = ws;
  }
  return { current, best, thisWeekHit };
}

// ------------------------------------------------------------
//  Emblemas — duas trilhas: constância (semanas seguidas na meta)
//  e volume (total de treinos). Uma vez ganho, fica pra sempre.
// ------------------------------------------------------------
export type Badge = { kind: "streak" | "volume"; threshold: number; emoji: string; label: string };

export const STREAK_BADGES: Badge[] = [
  { kind: "streak", threshold: 2,  emoji: "🔥", label: "2 semanas na meta" },
  { kind: "streak", threshold: 4,  emoji: "⚡", label: "1 mês na meta" },
  { kind: "streak", threshold: 8,  emoji: "💪", label: "2 meses na meta" },
  { kind: "streak", threshold: 12, emoji: "🏅", label: "3 meses na meta" },
  { kind: "streak", threshold: 26, emoji: "👑", label: "6 meses na meta" },
  { kind: "streak", threshold: 52, emoji: "🏆", label: "1 ano na meta" },
];

export const VOLUME_BADGES: Badge[] = [
  { kind: "volume", threshold: 10,  emoji: "🌱", label: "10 treinos" },
  { kind: "volume", threshold: 25,  emoji: "🌿", label: "25 treinos" },
  { kind: "volume", threshold: 50,  emoji: "🌳", label: "50 treinos" },
  { kind: "volume", threshold: 100, emoji: "🥇", label: "100 treinos" },
  { kind: "volume", threshold: 250, emoji: "💎", label: "250 treinos" },
];

export function badgeStatus(bestStreak: number, sessions: number) {
  const earned = [
    ...STREAK_BADGES.filter((b) => b.threshold <= bestStreak),
    ...VOLUME_BADGES.filter((b) => b.threshold <= sessions),
  ];
  const nextStreak = STREAK_BADGES.find((b) => b.threshold > bestStreak) ?? null;
  const nextVolume = VOLUME_BADGES.find((b) => b.threshold > sessions) ?? null;
  return { earned, nextStreak, nextVolume };
}

// ------------------------------------------------------------
//  Estatísticas auxiliares (painel "treino de hoje").
// ------------------------------------------------------------

// Média de treinos por semana nas últimas 4 semanas — ou desde o
// primeiro treino, se a pessoa começou faz menos tempo que isso.
export function gymPerWeek(pid: string, logs: Record<string, DayLog>, today: string): number {
  const gymDays: string[] = [];
  for (const key in logs) {
    if (key.startsWith(`${pid}|`) && logs[key].gym) gymDays.push(logs[key].day);
  }
  if (gymDays.length === 0) return 0;
  gymDays.sort();

  const windowStart = shiftKey(today, -27);
  const from = gymDays[0] > windowStart ? gymDays[0] : windowStart;
  const inWindow = gymDays.filter((d) => d >= from && d <= today).length;
  const spanDays = Math.round((fromKey(today).getTime() - fromKey(from).getTime()) / 86_400_000) + 1;
  return Math.round((inWindow / Math.max(1, spanDays / 7)) * 10) / 10;
}

// Quantas vezes cada treino já foi feito, no histórico todo.
export function workoutCounts(pid: string, logs: Record<string, DayLog>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const key in logs) {
    if (!key.startsWith(`${pid}|`)) continue;
    const l = logs[key];
    if (l.gym && l.workout_id) counts[l.workout_id] = (counts[l.workout_id] ?? 0) + 1;
  }
  return counts;
}
