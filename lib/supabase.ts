import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Avisa cedo (no console do navegador) se as variáveis não foram configuradas.
export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured && typeof window !== "undefined") {
  console.warn(
    "Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY em .env.local",
  );
}

export const supabase = createClient(url ?? "http://localhost", anonKey ?? "public-anon-key");
