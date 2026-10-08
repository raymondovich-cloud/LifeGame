// source/application/health/health.aggregator.js — Version 1.0

const WINDOW_DAYS = 28;
const DAY_MS = 24 * 60 * 60 * 1000;

const METRIC_CONFIG = Object.freeze({
    recovery: {
        sleepDurationHours: "medium",
        sleepVariabilityMinutes: "medium",
        subjectiveRecovery: "medium",
        restingHeartRate: "medium",
        restingHeartRateBaseline: "slow",
        hrv: "medium",
        hrvBaseline: "slow"
    },
    activity: {
        activeMinutesPerWeek: "medium",
        stepsPerDay: "medium",
        distanceScore: "medium",
        activeCaloriesScore: "medium"
    },
    nutrition: {
        regularity: "slow",
        regimeAdherence: "slow",
        subjectiveQuality: "medium",
        water: "medium"
    },
    lifestyle: {
        alcohol: "medium",
        smoking: "slow",
        nicotine: "slow",
        stress: "medium",
        mood: "medium",
        subjectiveWellbeing: "medium"
    },
    body: {
        weightTrend: "slow",
        bmiContext: "slow",
        restingHeartRate: "medium",
        bloodPressure: "medium"
    }
});

function numeric(value) {
    return Number.isFinite(Number(value)) ? Number(value) : null;
}

function ageDays(recordedAt, now) {
    return Math.max(0, (now - recordedAt) / DAY_MS);
}

function recencyWeight(age, halfLifeDays) {
    return Math.exp((-Math.log(2) * age) / halfLifeDays);
}

function aggregateMetric(records, field, halfLifeDays, now) {
    const values = records
        .map((record) => ({
            value: numeric(record?.[field]),
            recordedAt: Number(record?.recordedAt)
        }))
        .filter((item) =>
            item.value !== null &&
            Number.isFinite(item.recordedAt) &&
            item.recordedAt <= now &&
            item.recordedAt >= now - WINDOW_DAYS * DAY_MS
        );

    if (values.length === 0) return null;

    let weightedTotal = 0;
    let totalWeight = 0;

    for (const item of values) {
        const weight = recencyWeight(ageDays(item.recordedAt, now), halfLifeDays);
        weightedTotal += item.value * weight;
        totalWeight += weight;
    }

    return {
        value: weightedTotal / totalWeight,
        observations: values.length,
        latestRecordedAt: Math.max(...values.map((item) => item.recordedAt))
    };
}

function aggregateCategory(records, config, now) {
    const result = {};

    for (const [field, halfLife] of Object.entries(config)) {
        const aggregate = aggregateMetric(
            records,
            field,
            halfLife === "fast" ? 3 : halfLife === "medium" ? 14 : 28,
            now
        );

        if (aggregate) result[field] = aggregate.value;
    }

    return result;
}

function aggregateTraining(records, now) {
    const workouts = records.filter((record) =>
        record &&
        Number.isFinite(Number(record.recordedAt)) &&
        Number(record.recordedAt) <= now &&
        Number(record.recordedAt) >= now - WINDOW_DAYS * DAY_MS &&
        (record.type === "workout" || record.workout === true)
    );

    if (workouts.length === 0) return {};

    return {
        trainingsPerWeek: workouts.length / (WINDOW_DAYS / 7)
    };
}

function createHealthAggregator(memory) {
    if (!memory) {
        throw new Error("LifeGame Health Aggregator: memory is required.");
    }

    async function aggregate({ now = Date.now() } = {}) {
        const end = Number(now);

        if (!Number.isFinite(end)) {
            throw new Error("LifeGame Health Aggregator: valid now timestamp is required.");
        }

        const start = end - WINDOW_DAYS * DAY_MS;

        const [body, activity, recovery, lifestyle] = await Promise.all(
            ["body", "activity", "recovery", "lifestyle"].map((category) =>
                Promise.resolve(memory.getFactsBetween(category, start, end))
            )
        );

        return {
            window: { start, end, days: WINDOW_DAYS },
            recovery: aggregateCategory(recovery, METRIC_CONFIG.recovery, end),
            activity: aggregateCategory(activity, METRIC_CONFIG.activity, end),
            training: aggregateTraining(activity, end),
            nutrition: aggregateCategory(lifestyle, METRIC_CONFIG.nutrition, end),
            lifestyle: aggregateCategory(lifestyle, METRIC_CONFIG.lifestyle, end),
            body: aggregateCategory(body, METRIC_CONFIG.body, end)
        };
    }

    return Object.freeze({ aggregate });
}

export { WINDOW_DAYS, createHealthAggregator };
