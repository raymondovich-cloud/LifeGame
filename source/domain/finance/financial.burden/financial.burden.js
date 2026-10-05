// financial.burden.js — Version 2.0

function createFinancialBurden(label, debt, payment) {
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

    return {
        entry: {
            label: normalizedLabel,
            amount: normalizedPayment,
            debt: normalizedDebt,
            payment: normalizedPayment
        },
        event: {
            type: "finance.financial.burden.changed",
            occurredAt: Date.now(),
            payload: {
                operation: "created"
            }
        }
    };
}

function updateFinancialBurden(existingEntry, label, debt, payment) {
    if (!existingEntry) return false;

    const result = createFinancialBurden(label, debt, payment);

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

function removeFinancialBurden(existingEntry) {
    if (!existingEntry) return false;

    return {
        entry: { ...existingEntry },
        event: {
            type: "finance.financial.burden.changed",
            occurredAt: Date.now(),
            payload: {
                operation: "deleted",
                entryId: existingEntry.id
            }
        }
    };
}

export {
    createFinancialBurden,
    updateFinancialBurden,
    removeFinancialBurden
};
