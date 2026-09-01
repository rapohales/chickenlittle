"use client";

import { useEffect, useState } from "react";
import { ACCENTS, type DayLog, type Person } from "@/lib/types";
import { longLabel } from "@/lib/dates";
import { DumbbellIcon, SaladIcon, CloseIcon, CheckIcon } from "./icons";

type Props = {
  dayKey: string;
  me: Person;
  other: Person | null;
  myLog: DayLog | undefined;
  otherLog: DayLog | undefined;
  onClose: () => void;
  onSave: (log: { gym: boolean; diet: boolean; notes: string }) => void;
};

export default function DayModal({ dayKey, me, other, myLog, otherLog, onClose, onSave }: Props) {
  const [gym, setGym] = useState(myLog?.gym ?? false);
  const [diet, setDiet] = useState(myLog?.diet ?? false);
  const [notes, setNotes] = useState(myLog?.notes ?? "");

  // Fecha com ESC (útil no desktop).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const c = ACCENTS[me.accent];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 animate-fade sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl border border-border bg-surface p-5 pb-8 animate-pop sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Registro do dia</p>
            <h2 className="text-lg font-bold capitalize">{longLabel(dayKey)}</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-muted transition active:scale-90 hover:text-foreground">
            <CloseIcon />
          </button>
        </div>

        <p className="mt-3 text-sm">
          Editando como{" "}
          <span className="font-semibold" style={{ color: c.base }}>{me.name}</span>
        </p>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Toggle active={gym} accent={c.base} soft={c.soft} onClick={() => setGym((v) => !v)} label="Academia" icon={<DumbbellIcon size={26} />} />
          <Toggle active={diet} accent={c.base} soft={c.soft} onClick={() => setDiet((v) => !v)} label="Dieta" icon={<SaladIcon size={26} />} />
        </div>

        <label className="mt-4 block text-sm text-muted">Observações</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Ex: treino de perna, comi fora no almoço..."
          className="mt-1 w-full resize-none rounded-xl border border-border bg-surface-2 p-3 text-sm outline-none transition focus:border-muted"
        />

        {other && (otherLog?.gym || otherLog?.diet || otherLog?.notes) ? (
          <div className="mt-4 rounded-xl border border-border bg-surface-2 p-3">
            <p className="text-xs text-muted">
              <span className="font-semibold" style={{ color: ACCENTS[other.accent].base }}>{other.name}</span> nesse dia
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
              {otherLog?.gym && <Tag accent={ACCENTS[other.accent].base}><DumbbellIcon size={14} /> Academia</Tag>}
              {otherLog?.diet && <Tag accent={ACCENTS[other.accent].base}><SaladIcon size={14} /> Dieta</Tag>}
              {!otherLog?.gym && !otherLog?.diet && <span className="text-muted">Sem treino/dieta</span>}
            </div>
            {otherLog?.notes && <p className="mt-1.5 text-xs text-muted italic">“{otherLog.notes}”</p>}
          </div>
        ) : null}

        <button
          onClick={() => onSave({ gym, diet, notes })}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold text-black transition active:scale-[0.98]"
          style={{ background: c.base }}
        >
          <CheckIcon size={20} /> Salvar
        </button>
      </div>
    </div>
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
