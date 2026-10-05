// finance.memory.test.mjs — Version 2.0

import test from "node:test";
import assert from "node:assert/strict";

import { createUserContext } from "../../application/user/user.context.js";
import { createFinanceMemory } from "./finance.memory.js";

test("Finance Memory isolates users across all Finance collections", () => {
    const firstUser = createFinanceMemory(createUserContext("user-1"));
    const secondUser = createFinanceMemory(createUserContext("user-2"));

    firstUser.saveAsset({
        label: "Счёт",
        amount: 100000,
        liquidity: "liquid"
    });
    firstUser.saveActualEarning({
        label: "Зарплата",
        amount: 100000
    });
    firstUser.saveFinancialBurden({
        label: "Кредит",
        amount: 20000,
        debt: 500000,
        payment: 20000
    });
    firstUser.saveMandatoryExpense({
        label: "Аренда",
        amount: 50000
    });
    firstUser.saveFinancialCushion({
        label: "Резерв",
        amount: 200000
    });

    assert.equal(firstUser.listAssets().length, 1);
    assert.equal(firstUser.listActualEarnings().length, 1);
    assert.equal(firstUser.listFinancialBurden().length, 1);
    assert.equal(firstUser.listMandatoryExpenses().length, 1);
    assert.equal(firstUser.listFinancialCushion().length, 1);

    assert.equal(secondUser.listAssets().length, 0);
    assert.equal(secondUser.listActualEarnings().length, 0);
    assert.equal(secondUser.listFinancialBurden().length, 0);
    assert.equal(secondUser.listMandatoryExpenses().length, 0);
    assert.equal(secondUser.listFinancialCushion().length, 0);
});

test("Finance Memory preserves identity on update", () => {
    const memory = createFinanceMemory(createUserContext("user-1"));

    const saved = memory.saveActualEarning({
        label: "Зарплата",
        amount: 100000
    });

    const updated = memory.updateActualEarning(saved.id, {
        label: "Зарплата",
        amount: 120000
    });

    assert.equal(updated.id, saved.id);
    assert.equal(updated.amount, 120000);
});
