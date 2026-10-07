-- LifeGame Finance row creator metadata
-- Version 1.0
-- Responsibility: preserve the original creator identity for Finance rows.

alter table public.finance_assets add column if not exists created_by uuid;
alter table public.finance_actual_earnings add column if not exists created_by uuid;
alter table public.finance_burdens add column if not exists created_by uuid;
alter table public.finance_mandatory_expenses add column if not exists created_by uuid;
alter table public.finance_cushions add column if not exists created_by uuid;

update public.finance_assets set created_by = user_id where created_by is null;
update public.finance_actual_earnings set created_by = user_id where created_by is null;
update public.finance_burdens set created_by = user_id where created_by is null;
update public.finance_mandatory_expenses set created_by = user_id where created_by is null;
update public.finance_cushions set created_by = user_id where created_by is null;

alter table public.finance_assets alter column created_by set default auth.uid(), alter column created_by set not null;
alter table public.finance_actual_earnings alter column created_by set default auth.uid(), alter column created_by set not null;
alter table public.finance_burdens alter column created_by set default auth.uid(), alter column created_by set not null;
alter table public.finance_mandatory_expenses alter column created_by set default auth.uid(), alter column created_by set not null;
alter table public.finance_cushions alter column created_by set default auth.uid(), alter column created_by set not null;

create or replace function public.finance_set_creator()
returns trigger
language plpgsql
as $$
begin
    if tg_op = 'INSERT' then
        new.created_by := coalesce(auth.uid(), new.user_id);
    elsif tg_op = 'UPDATE' then
        new.created_by := old.created_by;
    end if;
    return new;
end;
$$;

drop trigger if exists finance_assets_set_creator on public.finance_assets;
create trigger finance_assets_set_creator
before insert or update on public.finance_assets
for each row execute function public.finance_set_creator();

drop trigger if exists finance_actual_earnings_set_creator on public.finance_actual_earnings;
create trigger finance_actual_earnings_set_creator
before insert or update on public.finance_actual_earnings
for each row execute function public.finance_set_creator();

drop trigger if exists finance_burdens_set_creator on public.finance_burdens;
create trigger finance_burdens_set_creator
before insert or update on public.finance_burdens
for each row execute function public.finance_set_creator();

drop trigger if exists finance_mandatory_expenses_set_creator on public.finance_mandatory_expenses;
create trigger finance_mandatory_expenses_set_creator
before insert or update on public.finance_mandatory_expenses
for each row execute function public.finance_set_creator();

drop trigger if exists finance_cushions_set_creator on public.finance_cushions;
create trigger finance_cushions_set_creator
before insert or update on public.finance_cushions
for each row execute function public.finance_set_creator();

alter table public.finance_assets
    add constraint finance_assets_created_by_fkey
    foreign key (created_by) references auth.users(id);

alter table public.finance_actual_earnings
    add constraint finance_actual_earnings_created_by_fkey
    foreign key (created_by) references auth.users(id);

alter table public.finance_burdens
    add constraint finance_burdens_created_by_fkey
    foreign key (created_by) references auth.users(id);

alter table public.finance_mandatory_expenses
    add constraint finance_mandatory_expenses_created_by_fkey
    foreign key (created_by) references auth.users(id);

alter table public.finance_cushions
    add constraint finance_cushions_created_by_fkey
    foreign key (created_by) references auth.users(id);

comment on column public.finance_assets.created_by is
    'Authenticated user who originally created the finance row.';

comment on column public.finance_actual_earnings.created_by is
    'Authenticated user who originally created the finance row.';

comment on column public.finance_burdens.created_by is
    'Authenticated user who originally created the finance row.';

comment on column public.finance_mandatory_expenses.created_by is
    'Authenticated user who originally created the finance row.';

comment on column public.finance_cushions.created_by is
    'Authenticated user who originally created the finance row.';
