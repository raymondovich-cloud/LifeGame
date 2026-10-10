// source/domain/training/training-session-lifecycle.test.mjs — Version 1.0
import test from "node:test";
import assert from "node:assert/strict";
import { createTrainingSession } from "./training-session.js";
import { startTrainingSession, completeTrainingSession, reviseTrainingSession } from "./training-session-lifecycle.js";
const planned = createTrainingSession({
    id: "session-1", date: "2026-10-10", activityType: "strength", status: "planned", intensity: "unknown",
    exercises: [{ id: "barbell_bench_press", name: "Жим штанги лёжа", muscleGroups: ["chest", "triceps"], sets: [] }],
    createdAt: 100, updatedAt: 100
});
test("starts only a planned session and preserves creation metadata", () => {
    const started = startTrainingSession(planned, 200);
    assert.equal(started.status, "in_progress");
    assert.equal(started.createdAt, 100);
    assert.equal(started.updatedAt, 200);
    assert.throws(() => startTrainingSession(started, 300), /only a planned session/);
});
test("completes only an in-progress session", () => {
    const started = startTrainingSession(planned, 200);
    assert.equal(completeTrainingSession(started, 300).status, "completed");
    assert.throws(() => completeTrainingSession(planned, 300), /only an in-progress session/);
});
test("rejects backward timestamps", () => {
    assert.throws(() => startTrainingSession(planned, 99), /non-decreasing timestamp/);
});
test("allows controlled corrections without changing identity or creation time", () => {
    const completed = completeTrainingSession(startTrainingSession(planned, 200), 300);
    const revised = reviseTrainingSession(completed, { notes: "corrected" }, 400);
    assert.equal(revised.status, "completed");
    assert.equal(revised.id, completed.id);
    assert.equal(revised.createdAt, completed.createdAt);
    assert.equal(revised.notes, "corrected");
    assert.equal(revised.updatedAt, 400);
});
test("rejects identity, lifecycle and unknown-field edits", () => {
    assert.throws(() => reviseTrainingSession(planned, { id: "other" }, 200), /cannot be edited/);
    assert.throws(() => reviseTrainingSession(planned, { status: "completed" }, 200), /cannot be edited/);
    assert.throws(() => reviseTrainingSession(planned, { userId: "user-1" }, 200), /cannot be edited/);
});
test("revalidates revised data through the domain factory", () => {
    assert.throws(() => reviseTrainingSession(planned, { date: "2026-02-30" }, 200), /valid ISO calendar date/);
});
