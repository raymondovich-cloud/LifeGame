// source/index/finance/finance.index.js — Version 1.0

const INDEX_LIMITS = Object.freeze({
    minimum: 0,
    maximum: 100
});

function normalizeAmount(value) {
    const amount = Number(value);
    return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function sumEntries(entries) {
    if (!Array.isArray(entries)) return 0;
    return entries.reduce((total, entry) => total + normalizeAmount(entry?.amount), 0);
}

function calculateCoverageScore(available, required) {
    if (required <= 0) return available > 0 ? 100 : 0;
    return Math.min(100, (available / required) * 100);
}

function calculateBurdenScore(burden, income) {
    if (income <= 0) return burden <= 0 ? 100 : 0;
    return Math.max(0, Math.min(100, (1 - burden / income) * 100));
}

function calculateFinancialStabilityIndex(financeState = {}) {
    const liquidFunds = sumEntries(financeState.liquidFunds);
    const actualEarnings = sumEntries(financeState.actualEarnings);
    const financialBurden = sumEntries(financeState.financialBurden);
    const mandatoryExpenses = sumEntries(financeState.mandatoryExpenses);
    const financialCushion = sumEntries(financeState.financialCushion);

    const liquidityScore = calculateCoverageScore(liquidFunds, mandatoryExpenses);
    const burdenScore = calculateBurdenScore(financialBurden, actualEarnings);
    const cushionScore = calculateCoverageScore(financialCushion, mandatoryExpenses);

    const value = Math.round(
        liquidityScore * 0.4 +
        burdenScore * 0.3 +
        cushionScore * 0.3
    );

    return {
        value: Math.max(INDEX_LIMITS.minimum, Math.min(INDEX_LIMITS.maximum, value)),
        scale: INDEX_LIMITS.maximum,
        components: {
            liquidity: Math.round(liquidityScore),
            burden: Math.round(burdenScore),
            cushion: Math.round(cushionScore)
        }
    };
}

export { calculateFinancialStabilityIndex };
