// assets.js — Version 2.1

import { publish } from "../../../core/events/event.bus.js";

const entries = [];
let nextId = 1;

function listAssets() {
    return entries.map((entry) => ({ ...entry }));
}

function calculateAssetsTotal() {
    return entries.reduce((total, entry) => total + entry.amount, 0);
}

function publishStateChanged() {
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

function removeAsset(id) {
    const index = entries.findIndex((entry) => entry.id === id);

    if (index === -1) return false;

    entries.splice(index, 1);
    publishStateChanged();

    return true;
}

export {
    listAssets,
    calculateAssetsTotal,
    addAsset,
    removeAsset
};
