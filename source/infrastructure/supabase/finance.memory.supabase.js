// finance.memory.supabase.js — Version 2.0
// Responsibility: implement the Finance Memory Port with Supabase persistence and a local runtime cache.

const COLLECTIONS = Object.freeze({
    assets: { table: "finance_assets", fields: ["label", "amount", "liquidity"] },
    actualEarnings: { table: "finance_actual_earnings", fields: ["label", "amount"] },
    financialBurden: { table: "finance_burdens", fields: ["label", "debt", "payment"] },
    mandatoryExpenses: { table: "finance_mandatory_expenses", fields: ["label", "amount"] },
    financialCushion: { table: "finance_cushions", fields: ["label", "amount"] }
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

    function normalizeRow(row) {
        if (!row) return row;
        const result = { ...row };

        ["amount", "debt", "payment"].forEach((field) => {
            if (result[field] !== undefined && result[field] !== null) {
                result[field] = Number(result[field]);
            }
        });

        delete result.user_id;
        delete result.created_at;
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
                entries: row.entries || []
            }))
        );
    }

    async function hydrate() {
        await Promise.all([
            ...Object.keys(COLLECTIONS).map(loadCollection),
            loadSnapshots()
        ]);
    }

    function list(key) {
        return clone(cache[key]);
    }

    async function save(key, entry) {
        const config = COLLECTIONS[key];
        const payload = { user_id: userId };

        config.fields.forEach((field) => {
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
        return clone(saved);
    }

    async function update(key, id, entry) {
        const config = COLLECTIONS[key];
        const payload = {};

        config.fields.forEach((field) => {
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
        const index = cache[key].findIndex((item) => item.id === id);

        if (index !== -1) cache[key][index] = updated;

        return clone(updated);
    }

    async function remove(key, id) {
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
            entries: data.entries || []
        };

        snapshots.push(clone(saved));
        return clone(saved);
    }

    function listSnapshots() {
        return clone(snapshots);
    }

    return Object.freeze({
        userId,
        hydrate,
        listAssets: () => list("assets"),
        saveAsset: (entry) => save("assets", entry),
        updateAsset: (id, entry) => update("assets", id, entry),
        deleteAsset: (id) => remove("assets", id),

        listActualEarnings: () => list("actualEarnings"),
        saveActualEarning: (entry) => save("actualEarnings", entry),
        updateActualEarning: (id, entry) => update("actualEarnings", id, entry),
        deleteActualEarning: (id) => remove("actualEarnings", id),

        listFinancialBurden: () => list("financialBurden"),
        saveFinancialBurden: (entry) => save("financialBurden", entry),
        updateFinancialBurden: (id, entry) => update("financialBurden", id, entry),
        deleteFinancialBurden: (id) => remove("financialBurden", id),

        listMandatoryExpenses: () => list("mandatoryExpenses"),
        saveMandatoryExpense: (entry) => save("mandatoryExpenses", entry),
        updateMandatoryExpense: (id, entry) => update("mandatoryExpenses", id, entry),
        deleteMandatoryExpense: (id) => remove("mandatoryExpenses", id),

        listFinancialCushion: () => list("financialCushion"),
        saveFinancialCushion: (entry) => save("financialCushion", entry),
        updateFinancialCushion: (id, entry) => update("financialCushion", id, entry),
        deleteFinancialCushion: (id) => remove("financialCushion", id),

        saveAssetsSnapshot,
        getAssetsSnapshotAtOrBefore: (timestamp) => {
            const matches = snapshots.filter((item) => item.occurredAt <= timestamp);
            return matches.length ? clone(matches[matches.length - 1]) : null;
        },
        getAssetsSnapshotsBetween: (start, end) =>
            clone(snapshots.filter((item) =>
                item.occurredAt >= start && item.occurredAt <= end
            )),
        getFirstAssetsSnapshot: () =>
            snapshots.length ? clone(snapshots[0]) : null,
        getLatestAssetsSnapshot: () =>
            snapshots.length ? clone(snapshots[snapshots.length - 1]) : null,
        listAssetsSnapshots: listSnapshots
    });
}

export { createSupabaseFinanceMemory };
