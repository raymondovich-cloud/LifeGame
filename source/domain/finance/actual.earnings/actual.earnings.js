// actual.earnings.js — Version 2.0

function createActualEarning(label, amount) {
    const normalizedLabel = String(label ?? "").trim();
    const normalizedAmount = Number(amount);

    if (!normalizedLabel) {
        throw new Error("Actual Earnings: название записи обязательно.");
    }

    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
        throw new Error("Actual Earnings: сумма должна быть больше нуля.");
    }

    return {
        entry: {
            label: normalizedLabel,
            amount: normalizedAmount
        },
        event: {
            type: "finance.actual.earnings.changed",
            occurredAt: Date.now(),
            payload: {
                operation: "created"
            }
        }
    };
}

function updateActualEarning(existingEntry, label, amount) {
    if (!existingEntry) return false;

    const result = createActualEarning(label, amount);

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

function removeActualEarning(existingEntry) {
    if (!existingEntry) return false;

    return {
        entry: { ...existingEntry },
        event: {
            type: "finance.actual.earnings.changed",
            occurredAt: Date.now(),
            payload: {
                operation: "deleted",
                entryId: existingEntry.id
            }
        }
    };
}

export {
    createActualEarning,
    updateActualEarning,
    removeActualEarning
};
