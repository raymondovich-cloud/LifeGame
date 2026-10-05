// financial.cushion.test.mjs — Version 1.0

import test from "node:test";
import assert from "node:assert/strict";

import {
    createFinancialCushion,
    updateFinancialCushion,
    removeFinancialCushion
} from "./financial.cushion.js";

test("Financial Cushion Domain is stateless", () => {
    const first = createFinancialCushion("Резерв", 200000);
    const second = createFinancialCushion("Отдельный фонд", 50000);

    assert.equal(first.entry.id, undefined);
    assert.equal(second.entry.id, undefined);

    const updated = updateFinancialCushion(
        { id: "cushion-1", label: "Резерв", amount: 200000 },
        "Резерв",
        250000
    );

    assert.equal(updated.entry.id, "cushion-1");
    assert.equal(updated.entry.amount, 250000);
    assert.equal(removeFinancialCushion(null), false);
});
