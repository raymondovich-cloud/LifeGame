// financial.burden.js — Version 1.1

const entries = [];
let nextId = 1;

function listFinancialBurden() {
    return entries.map((entry) => ({ ...entry }));
}

function addFinancialBurden(label, amount) {
    const normalizedLabel = String(label ?? "").trim();
    const normalizedAmount = Number(amount);

    if (!normalizedLabel) {
        throw new Error("Financial Burden: название записи обязательно.");
    }

    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
        throw new Error("Financial Burden: сумма должна быть больше нуля.");
    }

    const entry = {
        id: `financial-burden-${nextId++}`,
        label: normalizedLabel,
        amount: normalizedAmount
    };

    entries.push(entry);
    return { ...entry };
}

function removeFinancialBurden(id) {
    const index = entries.findIndex((entry) => entry.id === id);

    if (index === -1) return false;

    entries.splice(index, 1);
    return true;
}

export { listFinancialBurden, addFinancialBurden, removeFinancialBurden };
