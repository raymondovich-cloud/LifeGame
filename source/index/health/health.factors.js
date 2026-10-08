// source/index/health/health.factors.js — Version 1.0

const FACTOR_WEIGHTS = Object.freeze({
    recovery: 0.25,
    activity: 0.20,
    training: 0.15,
    nutrition: 0.15,
    lifestyle: 0.15,
    body: 0.10
});

function valid(value) {
    return Number.isFinite(Number(value));
}

function weightedFactor(metrics = {}) {
    const entries = Object.entries(metrics).filter(([, item]) =>
        item &&
        valid(item.value) &&
        valid(item.weight) &&
        Number(item.weight) > 0
    );

    if (entries.length === 0) {
        return {
            score: null,
            coverage: 0,
            metrics: {}
        };
    }

    const totalWeight = entries.reduce(
        (sum, [, item]) => sum + Number(item.weight),
        0
    );

    const score = entries.reduce(
        (sum, [, item]) => sum + Number(item.value) * Number(item.weight),
        0
    ) / totalWeight;

    const normalizedMetrics = Object.fromEntries(
        entries.map(([key, item]) => [key, Number(item.value)])
    );

    return {
        score,
        coverage: totalWeight,
        metrics: normalizedMetrics
    };
}

function calculateFactors(input = {}) {
    const recovery = weightedFactor({
        sleepDuration: { value: input.recovery?.sleepDuration, weight: 0.35 },
        sleepRegularity: { value: input.recovery?.sleepRegularity, weight: 0.25 },
        subjectiveRecovery: { value: input.recovery?.subjectiveRecovery, weight: 0.20 },
        restingHeartRate: { value: input.recovery?.restingHeartRate, weight: 0.10 },
        hrv: { value: input.recovery?.hrv, weight: 0.10 }
    });

    const activity = weightedFactor({
        activeMinutes: { value: input.activity?.activeMinutes, weight: 0.60 },
        steps: { value: input.activity?.steps, weight: 0.25 },
        distance: { value: input.activity?.distance, weight: 0.075 },
        activeCalories: { value: input.activity?.activeCalories, weight: 0.075 }
    });

    const training = weightedFactor({
        frequency: { value: input.training?.frequency, weight: 0.30 },
        duration: { value: input.training?.duration, weight: 0.20 },
        regularity: { value: input.training?.regularity, weight: 0.20 },
        loadRecoveryBalance: { value: input.training?.loadRecoveryBalance, weight: 0.30 }
    });

    const nutrition = weightedFactor({
        regularity: { value: input.nutrition?.regularity, weight: 0.30 },
        regimeAdherence: { value: input.nutrition?.regimeAdherence, weight: 0.30 },
        subjectiveQuality: { value: input.nutrition?.subjectiveQuality, weight: 0.25 },
        water: { value: input.nutrition?.water, weight: 0.15 }
    });

    const lifestyle = weightedFactor({
        alcohol: { value: input.lifestyle?.alcohol, weight: 0.20 },
        smoking: { value: input.lifestyle?.smoking, weight: 0.25 },
        nicotine: { value: input.lifestyle?.nicotine, weight: 0.15 },
        stress: { value: input.lifestyle?.stress, weight: 0.15 },
        mood: { value: input.lifestyle?.mood, weight: 0.10 },
        subjectiveWellbeing: { value: input.lifestyle?.subjectiveWellbeing, weight: 0.15 }
    });

    const body = weightedFactor({
        weightTrend: { value: input.body?.weightTrend, weight: 0.35 },
        bmiContext: { value: input.body?.bmiContext, weight: 0.25 },
        restingHeartRate: { value: input.body?.restingHeartRate, weight: 0.20 },
        bloodPressure: { value: input.body?.bloodPressure, weight: 0.20 }
    });

    return { recovery, activity, training, nutrition, lifestyle, body };
}

export {
    FACTOR_WEIGHTS,
    weightedFactor,
    calculateFactors
};
