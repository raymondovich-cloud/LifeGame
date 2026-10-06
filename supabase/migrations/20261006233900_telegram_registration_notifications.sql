-- supabase/migrations/20261006233900_telegram_registration_notifications.sql — Version 1.0
-- Connects new public.profiles rows to the telegram-admin Edge Function.

create extension if not exists pg_net;

select vault.create_secret(
  encode(gen_random_bytes(32), 'hex'),
  'lifegame_registration_webhook_secret',
  'Shared secret for the internal LifeGame registration to telegram-admin webhook.'
)
where not exists (
  select 1 from vault.secrets where name = 'lifegame_registration_webhook_secret'
);

create or replace function public.lifegame_registration_webhook_secret()
returns text
language sql
security definer
set search_path = ''
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'lifegame_registration_webhook_secret'
  limit 1;
$$;

revoke all on function public.lifegame_registration_webhook_secret() from public, anon, authenticated;
grant execute on function public.lifegame_registration_webhook_secret() to service_role;

create or replace function private.notify_telegram_admin_on_profile_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  webhook_secret text;
  request_id bigint;
begin
  select decrypted_secret
    into webhook_secret
  from vault.decrypted_secrets
  where name = 'lifegame_registration_webhook_secret'
  limit 1;

  if webhook_secret is null or webhook_secret = '' then
    raise warning 'LifeGame registration webhook secret is not configured';
    return new;
  end if;

  select net.http_post(
    url := 'https://ewwpnahjhqcbtfszthhc.supabase.co/functions/v1/telegram-admin',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-lifegame-webhook-secret', webhook_secret
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'profiles',
      'schema', 'public',
      'record', jsonb_build_object(
        'id', new.id,
        'display_name', new.display_name,
        'created_at', new.created_at,
        'updated_at', new.updated_at
      ),
      'old_record', null
    )
  ) into request_id;

  return new;
end;
$$;

revoke all on function private.notify_telegram_admin_on_profile_created() from public;

drop trigger if exists profiles_notify_telegram_admin on public.profiles;

create trigger profiles_notify_telegram_admin
after insert on public.profiles
for each row
execute function private.notify_telegram_admin_on_profile_created();
