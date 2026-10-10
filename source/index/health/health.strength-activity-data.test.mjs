// source/index/health/health.strength-activity-data.test.mjs — Version 1.0

import test from "node:test";
import assert from "node:assert/strict";

import { prepareStrengthActivityData } from "./health.strength-activity-data.js";

const baseInput = {
    weekStartDate: "2026-10-05",
    weekEndDate: "2026-10-11",
    isLogComplete: true,
    requiredMuscleGroups: ["legs", "back", "chest"],
    sessions: [
        {
            date: "2026-10-05",
            isQualifyingStrengthSession: true,
            muscleGroups: ["legs", "back"]
        },
        {
            date: "2026-10-05",
            isQualifyingStrengthSession: true,
            muscleGroups: ["chest"]
        },
        {
            date: "2026-10-08",
            isQualifyingStrengthSession: true,
            muscleGroups: ["chest", "back"]
        }
    ]
};

test("Strength preparation deduplicates multiple qualifying sessions on one date", () => {
    const result = prepareStrengthActivityData(baseInput);

    assert.equal(result.available, true);
    assert.equal(result.qualifyingDaysPerWeek, 2);
    assert.deepEqual(result.qualifyingDates, ["2026-10-05", "2026-10-08"]);
    assert.equal(result.recommendationMetByDays, true);
});

test("Strength preparation reports weekly muscle-group coverage separately", () => {
    const result = prepareStrengthActivityData(baseInput);

    assert.deepEqual(result.coveredMuscleGroups, ["back", "chest", "legs"]);
    assert.deepEqual(result.missingMuscleGroups, []);
    assert.equal(result.requiredMuscleGroupsCovered, true);
});

test("An incomplete log is not interpreted as zero strength days", () => {
    const result = prepareStrengthActivityData({
        ...baseInput,
        isLogComplete: false,
        sessions: []
    });

    assert.equal(result.available, false);
    assert.equal(result.reason, "incomplete_data");
    assert.equal(result.qualifyingDaysPerWeek, null);
});

test("Unknown session classification makes the weekly result unavailable", () => {
    const result = prepareStrengthActivityData({
        ...baseInput,
        sessions: [{
            date: "2026-10-06",
            isQualifyingStrengthSession: null,
            muscleGroups: []
        }]
    });

    assert.equal(result.available, false);
    assert.equal(result.qualifyingDaysPerWeek, null);
});

test("Sessions outside the requested week are rejected", () => {
    const result = prepareStrengthActivityData({
        ...baseInput,
        sessions: [{
            date: "2026-10-12",
            isQualifyingStrengthSession: true,
            muscleGroups: ["legs"]
        }]
    });

    assert.equal(result.available, false);
    assert.equal(result.error, "session_outside_week_range");
});

test("Invalid week ranges are rejected", () => {
    const result = prepareStrengthActivityData({
        ...baseInput,
        weekStartDate: "2026-10-12",
        weekEndDate: "2026-10-05"
    });

    assert.equal(result.available, false);
    assert.equal(result.error, "invalid_week_range");
});

test("Missing required muscle groups are reported without inventing a health score", () => {
    const result = prepareStrengthActivityData({
        ...baseInput,
        sessions: [{
            date: "2026-10-05",
            isQualifyingStrengthSession: true,
            muscleGroups: ["legs"]
        }]
    });

    assert.deepEqual(result.missingMuscleGroups, ["back", "chest"]);
    assert.equal(result.requiredMuscleGroupsCovered, false);
    assert.equal(result.status, "prepared_data_only");
});
