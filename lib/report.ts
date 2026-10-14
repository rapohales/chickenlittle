import type { DayLog } from "./types";
import { MONTHS, shiftKey, toKey, weekStartKey } from "./dates";
import { summarizeWeek } from "./points";

// ============================================================
//  Relatórios mensal e anual.
//
//  Contagens de dias (treinos, dieta) usam a data exata.
//  Pontos e metas são semanais, e uma semana pertence ao mês da sua
//  quarta-feira (o mês que contém a maior parte dela) — assim cada
//  semana entra em exatamente um mês, sem contar ponto duas vezes.
// ============================================================

export type Bucket = { label: string; title: string; value: number | null };

export type PersonReport = {
  gym: number;
  diet: number;
  perfect: number;       // academia + dieta no mesmo dia
  points: number;
  weeksHit: number;
  weeksCounted: number;  // semanas fechadas (+ a atual, se já bateu a meta)
  workouts: Record<string, number>;
  buckets: Bucket[];     // série do gráfico: semanas (mês) ou meses (ano)
  hasData: boolean;
};

const SHORT_MONTHS = MONTHS.map((m) => m.slice(0, 3));

function firstActiveWeek(pid: string, logs: Record<string, DayLog>): string | null {
  let first: string | null = null;
  for (const key in logs) {
    if (!key.startsWith(`${pid}|`)) continue;
    const l = logs[key];
    if ((l.gym || l.diet) && (first === null || l.day < first)) first = l.day;
  }
  return first ? weekStartKey(first) : null;
}

export function periodRange(mode: "month" | "year", year: number, month: number) {
  return mode === "month"
    ? { from: toKey(new Date(year, month, 1)), to: toKey(new Date(year, month + 1, 0)) }
    : { from: toKey(new Date(year, 0, 1)), to: toKey(new Date(year, 11, 31)) };
}

export function personReport(
  pid: string,
  logs: Record<string, DayLog>,
  goal: number,
  mode: "month" | "year",
  year: number,
  month: number,
  today: string,
): PersonReport {
  const { from, to } = periodRange(mode, year, month);
  const last = to < today ? to : today;

  // ---- contagens por dia ---------------------------------------------
  let gym = 0, diet = 0, perfect = 0;
  const workouts: Record<string, number> = {};
  const perMonthGym = new Array<number>(12).fill(0);
  for (let d = from; d <= last; d = shiftKey(d, 1)) {
    const l = logs[`${pid}|${d}`];
    if (!l) continue;
    if (l.gym) { gym++; perMonthGym[Number(d.slice(5, 7)) - 1]++; }
    if (l.diet) diet++;
    if (l.gym && l.diet) perfect++;
    if (l.gym && l.workout_id) workouts[l.workout_id] = (workouts[l.workout_id] ?? 0) + 1;
  }

  // ---- semanas (pontos e metas) --------------------------------------
  const start = firstActiveWeek(pid, logs);
  const thisWeek = weekStartKey(today);
  let points = 0, weeksHit = 0, weeksCounted = 0;
  const weekBuckets: Bucket[] = [];

  const dm = (k: string) => `${Number(k.slice(8))}/${Number(k.slice(5, 7))}`;

  for (let ws = weekStartKey(from); ws <= to; ws = shiftKey(ws, 7)) {
    const future = ws > thisWeek;

    // Gráfico: toda semana que encosta no mês, contando só os dias do mês —
    // assim a soma das barras bate com o total de treinos do período.
    const a = ws < from ? from : ws;
    const we = shiftKey(ws, 6);
    const b = we > to ? to : we;
    let inMonth = 0;
    for (let d = a; d <= b && d <= last; d = shiftKey(d, 1)) if (logs[`${pid}|${d}`]?.gym) inMonth++;
    weekBuckets.push({ label: dm(a), title: `${dm(a)} a ${dm(b)}`, value: future ? null : inMonth });

    // Pontos e metas: a semana inteira, atribuída ao mês da sua quarta-feira.
    const mid = shiftKey(ws, 3);
    if (mid < from || mid > to) continue;
    const before = start === null || ws < start;
    const w = summarizeWeek(pid, logs, ws, goal);
    if (future || before) continue;
    points += w.points;
    if (w.hit) weeksHit++;
    if (ws < thisWeek || w.hit) weeksCounted++; // semana atual só conta depois de batida
  }

  const monthBuckets: Bucket[] = SHORT_MONTHS.map((m, i) => ({
    label: m,
    title: `${MONTHS[i]} de ${year}`,
    value: toKey(new Date(year, i, 1)) > today ? null : perMonthGym[i],
  }));

  return {
    gym, diet, perfect, points, weeksHit, weeksCounted, workouts,
    buckets: mode === "month" ? weekBuckets : monthBuckets,
    hasData: gym + diet > 0,
  };
}

// Dias em que os dois treinaram — a estatística "do casal".
export function daysTogether(
  ids: string[], logs: Record<string, DayLog>, from: string, to: string, today: string,
): number {
  if (ids.length < 2) return 0;
  const last = to < today ? to : today;
  let n = 0;
  for (let d = from; d <= last; d = shiftKey(d, 1)) {
    if (ids.every((id) => logs[`${id}|${d}`]?.gym)) n++;
  }
  return n;
}
