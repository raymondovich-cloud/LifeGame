// source/index/finance/finance.index.js — Version 2.2
//
// FSI 2.1 — Financial Stability Index.
// This layer calculates derived financial stability only.
// Domain data remains raw; user state/history must come from Memory/application.
//
// Inputs:
// A = total assets
// L = liquid funds (only assets explicitly marked liquid)
// I = average monthly actual income
// E = essential mandatory monthly expenses
// D = mandatory monthly debt payments
// B = total outstanding debt
// R = emergency reserve (subset of L)
//
// O = E + D
//
// FSI 2.1 = Financial Strength × Stability Factor
//
// Financial Strength:
// FS = 0.35 Ls + 0.25 Is + 0.20 Rs + 0.10 Ds + 0.10 Bs
//
// Ls = 100 × (1 - e^(-LC / 2)), LC = L / O
// Is = 100 × (1 - e^(-IC / 0.75)), IC = I / O
// Rs = 100 × (1 - e^(-RC / 2)), RC = R / E
// Ds = 100 × e^(-DBR / 0.35), DBR = D / I
// Bs = 100 × e^(-DE / 12), DE = B / I
//
// Stability Factor:
// SF = Fi^0.20 × Fd^0.20 × Fl^0.20 × Fr^0.15 × Fis^0.15 × Ft^0.10
//
// Fi  = min(1, IC / 2)
// Fd  = e^(-DBR / 0.40)
// Fl  = 1 - e^(-LC / 2)
// Fr  = 1 - e^(-RC / 2)
// Fis = e^(-CV), CV = income standard deviation / income mean
// Ft  = 0.40 Ti + 0.30 Td + 0.30 Tr
//
// Income/debt/reserve histories use six monthly observations when supplied.
// Trend is normalized around 0.50: improving income/reserve raises it;
// increasing debt lowers it. With insufficient history, neutral 0.50 is used.
//
// Survival Months = L / O is returned as a diagnostic and is not part of FSI.
// Stress tests are also diagnostics and are not part of the current FSI score.

const FSI_LIMITS = Object.freeze({
    minimum: 0,
    maximum: 100
});

const FSI_CATEGORIES = Object.freeze([
    { minimum: 0, maximum: 19, key: "critical", label: "Критический" },
    { minimum: 20, maximum: 39, key: "fragile", label: "Хрупкий" },
    { minimum: 40, maximum: 59, key: "unstable", label: "Нестабильный" },
    { minimum: 60, maximum: 74, key: "stable", label: "Стабильный" },
    { minimum: 75, maximum: 89, key: "strong", label: "Сильный" },
    { minimum: 90, maximum: 100, key: "resilient", label: "Устойчивый" }
]);

