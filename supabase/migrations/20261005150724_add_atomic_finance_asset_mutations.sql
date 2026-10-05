-- Version 1.0
-- LifeGame Finance: atomic Assets mutation + historical snapshot.

create or replace function public.finance_mutate_asset(
    p_operation text,
    p_asset_id uuid default null,
    p_label text default null,
    p_amount numeric default null,
    p_liquidity text default null,
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
    end if;

    if p_operation = 'create' then
        insert into public.finance_assets (
            user_id,
            label,
            amount,
            liquidity
        )
        values (
            v_user_id,
            trim(p_label),
            p_amount,
            p_liquidity
        )
        returning * into v_asset;

    elsif p_operation = 'update' then
        update public.finance_assets
        set
            label = trim(p_label),
            amount = p_amount,
            liquidity = p_liquidity
        where id = p_asset_id
          and user_id = v_user_id
        returning * into v_asset;

        if not found then
            return jsonb_build_object(
                'success', false,
                'asset', null,
                'snapshot', null
            );
        end if;

    else
        delete from public.finance_assets
        where id = p_asset_id
          and user_id = v_user_id
        returning * into v_asset;

        if not found then
            return jsonb_build_object(
                'success', false,
                'asset', null,
                'snapshot', null
            );
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
                    'liquidity', a.liquidity
                )
                order by a.created_at, a.id
            ),
            '[]'::jsonb
        )
    into v_total, v_entries
    from public.finance_assets a
    where a.user_id = v_user_id;

    insert into public.finance_asset_snapshots (
        user_id,
        occurred_at,
        total,
        entries
    )
    values (
        v_user_id,
        p_occurred_at,
        v_total,
        v_entries
    )
    returning jsonb_build_object(
        'occurredAt', extract(epoch from occurred_at) * 1000,
        'total', total,
        'entries', entries
    ) into v_snapshot;

    return jsonb_build_object(
        'success', true,
        'asset',
            case
                when p_operation = 'delete' then null
                else jsonb_build_object(
                    'id', v_asset.id,
                    'label', v_asset.label,
                    'amount', v_asset.amount,
                    'liquidity', v_asset.liquidity
                )
            end,
        'snapshot', v_snapshot
    );
end;
$$;

revoke execute on function public.finance_mutate_asset(text, uuid, text, numeric, text, timestamptz) from public, anon;
grant execute on function public.finance_mutate_asset(text, uuid, text, numeric, text, timestamptz) to authenticated;
