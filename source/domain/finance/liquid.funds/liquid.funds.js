// liquid.funds.js — Version 1.2

import { publish } from "../../../core/events/event.bus.js";

const entries = [];
let nextId = 1;

function listLiquidFunds() {
    return entries.map((entry) => ({ ...entry }));
}

function calculateLiquidFundsTotal() {
    return entries.reduce((total, entry) => total + entry.amount, 0);
}

function publishStateChanged() {
    publish({
        type: "finance.liquid-funds.state.changed",
        occurredAt: Date.now(),
        payload: {
            total: calculateLiquidFundsTotal(),
            entries: listLiquidFunds()
        }
    });
}

function addLiquidFund(label, amount) {
    const normalizedLabel = String(label ?? "").trim();
    const normalizedAmount = Number(amount);

    if (!normalizedLabel) {
        throw new Error("Liquid Funds: название записи обязательно.");
    }

    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
        throw new Error("Liquid Funds: сумма должна быть больше нуля.");
    }

    const entry = {
        id: `liquid-fund-${nextId++}`,
        label: normalizedLabel,
        amount: normalizedAmount
    };

    entries.push(entry);
    publishStateChanged();

    return { ...entry };
}

function removeLiquidFund(id) {
    const index = entries.findIndex((entry) => entry.id === id);

    if (index === -1) return false;

    entries.splice(index, 1);
    publishStateChanged();

    return true;
}

export {
    listLiquidFunds,
    calculateLiquidFundsTotal,
    addLiquidFund,
    removeLiquidFund
};
