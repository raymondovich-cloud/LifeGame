-- supabase/migrations/20261006234600_admin_bot_1_0.sql — Version 1.0
-- Adds security-event notifications for LifeGame Admin Bot 1.0.

create or replace function private.notify_telegram_admin_on_security_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  webhook_secret text;
  request_id bigint;
begin
  if new.event_type = 'identity.user.registered' then
    return new;
  end if;

  if new.event_type not like 'security.%'
     and new.event_type not like 'identity.authentication.%' then
    return new;
  end if;

  select decrypted_secret
    into webhook_secret
  from vault.decrypted_secrets
  where name = 'lifegame_registration_webhook_secret'
  limit 1;

  if webhook_secret is null or webhook_secret = '' then
    raise warning 'LifeGame admin webhook secret is not configured';
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
      'event_type', 'security_event',
      'table', 'security_events',
      'schema', 'private',
      'record', jsonb_build_object(
        'id', new.id,
        'user_id', new.user_id,
        'event_type', new.event_type,
        'occurred_at', new.occurred_at
      ),
      'old_record', null
    )
  ) into request_id;

  return new;
end;
$$;

revoke all on function private.notify_telegram_admin_on_security_event() from public;
revoke all on function private.notify_telegram_admin_on_security_event() from anon;
revoke all on function private.notify_telegram_admin_on_security_event() from authenticated;

drop trigger if exists security_events_notify_telegram_admin on private.security_events;

create trigger security_events_notify_telegram_admin
after insert on private.security_events
for each row
execute function private.notify_telegram_admin_on_security_event();
