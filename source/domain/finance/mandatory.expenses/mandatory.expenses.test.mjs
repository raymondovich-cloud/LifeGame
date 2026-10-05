// mandatory.expenses.test.mjs — Version 1.0

import test from "node:test";
import assert from "node:assert/strict";

import {
    createMandatoryExpense,
    updateMandatoryExpense,
    removeMandatoryExpense
} from "./mandatory.expenses.js";

test("Mandatory Expenses Domain is stateless", () => {
    const first = createMandatoryExpense("Аренда", 50000);
    const second = createMandatoryExpense("Связь", 1000);

    assert.equal(first.entry.id, undefined);
    assert.equal(second.entry.id, undefined);

    const updated = updateMandatoryExpense(
        { id: "expense-1", label: "Аренда", amount: 50000 },
        "Аренда",
        55000
    );

    assert.equal(updated.entry.id, "expense-1");
    assert.equal(updated.entry.amount, 55000);
    assert.equal(removeMandatoryExpense(null), false);
});
