-- Version 1.0
-- Preserve financial-burden lifecycle and closure timestamps without deleting user history.
alter table public.finance_burdens
    add column if not exists status text not null default 'active',
    add column if not exists closed_at timestamptz;

do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'finance_burdens_status_check'
          and conrelid = 'public.finance_burdens'::regclass
    ) then
        alter table public.finance_burdens
            add constraint finance_burdens_status_check
            check (status in ('active', 'closed'));
    end if;
end
$$;
