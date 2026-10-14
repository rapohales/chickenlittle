"use client";

import { useState } from "react";
import type { Bucket } from "@/lib/report";

// Gráfico de barras de UMA série (uma pessoa). Barras finas com topo
// arredondado, 2px de respiro entre elas, rótulo só na maior barra,
// linha de meta opcional, toque/hover pra ver o valor e tabela acessível.
export default function BarChart({
  buckets, color, goal, unit = "treinos", height = 96,
}: {
  buckets: Bucket[];
  color: string;
  goal?: number;
  unit?: string;
  height?: number;
}) {
  const [sel, setSel] = useState<number | null>(null);
  const values = buckets.map((b) => b.value ?? 0);
  const max = Math.max(1, goal ?? 0, ...values);
  const peak = values.indexOf(Math.max(...values));
  const plural = (n: number) => `${n} ${n === 1 ? unit.replace(/s$/, "") : unit}`;

  const active = sel !== null ? buckets[sel] : null;

  return (
    <div>
      {/* Leitura do valor selecionado (substitui o tooltip no celular) */}
      <p className="mb-1.5 h-4 text-[11px] text-muted tabular-nums">
        {active
          ? <>{active.title} · <b className="text-foreground">{active.value === null ? "ainda não chegou" : plural(active.value)}</b></>
          : "Toque numa barra pra ver o valor"}
      </p>

      <div className="relative" style={{ height }} onPointerLeave={() => setSel(null)}>
        {/* Linha de meta */}
        {goal !== undefined && goal > 0 && (
          <div className="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-muted/50"
            style={{ bottom: `${(goal / max) * 100}%` }}>
            <span className="absolute -top-3.5 right-0 text-[9px] uppercase tracking-wider text-muted">meta {goal}</span>
          </div>
        )}

        <div className="flex h-full items-end gap-[2px] border-b border-border-strong">
          {buckets.map((b, i) => {
            const v = b.value;
            const pct = v === null ? 0 : (v / max) * 100;
            const dim = sel !== null && sel !== i;
            return (
              <button
                key={i}
                type="button"
                onPointerEnter={(e) => e.pointerType === "mouse" && setSel(i)}
                onFocus={() => setSel(i)}
                onClick={() => setSel((s) => (s === i ? null : i))}
                className="group relative flex h-full flex-1 items-end justify-center outline-none"
                aria-label={`${b.title}: ${v === null ? "futuro" : plural(v)}`}
              >
                {v === null ? (
                  <span className="h-[3px] w-full rounded-full bg-border" />
                ) : (
                  <span
                    className="w-full max-w-7 rounded-t-[4px] transition-opacity animate-grow-y"
                    style={{
                      height: v === 0 ? 2 : `${pct}%`,
                      background: v === 0 ? "var(--border-strong)" : color,
                      opacity: dim ? 0.35 : 1,
                      animationDelay: `${i * 25}ms`,
                    }}
                  />
                )}
                {i === peak && v !== null && v > 0 && sel === null && (
                  <span className="pointer-events-none absolute text-[10px] font-semibold text-foreground tabular-nums"
                    style={{ bottom: `calc(${pct}% + 2px)` }}>{v}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-1 flex gap-[2px]">
        {buckets.map((b, i) => (
          <span key={i} className="flex-1 text-center text-[9px] text-muted"
            style={{ color: sel === i ? "var(--foreground)" : undefined }}>
            {b.label}
          </span>
        ))}
      </div>

      <details className="mt-2 text-[11px] text-muted">
        <summary className="cursor-pointer select-none">Ver em tabela</summary>
        <table className="mt-1.5 w-full tabular-nums">
          <tbody>
            {buckets.map((b, i) => (
              <tr key={i} className="border-t border-border">
                <td className="py-1">{b.title}</td>
                <td className="py-1 text-right text-foreground">{b.value === null ? "—" : b.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
