// assets.js — Version 2.3

import { publish } from "../../../core/events/event.bus.js";
import { trace } from "../../../core/diagnostics/lifecycle.trace.js";

const entries = [];
let nextId = 1;

function listAssets() {
    return entries.map((entry) => ({ ...entry }));
}

function calculateAssetsTotal() {
    return entries.reduce((total, entry) => total + entry.amount, 0);
}

function publishStateChanged() {
    trace("domain", "finance.assets.state.changed.prepare", {
        totalEntries: entries.length
    });

    publish({
        type: "finance.assets.state.changed",
        occurredAt: Date.now(),
        payload: {
            total: calculateAssetsTotal(),
            entries: listAssets()
        }
    });
}

function addAsset(label, amount, liquidity = "liquid") {
    const normalizedLabel = String(label ?? "").trim();
    const normalizedAmount = Number(amount);
    const normalizedLiquidity = liquidity === "illiquid" ? "illiquid" : "liquid";

    if (!normalizedLabel) {
        throw new Error("Assets: название записи обязательно.");
    }

    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
        throw new Error("Assets: сумма должна быть больше нуля.");
    }

    const entry = {
        id: `asset-${nextId++}`,
        label: normalizedLabel,
        amount: normalizedAmount,
        liquidity: normalizedLiquidity
    };

    entries.push(entry);
    publishStateChanged();

    return { ...entry };
}

function updateAsset(id, label, amount, liquidity = "liquid") {
    const normalizedLabel = String(label ?? "").trim();
    const normalizedAmount = Number(amount);
    const normalizedLiquidity = liquidity === "illiquid" ? "illiquid" : "liquid";

    if (!normalizedLabel) {
        throw new Error("Assets: название записи обязательно.");
    }

    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
        throw new Error("Assets: сумма должна быть больше нуля.");
    }

    const entry = entries.find((item) => item.id === id);

    if (!entry) {
        trace("domain", "finance.assets.update.not_found", { entryId: id });
        return false;
    }

    entry.label = normalizedLabel;
    entry.amount = normalizedAmount;
    entry.liquidity = normalizedLiquidity;

    publishStateChanged();

    trace("domain", "finance.assets.update.completed", { entryId: id });
    return { ...entry };
}

function removeAsset(id) {
    trace("domain", "finance.assets.remove.begin", { entryId: id });

    const index = entries.findIndex((entry) => entry.id === id);

    if (index === -1) {
        trace("domain", "finance.assets.remove.not_found", { entryId: id });
        return false;
    }

    entries.splice(index, 1);
    publishStateChanged();

    trace("domain", "finance.assets.remove.completed", {
        entryId: id,
        remainingEntries: entries.length
    });

    return true;
}

export {
    listAssets,
    calculateAssetsTotal,
    addAsset,
    removeAsset,
    updateAsset
};
