// Barrinha segmentada da meta semanal: um segmento por dia de meta,
// preenchidos conforme os treinos feitos. Passou da meta? Mostra "+N".
export default function GoalSegments({
  done, goal, color, size = "sm",
}: {
  done: number; goal: number; color: string; size?: "sm" | "lg";
}) {
  const segs = Math.max(1, Math.min(goal, 7));
  const dims = size === "lg" ? "h-2 w-5" : "h-1.5 w-3";
  return (
    <span className="flex items-center gap-[3px]">
      {Array.from({ length: segs }, (_, i) => (
        <span
          key={i}
          className={`${dims} rounded-full transition-colors duration-300`}
          style={{
            background: i < done ? color : "var(--border-strong)",
            boxShadow: i < done ? `0 0 8px ${color}55` : undefined,
          }}
        />
      ))}
      {done > goal && (
        <span className="ml-0.5 text-[10px] font-bold tabular-nums" style={{ color }}>+{done - goal}</span>
      )}
    </span>
  );
}
