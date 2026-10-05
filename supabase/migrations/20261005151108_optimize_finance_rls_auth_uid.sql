-- Version 1.0
-- LifeGame Finance: evaluate auth.uid() once per statement in RLS policies.

alter policy finance_assets_select_own
on public.finance_assets
using ((select auth.uid()) = user_id);

alter policy finance_assets_insert_own
on public.finance_assets
with check ((select auth.uid()) = user_id);

alter policy finance_assets_update_own
on public.finance_assets
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

alter policy finance_assets_delete_own
on public.finance_assets
using ((select auth.uid()) = user_id);

alter policy finance_actual_earnings_select_own
on public.finance_actual_earnings
using ((select auth.uid()) = user_id);

alter policy finance_actual_earnings_insert_own
on public.finance_actual_earnings
with check ((select auth.uid()) = user_id);

alter policy finance_actual_earnings_update_own
on public.finance_actual_earnings
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

alter policy finance_actual_earnings_delete_own
on public.finance_actual_earnings
using ((select auth.uid()) = user_id);

alter policy finance_burdens_select_own
on public.finance_burdens
using ((select auth.uid()) = user_id);

alter policy finance_burdens_insert_own
on public.finance_burdens
with check ((select auth.uid()) = user_id);

alter policy finance_burdens_update_own
on public.finance_burdens
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

alter policy finance_burdens_delete_own
on public.finance_burdens
using ((select auth.uid()) = user_id);

alter policy finance_mandatory_expenses_select_own
on public.finance_mandatory_expenses
using ((select auth.uid()) = user_id);

alter policy finance_mandatory_expenses_insert_own
on public.finance_mandatory_expenses
with check ((select auth.uid()) = user_id);

alter policy finance_mandatory_expenses_update_own
on public.finance_mandatory_expenses
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

alter policy finance_mandatory_expenses_delete_own
on public.finance_mandatory_expenses
using ((select auth.uid()) = user_id);

alter policy finance_cushions_select_own
on public.finance_cushions
using ((select auth.uid()) = user_id);

alter policy finance_cushions_insert_own
on public.finance_cushions
with check ((select auth.uid()) = user_id);

alter policy finance_cushions_update_own
on public.finance_cushions
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

alter policy finance_cushions_delete_own
on public.finance_cushions
using ((select auth.uid()) = user_id);

alter policy finance_asset_snapshots_select_own
on public.finance_asset_snapshots
using ((select auth.uid()) = user_id);

alter policy finance_asset_snapshots_insert_own
on public.finance_asset_snapshots
with check ((select auth.uid()) = user_id);
