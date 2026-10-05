// assets.js — Version 2.4

function normalizeAsset(label, amount, liquidity = "liquid") {
    const normalizedLabel = String(label ?? "").trim();
    const normalizedAmount = Number(amount);
    const normalizedLiquidity = liquidity === "illiquid" ? "illiquid" : "liquid";

    if (!normalizedLabel) {
        throw new Error("Assets: название записи обязательно.");
    }

    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
        throw new Error("Assets: сумма должна быть больше нуля.");
    }

    return {
        label: normalizedLabel,
        amount: normalizedAmount,
        liquidity: normalizedLiquidity
    };
}

function calculateAssetsTotal(entries) {
    if (!Array.isArray(entries)) {
        throw new Error("Assets: entries must be an array.");
    }

    return entries.reduce((total, entry) => total + Number(entry.amount || 0), 0);
}

function createAsset({ label, amount, liquidity = "liquid" }) {
    const entry = normalizeAsset(label, amount, liquidity);

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

function updateAsset(existingAsset, { label, amount, liquidity = "liquid" }) {
    if (!existingAsset || !existingAsset.id) {
        return false;
    }

    const changes = normalizeAsset(label, amount, liquidity);
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

export {
    calculateAssetsTotal,
    createAsset,
    updateAsset,
    removeAsset
};
