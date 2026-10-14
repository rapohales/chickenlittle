"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { ACCENTS, type Accent, type DayLog, type Person, type Workout } from "@/lib/types";
import {
  MONTHS, WEEKDAYS, friendlyDate, greeting, monthGrid, toKey, todayKey, weekStartKey,
} from "@/lib/dates";
import { goalOf, gymPerWeek, summarizeWeek, workoutCounts, type WeekSummary } from "@/lib/points";
import { ChartIcon, ExternalIcon, ChevronLeft, ChevronRight, DumbbellIcon, SaladIcon, PencilIcon, CheckIcon, CloseIcon } from "./icons";
import ProfilePicker from "./ProfilePicker";
import DayModal from "./DayModal";
import ProgressModal from "./ProgressModal";
import ReportModal from "./ReportModal";
import GoalSegments from "./GoalSegments";
import Sheet from "./Sheet";

const ME_KEY = "cl-me";
const logKey = (pid: string, day: string) => `${pid}|${day}`;
const byId = <T extends { id: string }>(a: T, b: T) => a.id.localeCompare(b.id);

export default function CalendarApp() {
  const [people, setPeople] = useState<Person[]>([]);
  const [logs, setLogs] = useState<Record<string, DayLog>>({});
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [showReport, setShowReport] = useState(false);

  // ---- carga inicial ---------------------------------------------------
  const loadAll = useCallback(async () => {
    const [p, l, w] = await Promise.all([
      supabase.from("people").select("*").order("id"),
      supabase.from("day_logs").select("*"),
      supabase.from("workouts").select("*").order("created_at"),
    ]);
    const err = p.error ?? l.error ?? w.error;
    if (err) { setError(err.message); return; }

    setPeople((p.data as Person[]) ?? []);
    const map: Record<string, DayLog> = {};
    for (const row of (l.data as DayLog[]) ?? []) map[logKey(row.person_id, row.day)] = row;
    setLogs(map);
    setWorkouts((w.data as Workout[]) ?? []);
  }, []);

  // ---- realtime: aplica só o que mudou, sem refazer o fetch inteiro -----
  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    setMeId(localStorage.getItem(ME_KEY));
    loadAll().finally(() => setLoading(false));

    const onLog = (payload: RealtimePostgresChangesPayload<DayLog>) => {
      setLogs((prev) => {
        const next = { ...prev };
        if (payload.eventType === "DELETE") {
          const old = payload.old;
          if (old.person_id && old.day) delete next[logKey(old.person_id, old.day)];
        } else {
          const row = payload.new;
          next[logKey(row.person_id, row.day)] = row;
        }
        return next;
      });
    };
    const onPerson = (payload: RealtimePostgresChangesPayload<Person>) => {
      setPeople((prev) => {
        if (payload.eventType === "DELETE") return prev.filter((p) => p.id !== payload.old.id);
        const row = payload.new;
        const rest = prev.filter((p) => p.id !== row.id);
        return [...rest, row].sort(byId);
      });
    };
    const onWorkout = (payload: RealtimePostgresChangesPayload<Workout>) => {
      setWorkouts((prev) => {
        if (payload.eventType === "DELETE") return prev.filter((w) => w.id !== payload.old.id);
        const row = payload.new;
        return prev.some((w) => w.id === row.id)
          ? prev.map((w) => (w.id === row.id ? row : w))
          : [...prev, row];
      });
    };

    const channel = supabase
      .channel("rotina-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "day_logs" }, onLog)
      .on("postgres_changes", { event: "*", schema: "public", table: "people" }, onPerson)
      .on("postgres_changes", { event: "*", schema: "public", table: "workouts" }, onWorkout)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadAll]);

  // ---- derivados (memoizados) ----------------------------------------
  const tKey = todayKey();
  const me = useMemo(() => people.find((p) => p.id === meId) ?? null, [people, meId]);
  const other = useMemo(() => people.find((p) => p.id !== meId) ?? null, [people, meId]);
  const getLog = useCallback((pid: string, day: string) => logs[logKey(pid, day)], [logs]);

  const workoutById = useMemo(() => new Map(workouts.map((w) => [w.id, w])), [workouts]);
  const myWorkouts = useMemo(() => workouts.filter((w) => w.person_id === meId), [workouts, meId]);
  const workoutNameOf = useCallback((pid: string, day: string) => {
    const id = logs[logKey(pid, day)]?.workout_id;
    return id ? workoutById.get(id)?.name ?? null : null;
  }, [logs, workoutById]);

  // Resumo da semana atual de cada pessoa (meta, treinos, dieta, pontos).
  const weekNow = useMemo<Record<string, WeekSummary>>(() => {
    const ws = weekStartKey(tKey);
    return Object.fromEntries(people.map((p) => [p.id, summarizeWeek(p.id, logs, ws, goalOf(p))]));
  }, [people, logs, tKey]);

  const myStats = useMemo(
    () => (me ? { perWeek: gymPerWeek(me.id, logs, tKey), counts: workoutCounts(me.id, logs) } : null),
    [me, logs, tKey],
  );

  const cells = useMemo(() => monthGrid(view.year, view.month), [view.year, view.month]);

  // ---- mutações --------------------------------------------------------
  const saveLog = useCallback(async (
    day: string,
    patch: { gym: boolean; diet: boolean; notes: string; workout_id: string | null },
  ) => {
    if (!meId) return;
    const row: DayLog = { person_id: meId, day, ...patch, updated_at: new Date().toISOString() };
    setLogs((prev) => ({ ...prev, [logKey(meId, day)]: row })); // otimista
    setSelectedDay(null);
    const { error } = await supabase.from("day_logs").upsert(row, { onConflict: "person_id,day" });
    if (error) { setError(error.message); loadAll(); }
  }, [meId, loadAll]);

  const createWorkout = useCallback(async (name: string): Promise<Workout | null> => {
    if (!meId) return null;
    const { data, error } = await supabase.from("workouts").insert({ person_id: meId, name }).select().single();
    if (error) { setError(error.message); return null; }
    const created = data as Workout;
    setWorkouts((prev) => (prev.some((w) => w.id === created.id) ? prev : [...prev, created]));
    return created;
  }, [meId]);

  const updatePerson = useCallback(async (id: string, patch: Partial<Pick<Person, "name" | "accent" | "weekly_goal">>) => {
    setPeople((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p))); // otimista
    const { error } = await supabase.from("people").update(patch).eq("id", id);
    if (error) { setError(error.message); loadAll(); } // desfaz o otimismo
  }, [loadAll]);

  const pickMe = useCallback((id: string) => {
    localStorage.setItem(ME_KEY, id);
    setMeId(id);
    setShowSettings(false);
  }, []);

  // ---- estados de borda ------------------------------------------------
  if (!isSupabaseConfigured) return <SetupScreen />;
  if (loading) return <Splash />;
  if (error && people.length === 0) return <ErrorScreen message={error} />;
  if (!me) return <ProfilePicker people={people} onPick={pickMe} />;

  const c = ACCENTS[me.accent];
  const goMonth = (delta: number) =>
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-4 pb-12 animate-rise">
      {/* Cabeçalho */}
      <header className="flex items-start justify-between gap-3 pt-6 pb-5">
        <div className="min-w-0">
          <p className="text-xs text-muted">{friendlyDate()}</p>
          <h1 className="mt-0.5 truncate text-2xl font-bold tracking-tight">
            {greeting()}, {me.name.split(" ")[0]}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => setShowReport(true)}
            className="card flex h-10 w-10 items-center justify-center rounded-full text-muted transition active:scale-95 hover:text-foreground"
            aria-label="Relatório mensal e anual"
            title="Relatório"
          >
            <ChartIcon />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="card flex h-10 items-center justify-center rounded-full px-1.5 transition active:scale-95"
            aria-label="Perfis e configurações"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
              style={{ background: c.soft, color: c.base }}>
              {me.name.charAt(0).toUpperCase()}
            </span>
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          <span className="min-w-0 flex-1">{error}</span>
          <button onClick={() => setError(null)} aria-label="Fechar aviso" className="shrink-0 opacity-70 hover:opacity-100">
            <CloseIcon size={14} />
          </button>
        </div>
      )}

      {/* Meta da semana — barra de progresso dos dois */}
      <button
        onClick={() => setShowProgress(true)}
        className="card flex items-center gap-2 rounded-2xl px-3 py-2.5 text-left transition active:scale-[0.99]"
      >
        <div className="flex min-w-0 flex-1 items-center gap-4 overflow-x-auto">
          {people.map((p) => {
            const w = weekNow[p.id];
            const pc = ACCENTS[p.accent];
            return (
              <div key={p.id} className="flex shrink-0 items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                  style={{ background: pc.soft, color: pc.base }}>
                  {p.name.charAt(0).toUpperCase()}
                </span>
                <div className="flex flex-col gap-1">
                  <span className="max-w-[72px] truncate text-[11px] font-medium leading-none text-muted">
                    {p.name.split(" ")[0]}
                  </span>
                  <GoalSegments done={w.gym} goal={w.goal} color={pc.base} />
                </div>
                <span className="text-xs font-bold tabular-nums" style={{ color: w.hit ? pc.base : "var(--foreground)" }}>
                  {w.gym}/{w.goal}
                </span>
                <span className="flex items-center gap-0.5 text-[11px] font-semibold tabular-nums" style={{ color: pc.base }}>
                  <SaladIcon size={11} />{w.diet}
                </span>
              </div>
            );
          })}
        </div>
        <ChevronRight size={16} className="shrink-0 text-muted" />
      </button>

      {/* Navegação do mês */}
      <div className="mt-6 mb-2 flex items-center justify-between">
        <button onClick={() => goMonth(-1)} className="card rounded-full p-2 transition active:scale-90" aria-label="Mês anterior">
          <ChevronLeft />
        </button>
        <button
          onClick={() => setShowReport(true)}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-lg font-bold tracking-tight transition active:scale-95"
          title="Ver relatório do mês"
        >
          {MONTHS[view.month]} <span className="font-normal text-muted">{view.year}</span>
          <ChartIcon size={14} className="text-muted" />
        </button>
        <button onClick={() => goMonth(1)} className="card rounded-full p-2 transition active:scale-90" aria-label="Próximo mês">
          <ChevronRight />
        </button>
      </div>

      {/* Grade */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1 text-[11px] font-medium text-muted">{w}</div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={`e${i}`} />;
          const key = toKey(date);
          const isToday = key === tKey;
          const isFuture = key > tKey;
          return (
            <button
              key={key}
              disabled={isFuture}
              onClick={() => setSelectedDay(key)}
              className="relative flex aspect-square flex-col items-center rounded-xl border p-1 transition-all duration-100 active:translate-y-px active:scale-[0.96] active:shadow-none disabled:opacity-30 disabled:shadow-none"
              style={{
                borderColor: isToday ? c.base : "var(--border)",
                background: isToday ? c.soft : "var(--surface-2)",
                boxShadow: isToday
                  ? `0 2px 0 0 ${c.base}66, 0 0 18px -4px ${c.base}55`
                  : "0 2px 0 0 rgba(0,0,0,0.45)",
              }}
            >
              <span className="text-[12px] font-bold leading-none" style={{ color: isToday ? c.base : "var(--foreground)" }}>
                {date.getDate()}
              </span>
              <div className="mt-auto flex w-full flex-col items-center gap-[3px] pb-0.5">
                {people.map((p) => (
                  <DayMark key={p.id} accent={ACCENTS[p.accent]} log={getLog(p.id, key)} />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-center gap-3 text-[11px] text-muted">
        <span>Toque num dia pra registrar</span>
        <span className="flex items-center gap-1"><DumbbellIcon size={12} /> treino</span>
        <span className="flex items-center gap-1"><SaladIcon size={12} /> comi bem</span>
      </div>

      {/* Treino de hoje + frequência */}
      {myStats && (
        <TodayPanel
          people={people}
          me={me}
          todayKeyStr={tKey}
          getLog={getLog}
          workoutNameOf={workoutNameOf}
          perWeek={myStats.perWeek}
          counts={myStats.counts}
          myWorkouts={myWorkouts}
        />
      )}

      {/* Atalho pro site de dieta */}
      <a
        href="https://diet-o.vercel.app"
        target="_blank"
        rel="noopener noreferrer"
        className="card mt-3 flex items-center gap-3 rounded-2xl p-3 transition active:scale-[0.99]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: c.soft, color: c.base }}>
          <SaladIcon size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Diet-o</span>
          <span className="block truncate text-xs text-muted">Abrir o site da dieta</span>
        </span>
        <ExternalIcon size={16} className="shrink-0 text-muted" />
      </a>

      {selectedDay && (
        <DayModal
          dayKey={selectedDay}
          me={me}
          other={other}
          myLog={getLog(me.id, selectedDay)}
          otherLog={other ? getLog(other.id, selectedDay) : undefined}
          workouts={myWorkouts}
          otherWorkoutName={other ? workoutNameOf(other.id, selectedDay) : null}
          onCreateWorkout={createWorkout}
          onClose={() => setSelectedDay(null)}
          onSave={(patch) => saveLog(selectedDay, patch)}
        />
      )}

      {showProgress && <ProgressModal people={people} logs={logs} onClose={() => setShowProgress(false)} />}

      {showReport && (
        <ReportModal
          people={people}
          logs={logs}
          workouts={workouts}
          initialYear={view.year}
          initialMonth={view.month}
          onClose={() => setShowReport(false)}
        />
      )}

      {showSettings && (
        <SettingsSheet
          people={people}
          meId={meId}
          onPickMe={pickMe}
          onUpdate={updatePerson}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

// ---- painel de baixo -------------------------------------------------
function TodayPanel({
  people, me, todayKeyStr, getLog, workoutNameOf, perWeek, counts, myWorkouts,
}: {
  people: Person[];
  me: Person;
  todayKeyStr: string;
  getLog: (pid: string, day: string) => DayLog | undefined;
  workoutNameOf: (pid: string, day: string) => string | null;
  perWeek: number;
  counts: Record<string, number>;
  myWorkouts: Workout[];
}) {
  const c = ACCENTS[me.accent];
  const ranked = myWorkouts
    .map((w) => ({ workout: w, count: counts[w.id] ?? 0 }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <section className="card mt-4 rounded-2xl p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted">Treino de hoje</p>

      <div className="mt-2.5 flex flex-col gap-2">
        {people.map((p) => {
          const log = getLog(p.id, todayKeyStr);
          const name = workoutNameOf(p.id, todayKeyStr);
          const pc = ACCENTS[p.accent];
          return (
            <div key={p.id} className="flex items-center gap-2 text-sm">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: pc.base, boxShadow: `0 0 6px ${pc.base}` }} />
              <span className="shrink-0 text-muted">{p.name.split(" ")[0]}</span>
              {log?.gym ? (
                <span className="flex min-w-0 items-center gap-1 font-semibold" style={{ color: pc.base }}>
                  <DumbbellIcon size={14} />
                  <span className="truncate">{name ?? "Treinou"}</span>
                </span>
              ) : (
                <span className="text-muted/60">ainda não treinou</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <p className="text-xs text-muted">
          Você treina{" "}
          <span className="font-semibold" style={{ color: c.base }}>
            {perWeek > 0 ? `~${perWeek.toString().replace(".", ",")}x por semana` : "— sem treinos ainda"}
          </span>
        </p>
        {ranked.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
            {ranked.map(({ workout, count }) => (
              <span key={workout.id}>
                {workout.name} <span className="font-semibold tabular-nums" style={{ color: c.base }}>{count}x</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// Uma linha por pessoa dentro da célula: halter (treinou) e prato (comeu
// bem). Feito = ícone na cor da pessoa com brilho; não feito = fantasma bem
// apagado, que mantém o layout estável sem competir pela atenção.
function DayMark({ accent, log }: { accent: (typeof ACCENTS)[Accent]; log: DayLog | undefined }) {
  const gym = !!log?.gym, diet = !!log?.diet;
  const on = (done: boolean) =>
    done
      ? { color: accent.base, filter: `drop-shadow(0 0 3px ${accent.base}88)` }
      : { color: "var(--border-strong)", opacity: 0.4 };
  return (
    <div className="flex items-center justify-center gap-[3px] leading-none">
      <span style={on(gym)}><DumbbellIcon size={11} /></span>
      <span style={on(diet)}><SaladIcon size={11} /></span>
    </div>
  );
}

// ---- configurações ----------------------------------------------------
function SettingsSheet({
  people, meId, onPickMe, onUpdate, onClose,
}: {
  people: Person[];
  meId: string | null;
  onPickMe: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Pick<Person, "name" | "accent" | "weekly_goal">>) => void;
  onClose: () => void;
}) {
  const [names, setNames] = useState<Record<string, string>>(() =>
    Object.fromEntries(people.map((p) => [p.id, p.name])),
  );

  return (
    <Sheet eyebrow="Configurações" title="Perfis" onClose={onClose}>
      <p className="text-sm text-muted">Quem é você, nomes, cores e a meta de treinos de cada um.</p>

      <div className="mt-4 flex flex-col gap-3">
        {people.map((p) => {
          const isMe = p.id === meId;
          const pc = ACCENTS[p.accent];
          const goal = goalOf(p);
          const name = names[p.id] ?? p.name;
          const dirty = name.trim() !== p.name && name.trim() !== "";

          return (
            <div key={p.id} className="card rounded-2xl p-3"
              style={isMe ? { borderColor: pc.base, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 3px ${pc.soft}` } : undefined}>
              {/* Nome */}
              <div className="flex items-center gap-2">
                <input
                  value={name}
                  onChange={(e) => setNames((s) => ({ ...s, [p.id]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter" && dirty) onUpdate(p.id, { name: name.trim() }); }}
                  className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-muted"
                  placeholder="Nome"
                />
                <button
                  onClick={() => dirty && onUpdate(p.id, { name: name.trim() })}
                  disabled={!dirty}
                  className="rounded-lg border border-border bg-surface p-2 transition active:scale-90 disabled:opacity-40"
                  style={dirty ? { color: pc.base, borderColor: pc.base } : { color: "var(--muted)" }}
                  title="Salvar nome"
                >
                  {dirty ? <CheckIcon size={16} /> : <PencilIcon />}
                </button>
              </div>

              {/* Cor */}
              <div className="mt-2.5 flex items-center gap-2">
                {(Object.keys(ACCENTS) as Accent[]).map((a) => (
                  <button
                    key={a}
                    onClick={() => onUpdate(p.id, { accent: a })}
                    className="h-6 w-6 rounded-full border-2 transition active:scale-90"
                    style={{ background: ACCENTS[a].base, borderColor: p.accent === a ? "#fff" : "transparent" }}
                    aria-label={ACCENTS[a].label}
                  />
                ))}
              </div>

              {/* Meta semanal */}
              <div className="mt-3 flex items-center justify-between rounded-xl bg-surface px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Meta semanal</p>
                  <p className="text-[11px] text-muted">dias de academia por semana</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onUpdate(p.id, { weekly_goal: goal - 1 })}
                    disabled={goal <= 1}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface-2 text-lg leading-none transition active:scale-90 disabled:opacity-30"
                    aria-label="Diminuir meta"
                  >−</button>
                  <span className="w-7 text-center text-base font-bold tabular-nums" style={{ color: pc.base }}>{goal}</span>
                  <button
                    onClick={() => onUpdate(p.id, { weekly_goal: goal + 1 })}
                    disabled={goal >= 7}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface-2 text-lg leading-none transition active:scale-90 disabled:opacity-30"
                    aria-label="Aumentar meta"
                  >+</button>
                </div>
              </div>

              {/* Sou eu */}
              <button
                onClick={() => onPickMe(p.id)}
                disabled={isMe}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2 text-sm font-semibold transition active:scale-95 disabled:opacity-70"
                style={{ background: isMe ? pc.soft : "var(--surface)", color: isMe ? pc.base : "var(--foreground)" }}
              >
                {isMe ? <><CheckIcon size={16} /> Sou eu</> : "Entrar como este"}
              </button>
            </div>
          );
        })}
      </div>

      <button onClick={onClose} className="mt-5 w-full rounded-xl border border-border bg-surface-2 py-3 text-sm font-medium transition active:scale-95">
        Fechar
      </button>
    </Sheet>
  );
}

// ---- telas de borda ---------------------------------------------------
function Splash() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3">
      <div className="text-4xl animate-pulse">🐣</div>
      <p className="text-sm text-muted">Carregando...</p>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="text-4xl">⚠️</div>
      <h1 className="text-lg font-bold">Não consegui carregar os dados</h1>
      <p className="text-sm text-muted">{message}</p>
      <p className="text-xs text-muted">
        Verifique se você rodou o <code className="text-foreground">supabase/schema.sql</code> e as
        migrações em <code className="text-foreground">supabase/migrations/</code> no SQL Editor do Supabase.
      </p>
    </div>
  );
}

function SetupScreen() {
  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="text-4xl">🐣</div>
      <h1 className="text-xl font-bold">Falta configurar o Supabase</h1>
      <p className="text-sm text-muted">
        Crie um arquivo <code className="text-foreground">.env.local</code> na raiz do projeto com:
      </p>
      <pre className="w-full overflow-x-auto rounded-xl border border-border bg-surface p-3 text-left text-xs">
{`NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...`}
      </pre>
      <p className="text-xs text-muted">Depois reinicie o <code className="text-foreground">npm run dev</code>. Veja o README.</p>
    </div>
  );
}
