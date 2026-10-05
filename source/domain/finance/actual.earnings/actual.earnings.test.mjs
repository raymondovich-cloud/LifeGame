// actual.earnings.test.mjs — Version 1.0

import test from "node:test";
import assert from "node:assert/strict";

import {
    createActualEarning,
    updateActualEarning,
    removeActualEarning
} from "./actual.earnings.js";

test("Actual Earnings Domain is stateless", () => {
    const first = createActualEarning("Зарплата", 100000);
    const second = createActualEarning("Фриланс", 25000);

    assert.equal(first.entry.id, undefined);
    assert.equal(second.entry.id, undefined);

    const updated = updateActualEarning(
        { id: "actual-1", label: "Зарплата", amount: 100000 },
        "Зарплата",
        120000
    );

    assert.equal(updated.entry.id, "actual-1");
    assert.equal(updated.entry.amount, 120000);
    assert.equal(removeActualEarning(null), false);
});
