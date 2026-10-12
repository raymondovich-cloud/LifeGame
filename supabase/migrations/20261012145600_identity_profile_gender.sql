-- LifeGame 3.0
-- Identity Profile Gender
-- Version: 1.0
--
-- Responsibility:
-- - persist the required registration gender in the canonical profile
-- - enforce the supported values at the database boundary
-- - preserve the existing secure Auth bootstrap trigger boundary

begin;

alter table public.profiles
    add column gender text;

alter table public.profiles
    add constraint profiles_gender_check
    check (gender is null or gender in ('male', 'female'));

comment on column public.profiles.gender is
    'Optional for legacy profiles; new registrations must supply male or female.';

create or replace function private.handle_new_identity_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    raw_birth_date text;
    normalized_birth_date date;
    raw_gender text;
begin
    raw_birth_date := nullif(new.raw_user_meta_data ->> 'birth_date', '');

    if raw_birth_date is not null
        and raw_birth_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        and to_char(to_date(raw_birth_date, 'YYYY-MM-DD'), 'YYYY-MM-DD') = raw_birth_date
    then
        normalized_birth_date := to_date(raw_birth_date, 'YYYY-MM-DD');
    else
        normalized_birth_date := null;
    end if;

    raw_gender := nullif(new.raw_user_meta_data ->> 'gender', '');

    if raw_gender is null or raw_gender not in ('male', 'female') then
        raise exception using
            errcode = '23514',
            message = 'Invalid registration gender.';
    end if;

    insert into public.profiles (
        id,
        display_name,
        birth_date,
        gender
    )
    values (
        new.id,
        nullif(new.raw_user_meta_data ->> 'display_name', ''),
        normalized_birth_date,
        raw_gender
    );

    insert into private.security_events (
        user_id,
        event_type,
        occurred_at,
        metadata
    )
    values (
        new.id,
        'identity.user.registered',
        coalesce(new.created_at, now()),
        jsonb_build_object('source', 'auth.users')
    );

    return new;
end;
$$;

revoke all on function private.handle_new_identity_user() from public;
revoke all on function private.handle_new_identity_user() from anon;
revoke all on function private.handle_new_identity_user() from authenticated;

commit;
