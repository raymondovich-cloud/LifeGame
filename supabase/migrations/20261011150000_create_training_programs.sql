-- supabase/migrations/20261011150000_create_training_programs.sql — Version 1.0
-- Private encrypted training-program persistence. All reads/writes go through the authenticated server handler.
begin;
create table public.training_programs(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null unique references auth.users(id) on delete cascade,
 start_date date not null,
 status text not null check(status in ('active','paused','completed')),
 revision bigint not null default 1 check(revision>0),
 payload_ciphertext bytea not null check(octet_length(payload_ciphertext) between 1 and 262144),
 payload_nonce bytea not null check(octet_length(payload_nonce)=12),
 payload_tag bytea not null check(octet_length(payload_tag)=16),
 payload_key_envelope bytea not null check(octet_length(payload_key_envelope) between 1 and 8192),
 payload_key_version text not null check(char_length(btrim(payload_key_version)) between 1 and 200),
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp()
);
comment on table public.training_programs is 'Private LifeGame training program. Program name, duration and workout templates are authenticated ciphertext; only minimal schedule metadata remains visible.';
comment on column public.training_programs.start_date is 'Open metadata required for progress calculations; reveals program start timing.';
comment on column public.training_programs.payload_ciphertext is 'AES-256-GCM encrypted program name, duration and weekly workout templates.';
alter table public.training_programs enable row level security;
revoke all on table public.training_programs from public,anon,authenticated;
grant select,insert,update on table public.training_programs to service_role;
create or replace function private.enforce_training_program_write()
returns trigger language plpgsql security invoker set search_path='' as $$
declare authenticated_user_id uuid;
begin
 authenticated_user_id := (select auth.uid());
 if authenticated_user_id is null and current_user <> 'service_role' then
  raise exception 'training program requires trusted server role' using errcode='42501';
 end if;
 if tg_op='INSERT' then
  if authenticated_user_id is not null and new.user_id is distinct from authenticated_user_id then raise exception 'training program owner mismatch' using errcode='42501'; end if;
  if new.revision is distinct from 1 then raise exception 'new program must start at revision 1' using errcode='23514'; end if;
  new.created_at:=clock_timestamp();new.updated_at:=new.created_at;return new;
 end if;
 if authenticated_user_id is not null and old.user_id is distinct from authenticated_user_id then raise exception 'training program owner mismatch' using errcode='42501'; end if;
 if new.id is distinct from old.id or new.user_id is distinct from old.user_id then raise exception 'program identity and ownership are immutable' using errcode='42501'; end if;
 new.created_at:=old.created_at;new.revision:=old.revision+1;new.updated_at:=clock_timestamp();return new;
end;$$;
revoke all on function private.enforce_training_program_write() from public,anon,authenticated;
create trigger training_programs_enforce_write before insert or update on public.training_programs for each row execute function private.enforce_training_program_write();
commit;
