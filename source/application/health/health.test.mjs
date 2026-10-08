// health.test.mjs — Version 1.1

import test from "node:test";
import assert from "node:assert/strict";

import { createHealthApplication } from "./health.js";

function createMemory() {
    const facts = new Map();

    return {
        saveFact: async (category, fact) => {
            const saved = { id: "fact-1", category, ...fact };
            const list = facts.get(category) || [];
            list.push(saved);
            facts.set(category, list);
            return saved;
        },
        listFacts: async (category) => facts.get(category) || [],
        getFactsBetween: async () => [],
        getLatestFact: async () => null,
        getLatestFacts: async () => ({}),
        replaceFacts: async () => []
    };
}

test("Health Application orchestrates calculation from memory", async () => {
    const memory = createMemory();
    const application = createHealthApplication({ memory });
    const result = await application.calculateFromMemory({ now: Date.now() });

    assert.equal(result.index.value, null);
    assert.equal(result.diagnosis.status, "insufficient");
});

test("Health Application rejects invalid input", () => {
    const application = createHealthApplication();

    assert.throws(
        () => application.calculate(null),
        /health input is required/
    );
});

test("Health Application exposes diagnosis from index constraints", () => {
    const application = createHealthApplication();

    const result = application.calculate({
        recovery: {
            sleepDurationHours: 8,
            sleepVariabilityMinutes: 20,
            subjectiveRecovery: 8
        },
        activity: {
            activeMinutesPerWeek: 150,
            stepsPerDay: 8000
        },
        training: {
            trainingsPerWeek: 3
        }
    });

    assert.equal(result.diagnosis.status, "attention");
    assert.equal(result.diagnosis.primaryConstraint?.factor, "recovery");
});

test("Health Application records facts through Memory", async () => {
    const memory = createMemory();
    const application = createHealthApplication({ memory });

    const saved = await application.recordFact("body", {
        weightKg: 70,
        recordedAt: 1234
    });

    assert.equal(saved.category, "body");
    assert.equal(saved.weightKg, 70);
    assert.equal(saved.recordedAt, 1234);
});

test("Health Application rejects invalid fact categories", async () => {
    const application = createHealthApplication({ memory: createMemory() });

    await assert.rejects(
        application.recordFact("medical", { value: 1 }),
        /invalid health fact category/
    );
});
