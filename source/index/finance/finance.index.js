// source/index/finance/finance.index.js — Version 2.1

const INDEX_LIMITS = Object.freeze({
    minimum: 0,
    maximum: 1000,
    componentMaximum: 200
});

function normalizeAmount(value) {
    const amount = Number(value);
    return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function sumEntries(entries) {
    if (!Array.isArray(entries)) return 0;
    return entries.reduce((total, entry) => total + normalizeAmount(entry?.amount), 0);
}

function resolveAmount(value, entries) {
    if (value !== undefined) return normalizeAmount(value);
    return sumEntries(entries);
}

function clampScore(value) {
    return Math.max(0, Math.min(INDEX_LIMITS.componentMaximum, value));
}

function calculateAssetBalanceScore(assets, debts) {
    return assets - debts > 0 ? 200 : 0;
}

function calculateActualEarningsScore(income, expenses) {
    if (expenses <= 0) return income > 0 ? 200 : 0;

    return clampScore(((income / expenses) - 1) * 200);
}

function calculateFinancialBurdenScore(payments, income) {
    if (income <= 0) return 0;

    return clampScore((1 - payments / income) * 200);
}

function calculateSpendingControlScore(expenses, income) {
    if (income <= 0) return 0;

    return clampScore((1 - expenses / income) * 200 * 2);
}

function calculateFinancialCushionScore(cushion, expenses) {
    if (expenses <= 0) return cushion > 0 ? 200 : 0;

    return Math.min(200, Math.max(0, ((cushion / expenses) / 6) * 200));
}

function calculateFinancialStabilityIndex(financeState = {}) {
    const assets = resolveAmount(financeState.assets, financeState.liquidFunds);
    const debts = resolveAmount(financeState.debts, financeState.debtsEntries);
    const income = resolveAmount(financeState.income, financeState.actualEarnings);
    const payments = resolveAmount(financeState.payments, financeState.financialBurden);
    const expenses = resolveAmount(financeState.expenses, financeState.mandatoryExpenses);
    const cushion = resolveAmount(financeState.cushion, financeState.financialCushion);

    const p1 = calculateAssetBalanceScore(assets, debts);
    const p2 = calculateActualEarningsScore(income, expenses);
    const p3 = calculateFinancialBurdenScore(payments, income);
    const p4 = calculateSpendingControlScore(expenses, income);
    const p5 = calculateFinancialCushionScore(cushion, expenses);

    const value = p1 + p2 + p3 + p4 + p5;

    return {
        value: Math.max(INDEX_LIMITS.minimum, Math.min(INDEX_LIMITS.maximum, Math.round(value))),
        scale: INDEX_LIMITS.maximum,
        components: {
            p1,
            p2,
            p3,
            p4,
            p5
        }
    };
}

export {
    calculateFinancialStabilityIndex
};
