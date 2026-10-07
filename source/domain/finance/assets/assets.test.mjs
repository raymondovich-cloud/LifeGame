// assets.test.mjs — Version 2.0

import test from "node:test";
import assert from "node:assert/strict";

import {
    calculateAssetsTotal,
    createAsset,
    updateAsset,
    removeAsset
} from "./assets.js";

test("Assets Domain creates a stateless asset result", () => {
    const result = createAsset({
        label: "Квартира",
        amount: 5000000,
        liquidity: "illiquid"
    });

    assert.deepEqual(result.entry, {
        label: "Квартира",
        amount: 5000000,
        liquidity: "illiquid",
        assetType: "cash",
        isReserve: false,
        incomeEnabled: false,
        annualYieldRate: null,
        compoundingFrequency: "none"
    });
    assert.equal(result.event.type, "finance.assets.changed");
    assert.equal(result.event.payload.operation, "created");
});

test("Assets Domain does not retain created state", () => {
    const first = createAsset({
        label: "Счёт",
        amount: 100000,
        liquidity: "liquid"
    });

    const second = createAsset({
        label: "Автомобиль",
        amount: 900000,
        liquidity: "illiquid"
    });

    assert.notEqual(first.entry, second.entry);
    assert.equal(first.entry.label, "Счёт");
    assert.equal(second.entry.label, "Автомобиль");
});

test("Assets Domain updates supplied state without owning it", () => {
    const existing = {
        id: "asset-1",
        label: "Счёт",
        amount: 100000,
        liquidity: "liquid"
    };

    const result = updateAsset(existing, {
        label: "Счёт",
        amount: 120000,
        liquidity: "illiquid"
    });

    assert.deepEqual(result.entry, {
        id: "asset-1",
        label: "Счёт",
        amount: 120000,
        liquidity: "illiquid",
        assetType: "cash",
        isReserve: false,
        incomeEnabled: false,
        annualYieldRate: null,
        compoundingFrequency: "none"
    });
    assert.deepEqual(existing, {
        id: "asset-1",
        label: "Счёт",
        amount: 100000,
        liquidity: "liquid"
    });
});

test("Assets Domain returns no operation for missing asset", () => {
    assert.equal(
        updateAsset(null, {
            label: "Счёт",
            amount: 1000,
            liquidity: "liquid"
        }),
        false
    );

    assert.equal(removeAsset(null), false);
});

test("Assets total is calculated from supplied state", () => {
    assert.equal(
        calculateAssetsTotal([
            { amount: 100 },
            { amount: 250 }
        ]),
        350
    );
});


test("Assets Domain supports reserve and income-producing parameters", () => {
    const result = createAsset({
        label: "Вклад",
        amount: 500000,
        liquidity: "liquid",
        assetType: "bank-deposit",
        isReserve: true,
        incomeEnabled: true,
        annualYieldRate: 16,
        compoundingFrequency: "monthly"
    });

    assert.equal(result.entry.isReserve, true);
    assert.equal(result.entry.assetType, "bank-deposit");
    assert.equal(result.entry.annualYieldRate, 16);
    assert.equal(result.entry.compoundingFrequency, "monthly");
});
