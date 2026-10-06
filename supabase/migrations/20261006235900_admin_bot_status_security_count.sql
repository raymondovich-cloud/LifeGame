-- supabase/migrations/20261006235900_admin_bot_status_security_count.sql — Version 1.0
-- Adds a protected aggregate RPC for Admin Bot /status without exposing private.security_events.

create or replace function public.lifegame_security_events_24h()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'forbidden';
  end if;

  return (
    select count(*)::bigint
    from private.security_events
    where occurred_at >= now() - interval '24 hours'
  );
end;
$$;

revoke all on function public.lifegame_security_events_24h() from public;
revoke all on function public.lifegame_security_events_24h() from anon;
revoke all on function public.lifegame_security_events_24h() from authenticated;
grant execute on function public.lifegame_security_events_24h() to service_role;
