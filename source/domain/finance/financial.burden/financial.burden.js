// financial.burden.js — Version 2.2

function createFinancialBurden(label, debt, payment = null, isCreditProduct = false, interestRate = null) {
    const normalizedLabel = String(label ?? "").trim();
    const normalizedDebt = Number(debt);
    const normalizedIsCreditProduct = Boolean(isCreditProduct);
    const normalizedPayment = normalizedIsCreditProduct && payment !== null && payment !== ""
        ? Number(payment)
        : null;
    const normalizedInterestRate = normalizedIsCreditProduct && interestRate !== null && interestRate !== ""
        ? Number(interestRate)
        : null;

    if (!normalizedLabel) {
        throw new Error("Financial Burden: название записи обязательно.");
    }

    if (!Number.isFinite(normalizedDebt) || normalizedDebt <= 0) {
        throw new Error("Financial Burden: сумма долга должна быть больше нуля.");
    }

    if (normalizedIsCreditProduct) {
        if (!Number.isFinite(normalizedPayment) || normalizedPayment < 0) {
            throw new Error("Financial Burden: регулярный платеж не может быть отрицательным.");
        }

        if (!Number.isFinite(normalizedInterestRate) || normalizedInterestRate < 0) {
            throw new Error("Financial Burden: процентная ставка не может быть отрицательной.");
        }
    }

    return {
        entry: {
            label: normalizedLabel,
            amount: normalizedPayment ?? 0,
            debt: normalizedDebt,
            payment: normalizedPayment,
            isCreditProduct: normalizedIsCreditProduct,
            interestRate: normalizedInterestRate
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

function updateFinancialBurden(existingEntry, label, debt, payment, isCreditProduct = true, interestRate = null) {
    if (!existingEntry) return false;

    const result = createFinancialBurden(label, debt, payment, isCreditProduct, interestRate);

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
