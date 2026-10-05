// assets.memory.js — Version 2.3

import { trace } from "../../core/diagnostics/lifecycle.trace.js";

const snapshots = [];

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

    if (!result) return null;

    return {
        occurredAt: result.occurredAt,
        total: result.total,
        entries: result.entries.map((entry) => ({ ...entry }))
    };
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
    getLiquidAssetsAtOrBefore,
    getIlliquidAssetsAtOrBefore
};
