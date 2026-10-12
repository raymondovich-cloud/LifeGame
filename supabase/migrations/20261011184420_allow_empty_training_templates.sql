-- LifeGame: keep saved workout templates when their final exercise is removed.
-- Empty templates are valid saved plans; the builder still requires exercises to start/save a non-empty workout.
alter table public.training_workout_templates
    drop constraint if exists training_workout_templates_exercises_check;

alter table public.training_workout_templates
    add constraint training_workout_templates_exercises_check
    check (jsonb_typeof(exercises) = 'array' and jsonb_array_length(exercises) between 0 and 50);

create or replace function public.delete_training_exercise_cascade(p_exercise_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
    v_user_id uuid := auth.uid();
    v_deleted boolean := false;
begin
    if v_user_id is null then
        raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
    end if;

    if not exists (
        select 1 from public.training_exercises
        where id = p_exercise_id and user_id = v_user_id
    ) then
        return false;
    end if;

    update public.training_workout_templates as template
    set exercises = (
        select coalesce(jsonb_agg(exercise_item.value order by exercise_item.ordinality), '[]'::jsonb)
        from jsonb_array_elements(template.exercises) with ordinality as exercise_item(value, ordinality)
        where exercise_item.value ->> 'id' <> p_exercise_id::text
    ),
    updated_at = now()
    where template.user_id = v_user_id
      and template.exercises @> jsonb_build_array(jsonb_build_object('id', p_exercise_id::text));

    -- Do not delete a template when its final exercise is removed: retain it with [].
    delete from public.training_exercises
    where id = p_exercise_id and user_id = v_user_id;
    v_deleted := found;
    return v_deleted;
end;
$$;

revoke all on function public.delete_training_exercise_cascade(uuid) from public, anon;
grant execute on function public.delete_training_exercise_cascade(uuid) to authenticated;
