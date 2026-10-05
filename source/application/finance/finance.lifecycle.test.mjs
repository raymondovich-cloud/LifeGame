// finance.lifecycle.test.mjs — Version 1.0
// Responsibility: verify the complete Finance Application CRUD lifecycle within one user scope.

import test from "node:test";
import assert from "node:assert/strict";

import { createUserContext } from "../user/user.context.js";
import { createFinanceApplication } from "./finance.js";
import { createFinanceMemory } from "../../memory/finance/finance.memory.js";

function createScopedFinance(userId) {
    const userContext = createUserContext(userId);
    const memory = createFinanceMemory(userContext);
    return createFinanceApplication({ memory });
}

test("Finance Application completes create → update → delete lifecycle", async () => {
    const finance = createScopedFinance("lifecycle-user");

    const created = await finance.addFinanceEntry(
        "actual-earnings",
        "Зарплата",
        100000
    );

    assert.ok(created.id);
    assert.equal(created.label, "Зарплата");
    assert.equal(created.amount, 100000);
    assert.deepEqual(
        finance.listFinanceEntries("actual-earnings"),
        [created]
    );

    const updated = await finance.updateFinanceEntry(
        "actual-earnings",
        created.id,
        "Зарплата после изменения",
        125000
    );

    assert.equal(updated.id, created.id);
    assert.equal(updated.label, "Зарплата после изменения");
    assert.equal(updated.amount, 125000);
    assert.deepEqual(
        finance.listFinanceEntries("actual-earnings"),
        [updated]
    );

    const deleted = await finance.removeFinanceEntry(
        "actual-earnings",
        created.id
    );

    assert.equal(deleted, true);
    assert.deepEqual(
        finance.listFinanceEntries("actual-earnings"),
        []
    );
});

test("Finance Application lifecycle remains isolated between users", async () => {
    const firstFinance = createScopedFinance("lifecycle-user-1");
    const secondFinance = createScopedFinance("lifecycle-user-2");

    const first = await firstFinance.addFinanceEntry(
        "actual-earnings",
        "Доход user-1",
        100000
    );

    const second = await secondFinance.addFinanceEntry(
        "actual-earnings",
        "Доход user-2",
        200000
    );

    await firstFinance.updateFinanceEntry(
        "actual-earnings",
        first.id,
        "Доход user-1 изменён",
        150000
    );

    assert.deepEqual(
        firstFinance.listFinanceEntries("actual-earnings").map((entry) => entry.amount),
        [150000]
    );

    assert.deepEqual(
        secondFinance.listFinanceEntries("actual-earnings").map((entry) => entry.amount),
        [200000]
    );

    assert.equal(
        await firstFinance.removeFinanceEntry("actual-earnings", first.id),
        true
    );

    assert.deepEqual(
        firstFinance.listFinanceEntries("actual-earnings"),
        []
    );

    assert.deepEqual(
        secondFinance.listFinanceEntries("actual-earnings"),
        [second]
    );
});
