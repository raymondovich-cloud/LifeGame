// finance.analytics.test.mjs — Version 2.0

import test from "node:test";
import assert from "node:assert/strict";

import { createUserContext } from "../user/user.context.js";
import { createFinanceApplication } from "./finance.js";
import { createFinanceAnalytics } from "./finance.analytics.js";
import { createFinanceMemory } from "../../memory/finance/finance.memory.js";

test("Finance Analytics calculates monthly change for four indicators", () => {
    const memory = createFinanceMemory(createUserContext("user-1"));
    const finance = createFinanceApplication({ memory });

    const seed = (collection, entry, occurredAt) => {
        memory.mutateFinanceCollection({
            collection,
            operation: "create",
            entry,
            occurredAt
        });
    };

    const update = (collection, entryId, entry, occurredAt) => {
        memory.mutateFinanceCollection({
            collection,
            operation: "update",
            entryId,
            entry,
            occurredAt
        });
    };

    seed("assets", {
        label: "Счёт",
        amount: 100000,
        liquidity: "liquid"
    }, 1000);

    seed("actual-earnings", {
        label: "Зарплата",
        amount: 100000
    }, 1000);

    seed("financial-burden", {
        label: "Кредит",
        debt: 100000,
        payment: 10000,
        amount: 100000,
        isCreditProduct: true,
        interestRate: 25
    }, 1000);

    seed("mandatory-expenses", {
        label: "Аренда",
        amount: 50000
    }, 1000);

    update("assets", memory.listAssets()[0].id, {
        ...memory.listAssets()[0],
        amount: 113000
    }, 2000);

    update("actual-earnings", memory.listActualEarnings()[0].id, {
        ...memory.listActualEarnings()[0],
        amount: 173000
    }, 2000);

    update("financial-burden", memory.listFinancialBurden()[0].id, {
        ...memory.listFinancialBurden()[0],
        debt: 49000,
        amount: 49000
    }, 2000);

    update("mandatory-expenses", memory.listMandatoryExpenses()[0].id, {
        ...memory.listMandatoryExpenses()[0],
        amount: 52000
    }, 2000);

    const analytics = createFinanceAnalytics({ financeApplication: finance });
    const result = analytics.getFinanceAnalytics({
        startDate: 1500,
        endDate: 2000
    });

    assert.equal(result.metrics.assets.change.percent, 13);
    assert.equal(result.metrics["actual-earnings"].change.percent, 73);
    assert.equal(result.metrics["financial-burden"].change.percent, -51);
    assert.equal(result.metrics["mandatory-expenses"].change.percent, 4);
    assert.equal(result.metrics["financial-cushion"], undefined);
});

test("Finance Analytics returns no fabricated percentage when baseline is zero", () => {
    const memory = createFinanceMemory(createUserContext("user-2"));
    const finance = createFinanceApplication({ memory });

    memory.mutateFinanceCollection({
        collection: "actual-earnings",
        operation: "create",
        entry: { label: "Первый доход", amount: 1000 },
        occurredAt: 2000
    });

    const analytics = createFinanceAnalytics({ financeApplication: finance });
    const result = analytics.getFinanceAnalytics({
        startDate: 1000,
        endDate: 2000
    });

    assert.equal(result.metrics["actual-earnings"].change.percent, null);
    assert.equal(result.metrics["actual-earnings"].change.hasComparison, false);
});

test("Finance Analytics uses the first snapshot inside the month when no earlier baseline exists", () => {
    const memory = createFinanceMemory(createUserContext("user-3"));
    const finance = createFinanceApplication({ memory });

    memory.mutateFinanceCollection({
        collection: "actual-earnings",
        operation: "create",
        entry: { label: "Доход", amount: 10000 },
        occurredAt: 2000
    });

    memory.mutateFinanceCollection({
        collection: "actual-earnings",
        operation: "update",
        entryId: memory.listActualEarnings()[0].id,
        entry: { ...memory.listActualEarnings()[0], amount: 15000 },
        occurredAt: 3000
    });

    const analytics = createFinanceAnalytics({ financeApplication: finance });
    const result = analytics.getFinanceAnalytics({
        startDate: 1000,
        endDate: 3000
    });

    assert.equal(result.metrics["actual-earnings"].baseline, 10000);
    assert.equal(result.metrics["actual-earnings"].current, 15000);
    assert.equal(result.metrics["actual-earnings"].change.percent, 50);
    assert.equal(result.metrics["actual-earnings"].change.hasComparison, true);
});
