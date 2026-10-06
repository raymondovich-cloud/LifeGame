-- supabase/migrations/20261007004500_admin_bot_1_1_monitoring.sql — Version 1.0
-- Adds protected monitoring aggregates for LifeGame Admin Bot 1.1.

create or replace function public.lifegame_admin_monitoring_24h()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'forbidden';
  end if;

  return (
    select jsonb_build_object(
      'total_24h', count(*),
      'authentication_failed_24h',
        count(*) filter (where event_type = 'identity.authentication.failed'),
      'security_namespace_24h',
        count(*) filter (where event_type like 'security.%')
    )
    from private.security_events
    where occurred_at >= now() - interval '24 hours'
  );
end;
$$;

revoke all on function public.lifegame_admin_monitoring_24h() from public;
revoke all on function public.lifegame_admin_monitoring_24h() from anon;
revoke all on function public.lifegame_admin_monitoring_24h() from authenticated;
grant execute on function public.lifegame_admin_monitoring_24h() to service_role;
