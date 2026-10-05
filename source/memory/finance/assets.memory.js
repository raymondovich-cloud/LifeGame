// assets.memory.js — Version 2.0

const snapshots = [];

function saveAssetsSnapshot(snapshot) {
    if (!snapshot || !snapshot.occurredAt || !Array.isArray(snapshot.entries)) {
        throw new Error("LifeGame Memory: invalid Assets snapshot.");
    }

    snapshots.push({
        occurredAt: snapshot.occurredAt,
        total: Number(snapshot.total) || 0,
        entries: snapshot.entries.map((entry) => ({ ...entry }))
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

    if (!result) return null;

    return {
        occurredAt: result.occurredAt,
        total: result.total,
        entries: result.entries.map((entry) => ({ ...entry }))
    };
}

export {
    saveAssetsSnapshot,
    getAssetsSnapshotAtOrBefore
};
