-- LifeGame: user-owned exercise library and reusable workout templates.
-- Payload-level encryption is intentionally deferred to the unified encryption migration.
create table if not exists public.training_exercises (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null check (char_length(btrim(name)) between 1 and 80),
    created_at timestamptz not null default now()
);
create unique index if not exists training_exercises_owner_name_unique on public.training_exercises (user_id, lower(name));
create index if not exists training_exercises_owner_created_idx on public.training_exercises (user_id, created_at desc);
create table if not exists public.training_workout_templates (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    title text not null check (char_length(btrim(title)) between 1 and 80),
    exercises jsonb not null check (jsonb_typeof(exercises) = 'array' and jsonb_array_length(exercises) between 1 and 50),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index if not exists training_workout_templates_owner_updated_idx on public.training_workout_templates (user_id, updated_at desc);
alter table public.training_exercises enable row level security;
alter table public.training_workout_templates enable row level security;
drop policy if exists "Users manage their own training exercises" on public.training_exercises;
create policy "Users manage their own training exercises" on public.training_exercises for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users manage their own workout templates" on public.training_workout_templates;
create policy "Users manage their own workout templates" on public.training_workout_templates for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.training_exercises to authenticated;
grant select, insert, update, delete on public.training_workout_templates to authenticated;
revoke all on public.training_exercises from anon;
revoke all on public.training_workout_templates from anon;
