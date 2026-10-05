// assets.test.mjs — Version 1.0

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
        liquidity: "illiquid"
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
        liquidity: "illiquid"
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
