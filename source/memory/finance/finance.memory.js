// finance.memory.js — Version 2.3

const COLLECTIONS = Object.freeze([
    "assets",
    "actual-earnings",
    "financial-burden",
    "mandatory-expenses",
    "financial-cushion"
]);

function createFinanceMemory(userContext) {
    const userId = userContext?.userId;

    if (!userId) {
        throw new Error("LifeGame Finance Memory: user context is required.");
    }

    const collections = new Map(
        COLLECTIONS.map((collection) => [collection, []])
    );
    const snapshots = new Map(
        COLLECTIONS.map((collection) => [collection, []])
    );

    function cloneEntry(entry) {
        return { ...entry };
    }

    function cloneEntries(entries) {
        return entries.map(cloneEntry);
    }

    function cloneSnapshot(snapshot) {
        return {
            occurredAt: snapshot.occurredAt,
            total: snapshot.total,
            entries: cloneEntries(snapshot.entries)
        };
    }

    function requireCollection(collection) {
        if (!collections.has(collection)) {
            throw new Error("LifeGame Finance Memory: unknown collection.");
        }

        return collections.get(collection);
    }

    function listEntries(collection) {
        return cloneEntries(requireCollection(collection));
    }

    function saveEntry(collection, entry) {
        const entries = requireCollection(collection);
        const storedEntry = {
            ...entry,
            id: entry.id || (
                collection + "-" + crypto.randomUUID()
            )
        };

        entries.push(storedEntry);
        return cloneEntry(storedEntry);
    }

    function updateEntry(collection, id, entry) {
        const entries = requireCollection(collection);
        const index = entries.findIndex((item) => item.id === id);

        if (index === -1) {
            return false;
        }

        entries[index] = {
            ...entries[index],
            ...entry,
            id
        };

        return cloneEntry(entries[index]);
    }

    function deleteEntry(collection, id) {
        const entries = requireCollection(collection);
        const index = entries.findIndex((entry) => entry.id === id);

        if (index === -1) {
            return false;
        }

        entries.splice(index, 1);
        return true;
    }

    function getCollectionSnapshotList(collection) {
        if (!snapshots.has(collection)) {
            throw new Error("LifeGame Finance Memory: unknown snapshot collection.");
        }
        return snapshots.get(collection);
    }

    function calculateCollectionTotal(collection, entries) {
        return entries.reduce((total, item) => {
            if (collection === "financial-burden") {
                return total + Number(item.debt || item.amount || 0);
            }
            return total + Number(item.amount || 0);
        }, 0);
    }

    function saveCollectionSnapshot(collection, snapshot) {
        if (!snapshot || !snapshot.occurredAt || !Array.isArray(snapshot.entries)) {
            throw new Error("LifeGame Finance Memory: invalid Finance snapshot.");
        }

        getCollectionSnapshotList(collection).push({
            occurredAt: snapshot.occurredAt,
            total: Number(snapshot.total) || 0,
            entries: cloneEntries(snapshot.entries)
        });
    }

    function getCollectionSnapshotAtOrBefore(collection, timestamp) {
        let result = null;
        getCollectionSnapshotList(collection).forEach((snapshot) => {
            if (snapshot.occurredAt <= timestamp && (!result || snapshot.occurredAt > result.occurredAt)) {
                result = snapshot;
            }
        });
        return result ? cloneSnapshot(result) : null;
    }

    function getCollectionSnapshotsBetween(collection, startTimestamp, endTimestamp) {
        if (!Number.isFinite(startTimestamp) || !Number.isFinite(endTimestamp) || startTimestamp > endTimestamp) {
            throw new Error("LifeGame Finance Memory: invalid snapshot range.");
        }
        return getCollectionSnapshotList(collection)
            .filter((snapshot) => snapshot.occurredAt >= startTimestamp && snapshot.occurredAt <= endTimestamp)
            .sort((left, right) => left.occurredAt - right.occurredAt)
            .map(cloneSnapshot);
    }

    function getFirstCollectionSnapshot(collection) {
        const list = getCollectionSnapshotList(collection);
        if (list.length === 0) return null;
        return cloneSnapshot(list.reduce((first, snapshot) =>
            !first || snapshot.occurredAt < first.occurredAt ? snapshot : first, null));
    }

    function getLatestCollectionSnapshot(collection) {
        const list = getCollectionSnapshotList(collection);
        if (list.length === 0) return null;
        return cloneSnapshot(list.reduce((latest, snapshot) =>
            !latest || snapshot.occurredAt > latest.occurredAt ? snapshot : latest, null));
    }

    function mutateFinanceCollection({ collection, operation, entry = null, entryId = null, occurredAt = Date.now() }) {
        if (!COLLECTIONS.includes(collection) || collection === "assets") {
            throw new Error("LifeGame Finance Memory: invalid Finance collection mutation.");
        }
        if (!["create", "update", "delete"].includes(operation)) {
            throw new Error("LifeGame Finance Memory: invalid Finance mutation.");
        }

        let savedEntry = null;
        if (operation === "create") {
            savedEntry = saveEntry(collection, entry);
        } else if (operation === "update") {
            savedEntry = updateEntry(collection, entryId, entry);
            if (!savedEntry) return false;
        } else if (!deleteEntry(collection, entryId)) {
            return false;
        }

        const currentEntries = listEntries(collection);
        const snapshot = {
            occurredAt,
            total: calculateCollectionTotal(collection, currentEntries),
            entries: currentEntries
        };
        saveCollectionSnapshot(collection, snapshot);

        return {
            entry: operation === "delete" ? null : savedEntry,
            snapshot: cloneSnapshot(snapshot)
        };
    }

    function mutateAsset({ operation, entry = null, entryId = null, occurredAt = Date.now() }) {
        if (!["create", "update", "delete"].includes(operation)) {
            throw new Error("LifeGame Finance Memory: invalid Assets mutation.");
        }

        let result;

        if (operation === "create") {
            const saved = saveEntry("assets", entry);
            result = {
                entry: saved,
                snapshot: null
            };
        } else if (operation === "update") {
            const updated = updateEntry("assets", entryId, entry);

            if (!updated) {
                return false;
            }

            result = {
                entry: updated,
                snapshot: null
            };
        } else {
            const deleted = deleteEntry("assets", entryId);

            if (!deleted) {
                return false;
            }

            result = {
                entry: null,
                snapshot: null
            };
        }

        const currentEntries = listEntries("assets");
        const snapshot = {
            occurredAt,
            total: currentEntries.reduce(
                (total, item) => total + Number(item.amount || 0),
                0
            ),
            entries: currentEntries
        };

        saveAssetsSnapshot(snapshot);
        result.snapshot = cloneSnapshot(snapshot);

        return result;
    }

    function saveAssetsSnapshot(snapshot) {
        if (!snapshot || !snapshot.occurredAt || !Array.isArray(snapshot.entries)) {
            throw new Error("LifeGame Finance Memory: invalid Assets snapshot.");
        }

        getCollectionSnapshotList("assets").push({
            occurredAt: snapshot.occurredAt,
            total: Number(snapshot.total) || 0,
            entries: cloneEntries(snapshot.entries)
        });
    }

    function getAssetsSnapshotAtOrBefore(timestamp) {
        let result = null;

        getCollectionSnapshotList("assets").forEach((snapshot) => {
            if (snapshot.occurredAt <= timestamp) {
                if (!result || snapshot.occurredAt > result.occurredAt) {
                    result = snapshot;
                }
            }
        });

        return result ? cloneSnapshot(result) : null;
    }

    function getAssetsSnapshotsBetween(startTimestamp, endTimestamp) {
        if (
            !Number.isFinite(startTimestamp) ||
            !Number.isFinite(endTimestamp) ||
            startTimestamp > endTimestamp
        ) {
            throw new Error("LifeGame Finance Memory: invalid snapshot range.");
        }

        return getCollectionSnapshotList("assets")
            .filter((snapshot) =>
                snapshot.occurredAt >= startTimestamp &&
                snapshot.occurredAt <= endTimestamp
            )
            .sort((left, right) => left.occurredAt - right.occurredAt)
            .map(cloneSnapshot);
    }

    function getFirstAssetsSnapshot() {
        if (getCollectionSnapshotList("assets").length === 0) return null;

        return cloneSnapshot(
            getCollectionSnapshotList("assets").reduce((first, snapshot) =>
                !first || snapshot.occurredAt < first.occurredAt
                    ? snapshot
                    : first,
            null)
        );
    }

    function getLatestAssetsSnapshot() {
        if (getCollectionSnapshotList("assets").length === 0) return null;

        return cloneSnapshot(
            getCollectionSnapshotList("assets").reduce((latest, snapshot) =>
                !latest || snapshot.occurredAt > latest.occurredAt
                    ? snapshot
                    : latest,
            null)
        );
    }

    return Object.freeze({
        userId,
        listAssets: () => listEntries("assets"),
        saveAsset: (entry) => saveEntry("assets", entry),
        updateAsset: (id, entry) => updateEntry("assets", id, entry),
        deleteAsset: (id) => deleteEntry("assets", id),
        mutateAsset,
        mutateFinanceCollection,
        getCollectionSnapshotAtOrBefore,
        getCollectionSnapshotsBetween,
        getFirstCollectionSnapshot,
        getLatestCollectionSnapshot,

        listActualEarnings: () => listEntries("actual-earnings"),
        saveActualEarning: (entry) => saveEntry("actual-earnings", entry),
        updateActualEarning: (id, entry) =>
            updateEntry("actual-earnings", id, entry),
        deleteActualEarning: (id) =>
            deleteEntry("actual-earnings", id),

        listFinancialBurden: () => listEntries("financial-burden"),
        saveFinancialBurden: (entry) =>
            saveEntry("financial-burden", entry),
        updateFinancialBurden: (id, entry) =>
            updateEntry("financial-burden", id, entry),
        deleteFinancialBurden: (id) =>
            deleteEntry("financial-burden", id),

        listMandatoryExpenses: () =>
            listEntries("mandatory-expenses"),
        saveMandatoryExpense: (entry) =>
            saveEntry("mandatory-expenses", entry),
        updateMandatoryExpense: (id, entry) =>
            updateEntry("mandatory-expenses", id, entry),
        deleteMandatoryExpense: (id) =>
            deleteEntry("mandatory-expenses", id),

        listFinancialCushion: () =>
            listEntries("financial-cushion"),
        saveFinancialCushion: (entry) =>
            saveEntry("financial-cushion", entry),
        updateFinancialCushion: (id, entry) =>
            updateEntry("financial-cushion", id, entry),
        deleteFinancialCushion: (id) =>
            deleteEntry("financial-cushion", id),

        saveAssetsSnapshot,
        getAssetsSnapshotAtOrBefore,
        getAssetsSnapshotsBetween,
        getFirstAssetsSnapshot,
        getLatestAssetsSnapshot
    });
}

export { createFinanceMemory };
