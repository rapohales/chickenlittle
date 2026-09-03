-- ============================================================
--  Migração 001 — Treinos nomeados (Upper A, Lower B, ...)
--  Rode este arquivo no SQL Editor do Supabase.
--  Pode rodar mais de uma vez sem problema.
-- ============================================================

-- Cada pessoa define os próprios treinos.
create table if not exists public.workouts (
  id         uuid primary key default gen_random_uuid(),
  person_id  text not null references public.people(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

-- Qual treino foi feito naquele dia (fica nulo se não foi registrado).
alter table public.day_logs
  add column if not exists workout_id uuid references public.workouts(id) on delete set null;

-- Mesma política dos outros: acesso liberado pra chave anon.
alter table public.workouts enable row level security;

drop policy if exists "acesso total workouts" on public.workouts;

create policy "acesso total workouts"
  on public.workouts for all
  to anon using (true) with check (true);

-- Realtime, pra um ver o treino do outro na hora.
do $$
begin
  alter publication supabase_realtime add table public.workouts;
exception
  when duplicate_object then null;
end $$;
