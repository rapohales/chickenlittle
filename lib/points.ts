import type { DayLog } from "./types";
import { fromKey, toKey } from "./dates";

export type Badge = { days: number; emoji: string; label: string };

export const BADGES: Badge[] = [
  { days: 3, emoji: "🔥", label: "3 dias" },
  { days: 7, emoji: "⚡", label: "1 semana" },
  { days: 14, emoji: "💪", label: "2 semanas" },
  { days: 30, emoji: "🏅", label: "1 mês" },
  { days: 60, emoji: "🥈", label: "2 meses" },
  { days: 100, emoji: "🥇", label: "100 dias" },
  { days: 180, emoji: "👑", label: "6 meses" },
  { days: 365, emoji: "🏆", label: "1 ano" },
];

export type Totals = { gym: number; diet: number; perfect: number; points: number };

const emptyTotals = (): Totals => ({ gym: 0, diet: 0, perfect: 0, points: 0 });

// Pontuação de um dia: +1 academia, +1 dieta, +1 bônus se fez os dois ("dia perfeito").
function addDay(totals: Totals, log: DayLog | undefined) {
  if (!log) return;
  const gym = !!log.gym, diet = !!log.diet;
  if (gym) totals.gym++;
  if (diet) totals.diet++;
  if (gym && diet) totals.perfect++;
  totals.points += (gym ? 1 : 0) + (diet ? 1 : 0) + (gym && diet ? 1 : 0);
}

// Soma os pontos de uma pessoa apenas nos dias informados (ex: os 7 dias da semana).
export function totalsForDays(pid: string, logs: Record<string, DayLog>, dayKeys: string[]): Totals {
  const totals = emptyTotals();
  for (const day of dayKeys) addDay(totals, logs[`${pid}|${day}`]);
  return totals;
}

// Soma os pontos de uma pessoa em todo o histórico já registrado.
export function allTimeTotals(pid: string, logs: Record<string, DayLog>): Totals {
  const totals = emptyTotals();
  for (const key in logs) {
    if (key.startsWith(`${pid}|`)) addDay(totals, logs[key]);
  }
  return totals;
}

// Dias (chaves YYYY-MM-DD) em que a pessoa fez pelo menos uma coisa, em ordem crescente.
export function activeDayKeys(pid: string, logs: Record<string, DayLog>): string[] {
  const keys: string[] = [];
  for (const key in logs) {
    if (!key.startsWith(`${pid}|`)) continue;
    const log = logs[key];
    if (log.gym || log.diet) keys.push(log.day);
  }
  return keys.sort();
}

function shiftKey(key: string, deltaDays: number): string {
  const d = fromKey(key);
  d.setDate(d.getDate() + deltaDays);
  return toKey(d);
}

// Sequência atual de dias seguidos com atividade. Se hoje ainda não foi
// registrado, conta a partir de ontem — assim o dia de hoje fica "em aberto"
// em vez de parecer que a sequência já quebrou.
export function currentStreak(activeDays: string[], todayKey: string): { current: number; todayDone: boolean } {
  const set = new Set(activeDays);
  const todayDone = set.has(todayKey);
  let cursor = todayDone ? todayKey : shiftKey(todayKey, -1);
  let current = 0;
  while (set.has(cursor)) {
    current++;
    cursor = shiftKey(cursor, -1);
  }
  return { current, todayDone };
}

// Maior sequência já alcançada (recorde), considerando todo o histórico.
export function bestStreak(activeDays: string[]): number {
  if (activeDays.length === 0) return 0;
  let best = 1, run = 1;
  for (let i = 1; i < activeDays.length; i++) {
    const prev = fromKey(activeDays[i - 1]);
    const next = fromKey(activeDays[i]);
    const diffDays = Math.round((next.getTime() - prev.getTime()) / 86_400_000);
    run = diffDays === 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

export function earnedBadges(best: number): Badge[] {
  return BADGES.filter((b) => b.days <= best);
}

export function nextBadge(best: number): Badge | null {
  return BADGES.find((b) => b.days > best) ?? null;
}
