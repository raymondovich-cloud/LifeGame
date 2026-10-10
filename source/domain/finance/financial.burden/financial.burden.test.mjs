// financial.burden.test.mjs — Version 1.3

import test from "node:test";
import assert from "node:assert/strict";

import {
    createFinancialBurden,
    updateFinancialBurden,
    removeFinancialBurden,
    closeFinancialBurden
} from "./financial.burden.js";

test("Financial Burden Domain is stateless", () => {
    const first = createFinancialBurden("Кредит", 500000, 20000, true, 25);
    const second = createFinancialBurden("Рассрочка", 100000, 10000, true, 10);

    assert.equal(first.entry.id, undefined);
    assert.equal(second.entry.id, undefined);
    assert.equal(first.entry.debt, 500000);
    assert.equal(first.entry.payment, 20000);

    const updated = updateFinancialBurden(
        { id: "burden-1", label: "Кредит", amount: 20000, debt: 500000, payment: 20000, isCreditProduct: true, interestRate: 25 },
        "Кредит",
        450000,
        20000,
        true,
        25
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


test("closing a financial burden preserves its values and records closure", () => {
    const created = createFinancialBurden("Кредит Сбербанк", 50000, 5000, true, 20).entry;
    const closed = closeFinancialBurden({ ...created, id: "burden-1" }, 1791633600000);
    assert.equal(closed.entry.id, "burden-1");
    assert.equal(closed.entry.status, "closed");
    assert.equal(closed.entry.closedAt, new Date(1791633600000).toISOString());
    assert.equal(closed.entry.debt, 50000);
    assert.equal(closed.event.payload.operation, "closed");
    assert.equal(closeFinancialBurden(closed.entry), false);
});
