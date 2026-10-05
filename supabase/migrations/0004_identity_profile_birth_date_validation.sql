-- LifeGame 3.0
-- Identity Profile Fields — birth date bootstrap validation
-- Version: 1.0
--
-- Responsibility:
-- - prevent malformed Auth metadata from breaking profile bootstrap
-- - accept only a real YYYY-MM-DD calendar date
--
-- Canonical profile data remains public.profiles.
-- Auth metadata remains bootstrap input only.

create or replace function private.handle_new_identity_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    raw_birth_date text;
    normalized_birth_date date;
begin
    raw_birth_date := nullif(new.raw_user_meta_data ->> 'birth_date', '');

    if raw_birth_date is not null
        and raw_birth_date ~ '^\d{4}-\d{2}-\d{2}$'
        and to_char(to_date(raw_birth_date, 'YYYY-MM-DD'), 'YYYY-MM-DD') = raw_birth_date
    then
        normalized_birth_date := to_date(raw_birth_date, 'YYYY-MM-DD');
    else
        normalized_birth_date := null;
    end if;

    insert into public.profiles (
        id,
        display_name,
        birth_date
    )
    values (
        new.id,
        nullif(new.raw_user_meta_data ->> 'display_name', ''),
        normalized_birth_date
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
