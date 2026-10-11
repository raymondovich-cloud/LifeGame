// training-session-workflow.test.mjs — Version 1.0
import test from "node:test";
import assert from "node:assert/strict";
import { createTrainingSessionWorkflow } from "./training-session-workflow.js";

const USER = { userId: "user-1" };
const SESSION_ID = "11111111-1111-4111-8111-111111111111";
const workout = {
    id: "upper-a", title: "Верх тела", date: "2026-10-11", durationMinutes: 50,
    exercises: [
        { id: "bench", name: "Жим лёжа", muscleGroups: ["chest"], targetSets: 3, targetReps: 8, targetResistance: { value: 40, unit: "kg" } }
    ]
};

function setup() {
    const calls = [];
    let current = null;
    const api = {
        async createSession({ session }) {
            calls.push({ action: "create", session });
            current = { session: { ...session, id: SESSION_ID, status: "planned", createdAt: 1000, updatedAt: 1000 }, revision: 1 };
            return current;
        },
        async startSession(input) {
            calls.push({ action: "start", ...input });
            current = { session: { ...current.session, status: "in_progress", updatedAt: 2000 }, revision: current.revision + 1 };
            return current;
        },
        async reviseSession(input) {
            calls.push({ action: "revise", ...input });
            current = { session: { ...current.session, ...input.changes, updatedAt: 3000 }, revision: current.revision + 1 };
            return current;
        },
        async completeSession(input) {
            calls.push({ action: "complete", ...input });
            current = { session: { ...current.session, status: "completed", updatedAt: 4000 }, revision: current.revision + 1 };
            return current;
        }
    };
    return { calls, workflow: createTrainingSessionWorkflow({ api, clock: () => Date.parse("2026-10-11T12:00:00Z") }) };
}

test("creates a planned session for the current date and starts it using compare-and-swap revision", async () => {
    const { calls, workflow } = setup();
    const result = await workflow.startWorkout({ userContext: USER, workout });
    assert.equal(result.session.status, "in_progress");
    assert.equal(result.revision, 2);
    assert.equal(calls[0].session.date, "2026-10-11");
    assert.equal(calls[0].session.exercises[0].sets.length, 0);
    assert.deepEqual(calls[1], { action: "start", sessionId: SESSION_ID, expectedRevision: 1 });
});

test("records a completed set through a revisioned application command", async () => {
    const { workflow } = setup();
    const started = await workflow.startWorkout({ userContext: USER, workout });
    const result = await workflow.recordSet({
        userContext: USER, sessionResult: started, exercise: workout.exercises[0],
        reps: 8, resistance: { value: 40, unit: "kg" }
    });
    assert.equal(result.session.exercises[0].sets.length, 1);
    assert.deepEqual(result.session.exercises[0].sets[0], { reps: 8, completed: true, resistance: { value: 40, unit: "kg" } });
    assert.equal(result.revision, 3);
});

test("requires at least one saved set before completing the workout", async () => {
    const { workflow } = setup();
    const started = await workflow.startWorkout({ userContext: USER, workout });
    await assert.rejects(workflow.completeWorkout({ userContext: USER, sessionResult: started }), (error) => error.code === "TRAINING_SESSION_EMPTY");
});

test("completes a session after recorded work", async () => {
    const { workflow } = setup();
    let current = await workflow.startWorkout({ userContext: USER, workout });
    current = await workflow.recordSet({ userContext: USER, sessionResult: current, exercise: workout.exercises[0], reps: 8, resistance: { value: 40, unit: "kg" } });
    const completed = await workflow.completeWorkout({ userContext: USER, sessionResult: current });
    assert.equal(completed.session.status, "completed");
    assert.equal(completed.revision, 4);
});

test("rejects missing authentication, invalid reps and exercises outside the session", async () => {
    const { workflow } = setup();
    await assert.rejects(workflow.startWorkout({ workout }), /authenticated user context/);
    const started = await workflow.startWorkout({ userContext: USER, workout });
    await assert.rejects(workflow.recordSet({ userContext: USER, sessionResult: started, exercise: workout.exercises[0], reps: 0, resistance: { value: 20, unit: "kg" } }), /reps from 1 to 100/);
    await assert.rejects(workflow.recordSet({ userContext: USER, sessionResult: started, exercise: { id: "outside" }, reps: 8, resistance: { value: 20, unit: "kg" } }), /does not belong/);
});
