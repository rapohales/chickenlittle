-- ============================================================
--  Migração 002 — Meta semanal de academia por pessoa
--  Rode este arquivo no SQL Editor do Supabase.
--  Pode rodar mais de uma vez sem problema.
-- ============================================================

-- Quantos dias por semana a pessoa pretende ir à academia (1 a 7).
-- A pontuação e a sequência ("streak") passam a ser relativas a isso:
-- bater 3 de 3 vale o mesmo que bater 5 de 5.
alter table public.people
  add column if not exists weekly_goal integer not null default 3;

alter table public.people
  drop constraint if exists people_weekly_goal_range;

alter table public.people
  add constraint people_weekly_goal_range check (weekly_goal between 1 and 7);
