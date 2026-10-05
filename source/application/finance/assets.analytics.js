// assets.analytics.js — Version 1.1

import { trace } from "../../core/diagnostics/lifecycle.trace.js";

let assetsSnapshotReader = () => null;
let assetsSnapshotsRangeReader = () => [];
let firstAssetsSnapshotReader = () => null;

function configureAssetsAnalyticsMemory({
    getSnapshotAtOrBefore,
    getSnapshotsBetween,
    getFirstSnapshot
}) {
    if (
        typeof getSnapshotAtOrBefore !== "function" ||
        typeof getSnapshotsBetween !== "function" ||
        typeof getFirstSnapshot !== "function"
    ) {
        throw new Error(
            "LifeGame Assets Analytics: memory readers are required."
        );
    }

    assetsSnapshotReader = getSnapshotAtOrBefore;
    assetsSnapshotsRangeReader = getSnapshotsBetween;
    firstAssetsSnapshotReader = getFirstSnapshot;
}

function clearAssetsAnalyticsMemory() {
    assetsSnapshotReader = () => null;
    assetsSnapshotsRangeReader = () => [];
    firstAssetsSnapshotReader = () => null;
}

function getAssetsAnalyticsRange(period, now = Date.now()) {
    const endDate = new Date(now);
    let startDate;

    if (period === "week") {
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
    } else if (period === "month") {
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
    } else if (period === "year") {
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 1);
    } else if (period === "all-time") {
        const firstSnapshot = firstAssetsSnapshotReader();

        if (!firstSnapshot) {
            return {
                startDate: null,
                endDate: endDate.getTime()
            };
        }

        startDate = new Date(firstSnapshot.occurredAt);
    } else {
        throw new Error("LifeGame Assets Analytics: unknown period.");
    }

    return {
        startDate: startDate.getTime(),
        endDate: endDate.getTime()
    };
}

function getAssetsAnalytics({ startDate, endDate }) {
    const startTimestamp = new Date(startDate).getTime();
    const endTimestamp = new Date(endDate).getTime();

    if (
        !Number.isFinite(startTimestamp) ||
        !Number.isFinite(endTimestamp) ||
        startTimestamp > endTimestamp
    ) {
        throw new Error("LifeGame Assets Analytics: invalid date range.");
    }

    const snapshots = assetsSnapshotsRangeReader(
        startTimestamp,
        endTimestamp
    );

    const baselineSnapshot = assetsSnapshotReader(startTimestamp);
    const currentSnapshot = assetsSnapshotReader(endTimestamp);
    const currentEntries = currentSnapshot?.entries ?? [];

    const baselineTotal = baselineSnapshot?.total ?? null;
    const currentTotal = currentSnapshot?.total ?? null;

    const hasComparison =
        baselineTotal !== null &&
        baselineTotal > 0 &&
        currentTotal !== null &&
        Number.isFinite(currentTotal);

    const changeAmount = hasComparison
        ? currentTotal - baselineTotal
        : null;

    const changePercent = hasComparison
        ? Math.round((changeAmount / baselineTotal) * 1000) / 10
        : null;

    const liquidTotal = currentEntries
        .filter((entry) => entry?.liquidity === "liquid")
        .reduce((total, entry) => total + (Number(entry.amount) || 0), 0);

    const illiquidTotal = currentEntries
        .filter((entry) => entry?.liquidity === "illiquid")
        .reduce((total, entry) => total + (Number(entry.amount) || 0), 0);

    const liquidityTotal = liquidTotal + illiquidTotal;

    trace("application", "finance.assets.analytics.completed", {
        startDate: startTimestamp,
        endDate: endTimestamp,
        snapshotCount: snapshots.length
    });

    return {
        startDate: startTimestamp,
        endDate: endTimestamp,
        baseline: baselineSnapshot
            ? {
                occurredAt: baselineSnapshot.occurredAt,
                total: baselineTotal
            }
            : null,
        current: currentSnapshot
            ? {
                occurredAt: currentSnapshot.occurredAt,
                total: currentTotal
            }
            : null,
        change: {
            amount: changeAmount,
            percent: changePercent,
            hasComparison
        },
        dynamics: snapshots.map((snapshot) => ({
            occurredAt: snapshot.occurredAt,
            total: snapshot.total
        })),
        liquidity: {
            liquid: liquidTotal,
            illiquid: illiquidTotal,
            total: liquidityTotal,
            liquidPercent: liquidityTotal > 0
                ? Math.round((liquidTotal / liquidityTotal) * 1000) / 10
                : null,
            illiquidPercent: liquidityTotal > 0
                ? Math.round((illiquidTotal / liquidityTotal) * 1000) / 10
                : null
        },
        composition: currentEntries.map((entry) => ({ ...entry }))
    };
}

export {
    configureAssetsAnalyticsMemory,
    clearAssetsAnalyticsMemory,
    getAssetsAnalyticsRange,
    getAssetsAnalytics
};
