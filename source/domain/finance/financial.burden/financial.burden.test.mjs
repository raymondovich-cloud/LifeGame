// financial.burden.test.mjs — Version 1.1

import test from "node:test";
import assert from "node:assert/strict";

import {
    createFinancialBurden,
    updateFinancialBurden,
    removeFinancialBurden
} from "./financial.burden.js";

test("Financial Burden Domain is stateless", () => {
    const first = createFinancialBurden("Кредит", 500000, 20000);
    const second = createFinancialBurden("Рассрочка", 100000, 10000);

    assert.equal(first.entry.id, undefined);
    assert.equal(second.entry.id, undefined);
    assert.equal(first.entry.debt, 500000);
    assert.equal(first.entry.payment, 20000);

    const updated = updateFinancialBurden(
        { id: "burden-1", label: "Кредит", amount: 20000, debt: 500000, payment: 20000 },
        "Кредит",
        450000,
        20000
    );

    assert.equal(updated.entry.id, "burden-1");
    assert.equal(updated.entry.debt, 450000);
    assert.equal(removeFinancialBurden(null), false);
});


test("Financial Burden supports ordinary obligations without credit fields", () => {
    const result = createFinancialBurden("Дядя Ваня", 3000, null, false, null);
    assert.equal(result.entry.isCreditProduct, false);
    assert.equal(result.entry.payment, null);
    assert.equal(result.entry.interestRate, null);
});

test("Financial Burden supports credit products with payment and annual rate", () => {
    const result = createFinancialBurden("Сбербанк", 30000, 3000, true, 25);
    assert.equal(result.entry.isCreditProduct, true);
    assert.equal(result.entry.payment, 3000);
    assert.equal(result.entry.interestRate, 25);
});
