// finance.memory.supabase.js — Version 3.1
// Responsibility: implement the Finance Memory Port with Supabase persistence and a local runtime cache.

const COLLECTIONS = Object.freeze({
    assets: {
        table: "finance_assets",
        fields: [
            "label",
            "amount",
            "liquidity",
            "asset_type",
            "is_reserve",
            "income_enabled",
            "annual_yield_rate",
            "compounding_frequency"
        ]
    },
    actualEarnings: { table: "finance_actual_earnings", fields: ["label", "amount"] },
    financialBurden: { table: "finance_burdens", fields: ["label", "debt", "payment", "is_credit_product", "interest_rate"] },
    mandatoryExpenses: { table: "finance_mandatory_expenses", fields: ["label", "amount"] }
});

function createSupabaseFinanceMemory({ client, userContext }) {
    if (!client || !userContext?.userId) {
        throw new Error("Supabase Finance Memory: client and user context are required.");
    }

    const userId = userContext.userId;
    const cache = Object.fromEntries(
        Object.keys(COLLECTIONS).map((key) => [key, []])
    );
    const snapshots = [];
    const financeSnapshots = new Map();

    function normalizeRow(row) {
        if (!row) return row;
        const result = { ...row };

        ["amount", "debt", "payment", "interest_rate"].forEach((field) => {
            if (result[field] !== undefined && result[field] !== null) {
                result[field] = Number(result[field]);
            }
        });

        if (result.is_credit_product !== undefined && result.is_credit_product !== null) {
            result.isCreditProduct = Boolean(result.is_credit_product);
            delete result.is_credit_product;
        }

        if (result.interest_rate !== undefined) {
            result.interestRate = result.interest_rate === null ? null : Number(result.interest_rate);
            delete result.interest_rate;
        }

        if (result.asset_type !== undefined) {
            result.assetType = result.asset_type || "cash";
            delete result.asset_type;
        }
        if (result.is_reserve !== undefined) {
            result.isReserve = Boolean(result.is_reserve);
            delete result.is_reserve;
        }
        if (result.income_enabled !== undefined) {
            result.incomeEnabled = Boolean(result.income_enabled);
            delete result.income_enabled;
        }
        if (result.annual_yield_rate !== undefined) {
            result.annualYieldRate = result.annual_yield_rate === null ? null : Number(result.annual_yield_rate);
            delete result.annual_yield_rate;
        }
        if (result.compounding_frequency !== undefined) {
            result.compoundingFrequency = result.compounding_frequency || "none";
            delete result.compounding_frequency;
        }

        if (result.created_at !== undefined && result.created_at !== null) {
            result.createdAt = new Date(result.created_at).getTime();
            delete result.created_at;
        }

        if (result.created_by !== undefined && result.created_by !== null) {
            result.createdBy = result.created_by;
            delete result.created_by;
        }

        delete result.user_id;
        delete result.updated_at;
        return result;
    }

    function clone(value) {
        return structuredClone(value);
    }

    async function loadCollection(key) {
        const config = COLLECTIONS[key];
        const { data, error } = await client
            .from(config.table)
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: true });

        if (error) throw error;
        cache[key] = (data || []).map(normalizeRow);
    }

    async function loadFinanceSnapshots() {
        const { data, error } = await client
            .from("finance_snapshots")
            .select("*")
            .eq("user_id", userId)
            .order("occurred_at", { ascending: true });

        if (error) throw error;

        financeSnapshots.clear();
        (data || []).forEach((row) => {
            const list = financeSnapshots.get(row.collection) || [];
            list.push({
                occurredAt: new Date(row.occurred_at).getTime(),
                total: Number(row.total),
                entries: (row.entries || []).map(normalizeRow)
            });
            financeSnapshots.set(row.collection, list);
        });
    }

    async function loadSnapshots() {
        const { data, error } = await client
            .from("finance_asset_snapshots")
            .select("*")
            .eq("user_id", userId)
            .order("occurred_at", { ascending: true });

        if (error) throw error;

        snapshots.splice(
            0,
            snapshots.length,
            ...(data || []).map((row) => ({
                occurredAt: new Date(row.occurred_at).getTime(),
                total: Number(row.total),
                entries: (row.entries || []).map(normalizeRow)
            }))
        );
    }

    async function hydrateCreatorNames() {
        const metadataByEntryId = new Map(
            Object.values(cache)
                .flat()
                .filter((entry) => entry?.id)
                .map((entry) => [
                    entry.id,
                    {
                        createdAt: entry.createdAt,
                        createdBy: entry.createdBy,
                        creatorName: entry.creatorName
                    }
                ])
        );

        snapshots.forEach((snapshot) => {
            snapshot.entries.forEach((entry) => {
                const current = metadataByEntryId.get(entry?.id);
                if (!current) return;

                if (entry.createdAt === undefined && current.createdAt !== undefined) {
                    entry.createdAt = current.createdAt;
                }
                if (entry.createdBy === undefined && current.createdBy !== undefined) {
                    entry.createdBy = current.createdBy;
                }
                if (!entry.creatorName && current.creatorName) {
                    entry.creatorName = current.creatorName;
                }
            });
        });

        const creatorIds = [...new Set([
            ...Object.values(cache).flat().map((entry) => entry.createdBy),
            ...snapshots.flatMap((snapshot) => snapshot.entries.map((entry) => entry.createdBy))
        ].filter(Boolean))];

        if (creatorIds.length === 0) return;

        const { data, error } = await client
            .from("profiles")
            .select("id, display_name")
            .in("id", creatorIds);

        if (error) throw error;

        const names = new Map(
            (data || []).map((profile) => [
                profile.id,
                String(profile.display_name || "").trim()
            ])
        );

        Object.values(cache).forEach((entries) => {
            entries.forEach((entry) => {
                const creatorName = names.get(entry.createdBy);
                if (creatorName) entry.creatorName = creatorName;
            });
        });

        snapshots.forEach((snapshot) => {
            snapshot.entries.forEach((entry) => {
                const creatorName = names.get(entry.createdBy);
                if (creatorName) entry.creatorName = creatorName;
            });
        });
    }

    async function hydrate() {
        await Promise.all([
            ...Object.keys(COLLECTIONS).map(loadCollection),
            loadSnapshots(),
            loadFinanceSnapshots()
        ]);

        await hydrateCreatorNames();
    }

    function list(key) {
        return clone(cache[key]);
    }

    async function mutateAsset({ operation, entry = null, entryId = null, occurredAt = Date.now() }) {
        const { data, error } = await client.rpc("finance_mutate_asset", {
            p_operation: operation,
            p_asset_id: entryId,
            p_label: entry?.label ?? null,
            p_amount: entry?.amount ?? null,
            p_liquidity: entry?.liquidity ?? null,
            p_asset_type: entry?.assetType ?? "cash",
            p_is_reserve: Boolean(entry?.isReserve),
            p_income_enabled: Boolean(entry?.incomeEnabled),
            p_annual_yield_rate: entry?.annualYieldRate ?? null,
            p_compounding_frequency: entry?.compoundingFrequency ?? "none",
            p_occurred_at: new Date(occurredAt).toISOString()
        });

        if (error) throw error;
        if (!data?.success) return false;

        if (operation === "create") {
            const saved = normalizeRow(data.asset);
            cache.assets.push(saved);
            await hydrateCreatorNames();
            applySnapshot(data.snapshot);
            return {
                entry: clone(saved),
                snapshot: clone(data.snapshot)
            };
        }

        if (operation === "update") {
            const updated = normalizeRow(data.asset);
            const existing = cache.assets.find((item) => item.id === entryId);
            if (existing?.creatorName) updated.creatorName = existing.creatorName;
            const index = cache.assets.findIndex((item) => item.id === entryId);

            if (index !== -1) cache.assets[index] = updated;
            applySnapshot(data.snapshot);

            return {
                entry: clone(updated),
                snapshot: clone(data.snapshot)
            };
        }

        cache.assets = cache.assets.filter((item) => item.id !== entryId);
        applySnapshot(data.snapshot);

        return {
            entry: null,
            snapshot: clone(data.snapshot)
        };
    }

    async function saveFinanceSnapshot(collection, snapshot) {
        if (collection === "assets") return saveAssetsSnapshot(snapshot);

        const { data, error } = await client
            .from("finance_snapshots")
            .insert({
                user_id: userId,
                collection,
                occurred_at: new Date(snapshot.occurredAt).toISOString(),
                total: snapshot.total,
                entries: snapshot.entries
            })
            .select("*")
            .single();

        if (error) throw error;

        const saved = {
            occurredAt: new Date(data.occurred_at).getTime(),
            total: Number(data.total),
            entries: (data.entries || []).map(normalizeRow)
        };
        const list = financeSnapshots.get(collection) || [];
        list.push(saved);
        financeSnapshots.set(collection, list);
        return clone(saved);
    }

    async function mutateFinanceCollection({ collection, operation, entry = null, entryId = null, occurredAt = Date.now() }) {
        if (collection === "assets") return mutateAsset({ operation, entry, entryId, occurredAt });

        const key = {
            "actual-earnings": "actualEarnings",
            "financial-burden": "financialBurden",
            "mandatory-expenses": "mandatoryExpenses"
        }[collection];

        if (!key) throw new Error("Supabase Finance Memory: unknown Finance collection.");

        let result;
        if (operation === "create") result = await save(key, entry);
        else if (operation === "update") result = await update(key, entryId, entry);
        else if (operation === "delete") {
            result = await remove(key, entryId);
            if (!result) return false;
        } else {
            throw new Error("Supabase Finance Memory: invalid Finance mutation.");
        }

        const entries = list(key);
        const total = collection === "financial-burden"
            ? entries.reduce((sum, item) => sum + Number(item.debt || item.amount || 0), 0)
            : entries.reduce((sum, item) => sum + Number(item.amount || 0), 0);

        const snapshot = await saveFinanceSnapshot(collection, {
            occurredAt,
            total,
            entries
        });

        return {
            entry: operation === "delete" ? null : result,
            snapshot
        };
    }

    async function save(key, entry) {
        if (key === "assets") {
            const result = await mutateAsset({
                operation: "create",
                entry,
                occurredAt: Date.now()
            });

            return result ? result.entry : false;
        }

        const config = COLLECTIONS[key];
        const payload = { user_id: userId };

        config.fields.forEach((field) => {
            if (field === "is_credit_product") {
                payload[field] = entry.isCreditProduct ?? false;
                return;
            }
            if (field === "interest_rate") {
                payload[field] = entry.interestRate ?? null;
                return;
            }
            payload[field] = entry[field];
        });

        const { data, error } = await client
            .from(config.table)
            .insert(payload)
            .select("*")
            .single();

        if (error) throw error;

        const saved = normalizeRow(data);
        cache[key].push(saved);
        await hydrateCreatorNames();
        return clone(saved);
    }

    async function update(key, id, entry) {
        if (key === "assets") {
            const result = await mutateAsset({
                operation: "update",
                entryId: id,
                entry,
                occurredAt: Date.now()
            });

            return result ? result.entry : false;
        }

        const config = COLLECTIONS[key];
        const payload = {};

        config.fields.forEach((field) => {
            if (field === "is_credit_product") {
                payload[field] = entry.isCreditProduct ?? false;
                return;
            }
            if (field === "interest_rate") {
                payload[field] = entry.interestRate ?? null;
                return;
            }
            payload[field] = entry[field];
        });

        const { data, error } = await client
            .from(config.table)
            .update(payload)
            .eq("id", id)
            .eq("user_id", userId)
            .select("*")
            .maybeSingle();

        if (error) throw error;
        if (!data) return false;

        const updated = normalizeRow(data);
        const existing = cache[key].find((item) => item.id === id);
        if (existing?.creatorName) updated.creatorName = existing.creatorName;
        const index = cache[key].findIndex((item) => item.id === id);

        if (index !== -1) cache[key][index] = updated;

        return clone(updated);
    }

    async function remove(key, id) {
        if (key === "assets") {
            const result = await mutateAsset({
                operation: "delete",
                entryId: id,
                occurredAt: Date.now()
            });

            return Boolean(result);
        }

        const config = COLLECTIONS[key];

        const { data, error } = await client
            .from(config.table)
            .delete()
            .eq("id", id)
            .eq("user_id", userId)
            .select("id");

        if (error) throw error;
        if (!data?.length) return false;

        cache[key] = cache[key].filter((item) => item.id !== id);
        return true;
    }



    function applySnapshot(snapshot) {
        if (!snapshot) return;

        snapshots.push({
            occurredAt: Number(snapshot.occurredAt),
            total: Number(snapshot.total),
            entries: (snapshot.entries || []).map(normalizeRow)
        });
    }

    async function saveAssetsSnapshot(snapshot) {
        const { data, error } = await client
            .from("finance_asset_snapshots")
            .insert({
                user_id: userId,
                occurred_at: new Date(snapshot.occurredAt).toISOString(),
                total: snapshot.total,
                entries: snapshot.entries
            })
            .select("*")
            .single();

        if (error) throw error;

        const saved = {
            occurredAt: new Date(data.occurred_at).getTime(),
            total: Number(data.total),
            entries: (data.entries || []).map(normalizeRow)
        };

        snapshots.push(clone(saved));
        return clone(saved);
    }

    function listSnapshots() {
        return snapshots.map(clone);
    }

    function getSnapshotAtOrBefore(timestamp) {
        let result = null;

        snapshots.forEach((snapshot) => {
            if (snapshot.occurredAt <= timestamp) {
                if (!result || snapshot.occurredAt >= result.occurredAt) {
                    result = snapshot;
                }
            }
        });

        return result ? clone(result) : null;
    }

    function getSnapshotsBetween(startTimestamp, endTimestamp) {
        if (
            !Number.isFinite(startTimestamp) ||
            !Number.isFinite(endTimestamp) ||
            startTimestamp > endTimestamp
        ) {
            throw new Error("Supabase Finance Memory: invalid snapshot range.");
        }

        return snapshots
            .filter((snapshot) =>
                snapshot.occurredAt >= startTimestamp &&
                snapshot.occurredAt <= endTimestamp
            )
            .sort((left, right) => left.occurredAt - right.occurredAt)
            .map(clone);
    }

    function getFirstSnapshot() {
        if (snapshots.length === 0) return null;

        return clone(
            snapshots.reduce((first, snapshot) =>
                !first || snapshot.occurredAt < first.occurredAt
                    ? snapshot
                    : first,
            null)
        );
    }

    function getLatestSnapshot() {
        if (snapshots.length === 0) return null;

        return clone(
            snapshots.reduce((latest, snapshot) =>
                !latest || snapshot.occurredAt >= latest.occurredAt
                    ? snapshot
                    : latest,
            null)
        );
    }

    return Object.freeze({
        userId,
        hydrate,
        listAssets: () => list("assets"),
        saveAsset: (entry) => save("assets", entry),
        updateAsset: (id, entry) => update("assets", id, entry),
        deleteAsset: (id) => remove("assets", id),
        mutateAsset,

        listActualEarnings: () => list("actualEarnings"),
        saveActualEarning: (entry) => save("actualEarnings", entry),
        updateActualEarning: (id, entry) =>
            update("actualEarnings", id, entry),
        deleteActualEarning: (id) =>
            remove("actualEarnings", id),

        listFinancialBurden: () => list("financialBurden"),
        saveFinancialBurden: (entry) =>
            save("financialBurden", entry),
        updateFinancialBurden: (id, entry) =>
            update("financialBurden", id, entry),
        deleteFinancialBurden: (id) =>
            remove("financialBurden", id),

        listMandatoryExpenses: () =>
            list("mandatoryExpenses"),
        saveMandatoryExpense: (entry) =>
            save("mandatoryExpenses", entry),
        updateMandatoryExpense: (id, entry) =>
            update("mandatoryExpenses", id, entry),
        deleteMandatoryExpense: (id) =>
            remove("mandatoryExpenses", id),

        saveAssetsSnapshot,
        getAssetsSnapshotAtOrBefore: getSnapshotAtOrBefore,
        getAssetsSnapshotsBetween: getSnapshotsBetween,
        getFirstAssetsSnapshot: getFirstSnapshot,
        getLatestAssetsSnapshot: getLatestSnapshot,
        mutateFinanceCollection,
        getCollectionSnapshotAtOrBefore: (collection, timestamp) => {
            if (collection === "assets") return getSnapshotAtOrBefore(timestamp);
            const list = financeSnapshots.get(collection) || [];
            let result = null;
            list.forEach((snapshot) => {
                if (snapshot.occurredAt <= timestamp && (!result || snapshot.occurredAt > result.occurredAt)) {
                    result = snapshot;
                }
            });
            return result ? clone(result) : null;
        },
        getCollectionSnapshotsBetween: (collection, startTimestamp, endTimestamp) => {
            if (collection === "assets") return getSnapshotsBetween(startTimestamp, endTimestamp);
            return (financeSnapshots.get(collection) || [])
                .filter((snapshot) => snapshot.occurredAt >= startTimestamp && snapshot.occurredAt <= endTimestamp)
                .sort((left, right) => left.occurredAt - right.occurredAt)
                .map(clone);
        },
        getFirstCollectionSnapshot: (collection) => {
            if (collection === "assets") return getFirstSnapshot();
            const list = financeSnapshots.get(collection) || [];
            return list.length
                ? clone(list.reduce((first, snapshot) => !first || snapshot.occurredAt < first.occurredAt ? snapshot : first, null))
                : null;
        },
        getLatestCollectionSnapshot: (collection) => {
            if (collection === "assets") return getLatestSnapshot();
            const list = financeSnapshots.get(collection) || [];
            return list.length
                ? clone(list.reduce((latest, snapshot) => !latest || snapshot.occurredAt > latest.occurredAt ? snapshot : latest, null))
                : null;
        }
    });
}

export { createSupabaseFinanceMemory };
