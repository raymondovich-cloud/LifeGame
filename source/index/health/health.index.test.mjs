// source/index/health/health.index.test.mjs — Version 1.1

import test from "node:test";
import assert from "node:assert/strict";

import {
    calculateHealthIndex,
    limitDailyChange,
    recencyWeight,
    smooth
} from "./health.index.js";
import { FACTOR_WEIGHTS } from "./health.factors.js";
import {
    scoreActiveMinutes,
    scoreSleepDuration,
    scoreSleepRegularity,
    scoreSteps,
    scoreTrainingFrequency
} from "./health.normalization.js";

test("Health normalization respects validated target bands", () => {
    assert.equal(scoreSleepDuration(8), 100);
    assert.equal(scoreSleepDuration(6), 65);
    assert.equal(scoreSleepDuration(3), 7.5);
    assert.equal(scoreSleepDuration(12), 40);
    assert.equal(scoreSleepRegularity(30), 100);
    assert.equal(scoreSleepRegularity(120), 25);
    assert.equal(scoreActiveMinutes(150), 80);
    assert.equal(scoreActiveMinutes(300), 100);
    assert.equal(scoreSteps(8000), 75);
    assert.equal(scoreSteps(10000), 95);
    assert.equal(scoreTrainingFrequency(0), 0);
    assert.equal(scoreTrainingFrequency(3), 80);
    assert.equal(scoreTrainingFrequency(5), 90);
});

test("Health factor weights sum to 100 percent", () => {
    const total = Object.values(FACTOR_WEIGHTS)
        .reduce((sum, value) => sum + value, 0);

    assert.equal(total, 1);
});

test("Health Index counts only actually populated metric weight in Coverage", () => {
    const result = calculateHealthIndex({
        recovery: {
            sleepDurationHours: 8
        }
    });

    assert.equal(result.status, "insufficient");
    assert.equal(result.coverage, 8.8);
    assert.equal(result.value, 100);
});

test("Health Index uses available factor weights without artificial zeros", () => {
    const result = calculateHealthIndex({
        recovery: {
            sleepDurationHours: 8,
            sleepVariabilityMinutes: 30,
            subjectiveRecovery: 10
        },
        activity: {
            activeMinutesPerWeek: 300,
            stepsPerDay: 10000
        },
        lifestyle: {
            alcohol: 100,
            smoking: 100,
            nicotine: 100,
            stress: 100,
            mood: 100,
            subjectiveWellbeing: 100
        }
    });

    assert.equal(result.status, "preliminary");
    assert.equal(result.rawValue, 100);
    assert.equal(result.value, 100);
});

test("Smoothing uses alpha 0.35", () => {
    assert.equal(Number(smooth(60, 100).toFixed(2)), 74);
});

test("Daily change cannot exceed eight points", () => {
    assert.equal(limitDailyChange(60, 100), 68);
    assert.equal(limitDailyChange(60, 0), 52);
});

test("Recency half-life parameters are correct", () => {
    assert.equal(Number(recencyWeight(3, "fast").toFixed(3)), 0.5);
    assert.equal(Number(recencyWeight(14, "medium").toFixed(3)), 0.5);
    assert.equal(Number(recencyWeight(28, "slow").toFixed(3)), 0.5);
});

test("Constraint exposes a weak high-weight factor", () => {
    const result = calculateHealthIndex({
        recovery: {
            sleepDurationHours: 5,
            sleepVariabilityMinutes: 120,
            subjectiveRecovery: 4
        },
        activity: {
            activeMinutesPerWeek: 300,
            stepsPerDay: 10000
        },
        training: {
            trainingsPerWeek: 4,
            durationScore: 90,
            regularityScore: 90,
            loadRecoveryBalanceScore: 90
        },
        nutrition: {
            regularity: 90,
            regimeAdherence: 90,
            subjectiveQuality: 90,
            water: 90
        },
        lifestyle: {
            alcohol: 90,
            smoking: 90,
            nicotine: 90,
            stress: 90,
            mood: 90,
            subjectiveWellbeing: 90
        },
        body: {
            weightTrend: 90,
            bmiContext: 90,
            restingHeartRate: 90,
            bloodPressure: 90
        }
    });

    assert.equal(result.constraints[0].factor, "recovery");
    assert.equal(result.constraints[0].score < 60, true);
});

test("Health Index remains bounded", () => {
    const result = calculateHealthIndex({
        recovery: {
            sleepDurationHours: 8,
            sleepVariabilityMinutes: 30,
            subjectiveRecovery: 10
        },
        activity: {
            activeMinutesPerWeek: 300,
            stepsPerDay: 10000
        },
        training: {
            trainingsPerWeek: 4,
            durationScore: 100,
            regularityScore: 100,
            loadRecoveryBalanceScore: 100
        },
        nutrition: {
            regularity: 100,
            regimeAdherence: 100,
            subjectiveQuality: 100,
            water: 100
        },
        lifestyle: {
            alcohol: 100,
            smoking: 100,
            nicotine: 100,
            stress: 100,
            mood: 100,
            subjectiveWellbeing: 100
        },
        body: {
            weightTrend: 100,
            bmiContext: 100,
            restingHeartRate: 100,
            bloodPressure: 100
        },
        previousIndex: 50
    });

    assert.equal(result.value >= 0, true);
    assert.equal(result.value <= 100, true);
});
