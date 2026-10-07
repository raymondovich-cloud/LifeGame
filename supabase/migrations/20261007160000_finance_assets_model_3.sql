-- Finance model 3.0: assets absorb reserve semantics and income-producing parameters.
-- Version 1.0

begin;

alter table public.finance_assets
    add column asset_type text not null default 'cash'
        check (asset_type in (
            'cash',
            'bank-account',
            'real-estate',
            'vehicle',
            'bank-deposit',
            'bond',
            'investment',
            'other'
        )),
    add column is_reserve boolean not null default false,
    add column income_enabled boolean not null default false,
    add column annual_yield_rate numeric,
    add column compounding_frequency text not null default 'none'
        check (compounding_frequency in ('none', 'monthly', 'quarterly', 'annual'));

alter table public.finance_assets
    add constraint finance_assets_annual_yield_rate_nonnegative
        check (annual_yield_rate is null or annual_yield_rate >= 0);

update public.finance_assets
set income_enabled = true
where asset_type in ('bank-deposit', 'bond')
  and annual_yield_rate is not null;

delete from public.finance_snapshots
where collection = 'financial-cushion';

alter table public.finance_snapshots
    drop constraint if exists finance_snapshots_collection_check;

alter table public.finance_snapshots
    add constraint finance_snapshots_collection_check
    check (
        collection in (
            'actual-earnings',
            'financial-burden',
            'mandatory-expenses'
        )
    );

drop table if exists public.finance_cushions;

create or replace function public.finance_mutate_asset(
    p_operation text,
    p_asset_id uuid default null,
    p_label text default null,
    p_amount numeric default null,
    p_liquidity text default null,
    p_asset_type text default 'cash',
    p_is_reserve boolean default false,
    p_income_enabled boolean default false,
    p_annual_yield_rate numeric default null,
    p_compounding_frequency text default 'none',
    p_occurred_at timestamptz default now()
)
returns jsonb
language plpgsql
security invoker
set search_path = public, auth
as $$
declare
    v_user_id uuid := (select auth.uid());
    v_asset public.finance_assets%rowtype;
    v_snapshot jsonb;
    v_total numeric(20,2);
    v_entries jsonb;
begin
    if v_user_id is null then
        raise exception 'LifeGame Finance: authenticated user is required.';
    end if;

    if p_operation not in ('create', 'update', 'delete') then
        raise exception 'LifeGame Finance: unsupported asset mutation.';
    end if;

    if p_operation in ('create', 'update') then
        if nullif(trim(p_label), '') is null then
            raise exception 'LifeGame Finance: asset label is required.';
        end if;

        if p_amount is null or p_amount <= 0 then
            raise exception 'LifeGame Finance: asset amount must be greater than zero.';
        end if;

        if p_liquidity not in ('liquid', 'illiquid') then
            raise exception 'LifeGame Finance: asset liquidity is invalid.';
        end if;

        if p_asset_type not in (
            'cash', 'bank-account', 'real-estate', 'vehicle',
            'bank-deposit', 'bond', 'investment', 'other'
        ) then
            raise exception 'LifeGame Finance: asset type is invalid.';
        end if;

        if p_annual_yield_rate is not null and p_annual_yield_rate < 0 then
            raise exception 'LifeGame Finance: annual yield rate must be non-negative.';
        end if;

        if p_compounding_frequency not in ('none', 'monthly', 'quarterly', 'annual') then
            raise exception 'LifeGame Finance: compounding frequency is invalid.';
        end if;

        if p_income_enabled and p_annual_yield_rate is null then
            raise exception 'LifeGame Finance: income-producing assets require an annual yield rate.';
        end if;
    end if;

    if p_operation = 'create' then
        insert into public.finance_assets (
            user_id, label, amount, liquidity, asset_type, is_reserve,
            income_enabled, annual_yield_rate, compounding_frequency
        )
        values (
            v_user_id, trim(p_label), p_amount, p_liquidity, p_asset_type,
            p_is_reserve, p_income_enabled, p_annual_yield_rate, p_compounding_frequency
        )
        returning * into v_asset;

    elsif p_operation = 'update' then
        update public.finance_assets
        set
            label = trim(p_label),
            amount = p_amount,
            liquidity = p_liquidity,
            asset_type = p_asset_type,
            is_reserve = p_is_reserve,
            income_enabled = p_income_enabled,
            annual_yield_rate = p_annual_yield_rate,
            compounding_frequency = p_compounding_frequency
        where id = p_asset_id
          and user_id = v_user_id
        returning * into v_asset;

        if not found then
            return jsonb_build_object('success', false, 'asset', null, 'snapshot', null);
        end if;

    else
        delete from public.finance_assets
        where id = p_asset_id
          and user_id = v_user_id
        returning * into v_asset;

        if not found then
            return jsonb_build_object('success', false, 'asset', null, 'snapshot', null);
        end if;
    end if;

    select
        coalesce(sum(a.amount), 0)::numeric(20,2),
        coalesce(
            jsonb_agg(
                jsonb_build_object(
                    'id', a.id,
                    'label', a.label,
                    'amount', a.amount,
                    'liquidity', a.liquidity,
                    'asset_type', a.asset_type,
                    'is_reserve', a.is_reserve,
                    'income_enabled', a.income_enabled,
                    'annual_yield_rate', a.annual_yield_rate,
                    'compounding_frequency', a.compounding_frequency
                )
                order by a.created_at, a.id
            ),
            '[]'::jsonb
        )
    into v_total, v_entries
    from public.finance_assets a
    where a.user_id = v_user_id;

    insert into public.finance_asset_snapshots (
        user_id, occurred_at, total, entries
    )
    values (
        v_user_id, p_occurred_at, v_total, v_entries
    )
    returning jsonb_build_object(
        'occurredAt', extract(epoch from occurred_at) * 1000,
        'total', total,
        'entries', entries
    ) into v_snapshot;

    return jsonb_build_object(
        'success', true,
        'asset',
            case when p_operation = 'delete' then null else
                jsonb_build_object(
                    'id', v_asset.id,
                    'label', v_asset.label,
                    'amount', v_asset.amount,
                    'liquidity', v_asset.liquidity,
                    'asset_type', v_asset.asset_type,
                    'is_reserve', v_asset.is_reserve,
                    'income_enabled', v_asset.income_enabled,
                    'annual_yield_rate', v_asset.annual_yield_rate,
                    'compounding_frequency', v_asset.compounding_frequency
                )
            end,
        'snapshot', v_snapshot
    );
end;
$$;

revoke execute on function public.finance_mutate_asset(text, uuid, text, numeric, text, timestamptz)
    from public, anon;
revoke execute on function public.finance_mutate_asset(
    text, uuid, text, numeric, text, text, boolean, boolean, numeric, text, timestamptz
) from public, anon;

grant execute on function public.finance_mutate_asset(
    text, uuid, text, numeric, text, text, boolean, boolean, numeric, text, timestamptz
) to authenticated;

commit;
