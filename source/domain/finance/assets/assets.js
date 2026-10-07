// assets.js — Version 3.0

const ASSET_TYPES = Object.freeze([
    "cash",
    "bank-account",
    "real-estate",
    "vehicle",
    "bank-deposit",
    "bond",
    "investment",
    "other"
]);

const COMPOUNDING_FREQUENCIES = Object.freeze([
    "none",
    "monthly",
    "quarterly",
    "annual"
]);

function normalizeAsset({
    label,
    amount,
    liquidity = "liquid",
    assetType = "cash",
    isReserve = false,
    incomeEnabled = false,
    annualYieldRate = null,
    compoundingFrequency = "none"
}) {
    const normalizedLabel = String(label ?? "").trim();
    const normalizedAmount = Number(amount);
    const normalizedLiquidity = liquidity === "illiquid" ? "illiquid" : "liquid";
    const normalizedAssetType = ASSET_TYPES.includes(assetType) ? assetType : "cash";
    const normalizedReserve = Boolean(isReserve);
    const normalizedIncomeEnabled = Boolean(incomeEnabled);
    const normalizedRate = normalizedIncomeEnabled && annualYieldRate !== null && annualYieldRate !== ""
        ? Number(annualYieldRate)
        : null;
    const normalizedCompounding = normalizedIncomeEnabled && COMPOUNDING_FREQUENCIES.includes(compoundingFrequency)
        ? compoundingFrequency
        : "none";

    if (!normalizedLabel) {
        throw new Error("Assets: название записи обязательно.");
    }

    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
        throw new Error("Assets: сумма должна быть больше нуля.");
    }

    if (normalizedIncomeEnabled && (!Number.isFinite(normalizedRate) || normalizedRate < 0)) {
        throw new Error("Assets: процентная ставка должна быть неотрицательной.");
    }

    return {
        label: normalizedLabel,
        amount: normalizedAmount,
        liquidity: normalizedLiquidity,
        assetType: normalizedAssetType,
        isReserve: normalizedReserve,
        incomeEnabled: normalizedIncomeEnabled,
        annualYieldRate: normalizedRate,
        compoundingFrequency: normalizedCompounding
    };
}

function calculateAssetsTotal(entries) {
    if (!Array.isArray(entries)) {
        throw new Error("Assets: entries must be an array.");
    }

    return entries.reduce((total, entry) => total + Number(entry.amount || 0), 0);
}

function createAsset(options) {
    const entry = normalizeAsset(options);

    return {
        entry,
        event: {
            type: "finance.assets.changed",
            occurredAt: Date.now(),
            payload: {
                operation: "created",
                entry
            }
        }
    };
}

function updateAsset(existingAsset, options) {
    if (!existingAsset || !existingAsset.id) {
        return false;
    }

    const changes = normalizeAsset(options);
    const entry = {
        ...existingAsset,
        ...changes
    };

    return {
        entry,
        event: {
            type: "finance.assets.changed",
            occurredAt: Date.now(),
            payload: {
                operation: "updated",
                entry
            }
        }
    };
}

function removeAsset(existingAsset) {
    if (!existingAsset || !existingAsset.id) {
        return false;
    }

    return {
        entry: { ...existingAsset },
        event: {
            type: "finance.assets.changed",
            occurredAt: Date.now(),
            payload: {
                operation: "deleted",
                entry: { ...existingAsset }
            }
        }
    };
}

function calculateProjectedIncome(entry, periods = 12) {
    if (!entry?.incomeEnabled || !Number.isFinite(Number(entry.annualYieldRate))) {
        return 0;
    }

    const principal = Number(entry.amount);
    const annualRate = Number(entry.annualYieldRate) / 100;
    if (!Number.isFinite(principal) || principal <= 0 || annualRate < 0 || periods <= 0) {
        return 0;
    }

    const frequency = entry.compoundingFrequency;
    if (frequency === "none") {
        return principal * annualRate * (periods / 12);
    }

    const compoundsPerYear = frequency === "monthly"
        ? 12
        : frequency === "quarterly"
            ? 4
            : 1;

    const years = periods / 12;
    return principal * (Math.pow(1 + annualRate / compoundsPerYear, compoundsPerYear * years) - 1);
}

export {
    ASSET_TYPES,
    COMPOUNDING_FREQUENCIES,
    calculateAssetsTotal,
    calculateProjectedIncome,
    createAsset,
    updateAsset,
    removeAsset
};
