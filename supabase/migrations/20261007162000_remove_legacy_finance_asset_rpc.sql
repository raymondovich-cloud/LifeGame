-- Finance Model 3.0 RPC cleanup
-- Version 1.0

begin;

drop function if exists public.finance_mutate_asset(
    text,
    uuid,
    text,
    numeric,
    text,
    timestamptz
);

commit;
