// finance.carousel.test.mjs — Version 1.0

import assert from "node:assert/strict";
import test from "node:test";

import {
    DEFAULT_FINANCE_CAROUSEL_ORDER,
    resolveFinanceCarouselOrder,
    toggleFinanceCarouselPin
} from "./finance.carousel.js";

test("uses the agreed default swipe order", () => {
    assert.deepEqual(resolveFinanceCarouselOrder(null, {}), [
        "assets",
        "debt-repayment",
        "financial-stability"
    ]);
    assert.deepEqual(DEFAULT_FINANCE_CAROUSEL_ORDER, [
        "assets",
        "debt-repayment",
        "financial-stability"
    ]);
});

test("accepts a future FSE-recommended order", () => {
    assert.deepEqual(resolveFinanceCarouselOrder({
        recommendedOrder: [
            "debt-repayment",
            "financial-stability",
            "assets"
        ]
    }, {}), [
        "debt-repayment",
        "financial-stability",
        "assets"
    ]);
});

test("keeps a pinned screen in its saved position while filling other positions from the recommendation", () => {
    assert.deepEqual(resolveFinanceCarouselOrder({
        order: [
            "debt-repayment",
            "financial-stability",
            "assets"
        ]
    }, {
        assets: 0
    }), [
        "assets",
        "debt-repayment",
        "financial-stability"
    ]);
});

test("preserves multiple pinned positions and safely completes partial recommendations", () => {
    assert.deepEqual(resolveFinanceCarouselOrder([
        "financial-stability",
        "assets",
        "debt-repayment"
    ], {
        assets: 0,
        "debt-repayment": 2
    }), [
        "assets",
        "financial-stability",
        "debt-repayment"
    ]);

    assert.deepEqual(resolveFinanceCarouselOrder(["debt-repayment"], {}), [
        "debt-repayment",
        "assets",
        "financial-stability"
    ]);
});

test("pinning and unpinning updates only the selected screen preference", () => {
    const pinned = toggleFinanceCarouselPin(
        { pinnedPositions: {} },
        "assets",
        0
    );
    assert.deepEqual(pinned, { pinnedPositions: { assets: 0 } });

    const unpinned = toggleFinanceCarouselPin(pinned, "assets", 0);
    assert.deepEqual(unpinned, { pinnedPositions: {} });
});
