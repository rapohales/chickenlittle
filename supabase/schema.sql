-- ============================================================
--  Chicken Little — esquema do banco (Supabase / PostgreSQL)
--  Rode este arquivo inteiro no SQL Editor do Supabase.
-- ============================================================

-- Pessoas do casal (apenas duas linhas).
create table if not exists public.people (
  id          text primary key,
  name        text not null,
  accent      text not null default 'lime',
  weekly_goal integer not null default 3 check (weekly_goal between 1 and 7)
);

-- Treinos nomeados de cada pessoa (Upper A, Lower B, ...).
create table if not exists public.workouts (
  id         uuid primary key default gen_random_uuid(),
  person_id  text not null references public.people(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

-- Registro de cada dia, por pessoa.
create table if not exists public.day_logs (
  person_id  text not null references public.people(id) on delete cascade,
  day        date not null,
  gym        boolean not null default false,
  diet       boolean not null default false,
  notes      text    not null default '',
  workout_id uuid references public.workouts(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (person_id, day)
);

-- Duas pessoas iniciais. Os nomes podem ser trocados dentro do app.
insert into public.people (id, name, accent) values
  ('p1', 'Você', 'lime'),
  ('p2', 'Ela',  'rose')
on conflict (id) do nothing;

-- ------------------------------------------------------------
--  RLS: o app usa a chave pública "anon". Como é privado entre
--  vocês dois (acesso pelo link), liberamos acesso total ao anon.
-- ------------------------------------------------------------
alter table public.people   enable row level security;
alter table public.day_logs enable row level security;
alter table public.workouts enable row level security;

drop policy if exists "acesso total people"   on public.people;
drop policy if exists "acesso total day_logs" on public.day_logs;
drop policy if exists "acesso total workouts" on public.workouts;

create policy "acesso total people"
  on public.people for all
  to anon using (true) with check (true);

create policy "acesso total day_logs"
  on public.day_logs for all
  to anon using (true) with check (true);

create policy "acesso total workouts"
  on public.workouts for all
  to anon using (true) with check (true);

-- Realtime (para os dois verem a atualização do outro na hora).
do $$
begin
  alter publication supabase_realtime add table public.day_logs;
  alter publication supabase_realtime add table public.workouts;
exception
  when duplicate_object then null;
end $$;