function normalizeAmount(value) {
    const amount = Number(value);

    return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function sumEntries(entries) {
    if (!Array.isArray(entries)) return 0;

    return entries.reduce(
        (total, entry) => total + normalizeAmount(entry?.amount),
        0
    );
}

function sumEntryField(entries, field) {
    if (!Array.isArray(entries)) return 0;

    return entries.reduce(
        (total, entry) => total + normalizeAmount(entry?.[field]),
        0
    );
}

function resolveAmount(value, entries) {
    if (value !== undefined) return normalizeAmount(value);

    return sumEntries(entries);
}

function clamp(value, minimum = 0, maximum = 1) {
    return Math.max(minimum, Math.min(maximum, value));
}

function positiveAverage(values) {
    const normalized = Array.isArray(values)
        ? values.map(normalizeAmount).filter((value) => value > 0)
        : [];

    if (normalized.length === 0) return 0;

    return normalized.reduce((sum, value) => sum + value, 0) / normalized.length;
}

function getCategory(value) {
    return FSI_CATEGORIES.find(
        (category) => value >= category.minimum && value <= category.maximum
    ) || FSI_CATEGORIES[FSI_CATEGORIES.length - 1];
}

function coverageScore(coverage, divisor) {
    if (coverage <= 0) return 0;

    return 100 * (1 - Math.exp(-coverage / divisor));
}

function resolveCoverage(numerator, denominator, zeroDenominatorScore = 0) {
    if (denominator > 0) return numerator / denominator;

    return numerator > 0 ? Infinity : zeroDenominatorScore;
}

function calculateIncomeStability(incomeHistory) {
    const values = Array.isArray(incomeHistory)
        ? incomeHistory.map(normalizeAmount).filter((value) => value > 0)
        : [];

    if (values.length < 2) return 0.5;

    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;

    if (mean <= 0) return 0;

    const variance = values.reduce(
        (sum, value) => sum + ((value - mean) ** 2),
        0
    ) / values.length;

    const standardDeviation = Math.sqrt(variance);
    const coefficientOfVariation = standardDeviation / mean;

    return clamp(Math.exp(-coefficientOfVariation));
}

function normalizeTrend(values, direction = "positive") {
    const normalized = Array.isArray(values)
        ? values.map(normalizeAmount).filter((value) => value >= 0)
        : [];

    if (normalized.length < 2) return 0.5;

    const first = normalized[0];
    const last = normalized[normalized.length - 1];
    const mean = normalized.reduce((sum, value) => sum + value, 0) / normalized.length;

    if (mean <= 0) {
        return direction === "negative" ? 1 : 0.5;
    }

    const relativeChange = (last - first) / mean;
    const directionalChange = direction === "negative"
        ? -relativeChange
        : relativeChange;

    return clamp(0.5 + 0.5 * Math.tanh(directionalChange * 3));
}

function calculateFinancialTrend(
    incomeHistory,
    debtHistory,
    reserveHistory
) {
    const incomeTrend = normalizeTrend(incomeHistory, "positive");
    const debtTrend = normalizeTrend(debtHistory, "negative");
    const reserveTrend = normalizeTrend(reserveHistory, "positive");

    return (
        (0.40 * incomeTrend) +
        (0.30 * debtTrend) +
        (0.30 * reserveTrend)
    );
}

function calculateFinancialStabilityIndex(financeState = {}) {
    const assetEntries = Array.isArray(financeState.assets) ? financeState.assets : [];
    const liquidAssetEntries = Array.isArray(financeState.liquidAssets)
        ? financeState.liquidAssets
        : assetEntries.filter((entry) => entry?.liquidity !== "illiquid");
    const liquidFunds = resolveAmount(
        financeState.liquidFundsAmount,
        financeState.liquidFunds ?? liquidAssetEntries
    );

    const totalDebt = financeState.debts !== undefined
        ? normalizeAmount(financeState.debts)
        : sumEntryField(financeState.financialBurden, "debt");

    const incomeHistory = Array.isArray(financeState.incomeHistory)
        ? financeState.incomeHistory
        : [];

    const averageIncome = incomeHistory.length > 0
        ? positiveAverage(incomeHistory)
        : resolveAmount(financeState.income, financeState.actualEarnings);

    const debtPayments = financeState.payments !== undefined
        ? normalizeAmount(financeState.payments)
        : sumEntryField(financeState.financialBurden, "payment");

    const mandatoryExpenses = resolveAmount(
        financeState.expenses,
        financeState.mandatoryExpenses
    );

    const emergencyReserve = Math.min(
        liquidFunds,
        resolveAmount(financeState.cushion, financeState.financialCushion)
    );

    const totalMandatoryOutflow = mandatoryExpenses + debtPayments;

    const liquidityCoverage = resolveCoverage(
        liquidFunds,
        totalMandatoryOutflow
    );

    const incomeCoverage = resolveCoverage(
        averageIncome,
        totalMandatoryOutflow
    );

    const reserveCoverage = resolveCoverage(
        emergencyReserve,
        mandatoryExpenses
    );

    const debtBurdenRatio = averageIncome > 0
        ? debtPayments / averageIncome
        : (debtPayments > 0 ? Infinity : 0);

    const debtExposureRatio = averageIncome > 0
        ? totalDebt / averageIncome
        : (totalDebt > 0 ? Infinity : 0);

    const liquidityScore = coverageScore(liquidityCoverage, 2);
    const incomeScore = coverageScore(incomeCoverage, 0.75);
    const reserveScore = coverageScore(reserveCoverage, 2);

    const debtBurdenScore = Number.isFinite(debtBurdenRatio)
        ? 100 * Math.exp(-debtBurdenRatio / 0.35)
        : 0;

    const debtExposureScore = Number.isFinite(debtExposureRatio)
        ? 100 * Math.exp(-debtExposureRatio / 12)
        : 0;

    const financialStrength = (
        (0.35 * liquidityScore) +
        (0.25 * incomeScore) +
        (0.20 * reserveScore) +
        (0.10 * debtBurdenScore) +
        (0.10 * debtExposureScore)
    );

    const incomeCoverageFactor = Number.isFinite(incomeCoverage)
        ? Math.min(1, incomeCoverage / 2)
        : (averageIncome > 0 ? 1 : 0);

    const debtStabilityFactor = Number.isFinite(debtBurdenRatio)
        ? Math.exp(-debtBurdenRatio / 0.40)
        : 0;

    const liquidityProtectionFactor = Number.isFinite(liquidityCoverage)
        ? 1 - Math.exp(-liquidityCoverage / 2)
        : (liquidFunds > 0 ? 1 : 0);

    const reserveProtectionFactor = Number.isFinite(reserveCoverage)
        ? 1 - Math.exp(-reserveCoverage / 2)
        : (emergencyReserve > 0 ? 1 : 0);

    const incomeStabilityFactor = calculateIncomeStability(incomeHistory);

    const financialTrendFactor = calculateFinancialTrend(
        incomeHistory,
        financeState.debtHistory,
        financeState.reserveHistory
    );

    const stabilityFactor =
        (incomeCoverageFactor ** 0.20) *
        (debtStabilityFactor ** 0.20) *
        (liquidityProtectionFactor ** 0.20) *
        (reserveProtectionFactor ** 0.15) *
        (incomeStabilityFactor ** 0.15) *
        (financialTrendFactor ** 0.10);

    const value = clamp(
        financialStrength * stabilityFactor,
        FSI_LIMITS.minimum,
        FSI_LIMITS.maximum
    );

    const roundedValue = Math.round(value * 10) / 10;

    return {
        value: roundedValue,
        scale: FSI_LIMITS.maximum,
        version: "2.1",
        category: getCategory(roundedValue),
        components: {
            financialStrength: Math.round(financialStrength * 10) / 10,
            stabilityFactor: Math.round(stabilityFactor * 1000) / 1000,
            liquidityScore: Math.round(liquidityScore * 10) / 10,
            incomeScore: Math.round(incomeScore * 10) / 10,
            reserveScore: Math.round(reserveScore * 10) / 10,
            debtBurdenScore: Math.round(debtBurdenScore * 10) / 10,
            debtExposureScore: Math.round(debtExposureScore * 10) / 10,
            incomeStabilityFactor: Math.round(incomeStabilityFactor * 1000) / 1000,
            financialTrendFactor: Math.round(financialTrendFactor * 1000) / 1000
        },
        diagnostics: {
            survivalMonths: Number.isFinite(liquidityCoverage)
                ? Math.round(liquidityCoverage * 100) / 100
                : null,
            incomeCoverage: Number.isFinite(incomeCoverage)
                ? Math.round(incomeCoverage * 100) / 100
                : null,
            debtBurdenRatio: Number.isFinite(debtBurdenRatio)
                ? Math.round(debtBurdenRatio * 1000) / 1000
                : null,
            debtExposureRatio: Number.isFinite(debtExposureRatio)
                ? Math.round(debtExposureRatio * 100) / 100
                : null
        }
    };
}

export {
    calculateFinancialStabilityIndex
};
