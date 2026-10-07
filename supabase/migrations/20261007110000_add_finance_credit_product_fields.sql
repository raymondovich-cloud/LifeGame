-- Finance credit product parameters.
-- Version 1.0

begin;

alter table public.finance_burdens
    add column is_credit_product boolean not null default false,
    add column interest_rate numeric,
    alter column payment drop not null;

alter table public.finance_burdens
    add constraint finance_burdens_payment_nonnegative
        check (payment is null or payment >= 0),
    add constraint finance_burdens_interest_rate_nonnegative
        check (interest_rate is null or interest_rate >= 0);

update public.finance_burdens
set is_credit_product = true
where payment is not null
  and payment > 0;

comment on column public.finance_burdens.is_credit_product is
    'Whether this financial burden is a credit product with payment and interest parameters.';

comment on column public.finance_burdens.interest_rate is
    'Annual interest rate in percent for credit products; used by future credit calculations.';

commit;
