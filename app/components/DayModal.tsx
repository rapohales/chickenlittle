"use client";

import { useState } from "react";
import { ACCENTS, type DayLog, type Person, type Workout } from "@/lib/types";
import { longLabel } from "@/lib/dates";
import { DumbbellIcon, SaladIcon, CheckIcon, PlusIcon } from "./icons";
import Sheet from "./Sheet";

type Props = {
  dayKey: string;
  me: Person;
  other: Person | null;
  myLog: DayLog | undefined;
  otherLog: DayLog | undefined;
  workouts: Workout[];
  otherWorkoutName: string | null;
  onCreateWorkout: (name: string) => Promise<Workout | null>;
  onClose: () => void;
  onSave: (log: { gym: boolean; diet: boolean; notes: string; workout_id: string | null }) => void;
};

export default function DayModal({
  dayKey, me, other, myLog, otherLog, workouts, otherWorkoutName, onCreateWorkout, onClose, onSave,
}: Props) {
  const [gym, setGym] = useState(myLog?.gym ?? false);
  const [diet, setDiet] = useState(myLog?.diet ?? false);
  const [notes, setNotes] = useState(myLog?.notes ?? "");
  const [workoutId, setWorkoutId] = useState<string | null>(myLog?.workout_id ?? null);

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const c = ACCENTS[me.accent];

  const createWorkout = async () => {
    const name = newName.trim();
    if (!name || creating) return;
    setCreating(true);
    const created = await onCreateWorkout(name);
    setCreating(false);
    if (created) {
      setWorkoutId(created.id);
      setNewName("");
      setAdding(false);
    }
  };

  return (
    <Sheet eyebrow="Registro do dia" title={<span className="capitalize">{longLabel(dayKey)}</span>} onClose={onClose}>
      <p className="text-sm text-muted">
        Editando como <span className="font-semibold" style={{ color: c.base }}>{me.name}</span>
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Toggle active={gym} accent={c.base} soft={c.soft} onClick={() => setGym((v) => !v)} label="Academia" icon={<DumbbellIcon size={26} />} />
        <Toggle active={diet} accent={c.base} soft={c.soft} onClick={() => setDiet((v) => !v)} label="Comi Bem" icon={<SaladIcon size={26} />} />
      </div>

      {gym && (
        <div className="mt-4 animate-rise">
          <label className="block text-sm text-muted">Qual treino?</label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {workouts.map((w) => {
              const on = workoutId === w.id;
              return (
                <button
                  key={w.id}
                  onClick={() => setWorkoutId(on ? null : w.id)}
                  className="rounded-full border px-3 py-1.5 text-sm font-medium transition active:scale-95"
                  style={{
                    borderColor: on ? c.base : "var(--border-strong)",
                    background: on ? c.soft : "var(--surface-2)",
                    color: on ? c.base : "var(--foreground)",
                    boxShadow: on ? `0 0 0 3px ${c.soft}` : undefined,
                  }}
                >
                  {w.name}
                </button>
              );
            })}

            {adding ? (
              <span className="flex items-center gap-1">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); createWorkout(); }
                    if (e.key === "Escape") { e.preventDefault(); setAdding(false); setNewName(""); }
                  }}
                  placeholder="Ex: Upper A"
                  maxLength={24}
                  className="w-28 rounded-full border border-border-strong bg-surface-2 px-3 py-1.5 text-sm outline-none focus:border-muted"
                />
                <button
                  onClick={createWorkout}
                  disabled={!newName.trim() || creating}
                  className="rounded-full p-1.5 transition active:scale-90 disabled:opacity-40"
                  style={{ background: c.soft, color: c.base }}
                  aria-label="Salvar treino"
                >
                  <CheckIcon size={16} />
                </button>
              </span>
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="flex items-center gap-1 rounded-full border border-dashed border-border-strong bg-surface-2 px-3 py-1.5 text-sm text-muted transition active:scale-95 hover:text-foreground"
              >
                <PlusIcon size={14} /> Novo
              </button>
            )}
          </div>
          {workouts.length === 0 && !adding && (
            <p className="mt-1.5 text-xs text-muted">Crie seus treinos (Upper A, Lower B...) no botão “Novo”.</p>
          )}
        </div>
      )}

      <label className="mt-4 block text-sm text-muted">Observações</label>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        placeholder="Ex: peguei mais carga no supino, comi fora no almoço..."
        className="mt-1 w-full resize-none rounded-xl border border-border bg-surface-2 p-3 text-sm outline-none transition focus:border-muted"
      />

      {other && (otherLog?.gym || otherLog?.diet || otherLog?.notes) ? (
        <div className="card mt-4 rounded-xl p-3">
          <p className="text-xs text-muted">
            <span className="font-semibold" style={{ color: ACCENTS[other.accent].base }}>{other.name}</span> nesse dia
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
            {otherLog?.gym && (
              <Tag accent={ACCENTS[other.accent].base}>
                <DumbbellIcon size={14} /> {otherWorkoutName ?? "Academia"}
              </Tag>
            )}
            {otherLog?.diet && <Tag accent={ACCENTS[other.accent].base}><SaladIcon size={14} /> Comi Bem</Tag>}
          </div>
          {otherLog?.notes && <p className="mt-1.5 text-xs text-muted italic">“{otherLog.notes}”</p>}
        </div>
      ) : null}

      <button
        onClick={() => onSave({ gym, diet, notes, workout_id: gym ? workoutId : null })}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold text-black transition active:scale-[0.98]"
        style={{ background: c.base, boxShadow: `0 8px 24px -8px ${c.base}99` }}
      >
        <CheckIcon size={20} /> Salvar
      </button>
    </Sheet>
  );
}

function Toggle({
  active, accent, soft, onClick, label, icon,
}: {
  active: boolean; accent: string; soft: string; onClick: () => void; label: string; icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-2xl border-2 py-5 transition active:scale-[0.97]"
      style={{
        borderColor: active ? accent : "var(--border)",
        background: active ? soft : "var(--surface-2)",
        color: active ? accent : "var(--muted)",
        boxShadow: active ? `0 0 24px -6px ${accent}66` : undefined,
      }}
    >
      {icon}
      <span className="text-sm font-semibold" style={{ color: active ? accent : "var(--foreground)" }}>{label}</span>
      <span className="text-xs" style={{ color: active ? accent : "var(--muted)" }}>{active ? "Feito ✓" : "Marcar"}</span>
    </button>
  );
}

function Tag({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ background: `${accent}22`, color: accent }}>
      {children}
    </span>
  );
}
