-- Version 1.0
-- LifeGame: persist whether a user's saved workout is pinned.
alter table public.training_workout_templates
    add column if not exists is_pinned boolean not null default false;

create index if not exists training_workout_templates_owner_pinned_updated_idx
    on public.training_workout_templates (user_id, is_pinned desc, updated_at desc);
