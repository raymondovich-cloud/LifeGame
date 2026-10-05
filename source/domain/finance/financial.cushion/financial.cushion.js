// financial.cushion.js — Version 2.0

function createFinancialCushion(label, amount) {
    const normalizedLabel = String(label ?? "").trim();
    const normalizedAmount = Number(amount);

    if (!normalizedLabel) {
        throw new Error("Financial Cushion: название записи обязательно.");
    }

    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
        throw new Error("Financial Cushion: сумма должна быть больше нуля.");
    }

    return {
        entry: {
            label: normalizedLabel,
            amount: normalizedAmount
        },
        event: {
            type: "finance.financial.cushion.changed",
            occurredAt: Date.now(),
            payload: {
                operation: "created"
            }
        }
    };
}

function updateFinancialCushion(existingEntry, label, amount) {
    if (!existingEntry) return false;

    const result = createFinancialCushion(label, amount);

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

function removeFinancialCushion(existingEntry) {
    if (!existingEntry) return false;

    return {
        entry: { ...existingEntry },
        event: {
            type: "finance.financial.cushion.changed",
            occurredAt: Date.now(),
            payload: {
                operation: "deleted",
                entryId: existingEntry.id
            }
        }
    };
}

export {
    createFinancialCushion,
    updateFinancialCushion,
    removeFinancialCushion
};
