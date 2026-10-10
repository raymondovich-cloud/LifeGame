// finance.carousel.js — Version 1.0
// Responsibility: persist finance-carousel pin preferences and resolve display order.

const FINANCE_CAROUSEL_VIEW_IDS = Object.freeze([
    "assets",
    "debt-repayment",
    "financial-stability"
]);

const DEFAULT_FINANCE_CAROUSEL_ORDER = FINANCE_CAROUSEL_VIEW_IDS;
const STORAGE_KEY_PREFIX = "lifegame.finance.carousel.v1";

function normalizeFinanceCarouselOrder(order) {
    const requested = Array.isArray(order) ? order : [];
    const result = [];

    requested.forEach((id) => {
        if (
            FINANCE_CAROUSEL_VIEW_IDS.includes(id) &&
            !result.includes(id)
        ) {
            result.push(id);
        }
    });

    DEFAULT_FINANCE_CAROUSEL_ORDER.forEach((id) => {
        if (!result.includes(id)) result.push(id);
    });

    return result;
}

function normalizePinnedPositions(value) {
    const source = value && typeof value === "object" && !Array.isArray(value)
        ? value
        : {};
    const result = {};
    const usedPositions = new Set();

    FINANCE_CAROUSEL_VIEW_IDS.forEach((id) => {
        const position = source[id];
        if (
            Number.isInteger(position) &&
            position >= 0 &&
            position < FINANCE_CAROUSEL_VIEW_IDS.length &&
            !usedPositions.has(position)
        ) {
            result[id] = position;
            usedPositions.add(position);
        }
    });

    return result;
}

function resolveFinanceCarouselOrder(recommendation, pinnedPositions = {}) {
    const recommendedOrder = Array.isArray(recommendation)
        ? recommendation
        : recommendation?.recommendedOrder ?? recommendation?.order;
    const baseOrder = normalizeFinanceCarouselOrder(recommendedOrder);
    const pins = normalizePinnedPositions(pinnedPositions);
    const result = Array(FINANCE_CAROUSEL_VIEW_IDS.length).fill(null);

    Object.entries(pins).forEach(([id, position]) => {
        result[position] = id;
    });

    const remaining = baseOrder.filter((id) => !result.includes(id));
    let nextIndex = 0;

    result.forEach((id, index) => {
        if (id === null) {
            result[index] = remaining[nextIndex];
            nextIndex += 1;
        }
    });

    return result;
}

function getStorageKey(userId) {
    const scope = typeof userId === "string" && userId.trim()
        ? "user:" + userId.trim()
        : "anonymous";
    return STORAGE_KEY_PREFIX + ":" + scope;
}

function getLocalStorage() {
    try {
        return globalThis.localStorage || null;
    } catch {
        return null;
    }
}

function loadFinanceCarouselPreferences(userId = null) {
    const storage = getLocalStorage();
    if (!storage) return { pinnedPositions: {} };

    try {
        const raw = storage.getItem(getStorageKey(userId));
        if (!raw) return { pinnedPositions: {} };

        const parsed = JSON.parse(raw);
        return {
            pinnedPositions: normalizePinnedPositions(parsed?.pinnedPositions)
        };
    } catch {
        return { pinnedPositions: {} };
    }
}

function saveFinanceCarouselPreferences(userId, preferences = {}) {
    const storage = getLocalStorage();
    if (!storage) return false;

    try {
        storage.setItem(
            getStorageKey(userId),
            JSON.stringify({
                version: 1,
                pinnedPositions: normalizePinnedPositions(preferences.pinnedPositions)
            })
        );
        return true;
    } catch {
        return false;
    }
}

function toggleFinanceCarouselPin(preferences, viewId, position) {
    const pinnedPositions = normalizePinnedPositions(preferences?.pinnedPositions);

    if (!FINANCE_CAROUSEL_VIEW_IDS.includes(viewId)) {
        return { pinnedPositions };
    }

    if (Object.prototype.hasOwnProperty.call(pinnedPositions, viewId)) {
        delete pinnedPositions[viewId];
    } else if (
        Number.isInteger(position) &&
        position >= 0 &&
        position < FINANCE_CAROUSEL_VIEW_IDS.length
    ) {
        pinnedPositions[viewId] = position;
    }

    return { pinnedPositions: normalizePinnedPositions(pinnedPositions) };
}

export {
    FINANCE_CAROUSEL_VIEW_IDS,
    DEFAULT_FINANCE_CAROUSEL_ORDER,
    normalizeFinanceCarouselOrder,
    normalizePinnedPositions,
    resolveFinanceCarouselOrder,
    loadFinanceCarouselPreferences,
    saveFinanceCarouselPreferences,
    toggleFinanceCarouselPin
};
