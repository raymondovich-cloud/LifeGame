// source/index/health/health.index.js — Version 1.1

import { FACTOR_WEIGHTS, calculateFactors } from "./health.factors.js";
import {
    clamp,
    scoreActiveMinutes,
    scorePersonalBaseline,
    scoreSleepDuration,
    scoreSleepRegularity,
    scoreSteps,
    scoreSubjectiveScale,
    scoreTrainingFrequency
} from "./health.normalization.js";

const HEALTH_LIMITS = Object.freeze({ minimum: 0, maximum: 100 });
const HEALTH_CATEGORIES = Object.freeze([
    { minimum: 0, maximum: 39.999, key: "critical", label: "Critical" },
    { minimum: 40, maximum: 59.999, key: "weak", label: "Weak" },
    { minimum: 60, maximum: 74.999, key: "attention", label: "Attention" },
    { minimum: 75, maximum: 89.999, key: "good", label: "Good" },
    { minimum: 90, maximum: 100, key: "excellent", label: "Excellent" }
]);

const RECENCY_HALF_LIFE = Object.freeze({
    fast: 3,
    medium: 14,
    slow: 28
});

const SMOOTHING_ALPHA = 0.35;
const DAILY_CHANGE_LIMIT = 8;
const COVERAGE = Object.freeze({
    insufficient: 0.40,
    preliminary: 0.70
});

function category(value) {
    return HEALTH_CATEGORIES.find(
        (item) => value >= item.minimum && value <= item.maximum
    ) || HEALTH_CATEGORIES[0];
}

function recencyWeight(ageDays, className = "medium") {
    const age = Number(ageDays);
    const halfLife = RECENCY_HALF_LIFE[className];

    if (!Number.isFinite(age) || age < 0 || !halfLife) return 0;

    return Math.exp((-Math.log(2) * age) / halfLife);
}

function smooth(previous, current, alpha = SMOOTHING_ALPHA) {
    if (!Number.isFinite(current)) return null;
    if (!Number.isFinite(previous)) return current;

    return alpha * current + (1 - alpha) * previous;
}

function limitDailyChange(previous, current, limit = DAILY_CHANGE_LIMIT) {
    if (!Number.isFinite(current) || !Number.isFinite(previous)) return current;

    return Math.max(previous - limit, Math.min(previous + limit, current));
}

function factorCoverage(factors) {
    return Object.entries(factors).reduce(
        (sum, [key, factor]) =>
            sum + FACTOR_WEIGHTS[key] * Number(factor.coverage || 0),
        0
    );
}

function rawIndex(factors) {
    const available = Object.entries(factors).filter(
        ([, factor]) => factor.score !== null
    );

    if (available.length === 0) return null;

    const weight = available.reduce(
        (sum, [key]) => sum + FACTOR_WEIGHTS[key],
        0
    );

    return available.reduce(
        (sum, [key, factor]) => sum + FACTOR_WEIGHTS[key] * factor.score,
        0
    ) / weight;
}

function constraints(factors, minimumDeficit = 15) {
    return Object.entries(factors)
        .filter(([, factor]) => factor.score !== null)
        .map(([key, factor]) => ({
            factor: key,
            score: factor.score,
            weight: FACTOR_WEIGHTS[key],
            deficit: 100 - factor.score,
            constraint: FACTOR_WEIGHTS[key] * (100 - factor.score)
        }))
        .filter((item) => item.deficit >= minimumDeficit)
        .sort((a, b) => b.constraint - a.constraint);
}

function prepareHealthInput(raw = {}) {
    const recovery = raw.recovery || {};
    const activity = raw.activity || {};
    const training = raw.training || {};

    return {
        recovery: {
            sleepDuration: scoreSleepDuration(recovery.sleepDurationHours),
            sleepRegularity: scoreSleepRegularity(recovery.sleepVariabilityMinutes),
            subjectiveRecovery: scoreSubjectiveScale(recovery.subjectiveRecovery),
            restingHeartRate: scorePersonalBaseline(
                recovery.restingHeartRate,
                recovery.restingHeartRateBaseline,
                0.05,
                0.40
            ),
            hrv: scorePersonalBaseline(
                recovery.hrv,
                recovery.hrvBaseline,
                0.10,
                0.50
            )
        },
        activity: {
            activeMinutes: scoreActiveMinutes(activity.activeMinutesPerWeek),
            steps: scoreSteps(activity.stepsPerDay),
            distance: Number.isFinite(Number(activity.distanceScore))
                ? Number(activity.distanceScore)
                : null,
            activeCalories: Number.isFinite(Number(activity.activeCaloriesScore))
                ? Number(activity.activeCaloriesScore)
                : null
        },
        training: {
            frequency: scoreTrainingFrequency(training.trainingsPerWeek),
            duration: Number.isFinite(Number(training.durationScore))
                ? Number(training.durationScore)
                : null,
            regularity: Number.isFinite(Number(training.regularityScore))
                ? Number(training.regularityScore)
                : null,
            loadRecoveryBalance: Number.isFinite(Number(training.loadRecoveryBalanceScore))
                ? Number(training.loadRecoveryBalanceScore)
                : null
        },
        nutrition: raw.nutrition || {},
        lifestyle: raw.lifestyle || {},
        body: raw.body || {}
    };
}

function calculateHealthIndex(raw = {}) {
    const normalized = prepareHealthInput(raw);
    const factors = calculateFactors(normalized);
    const coverage = factorCoverage(factors);
    const rawScore = rawIndex(factors);

    if (rawScore === null) {
        return {
            value: null,
            status: "insufficient",
            category: null,
            coverage: 0,
            confidence: "low",
            factors,
            constraints: [],
            methodology: {
                version: "1.0",
                alpha: SMOOTHING_ALPHA,
                dailyChangeLimit: DAILY_CHANGE_LIMIT,
                recencyHalfLife: RECENCY_HALF_LIFE
            }
        };
    }

    const previous = Number(raw.previousIndex);
    const smoothed = smooth(previous, rawScore);
    const value = clamp(limitDailyChange(previous, smoothed));

    const status = coverage < COVERAGE.insufficient
        ? "insufficient"
        : coverage < COVERAGE.preliminary
            ? "preliminary"
            : "full";

    const confidence = status === "full"
        ? "high"
        : status === "preliminary"
            ? "medium"
            : "low";

    return {
        value: Number(value.toFixed(1)),
        rawValue: Number(rawScore.toFixed(1)),
        status,
        category: category(value),
        coverage: Number((coverage * 100).toFixed(1)),
        confidence,
        factors,
        constraints: constraints(factors),
        methodology: {
            version: "1.0",
            alpha: SMOOTHING_ALPHA,
            dailyChangeLimit: DAILY_CHANGE_LIMIT,
            recencyHalfLife: RECENCY_HALF_LIFE
        }
    };
}

export {
    HEALTH_LIMITS,
    HEALTH_CATEGORIES,
    RECENCY_HALF_LIFE,
    SMOOTHING_ALPHA,
    DAILY_CHANGE_LIMIT,
    recencyWeight,
    smooth,
    limitDailyChange,
    calculateHealthIndex
};
