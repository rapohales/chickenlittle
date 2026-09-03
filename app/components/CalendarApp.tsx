"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { ACCENTS, type Accent, type DayLog, type Person } from "@/lib/types";
import { MONTHS, WEEKDAYS, monthGrid, toKey, todayKey, weekKeys } from "@/lib/dates";
import { ChevronLeft, ChevronRight, DumbbellIcon, SaladIcon, PencilIcon, CheckIcon } from "./icons";
import ProfilePicker from "./ProfilePicker";
import DayModal from "./DayModal";
import WeekSummaryModal from "./WeekSummaryModal";

const ME_KEY = "cl-me";
const logKey = (pid: string, day: string) => `${pid}|${day}`;

export default function CalendarApp() {
  const [people, setPeople] = useState<Person[]>([]);
  const [logs, setLogs] = useState<Record<string, DayLog>>({});
  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showWeekSummary, setShowWeekSummary] = useState(false);

  // ---- carregamento de dados ------------------------------------------
  const fetchPeople = useCallback(async () => {
    const { data, error } = await supabase.from("people").select("*").order("id");
    if (error) { setError(error.message); return; }
    setPeople((data as Person[]) ?? []);
  }, []);

  const fetchLogs = useCallback(async () => {
    const { data, error } = await supabase.from("day_logs").select("*");
    if (error) { setError(error.message); return; }
    const map: Record<string, DayLog> = {};
    for (const row of (data as DayLog[]) ?? []) map[logKey(row.person_id, row.day)] = row;
    setLogs(map);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    setMeId(localStorage.getItem(ME_KEY));
    (async () => {
      await Promise.all([fetchPeople(), fetchLogs()]);
      setLoading(false);
    })();

    const channel = supabase
      .channel("day_logs-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "day_logs" }, fetchLogs)
      .on("postgres_changes", { event: "*", schema: "public", table: "people" }, fetchPeople)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchPeople, fetchLogs]);

  // ---- derivados -------------------------------------------------------
  const me = useMemo(() => people.find((p) => p.id === meId) ?? null, [people, meId]);
  const other = useMemo(() => people.find((p) => p.id !== meId) ?? null, [people, meId]);
  const getLog = useCallback((pid: string, day: string) => logs[logKey(pid, day)], [logs]);

  const weekStats = useCallback((pid: string) => {
    const wk = weekKeys();
    let gym = 0, diet = 0;
    for (const k of wk) {
      const l = getLog(pid, k);
      if (l?.gym) gym++;
      if (l?.diet) diet++;
    }
    return { gym, diet };
  }, [getLog]);

  // ---- mutações --------------------------------------------------------
  const saveLog = useCallback(async (day: string, patch: { gym: boolean; diet: boolean; notes: string }) => {
    if (!meId) return;
    const row: DayLog = { person_id: meId, day, ...patch, updated_at: new Date().toISOString() };
    setLogs((prev) => ({ ...prev, [logKey(meId, day)]: row })); // otimista
    setSelectedDay(null);
    const { error } = await supabase.from("day_logs").upsert(row, { onConflict: "person_id,day" });
    if (error) { setError(error.message); fetchLogs(); }
  }, [meId, fetchLogs]);

  const renamePerson = useCallback(async (id: string, name: string, accent: Accent) => {
    setPeople((prev) => prev.map((p) => (p.id === id ? { ...p, name, accent } : p)));
    const { error } = await supabase.from("people").update({ name, accent }).eq("id", id);
    if (error) setError(error.message);
  }, []);

  const pickMe = (id: string) => { localStorage.setItem(ME_KEY, id); setMeId(id); setShowSettings(false); };

  // ---- estados de borda ------------------------------------------------
  if (!isSupabaseConfigured) return <SetupScreen />;
  if (loading) return <Splash />;
  if (error && people.length === 0) return <ErrorScreen message={error} />;
  if (!me) return <ProfilePicker people={people} onPick={pickMe} />;

  // ---- calendário ------------------------------------------------------
  const cells = monthGrid(view.year, view.month);
  const tKey = todayKey();
  const goMonth = (delta: number) => {
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-4 pb-10">
      {/* Cabeçalho */}
      <header className="flex items-center justify-between pt-6 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🥥</span>
          <div>
            <h1 className="text-base font-bold leading-none">Rotina</h1>
          </div>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm transition active:scale-95"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
            style={{ background: ACCENTS[me.accent].soft, color: ACCENTS[me.accent].base }}>
            {me.name.charAt(0).toUpperCase()}
          </span>
          <span className="font-medium">{me.name}</span>
        </button>
      </header>

      {/* Resumo compacto da semana */}
      <button
        onClick={() => setShowWeekSummary(true)}
        className="flex items-center gap-2 py-1 text-left transition active:opacity-60"
      >
        <span className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
          {people.map((p, i) => {
            const c = ACCENTS[p.accent];
            const s = weekStats(p.id);
            return (
              <span key={p.id} className="flex min-w-0 shrink-0 items-center gap-1.5 text-[13px]">
                {i > 0 && <span className="text-muted">·</span>}
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: c.base }} />
                <span className="max-w-[64px] truncate text-muted">{p.name}</span>
                <span className="flex shrink-0 items-center gap-0.5 font-semibold" style={{ color: c.base }}>
                  <DumbbellIcon size={12} />{s.gym}
                </span>
                <span className="flex shrink-0 items-center gap-0.5 font-semibold" style={{ color: c.base }}>
                  <SaladIcon size={12} />{s.diet}
                </span>
              </span>
            );
          })}
        </span>
        <span className="shrink-0 text-xs text-muted">semana ›</span>
      </button>

      {/* Navegação do mês */}
      <div className="mt-6 mb-2 flex items-center justify-between">
        <button onClick={() => goMonth(-1)} className="rounded-full border border-border bg-surface p-2 transition active:scale-90">
          <ChevronLeft />
        </button>
        <h2 className="text-lg font-bold">
          {MONTHS[view.month]} <span className="text-muted font-normal">{view.year}</span>
        </h2>
        <button onClick={() => goMonth(1)} className="rounded-full border border-border bg-surface p-2 transition active:scale-90">
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
              className="relative flex aspect-square flex-col items-center rounded-xl border p-1 transition active:scale-95 disabled:opacity-30"
              style={{
                borderColor: isToday ? ACCENTS[me.accent].base : "var(--border)",
                background: isToday ? ACCENTS[me.accent].soft : "var(--surface)",
              }}
            >
              <span className={`text-xs font-semibold ${isToday ? "" : "text-foreground"}`}
                style={isToday ? { color: ACCENTS[me.accent].base } : undefined}>
                {date.getDate()}
              </span>
              <div className="mt-auto flex w-full flex-col gap-0.5">
                {people.map((p) => (
                  <DayMark key={p.id} accent={ACCENTS[p.accent]} log={getLog(p.id, key)} />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-center text-xs text-muted">Toque em um dia pra registrar</p>

      {selectedDay && (
        <DayModal
          dayKey={selectedDay}
          me={me}
          other={other}
          myLog={getLog(me.id, selectedDay)}
          otherLog={other ? getLog(other.id, selectedDay) : undefined}
          onClose={() => setSelectedDay(null)}
          onSave={(patch) => saveLog(selectedDay, patch)}
        />
      )}

      {showWeekSummary && (
        <WeekSummaryModal
          people={people}
          statsFor={weekStats}
          onClose={() => setShowWeekSummary(false)}
        />
      )}

      {showSettings && (
        <SettingsSheet
          people={people}
          meId={meId}
          onPickMe={pickMe}
          onRename={renamePerson}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

// Marca compacta de uma pessoa dentro da célula do dia.
function DayMark({ accent, log }: { accent: (typeof ACCENTS)[Accent]; log: DayLog | undefined }) {
  const gym = log?.gym, diet = log?.diet;
  const on = gym || diet;
  return (
    <div className="flex h-1.5 items-center justify-center gap-0.5">
      <span className="h-1.5 flex-1 rounded-full transition-colors"
        style={{ background: gym ? accent.base : "var(--surface-2)" }} />
      <span className="h-1.5 flex-1 rounded-full transition-colors"
        style={{ background: diet ? accent.base : "var(--surface-2)" }} />
      {!on && <span className="sr-only">nada</span>}
    </div>
  );
}

// ---- telas auxiliares --------------------------------------------------
function SettingsSheet({
  people, meId, onPickMe, onRename, onClose,
}: {
  people: Person[];
  meId: string | null;
  onPickMe: (id: string) => void;
  onRename: (id: string, name: string, accent: Accent) => void;
  onClose: () => void;
}) {
  const [drafts, setDrafts] = useState(() =>
    Object.fromEntries(people.map((p) => [p.id, { name: p.name, accent: p.accent }])) as Record<
      string, { name: string; accent: Accent }
    >,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 animate-fade sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl border border-border bg-surface p-5 pb-8 animate-pop sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold">Perfis</h2>
        <p className="text-sm text-muted">Escolha quem é você e ajuste os nomes/cores.</p>

        <div className="mt-4 flex flex-col gap-4">
          {people.map((p) => {
            const d = drafts[p.id];
            const isMe = p.id === meId;
            return (
              <div key={p.id} className="rounded-2xl border border-border bg-surface-2 p-3"
                style={{ borderColor: isMe ? ACCENTS[d.accent].base : "var(--border)" }}>
                <div className="flex items-center gap-2">
                  <input
                    value={d.name}
                    onChange={(e) => setDrafts((s) => ({ ...s, [p.id]: { ...s[p.id], name: e.target.value } }))}
                    className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-muted"
                    placeholder="Nome"
                  />
                  <button
                    onClick={() => onRename(p.id, d.name.trim() || p.name, d.accent)}
                    className="rounded-lg border border-border bg-surface p-2 text-muted transition active:scale-90 hover:text-foreground"
                    title="Salvar nome/cor"
                  >
                    <PencilIcon />
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {(Object.keys(ACCENTS) as Accent[]).map((a) => (
                    <button
                      key={a}
                      onClick={() => {
                        setDrafts((s) => ({ ...s, [p.id]: { ...s[p.id], accent: a } }));
                        onRename(p.id, d.name.trim() || p.name, a);
                      }}
                      className="h-6 w-6 rounded-full border-2 transition active:scale-90"
                      style={{ background: ACCENTS[a].base, borderColor: d.accent === a ? "#fff" : "transparent" }}
                      aria-label={ACCENTS[a].label}
                    />
                  ))}
                </div>
                <button
                  onClick={() => onPickMe(p.id)}
                  disabled={isMe}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition active:scale-95 disabled:opacity-60"
                  style={{
                    background: isMe ? ACCENTS[d.accent].soft : "var(--surface)",
                    color: isMe ? ACCENTS[d.accent].base : "var(--foreground)",
                    border: "1px solid var(--border)",
                  }}
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
      </div>
    </div>
  );
}

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
        Verifique se você rodou o <code className="text-foreground">supabase/schema.sql</code> no
        SQL Editor do Supabase.
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
