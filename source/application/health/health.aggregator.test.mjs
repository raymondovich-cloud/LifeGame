// source/application/health/health.aggregator.test.mjs — Version 1.0

import test from "node:test";
import assert from "node:assert/strict";

import { createHealthMemory } from "../../memory/health/health.memory.js";
import { createHealthAggregator } from "./health.aggregator.js";

test("Health Aggregator uses a 28-day window", async () => {
    const memory = createHealthMemory({ userId: "user-a" });
    const now = Date.UTC(2026, 9, 8);

    memory.saveFact("recovery", {
        recordedAt: now - 10 * 24 * 60 * 60 * 1000,
        sleepDurationHours: 8
    });
    memory.saveFact("recovery", {
        recordedAt: now - 29 * 24 * 60 * 60 * 1000,
        sleepDurationHours: 4
    });

    const result = await createHealthAggregator(memory).aggregate({ now });

    assert.equal(result.window.days, 28);
    assert.equal(result.recovery.sleepDurationHours, 8);
});

test("Health Aggregator applies recency weighting", async () => {
    const memory = createHealthMemory({ userId: "user-a" });
    const now = Date.UTC(2026, 9, 8);

    memory.saveFact("recovery", {
        recordedAt: now,
        sleepDurationHours: 8
    });
    memory.saveFact("recovery", {
        recordedAt: now - 14 * 24 * 60 * 60 * 1000,
        sleepDurationHours: 4
    });

    const result = await createHealthAggregator(memory).aggregate({ now });

    assert.ok(result.recovery.sleepDurationHours > 6);
});

test("Health Aggregator derives training from Activity workout events", async () => {
    const memory = createHealthMemory({ userId: "user-a" });
    const now = Date.UTC(2026, 9, 8);

    for (let index = 0; index < 4; index += 1) {
        memory.saveFact("activity", {
            recordedAt: now - index * 7 * 24 * 60 * 60 * 1000,
            type: "workout",
            durationMinutes: 60
        });
    }

    const result = await createHealthAggregator(memory).aggregate({ now });

    assert.equal(result.training.trainingsPerWeek, 1);
    assert.equal(result.training.durationScore, 100);
});

test("Health Aggregator does not invent missing data", async () => {
    const memory = createHealthMemory({ userId: "user-a" });
    const now = Date.UTC(2026, 9, 8);

    const result = await createHealthAggregator(memory).aggregate({ now });

    assert.deepEqual(result.recovery, {});
    assert.deepEqual(result.activity, {});
    assert.deepEqual(result.training, {});
    assert.deepEqual(result.nutrition, {});
    assert.deepEqual(result.lifestyle, {});
    assert.deepEqual(result.body, {});
});
