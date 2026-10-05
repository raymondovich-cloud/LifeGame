// assets.analytics.test.mjs — Version 1.0

import test from "node:test";
import assert from "node:assert/strict";

import { createUserContext } from "../user/user.context.js";
import { createFinanceApplication } from "./finance.js";
import { createAssetsAnalytics } from "./assets.analytics.js";
import { createFinanceMemory } from "../../memory/finance/finance.memory.js";

function createScopedFinance(userId) {
    const memory = createFinanceMemory(createUserContext(userId));
    return createFinanceApplication({ memory });
}

test("Assets Analytics remains isolated between Finance Application scopes", async () => {
    const firstFinance = createScopedFinance("user-1");
    const secondFinance = createScopedFinance("user-2");

    await firstFinance.addFinanceEntry("assets", "Карта", 100000, "liquid");
    await secondFinance.addFinanceEntry("assets", "Автомобиль", 500000, "illiquid");

    const firstAnalytics = createAssetsAnalytics({
        financeApplication: firstFinance
    });
    const secondAnalytics = createAssetsAnalytics({
        financeApplication: secondFinance
    });

    const firstRange = firstAnalytics.getAssetsAnalyticsRange(
        "all-time",
        Date.now()
    );
    const secondRange = secondAnalytics.getAssetsAnalyticsRange(
        "all-time",
        Date.now()
    );

    const firstResult = firstAnalytics.getAssetsAnalytics(firstRange);
    const secondResult = secondAnalytics.getAssetsAnalytics(secondRange);

    assert.equal(firstResult.current.total, 100000);
    assert.equal(secondResult.current.total, 500000);
    assert.deepEqual(
        firstResult.composition.map((entry) => entry.label),
        ["Карта"]
    );
    assert.deepEqual(
        secondResult.composition.map((entry) => entry.label),
        ["Автомобиль"]
    );
});

test("Assets Analytics requires an explicit Finance Application scope", () => {
    assert.throws(
        () => createAssetsAnalytics({ financeApplication: null }),
        /Finance Application is required/
    );
});
