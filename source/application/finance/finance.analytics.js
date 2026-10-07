// finance.analytics.js — Version 2.0

import { trace } from "../../core/diagnostics/lifecycle.trace.js";

const METRICS = Object.freeze([
    { id: "assets", label: "Активы" },
    { id: "actual-earnings", label: "Фактически заработано" },
    { id: "financial-burden", label: "Финансовая нагрузка" },
    { id: "mandatory-expenses", label: "Обязательные траты" }
]);

function createFinanceAnalytics({ financeApplication }) {
    if (!financeApplication) {
        throw new Error("LifeGame Finance Analytics: Finance Application is required.");
    }

    const requiredReaders = [
        "getCollectionSnapshotAtOrBefore",
        "getCollectionSnapshotsBetween",
        "getFirstCollectionSnapshot"
    ];

    requiredReaders.forEach((reader) => {
        if (typeof financeApplication[reader] !== "function") {
            throw new Error(
                "LifeGame Finance Analytics: Finance Application reader is required: " + reader
            );
        }
    });

    function getFinanceAnalyticsRange(period, now = Date.now()) {
        const endDate = new Date(now);
        let startDate;

        if (period === "month") {
            startDate = new Date(now);
            startDate.setMonth(startDate.getMonth() - 1);
        } else if (period === "week") {
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 7);
        } else if (period === "year") {
            startDate = new Date(now);
            startDate.setFullYear(startDate.getFullYear() - 1);
        } else if (period === "all-time") {
            const firstSnapshot = financeApplication.getFirstCollectionSnapshot("assets");
            if (!firstSnapshot) {
                return { startDate: null, endDate: endDate.getTime() };
            }
            startDate = new Date(firstSnapshot.occurredAt);
        } else {
            throw new Error("LifeGame Finance Analytics: unknown period.");
        }

        return {
            startDate: startDate.getTime(),
            endDate: endDate.getTime()
        };
    }

    function calculateChange(baseline, current, hasDistinctSnapshots) {
        const hasComparison =
            hasDistinctSnapshots &&
            baseline !== null &&
            baseline > 0 &&
            current !== null &&
            Number.isFinite(current);

        if (!hasComparison) {
            return { amount: null, percent: null, hasComparison: false };
        }

        const amount = current - baseline;
        return {
            amount,
            percent: Math.round((amount / baseline) * 1000) / 10,
            hasComparison: true
        };
    }

    function getFinanceAnalytics({ startDate, endDate }) {
        const startTimestamp = new Date(startDate).getTime();
        const endTimestamp = new Date(endDate).getTime();

        if (
            !Number.isFinite(startTimestamp) ||
            !Number.isFinite(endTimestamp) ||
            startTimestamp > endTimestamp
        ) {
            throw new Error("LifeGame Finance Analytics: invalid date range.");
        }

        const metrics = Object.fromEntries(
            METRICS.map((metric) => {
                const snapshots = financeApplication.getCollectionSnapshotsBetween(
                    metric.id,
                    startTimestamp,
                    endTimestamp
                );
                const baselineSnapshot =
                    financeApplication.getCollectionSnapshotAtOrBefore(
                        metric.id,
                        startTimestamp
                    );
                const currentSnapshot =
                    financeApplication.getCollectionSnapshotAtOrBefore(
                        metric.id,
                        endTimestamp
                    );

                const firstInRange = snapshots[0] ?? null;
                const effectiveBaselineSnapshot = baselineSnapshot ?? firstInRange;
                const baseline = effectiveBaselineSnapshot?.total ?? null;
                const current = currentSnapshot?.total ?? null;

                return [metric.id, {
                    id: metric.id,
                    label: metric.label,
                    baseline,
                    current,
                    change: calculateChange(
                        baseline,
                        current,
                        Boolean(
                            effectiveBaselineSnapshot &&
                            currentSnapshot &&
                            effectiveBaselineSnapshot.occurredAt !== currentSnapshot.occurredAt
                        )
                    ),
                    dynamics: snapshots.map((snapshot) => ({
                        occurredAt: snapshot.occurredAt,
                        total: snapshot.total
                    }))
                }];
            })
        );

        trace("application", "finance.analytics.completed", {
            startDate: startTimestamp,
            endDate: endTimestamp
        });

        return {
            startDate: startTimestamp,
            endDate: endTimestamp,
            metrics
        };
    }

    return Object.freeze({
        getFinanceAnalyticsRange,
        getFinanceAnalytics
    });
}

export { createFinanceAnalytics };
