// finance.memory.test.mjs — Version 1.0

import test from "node:test";
import assert from "node:assert/strict";

import { createUserContext } from "../../application/user/user.context.js";
import { createFinanceMemory } from "./finance.memory.js";

test("Finance Memory isolates users", () => {
    const firstUser = createFinanceMemory(createUserContext("user-1"));
    const secondUser = createFinanceMemory(createUserContext("user-2"));

    firstUser.saveAsset({
        label: "Счёт",
        amount: 100000,
        liquidity: "liquid"
    });

    assert.equal(firstUser.listAssets().length, 1);
    assert.equal(secondUser.listAssets().length, 0);
});

test("Finance Memory preserves asset identity on update", () => {
    const memory = createFinanceMemory(createUserContext("user-1"));

    const saved = memory.saveAsset({
        label: "Счёт",
        amount: 100000,
        liquidity: "liquid"
    });

    const updated = memory.updateAsset(saved.id, {
        label: "Счёт",
        amount: 120000,
        liquidity: "liquid"
    });

    assert.equal(updated.id, saved.id);
    assert.equal(updated.amount, 120000);
});
