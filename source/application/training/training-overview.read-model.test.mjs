// source/application/training/training-overview.read-model.test.mjs — Version 1.0
import test from "node:test";
import assert from "node:assert/strict";
import { createTrainingOverviewReadModel } from "./training-overview.read-model.js";
const program = {
    id: "11111111-1111-4111-8111-111111111111", name: "Силовая база",
    startDate: "2026-10-05", totalWeeks: 8, status: "active",
    workouts: [{ id: "back-biceps", title: "Спина · Бицепс", weekday: 1, durationMinutes: 45,
        exercises: [{ id: "row", name: "Тяга", muscleGroups: ["back"], targetSets: 3, targetReps: 10, restSeconds: 90 }] }]
};
const session = (date, status = "completed") => ({
    id: "22222222-2222-4222-8222-222222222222", date, status, activityType: "strength", intensity: "moderate",
    exercises: [{ id: "row", name: "Тяга", muscleGroups: ["back"],
        sets: [{ reps: 10, completed: true, resistance: { value: 40, unit: "kg" } },
               { reps: 10, completed: true, resistance: { value: 40, unit: "kg" } },
               { reps: 10, completed: true, resistance: { value: 40, unit: "kg" } }] }]
});
function model(date) { return createTrainingOverviewReadModel({ clock: () => new Date(date + "T12:00:00.000Z").getTime() }); }
test("derives week, completion, next workout and recommendation from persisted records", () => {
    const result = model("2026-10-12").execute({ program, sessions: [session("2026-10-05")] });
    assert.equal(result.program.currentWeek, 2);
    assert.equal(result.program.completedWorkouts, 0);
    assert.equal(result.program.targetWorkouts, 1);
    assert.equal(result.program.nextWorkout.date, "2026-10-12");
    assert.deepEqual({ sets: result.previousWorkout.sets, reps: result.previousWorkout.reps, weightKg: result.previousWorkout.weightKg },
        { sets: 3, reps: 10, weightKg: 40 });
});
test("does not count planned sessions or sessions missing a template exercise", () => {
    const incomplete = { ...session("2026-10-12", "planned"), exercises: [] };
    const result = model("2026-10-12").execute({ program, sessions: [incomplete] });
    assert.equal(result.program.completedWorkouts, 0);
    assert.equal(result.program.nextWorkout.date, "2026-10-12");
    assert.equal(result.previousWorkout, null);
});
test("does not invent a numeric recommendation for bodyweight-only sets", () => {
    const bodyweight = { ...session("2026-10-05"), exercises: [{ id: "row", name: "Тяга", sets: [
        { reps: 10, completed: true, resistance: { value: null, unit: "bodyweight" } }
    ] }] };
    assert.equal(model("2026-10-12").execute({ program, sessions: [bodyweight] }).previousWorkout, null);
});
test("returns an explicit empty state when no program exists", () => {
    assert.deepEqual(model("2026-10-12").execute({ sessions: [] }), { program: null, previousWorkout: null });
});
test("requires a deterministic clock and valid program data", () => {
    assert.throws(() => createTrainingOverviewReadModel({ clock: 1 }), /clock is required/);
    assert.throws(() => model("2026-10-12").execute({ program: { ...program, startDate: "invalid" } }), /valid program/);
});
