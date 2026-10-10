// source/index/health/health.activity-training.test.mjs — Version 1.1

import test from "node:test";
import assert from "node:assert/strict";

import {
    WHO_ACTIVITY_GUIDELINES,
    calculateAerobicActivity,
    calculateStrengthActivity,
    calculateActivityTraining
} from "./health.activity-training.js";

test("Aerobic activity uses WHO moderate-equivalent minutes", () => {
    const result = calculateAerobicActivity({
        moderateMinutesPerWeek: 90,
        vigorousMinutesPerWeek: 30
    });

    assert.equal(result.equivalentModerateMinutesPerWeek, 150);
    assert.equal(result.minimumRecommendationMet, true);
    assert.equal(result.recommendedRange, "within");
});

test("Aerobic activity distinguishes below, within, and above the recommended range", () => {
    assert.equal(calculateAerobicActivity({
        moderateMinutesPerWeek: 149,
        vigorousMinutesPerWeek: 0
    }).recommendedRange, "below");

    assert.equal(calculateAerobicActivity({
        moderateMinutesPerWeek: 150,
        vigorousMinutesPerWeek: 0
    }).recommendedRange, "within");

    assert.equal(calculateAerobicActivity({
        moderateMinutesPerWeek: 301,
        vigorousMinutesPerWeek: 0
    }).recommendedRange, "above");
});

test("Aerobic activity reports missing data instead of treating it as zero", () => {
    const result = calculateAerobicActivity({
        moderateMinutesPerWeek: null,
        vigorousMinutesPerWeek: undefined
    });

    assert.equal(result.available, false);
    assert.equal(result.equivalentModerateMinutesPerWeek, null);
    assert.equal(result.minimumRecommendationMet, null);
    assert.equal(result.reason, "incomplete_data");
});

test("Aerobic activity rejects invalid values instead of treating them as zero", () => {
    const result = calculateAerobicActivity({
        moderateMinutesPerWeek: -1,
        vigorousMinutesPerWeek: 0
    });

    assert.equal(result.available, false);
    assert.equal(result.error, "invalid_aerobic_minutes");
});

test("Strength activity reports recommendation attainment without a health score", () => {
    assert.equal(calculateStrengthActivity({ qualifyingDaysPerWeek: 0 }).recommendationAttainmentPercent, 0);
    assert.equal(calculateStrengthActivity({ qualifyingDaysPerWeek: 1 }).recommendationAttainmentPercent, 50);
    assert.equal(calculateStrengthActivity({ qualifyingDaysPerWeek: 2 }).recommendationAttainmentPercent, 100);
    assert.equal(calculateStrengthActivity({ qualifyingDaysPerWeek: 4 }).recommendationAttainmentPercent, 100);
});

test("Strength activity rejects invalid day counts", () => {
    assert.equal(calculateStrengthActivity({ qualifyingDaysPerWeek: 8 }).available, false);
    assert.equal(calculateStrengthActivity({ qualifyingDaysPerWeek: 1.5 }).error, "invalid_qualifying_days");
});

test("Activity & Training keeps aerobic and strength components separate", () => {
    const result = calculateActivityTraining({
        aerobic: { moderateMinutesPerWeek: 150 },
        strength: { qualifyingDaysPerWeek: 2 },
        stepsPerDay: 7000
    });

    assert.equal(result.status, "components_only");
    assert.equal(result.score, null);
    assert.equal(result.aerobic.minimumRecommendationMet, true);
    assert.equal(result.strength.recommendationMet, true);
    assert.equal(result.supportingMetrics.stepsPerDay, 7000);
});

test("Blank steps are unavailable rather than zero", () => {
    const result = calculateActivityTraining({
        stepsPerDay: ""
    });

    assert.equal(result.supportingMetrics.stepsPerDay, null);
    assert.equal(WHO_ACTIVITY_GUIDELINES.minimumStrengthDaysPerWeek, 2);
});
