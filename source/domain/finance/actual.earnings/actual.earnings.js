// actual.earnings.js — Version 1.1

const entries = [];
let nextId = 1;

function listActualEarnings() {
    return entries.map((entry) => ({ ...entry }));
}

function addActualEarning(label, amount) {
    const normalizedLabel = String(label ?? "").trim();
    const normalizedAmount = Number(amount);

    if (!normalizedLabel) {
        throw new Error("Actual Earnings: название записи обязательно.");
    }

    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
        throw new Error("Actual Earnings: сумма должна быть больше нуля.");
    }

    const entry = {
        id: `actual-earning-${nextId++}`,
        label: normalizedLabel,
        amount: normalizedAmount
    };

    entries.push(entry);
    return { ...entry };
}

function removeActualEarning(id) {
    const index = entries.findIndex((entry) => entry.id === id);

    if (index === -1) return false;

    entries.splice(index, 1);
    return true;
}

export { listActualEarnings, addActualEarning, removeActualEarning };
