// source/domain/training/exercise-catalog.test.mjs — Version 1.0
import test from "node:test";
import assert from "node:assert/strict";
import { EXERCISE_CATALOG, findExerciseById, listExercises } from "./exercise-catalog.js";
test("catalog identifiers are unique and entries are immutable", () => {
    const ids = EXERCISE_CATALOG.map(({ id }) => id);
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(Object.isFrozen(EXERCISE_CATALOG), true);
    assert.equal(Object.isFrozen(EXERCISE_CATALOG[0].muscleGroups), true);
});
test("finds stable IDs and returns null for unknown IDs", () => {
    assert.equal(findExerciseById("barbell_bench_press").names.ru, "Жим штанги лёжа");
    assert.equal(findExerciseById("unknown_exercise"), null);
    assert.equal(findExerciseById(null), null);
});
test("filters by muscle group, equipment and localized query", () => {
    assert.ok(listExercises({ muscleGroup: "chest" }).every((item) => item.muscleGroups.includes("chest")));
    assert.ok(listExercises({ equipment: "bodyweight" }).every((item) => item.equipment === "bodyweight"));
    assert.ok(listExercises({ query: "планка" }).some((item) => item.id === "plank"));
});
test("returns no mutable catalog internals", () => {
    assert.throws(() => { EXERCISE_CATALOG[0].names.ru = "changed"; }, TypeError);
});
