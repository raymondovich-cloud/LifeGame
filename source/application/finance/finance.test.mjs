// finance.test.mjs — Version 1.0

import test from "node:test";
import assert from "node:assert/strict";

import { createUserContext } from "../user/user.context.js";
import { createFinanceApplication } from "./finance.js";
import { createFinanceMemory } from "../../memory/finance/finance.memory.js";

test("Finance Application keeps user state isolated without module-global memory", async () => {
    const firstMemory = createFinanceMemory(createUserContext("user-1"));
    const secondMemory = createFinanceMemory(createUserContext("user-2"));

    const firstFinance = createFinanceApplication({ memory: firstMemory });
    const secondFinance = createFinanceApplication({ memory: secondMemory });

    const firstEntry = await firstFinance.addFinanceEntry(
        "actual-earnings",
        "Зарплата",
        100000
    );

    assert.equal(firstEntry.label, "Зарплата");
    assert.equal(firstFinance.listFinanceEntries("actual-earnings").length, 1);
    assert.equal(secondFinance.listFinanceEntries("actual-earnings").length, 0);

    const secondEntry = await secondFinance.addFinanceEntry(
        "actual-earnings",
        "Доход user-2",
        200000
    );

    assert.equal(secondEntry.amount, 200000);
    assert.equal(firstFinance.listFinanceEntries("actual-earnings").length, 1);
    assert.equal(secondFinance.listFinanceEntries("actual-earnings").length, 1);
});

test("Finance Application requires an explicit memory scope", () => {
    assert.throws(
        () => createFinanceApplication({ memory: null }),
        /Finance memory is required/
    );
});
