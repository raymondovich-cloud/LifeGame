-- LifeGame 3.0
-- Identity Foundation — profile bootstrap
-- Version: 1.0
--
-- Responsibility:
-- - create the LifeGame profile automatically when Supabase Auth creates a user
-- - create the minimal server-side registration security event
--
-- This trigger is infrastructure/database behavior.
-- It does not store passwords, tokens, keys, or private user data.

create or replace function private.handle_new_identity_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (id)
    values (new.id);

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

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function private.handle_new_identity_user();
