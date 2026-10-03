// financial.burden.js — Version 1.2

const entries = [];
let nextId = 1;

function listFinancialBurden() {
    return entries.map((entry) => ({ ...entry }));
}

function addFinancialBurden(label, debt, payment) {
    const normalizedLabel = String(label ?? "").trim();
    const normalizedDebt = Number(debt);
    const normalizedPayment = Number(payment);

    if (!normalizedLabel) {
        throw new Error("Financial Burden: название записи обязательно.");
    }

    if (!Number.isFinite(normalizedDebt) || normalizedDebt <= 0) {
        throw new Error("Financial Burden: сумма долга должна быть больше нуля.");
    }

    if (!Number.isFinite(normalizedPayment) || normalizedPayment < 0) {
        throw new Error("Financial Burden: регулярный платеж не может быть отрицательным.");
    }

    const entry = {
        id: `financial-burden-${nextId++}`,
        label: normalizedLabel,
        amount: normalizedPayment,
        debt: normalizedDebt,
        payment: normalizedPayment
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
