// source/infrastructure/supabase/health.memory.supabase.js — Version 1.0

const TABLE = "health_facts";

function clone(value) {
    return structuredClone(value);
}

function normalizeRow(row) {
    if (!row) return row;

    return {
        id: row.id,
        userId: row.user_id,
        category: row.category,
        recordedAt: new Date(row.recorded_at).getTime(),
        source: row.source || "manual",
        ...clone(row.payload || {})
    };
}

function toPayload(fact) {
    const {
        id,
        userId,
        category,
        recordedAt,
        source,
        ...payload
    } = fact || {};

    return {
        id,
        user_id: userId,
        category,
        recorded_at: new Date(recordedAt || Date.now()).toISOString(),
        source: source || "manual",
        payload
    };
}

function createSupabaseHealthMemory({ client, userContext }) {
    if (!client || !userContext?.userId) {
        throw new Error("Supabase Health Memory: client and user context are required.");
    }

    const userId = userContext.userId;
    const cache = new Map();

    function categoryCache(category) {
        if (!cache.has(category)) cache.set(category, []);
        return cache.get(category);
    }

    async function hydrate() {
        const { data, error } = await client
            .from(TABLE)
            .select("*")
            .eq("user_id", userId)
            .order("recorded_at", { ascending: true });

        if (error) throw error;

        cache.clear();
        (data || []).forEach((row) => {
            const fact = normalizeRow(row);
            categoryCache(fact.category).push(fact);
        });
    }

    function listFacts(category) {
        return clone(categoryCache(category));
    }

    async function saveFact(category, fact) {
        const normalized = {
            ...clone(fact),
            category,
            userId,
            recordedAt: fact?.recordedAt || Date.now(),
            source: fact?.source || "manual"
        };

        const payload = toPayload(normalized);

        const { data, error } = await client
            .from(TABLE)
            .insert(payload)
            .select("*")
            .single();

        if (error) throw error;

        const saved = normalizeRow(data);
        categoryCache(category).push(saved);
        return clone(saved);
    }

    async function replaceFacts(category, entries) {
        if (!Array.isArray(entries)) {
            throw new Error("Supabase Health Memory: entries must be an array.");
        }

        const { error: deleteError } = await client
            .from(TABLE)
            .delete()
            .eq("user_id", userId)
            .eq("category", category);

        if (deleteError) throw deleteError;

        categoryCache(category).length = 0;

        const saved = [];
        for (const entry of entries) {
            saved.push(await saveFact(category, entry));
        }

        return clone(saved);
    }

    async function getFactsBetween(category, startTimestamp, endTimestamp) {
        if (
            !Number.isFinite(startTimestamp) ||
            !Number.isFinite(endTimestamp) ||
            startTimestamp > endTimestamp
        ) {
            throw new Error("Supabase Health Memory: invalid fact range.");
        }

        return listFacts(category)
            .filter((fact) =>
                fact.recordedAt >= startTimestamp &&
                fact.recordedAt <= endTimestamp
            )
            .sort((left, right) => left.recordedAt - right.recordedAt);
    }

    async function getLatestFact(category) {
        const entries = listFacts(category);
        if (entries.length === 0) return null;

        return clone(entries.reduce((latest, fact) =>
            !latest || fact.recordedAt > latest.recordedAt ? fact : latest,
            null
        ));
    }

    async function getLatestFacts() {
        const categories = ["body", "activity", "recovery", "lifestyle"];

        return Object.fromEntries(
            categories.map((category) => [
                category,
                (() => {
                    const entries = listFacts(category);
                    return entries.length
                        ? clone(entries.reduce((latest, fact) =>
                            !latest || fact.recordedAt > latest.recordedAt ? fact : latest,
                            null
                        ))
                        : null;
                })()
            ])
        );
    }

    return Object.freeze({
        userId,
        hydrate,
        listFacts,
        saveFact,
        replaceFacts,
        getFactsBetween,
        getLatestFact,
        getLatestFacts
    });
}

export { createSupabaseHealthMemory };
