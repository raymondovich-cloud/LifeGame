// source/index/health/health.strength-session-qualification.test.mjs — Version 1.0

import test from "node:test";
import assert from "node:assert/strict";
import { classifyStrengthSession } from "./health.strength-session-qualification.js";

const validSession = {
    activityType: "strength",
    intensity: "moderate",
    isSessionComplete: true,
    exercises: [
        { completedSets: 3, muscleGroups: ["chest"] },
        { completedSets: 2, muscleGroups: ["triceps"] }
    ]
};

test("qualifies an explicitly moderate session with completed resistance sets", () => {
    const result = classifyStrengthSession(validSession);
    assert.equal(result.available, true);
    assert.equal(result.isQualifyingStrengthSession, true);
    assert.equal(result.completedWorkingSets, 5);
    assert.deepEqual(result.muscleGroups, ["chest", "triceps"]);
});

test("qualifies an explicitly vigorous session", () => {
    const result = classifyStrengthSession({ ...validSession, intensity: "vigorous" });
    assert.equal(result.isQualifyingStrengthSession, true);
});

test("does not qualify a light-intensity session", () => {
    const result = classifyStrengthSession({ ...validSession, intensity: "light" });
    assert.equal(result.available, true);
    assert.equal(result.isQualifyingStrengthSession, false);
    assert.equal(result.reason, "below_qualifying_intensity");
});

test("does not qualify a non-strength session", () => {
    const result = classifyStrengthSession({ ...validSession, activityType: "other" });
    assert.equal(result.isQualifyingStrengthSession, false);
});

test("keeps an unknown intensity unavailable instead of guessing", () => {
    const result = classifyStrengthSession({ ...validSession, intensity: "unknown" });
    assert.equal(result.available, false);
    assert.equal(result.isQualifyingStrengthSession, null);
});

test("keeps an incomplete session unavailable", () => {
    const result = classifyStrengthSession({ ...validSession, isSessionComplete: false });
    assert.equal(result.available, false);
    assert.equal(result.reason, "incomplete_session");
});

test("does not qualify a session with no completed working sets", () => {
    const result = classifyStrengthSession({
        ...validSession,
        exercises: [{ completedSets: 0, muscleGroups: ["chest"] }]
    });
    assert.equal(result.isQualifyingStrengthSession, false);
    assert.equal(result.completedWorkingSets, 0);
});

test("requires muscle-group evidence for completed sets", () => {
    const result = classifyStrengthSession({
        ...validSession,
        exercises: [{ completedSets: 2, muscleGroups: [] }]
    });
    assert.equal(result.available, false);
    assert.equal(result.reason, "missing_muscle_groups");
});

test("rejects invalid set counts", () => {
    const result = classifyStrengthSession({
        ...validSession,
        exercises: [{ completedSets: 1.5, muscleGroups: ["chest"] }]
    });
    assert.equal(result.available, false);
    assert.equal(result.reason, "invalid_completed_sets");
});

test("requires the session to be explicitly complete", () => {
    const result = classifyStrengthSession({
        activityType: "strength",
        intensity: "moderate",
        exercises: validSession.exercises
    });
    assert.equal(result.available, false);
});
