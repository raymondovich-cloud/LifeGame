// financial.cushion.js — Version 1.2

const entries = [];
let nextId = 1;

function listFinancialCushion() {
    return entries.map((entry) => ({ ...entry }));
}

function addFinancialCushion(label, amount) {
    const normalizedLabel = String(label ?? "").trim();
    const normalizedAmount = Number(amount);

    if (!normalizedLabel) {
        throw new Error("Financial Cushion: название записи обязательно.");
    }

    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
        throw new Error("Financial Cushion: сумма должна быть больше нуля.");
    }

    const entry = {
        id: `financial-cushion-${nextId++}`,
        label: normalizedLabel,
        amount: normalizedAmount
    };

    entries.push(entry);
    return { ...entry };
}

function updateFinancialCushion(id, label, amount) {
    const normalizedLabel = String(label ?? "").trim();
    const normalizedAmount = Number(amount);

    if (!normalizedLabel) throw new Error("Financial Cushion: название записи обязательно.");
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
        throw new Error("Financial Cushion: сумма должна быть больше нуля.");
    }

    const entry = entries.find((item) => item.id === id);
    if (!entry) return false;

    entry.label = normalizedLabel;
    entry.amount = normalizedAmount;
    return { ...entry };
}

function removeFinancialCushion(id) {
    const index = entries.findIndex((entry) => entry.id === id);

    if (index === -1) return false;

    entries.splice(index, 1);
    return true;
}

export { listFinancialCushion, addFinancialCushion, updateFinancialCushion, removeFinancialCushion };
