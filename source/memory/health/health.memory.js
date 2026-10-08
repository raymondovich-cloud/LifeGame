// source/memory/health/health.memory.js — Version 1.0

const HEALTH_FACTS = Object.freeze(["body", "activity", "recovery", "lifestyle"]);

function clone(value) {
    return structuredClone(value);
}

function createHealthMemory(userContext) {
    const userId = userContext?.userId;
    if (!userId) throw new Error("LifeGame Health Memory: user context is required.");

    const facts = new Map(HEALTH_FACTS.map((category) => [category, []]));

    function requireCategory(category) {
        if (!facts.has(category)) throw new Error("LifeGame Health Memory: unknown category.");
        return facts.get(category);
    }

    function listFacts(category) {
        return clone(requireCategory(category));
    }

    function saveFact(category, fact) {
        if (!fact || typeof fact !== "object") {
            throw new Error("LifeGame Health Memory: fact is required.");
        }
        const stored = {
            ...clone(fact),
            id: fact.id || category + "-" + crypto.randomUUID(),
            userId,
            recordedAt: fact.recordedAt || Date.now()
        };
        requireCategory(category).push(stored);
        return clone(stored);
    }

    function replaceFacts(category, entries) {
        if (!Array.isArray(entries)) {
            throw new Error("LifeGame Health Memory: entries must be an array.");
        }
        return entries.map((fact) => saveFact(category, fact));
    }

    function getFactsBetween(category, startTimestamp, endTimestamp) {
        if (!Number.isFinite(startTimestamp) || !Number.isFinite(endTimestamp) || startTimestamp > endTimestamp) {
            throw new Error("LifeGame Health Memory: invalid fact range.");
        }
        return listFacts(category)
            .filter((fact) => fact.recordedAt >= startTimestamp && fact.recordedAt <= endTimestamp)
            .sort((left, right) => left.recordedAt - right.recordedAt);
    }

    function getLatestFact(category) {
        const entries = requireCategory(category);
        if (entries.length === 0) return null;
        return clone(entries.reduce((latest, fact) =>
            !latest || fact.recordedAt > latest.recordedAt ? fact : latest, null));
    }

    function getLatestFacts() {
        return Object.fromEntries(
            HEALTH_FACTS.map((category) => [category, getLatestFact(category)])
        );
    }

    return Object.freeze({
        userId,
        listFacts,
        saveFact,
        replaceFacts,
        getFactsBetween,
        getLatestFact,
        getLatestFacts
    });
}

export { HEALTH_FACTS, createHealthMemory };
