-- LifeGame: classify user-owned library exercises for cardio vs strength sessions.
alter table public.training_exercises
    add column if not exists exercise_type text not null default 'strength'
    check (exercise_type in ('cardio', 'strength'));
