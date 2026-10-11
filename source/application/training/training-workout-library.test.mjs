// source/application/training/training-workout-library.test.mjs — Version 1.2
import test from "node:test";
import assert from "node:assert/strict";
import { createTrainingWorkoutLibraryApplication } from "./training-workout-library.js";
function makeApi() {
    const calls = [];
    const api = Object.fromEntries(["listExercises", "createExercise", "deleteExercise", "listTemplates", "saveTemplate", "deleteTemplate"].map((name) => [
        name, async (...args) => { calls.push([name, ...args]); return name === "createExercise" ? { id: "exercise-1", name: args[1] } : name === "saveTemplate" ? { id: "template-1", ...args[1] } : []; }
    ]));
    return { api, calls };
}
test("requires an authenticated user context", () => {
    const { api } = makeApi();
    assert.throws(() => createTrainingWorkoutLibraryApplication({ api }), /authenticated user context/);
});
test("normalizes exercise names and scopes every call to the user", async () => {
    const { api, calls } = makeApi();
    const app = createTrainingWorkoutLibraryApplication({ api, userContext: { userId: "user-1" } });
    await app.createExercise({ name: "  Жим   лёжа " });
    assert.deepEqual(calls[0], ["createExercise", "user-1", "Жим лёжа", "strength"]);
});
test("rejects empty names and duplicate exercises before persistence", () => {
    const { api, calls } = makeApi();
    const app = createTrainingWorkoutLibraryApplication({ api, userContext: { userId: "user-1" } });
    assert.throws(() => app.createExercise({ name: "  " }), { code: "TRAINING_WORKOUT_LIBRARY_INVALID_NAME" });
    assert.throws(() => app.saveTemplate({ title: "A", exercises: [{ id: "1", name: "Жим лёжа" }, { id: "2", name: "жим ЛЁЖА" }] }), { code: "TRAINING_WORKOUT_LIBRARY_DUPLICATE_EXERCISE" });
    assert.equal(calls.length, 0);
});
test("persists a validated template with ordered exercise snapshots", async () => {
    const { api, calls } = makeApi();
    const app = createTrainingWorkoutLibraryApplication({ api, userContext: { userId: "user-2" } });
    await app.saveTemplate({ title: "  День A ", exercises: [{ id: "exercise-1", name: "Присед", targetReps: 10 }, { id: "exercise-2", name: "Тяга" }] });
    assert.equal(calls[0][1], "user-2");
    assert.equal(calls[0][2].title, "День A");
    assert.deepEqual(calls[0][2].exercises.map((item) => item.id), ["exercise-1", "exercise-2"]);
});

test("deletes an exercise through the user-scoped persistence API", async () => {
    const { api, calls } = makeApi();
    const app = createTrainingWorkoutLibraryApplication({ api, userContext: { userId: "user-3" } });
    await app.deleteExercise({ exerciseId: "exercise-9" });
    assert.deepEqual(calls[0], ["deleteExercise", "user-3", "exercise-9"]);
});
