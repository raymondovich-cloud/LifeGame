// mandatory.expenses.js — Version 1.1

const entries = [];
let nextId = 1;

function listMandatoryExpenses() {
    return entries.map((entry) => ({ ...entry }));
}

function addMandatoryExpense(label, amount) {
    const normalizedLabel = String(label ?? "").trim();
    const normalizedAmount = Number(amount);

    if (!normalizedLabel) {
        throw new Error("Mandatory Expenses: название записи обязательно.");
    }

    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
        throw new Error("Mandatory Expenses: сумма должна быть больше нуля.");
    }

    const entry = {
        id: `mandatory-expense-${nextId++}`,
        label: normalizedLabel,
        amount: normalizedAmount
    };

    entries.push(entry);
    return { ...entry };
}

function removeMandatoryExpense(id) {
    const index = entries.findIndex((entry) => entry.id === id);

    if (index === -1) return false;

    entries.splice(index, 1);
    return true;
}

export { listMandatoryExpenses, addMandatoryExpense, removeMandatoryExpense };
