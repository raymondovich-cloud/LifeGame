// credit.product.test.mjs — Version 1.0

import test from "node:test";
import assert from "node:assert/strict";

import { calculateCreditProduct } from "./credit.product.js";

test("Credit Product calculates monthly compound interest and payoff", () => {
    const result = calculateCreditProduct(30000, 3000, 25);

    assert.equal(result.payoffPossible, true);
    assert.equal(result.monthsToPayoff, 12);
    assert.equal(Math.round(result.firstMonthInterest * 100) / 100, 625);
    assert.equal(Math.round(result.totalInterest * 100) / 100, 3996.60);
    assert.equal(Math.round(result.totalPaid * 100) / 100, 33996.60);
    assert.equal(result.remainingBalance, 0);
});

test("Credit Product handles zero interest", () => {
    const result = calculateCreditProduct(10000, 2500, 0);

    assert.equal(result.monthsToPayoff, 4);
    assert.equal(result.totalInterest, 0);
    assert.equal(result.totalPaid, 10000);
});

test("Credit Product detects payment that does not cover interest", () => {
    const result = calculateCreditProduct(30000, 500, 25);

    assert.equal(result.payoffPossible, false);
    assert.equal(result.monthsToPayoff, null);
    assert.equal(result.totalInterest, null);
    assert(result.remainingBalance > 30000);
});

test("Credit Product rejects invalid inputs", () => {
    assert.throws(() => calculateCreditProduct(0, 1000, 10));
    assert.throws(() => calculateCreditProduct(10000, 0, 10));
    assert.throws(() => calculateCreditProduct(10000, 1000, -1));
});
