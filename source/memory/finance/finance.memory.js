// finance.memory.js — Version 1.0

function createFinanceMemory(userContext) {
    const userId = userContext?.userId;

    if (!userId) {
        throw new Error("LifeGame Finance Memory: user context is required.");
    }

    const assets = [];
    const snapshots = [];

    function cloneAsset(asset) {
        return { ...asset };
    }

    function cloneSnapshot(snapshot) {
        return {
            occurredAt: snapshot.occurredAt,
            total: snapshot.total,
            entries: snapshot.entries.map(cloneAsset)
        };
    }

    function listAssets() {
        return assets.map(cloneAsset);
    }

    function saveAsset(asset) {
        const storedAsset = {
            ...asset,
            id: asset.id || ("asset-" + crypto.randomUUID())
        };

        assets.push(storedAsset);
        return cloneAsset(storedAsset);
    }

    function updateAsset(id, asset) {
        const index = assets.findIndex((entry) => entry.id === id);

        if (index === -1) {
            return false;
        }

        assets[index] = {
            ...assets[index],
            ...asset,
            id
        };

        return cloneAsset(assets[index]);
    }

    function deleteAsset(id) {
        const index = assets.findIndex((entry) => entry.id === id);

        if (index === -1) {
            return false;
        }

        assets.splice(index, 1);
        return true;
    }

    function saveAssetsSnapshot(snapshot) {
        if (!snapshot || !snapshot.occurredAt || !Array.isArray(snapshot.entries)) {
            throw new Error("LifeGame Finance Memory: invalid Assets snapshot.");
        }

        snapshots.push({
            occurredAt: snapshot.occurredAt,
            total: Number(snapshot.total) || 0,
            entries: snapshot.entries.map(cloneAsset)
        });
    }

    function getAssetsSnapshotAtOrBefore(timestamp) {
        let result = null;

        snapshots.forEach((snapshot) => {
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

        return snapshots
            .filter((snapshot) =>
                snapshot.occurredAt >= startTimestamp &&
                snapshot.occurredAt <= endTimestamp
            )
            .sort((left, right) => left.occurredAt - right.occurredAt)
            .map(cloneSnapshot);
    }

    function getFirstAssetsSnapshot() {
        if (snapshots.length === 0) return null;

        return cloneSnapshot(
            snapshots.reduce((first, snapshot) =>
                !first || snapshot.occurredAt < first.occurredAt
                    ? snapshot
                    : first,
            null)
        );
    }

    function getLatestAssetsSnapshot() {
        if (snapshots.length === 0) return null;

        return cloneSnapshot(
            snapshots.reduce((latest, snapshot) =>
                !latest || snapshot.occurredAt > latest.occurredAt
                    ? snapshot
                    : latest,
            null)
        );
    }

    return Object.freeze({
        userId,
        listAssets,
        saveAsset,
        updateAsset,
        deleteAsset,
        saveAssetsSnapshot,
        getAssetsSnapshotAtOrBefore,
        getAssetsSnapshotsBetween,
        getFirstAssetsSnapshot,
        getLatestAssetsSnapshot
    });
}

export { createFinanceMemory };
