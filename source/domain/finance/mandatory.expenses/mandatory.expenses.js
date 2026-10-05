// mandatory.expenses.js — Version 2.0

function createMandatoryExpense(label, amount) {
    const normalizedLabel = String(label ?? "").trim();
    const normalizedAmount = Number(amount);

    if (!normalizedLabel) {
        throw new Error("Mandatory Expenses: название записи обязательно.");
    }

    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
        throw new Error("Mandatory Expenses: сумма должна быть больше нуля.");
    }

    return {
        entry: {
            label: normalizedLabel,
            amount: normalizedAmount
        },
        event: {
            type: "finance.mandatory.expenses.changed",
            occurredAt: Date.now(),
            payload: {
                operation: "created"
            }
        }
    };
}

function updateMandatoryExpense(existingEntry, label, amount) {
    if (!existingEntry) return false;

    const result = createMandatoryExpense(label, amount);

    return {
        entry: {
            ...result.entry,
            id: existingEntry.id
        },
        event: {
            ...result.event,
            payload: {
                operation: "updated",
                entryId: existingEntry.id
            }
        }
    };
}

function removeMandatoryExpense(existingEntry) {
    if (!existingEntry) return false;

    return {
        entry: { ...existingEntry },
        event: {
            type: "finance.mandatory.expenses.changed",
            occurredAt: Date.now(),
            payload: {
                operation: "deleted",
                entryId: existingEntry.id
            }
        }
    };
}

export {
    createMandatoryExpense,
    updateMandatoryExpense,
    removeMandatoryExpense
};
