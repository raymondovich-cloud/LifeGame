// assets.memory.js — Version 2.4

import { trace } from "../../core/diagnostics/lifecycle.trace.js";

const snapshots = [];

function cloneSnapshot(snapshot) {
    return {
        occurredAt: snapshot.occurredAt,
        total: snapshot.total,
        entries: snapshot.entries.map((entry) => ({ ...entry }))
    };
}

function saveAssetsSnapshot(snapshot) {
    if (!snapshot || !snapshot.occurredAt || !Array.isArray(snapshot.entries)) {
        throw new Error("LifeGame Memory: invalid Assets snapshot.");
    }

    trace("memory", "finance.assets.snapshot.save.begin", {
        entryCount: snapshot.entries.length
    });

    snapshots.push({
        occurredAt: snapshot.occurredAt,
        total: Number(snapshot.total) || 0,
        entries: snapshot.entries.map((entry) => ({ ...entry }))
    });

    trace("memory", "finance.assets.snapshot.save.completed", {
        entryCount: snapshot.entries.length
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
        throw new Error("LifeGame Memory: invalid Assets snapshot range.");
    }

    return snapshots
        .filter((snapshot) =>
            snapshot.occurredAt >= startTimestamp &&
            snapshot.occurredAt <= endTimestamp
        )
        .sort((left, right) => left.occurredAt - right.occurredAt)
        .map(cloneSnapshot);
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

function getAssetsByLiquidityAtOrBefore(timestamp, liquidity) {
    const snapshot = getAssetsSnapshotAtOrBefore(timestamp);

    if (!snapshot) return null;

    return snapshot.entries
        .filter((entry) => entry?.liquidity === liquidity)
        .map((entry) => ({ ...entry }));
}

function getLiquidAssetsAtOrBefore(timestamp) {
    return getAssetsByLiquidityAtOrBefore(timestamp, "liquid");
}

function getIlliquidAssetsAtOrBefore(timestamp) {
    return getAssetsByLiquidityAtOrBefore(timestamp, "illiquid");
}

export {
    saveAssetsSnapshot,
    getAssetsSnapshotAtOrBefore,
    getAssetsSnapshotsBetween,
    getLatestAssetsSnapshot,
    getFirstAssetsSnapshot,
    getLiquidAssetsAtOrBefore,
    getIlliquidAssetsAtOrBefore
};
