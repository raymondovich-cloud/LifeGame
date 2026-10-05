// finance.memory.supabase.js — Version 1.0
// Responsibility: implement the Finance Memory Port with Supabase persistence.

const COLLECTIONS = Object.freeze({
    assets: {
        table: "finance_assets",
        fields: ["label", "amount", "liquidity"]
    },
    actualEarnings: {
        table: "finance_actual_earnings",
        fields: ["label", "amount"]
    },
    financialBurden: {
        table: "finance_burdens",
        fields: ["label", "debt", "payment"]
    },
    mandatoryExpenses: {
        table: "finance_mandatory_expenses",
        fields: ["label", "amount"]
    },
    financialCushion: {
        table: "finance_cushions",
        fields: ["label", "amount"]
    }
});

function createSupabaseFinanceMemory({ client, userContext }) {
    if (!client) {
        throw new Error("Supabase Finance Memory: client is required.");
    }

    const userId = userContext?.userId;

    if (!userId) {
        throw new Error("Supabase Finance Memory: user context is required.");
    }

    function normalizeRow(row) {
        if (!row) return row;

        const result = { ...row };
        delete result.user_id;
        delete result.created_at;
        delete result.updated_at;
        return result;
    }

    async function list(collection) {
        const config = COLLECTIONS[collection];
        const { data, error } = await client
            .from(config.table)
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: true });

        if (error) throw error;
        return (data || []).map(normalizeRow);
    }

    async function save(collection, entry) {
        const config = COLLECTIONS[collection];
        const payload = { user_id: userId };

        for (const field of config.fields) {
            payload[field] = entry[field];
        }

        const { data, error } = await client
            .from(config.table)
            .insert(payload)
            .select("*")
            .single();

        if (error) throw error;
        return normalizeRow(data);
    }

    async function update(collection, id, entry) {
        const config = COLLECTIONS[collection];
        const payload = {};

        for (const field of config.fields) {
            payload[field] = entry[field];
        }

        const { data, error } = await client
            .from(config.table)
            .update(payload)
            .eq("id", id)
            .eq("user_id", userId)
            .select("*")
            .maybeSingle();

        if (error) throw error;
        return data ? normalizeRow(data) : false;
    }

    async function remove(collection, id) {
        const config = COLLECTIONS[collection];
        const { data, error } = await client
            .from(config.table)
            .delete()
            .eq("id", id)
            .eq("user_id", userId)
            .select("id");

        if (error) throw error;
        return Array.isArray(data) && data.length > 0;
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
        return {
            occurredAt: new Date(data.occurred_at).getTime(),
            total: Number(data.total),
            entries: data.entries || []
        };
    }

    async function getAssetsSnapshotAtOrBefore(timestamp) {
        const { data, error } = await client
            .from("finance_asset_snapshots")
            .select("*")
            .eq("user_id", userId)
            .lte("occurred_at", new Date(timestamp).toISOString())
            .order("occurred_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        return {
            occurredAt: new Date(data.occurred_at).getTime(),
            total: Number(data.total),
            entries: data.entries || []
        };
    }

    async function getAssetsSnapshotsBetween(startTimestamp, endTimestamp) {
        const { data, error } = await client
            .from("finance_asset_snapshots")
            .select("*")
            .eq("user_id", userId)
            .gte("occurred_at", new Date(startTimestamp).toISOString())
            .lte("occurred_at", new Date(endTimestamp).toISOString())
            .order("occurred_at", { ascending: true });

        if (error) throw error;

        return (data || []).map((row) => ({
            occurredAt: new Date(row.occurred_at).getTime(),
            total: Number(row.total),
            entries: row.entries || []
        }));
    }

    async function getFirstAssetsSnapshot() {
        const { data, error } = await client
            .from("finance_asset_snapshots")
            .select("*")
            .eq("user_id", userId)
            .order("occurred_at", { ascending: true })
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        return {
            occurredAt: new Date(data.occurred_at).getTime(),
            total: Number(data.total),
            entries: data.entries || []
        };
    }

    async function getLatestAssetsSnapshot() {
        const { data, error } = await client
            .from("finance_asset_snapshots")
            .select("*")
            .eq("user_id", userId)
            .order("occurred_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        return {
            occurredAt: new Date(data.occurred_at).getTime(),
            total: Number(data.total),
            entries: data.entries || []
        };
    }

    return Object.freeze({
        userId,
        listAssets: () => list("assets"),
        saveAsset: (entry) => save("assets", entry),
        updateAsset: (id, entry) => update("assets", id, entry),
        deleteAsset: (id) => remove("assets", id),

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

        listFinancialCushion: () =>
            list("financialCushion"),
        saveFinancialCushion: (entry) =>
            save("financialCushion", entry),
        updateFinancialCushion: (id, entry) =>
            update("financialCushion", id, entry),
        deleteFinancialCushion: (id) =>
            remove("financialCushion", id),

        saveAssetsSnapshot,
        getAssetsSnapshotAtOrBefore,
        getAssetsSnapshotsBetween,
        getFirstAssetsSnapshot,
        getLatestAssetsSnapshot
    });
}

export { createSupabaseFinanceMemory };
