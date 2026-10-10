// finance.index.test.mjs — Version 1.0

import test from "node:test";
import assert from "node:assert/strict";
import { calculateFinancialStabilityIndex } from "./finance.index.js";

function stateWithDebt(debt, status = "active") {
    const reserve = { label: "Резерв", amount: 100000, liquidity: "liquid", isReserve: true };
    return {
        assets: [reserve], liquidAssets: [reserve], illiquidAssets: [],
        actualEarnings: [{ label: "Доход", amount: 100000 }],
        mandatoryExpenses: [{ label: "Расходы", amount: 10000 }],
        financialBurden: [{ label: "Обязательство", debt, payment: 5000, status }],
        financialCushion: 100000,
        incomeHistory: [], debtHistory: [], liquidityHistory: [], reserveHistory: []
    };
}

test("closing a financial burden removes its debt and payment from the FSI", () => {
    const active = calculateFinancialStabilityIndex(stateWithDebt(50000, "active"));
    const closed = calculateFinancialStabilityIndex(stateWithDebt(50000, "closed"));
    assert.equal(active.diagnostics.totalDebt, 50000);
    assert.equal(active.diagnostics.debtPayments, 5000);
    assert.equal(closed.diagnostics.totalDebt, 0);
    assert.equal(closed.diagnostics.debtPayments, 0);
    assert.ok(closed.value > active.value);
});

test("reducing an active financial burden improves the FSI when other inputs are unchanged", () => {
    const before = calculateFinancialStabilityIndex(stateWithDebt(50000, "active"));
    const after = calculateFinancialStabilityIndex(stateWithDebt(20000, "active"));
    assert.ok(after.value > before.value);
});
