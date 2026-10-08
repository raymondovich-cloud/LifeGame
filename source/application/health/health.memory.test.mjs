// source/application/health/health.memory.test.mjs — Version 1.0

import test from "node:test";
import assert from "node:assert/strict";
import { createHealthMemory } from "../../memory/health/health.memory.js";
import { createHealthMemoryPort } from "./health.memory.port.js";

test("Health Memory isolates facts by user context", () => {
    const first = createHealthMemory({ userId: "user-a" });
    const second = createHealthMemory({ userId: "user-b" });
    first.saveFact("body", { weightKg: 70 });
    assert.equal(first.listFacts("body").length, 1);
    assert.equal(second.listFacts("body").length, 0);
    assert.equal(first.listFacts("body")[0].userId, "user-a");
});

test("Health Memory records timestamps and supports ranges", () => {
    const memory = createHealthMemory({ userId: "user-a" });
    memory.saveFact("activity", { recordedAt: 1000, steps: 5000 });
    memory.saveFact("activity", { recordedAt: 3000, steps: 9000 });
    const result = memory.getFactsBetween("activity", 1000, 2000);
    assert.equal(result.length, 1);
    assert.equal(result[0].steps, 5000);
});

test("Health Memory returns defensive copies", () => {
    const memory = createHealthMemory({ userId: "user-a" });
    memory.saveFact("recovery", { sleepDurationHours: 8 });
    const facts = memory.listFacts("recovery");
    facts[0].sleepDurationHours = 1;
    assert.equal(memory.listFacts("recovery")[0].sleepDurationHours, 8);
});

test("Health Memory Port rejects incomplete implementations", () => {
    assert.throws(() => createHealthMemoryPort({}), /method is required/);
});

test("Health Memory Port exposes only the declared contract", () => {
    const memory = createHealthMemory({ userId: "user-a" });
    const port = createHealthMemoryPort(memory);
    assert.equal(typeof port.saveFact, "function");
    assert.equal(typeof port.getLatestFacts, "function");
    assert.equal(port.userId, undefined);
});
