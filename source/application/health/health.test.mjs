// source/application/health/health.test.mjs — Version 1.0

import test from "node:test";
import assert from "node:assert/strict";

import {
    buildHealthDiagnosis,
    createHealthApplication
} from "./health.js";

test("Health Application orchestrates Index and Diagnosis", () => {
    const application = createHealthApplication();

    const result = application.calculate({
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

    assert.equal(typeof result.index.value, "number");
    assert.equal(result.diagnosis.primaryConstraint.factor, "recovery");
    assert.match(result.diagnosis.message, /восстановление/i);
});

test("Health Application preserves insufficient-data state", () => {
    const application = createHealthApplication();

    const result = application.calculate({
        recovery: {
            sleepDurationHours: 8
        }
    });

    assert.equal(result.index.status, "insufficient");
    assert.equal(result.diagnosis.status, "insufficient");
    assert.equal(result.diagnosis.primaryConstraint, null);
});

test("Health Application rejects missing input", () => {
    const application = createHealthApplication();

    assert.throws(
        () => application.calculate(null),
        /health input is required/
    );
});

test("Diagnosis is derived from Index constraints, not UI state", () => {
    const diagnosis = buildHealthDiagnosis({
        value: 72,
        constraints: [
            {
                factor: "activity",
                score: 40,
                constraint: 12
            }
        ]
    });

    assert.equal(diagnosis.primaryConstraint.factor, "activity");
    assert.equal(diagnosis.primaryConstraint.score, 40);
});
