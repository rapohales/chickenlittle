export type Accent = "lime" | "rose" | "orange" | "sky" | "violet";

export type Person = {
  id: string;
  name: string;
  accent: Accent;
  weekly_goal?: number; // dias de academia por semana (1–7). Opcional pra tolerar banco antigo.
};

export type Workout = {
  id: string;
  person_id: string;
  name: string;
  created_at?: string;
};

export type DayLog = {
  person_id: string;
  day: string; // YYYY-MM-DD
  gym: boolean;
  diet: boolean;
  notes: string;
  workout_id: string | null;
  updated_at?: string;
};

// Cores de cada "accent" usadas na UI. Mantidas em JS (e não só no Tailwind)
// para conseguirmos gerar estilos dinâmicos por pessoa.
export const ACCENTS: Record<Accent, { base: string; soft: string; text: string; label: string }> = {
  lime:   { base: "#a3e635", soft: "rgba(163,230,53,0.15)",  text: "#bef264", label: "Verde" },
  rose:   { base: "#fb7185", soft: "rgba(251,113,133,0.15)", text: "#fda4af", label: "Rosa" },
  orange: { base: "#fb923c", soft: "rgba(251,146,60,0.15)",  text: "#fdba74", label: "Laranja" },
  sky:    { base: "#38bdf8", soft: "rgba(56,189,248,0.15)",  text: "#7dd3fc", label: "Azul" },
  violet: { base: "#a78bfa", soft: "rgba(167,139,250,0.15)", text: "#c4b5fd", label: "Roxo" },
};
