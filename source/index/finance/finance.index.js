// source/index/finance/finance.index.js — Version 3.0
//
// FSI 3.0 — Financial Stability Index.
// Weighted composite indicator of cash-flow capacity, liquidity resilience,
// emergency reserve, debt sustainability, net financial position and trend.
// Scientifically grounded, not empirically validated.

const FSI_LIMITS = Object.freeze({ minimum: 0, maximum: 100 });
const FSI_CATEGORIES = Object.freeze([
    { minimum: 0, maximum: 19, key: "critical", label: "Критический" },
    { minimum: 20, maximum: 39, key: "vulnerable", label: "Уязвимый" },
    { minimum: 40, maximum: 59, key: "unstable", label: "Нестабильный" },
    { minimum: 60, maximum: 74, key: "stable", label: "Стабильный" },
    { minimum: 75, maximum: 89, key: "strong", label: "Сильный" },
    { minimum: 90, maximum: 100, key: "resilient", label: "Устойчивый" }
]);
const FSI_WEIGHTS = Object.freeze({
    cashFlow: 0.25,
    liquidityResilience: 0.20,
    emergencyReserve: 0.15,
    debtSustainability: 0.20,
    netFinancialPosition: 0.10,
    financialTrend: 0.10
});

function amount(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : 0;
}
function sum(entries, field = "amount") {
    if (!Array.isArray(entries)) return 0;
    return entries.reduce((total, entry) => total + amount(entry?.[field]), 0);
}
function resolve(value, entries) {
    return value !== undefined ? amount(value) : sum(entries);
}
function clamp(value, min = 0, max = 1) {
    return Math.max(min, Math.min(max, value));
}
function round(value, digits = 2) {
    if (!Number.isFinite(value)) return null;
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}
function category(value) {
    return FSI_CATEGORIES.find((item) => value >= item.minimum && value <= item.maximum)
        || FSI_CATEGORIES[FSI_CATEGORIES.length - 1];
}
function cashFlowScore(coverage) {
    if (coverage <= 0) return 0;
    if (!Number.isFinite(coverage)) return 1;
    return clamp(Math.log1p(coverage) / Math.log1p(2.5));
}
function monthsScore(months) {
    if (!Number.isFinite(months)) return months > 0 ? 1 : 0;
    if (months <= 0) return 0;
    if (months < 1) return months * 0.25;
    if (months < 3) return 0.25 + ((months - 1) / 2) * 0.35;
    if (months < 6) return 0.60 + ((months - 3) / 3) * 0.30;
    if (months < 9) return 0.90 + ((months - 6) / 3) * 0.10;
    return 1;
}
function dsrScore(ratio) {
    if (!Number.isFinite(ratio)) return ratio === 0 ? 1 : 0;
    if (ratio <= 0.20) return 1;
    if (ratio <= 0.35) return 1 - ((ratio - 0.20) / 0.15) * 0.25;
    if (ratio <= 0.50) return 0.75 - ((ratio - 0.35) / 0.15) * 0.55;
    if (ratio <= 0.75) return 0.20 - ((ratio - 0.50) / 0.25) * 0.20;
    return 0;
}
function dtiScore(ratio) {
    if (!Number.isFinite(ratio)) return ratio === 0 ? 1 : 0;
    if (ratio <= 0) return 1;
    return clamp(1 / (1 + ratio / 6));
}
function netPositionScore(netWorth, outflow) {
    if (outflow <= 0) return netWorth > 0 ? 1 : 0.5;
    const ratio = netWorth / outflow;
    if (ratio < 0) return clamp(0.40 * Math.exp(ratio));
    return clamp(0.40 + 0.60 * (1 - Math.exp(-ratio / 6)));
}
function trend(values, direction = "positive") {
    const list = Array.isArray(values) ? values.map(amount) : [];
    if (list.length < 2) return 0.5;
    const mean = list.reduce((a, b) => a + b, 0) / list.length;
    if (mean <= 0) return 0.5;
    const change = (list[list.length - 1] - list[0]) / mean;
    return clamp(0.5 + 0.5 * Math.tanh((direction === "negative" ? -change : change) * 2.5));
}
function financialTrend(income, debt, liquidity, reserve) {
    return 0.30 * trend(income) +
        0.25 * trend(debt, "negative") +
        0.25 * trend(liquidity) +
        0.20 * trend(reserve);
}
function creditRisk(entries, income) {
    const products = Array.isArray(entries) ? entries.filter((e) => e?.isCreditProduct) : [];
    if (products.length === 0) {
        return { score: 1, products: 0, nonAmortizingProducts: 0, firstMonthInterest: 0 };
    }
    let weighted = 0;
    let debtTotal = 0;
    let interestTotal = 0;
    let nonAmortizing = 0;
    products.forEach((entry) => {
        const debt = amount(entry?.debt);
        const payment = amount(entry?.payment);
        const rate = amount(entry?.interestRate);
        const interest = debt * rate / 100 / 12;
        debtTotal += debt;
        interestTotal += interest;
        if (interest <= 0) {
            weighted += debt;
            return;
        }
        const coverage = payment / interest;
        if (payment <= interest) nonAmortizing += 1;
        weighted += debt * (coverage <= 1 ? 0 : clamp(1 - Math.exp(-(coverage - 1) / 2)));
    });
    const amortization = debtTotal > 0 ? weighted / debtTotal : 1;
    const payments = sum(entries, "payment");
    const service = dsrScore(income > 0 ? payments / income : (payments > 0 ? Infinity : 0));
    return {
        score: 0.70 * amortization + 0.30 * service,
        products: products.length,
        nonAmortizingProducts: nonAmortizing,
        firstMonthInterest: interestTotal
    };
}

function calculateFinancialStabilityIndex(financeState = {}) {
    const assets = Array.isArray(financeState.assets) ? financeState.assets : [];
    const liquid = Array.isArray(financeState.liquidAssets)
        ? financeState.liquidAssets
        : assets.filter((e) => e?.liquidity !== "illiquid");
    const illiquid = Array.isArray(financeState.illiquidAssets)
        ? financeState.illiquidAssets
        : assets.filter((e) => e?.liquidity === "illiquid");

    const liquidFunds = resolve(financeState.liquidFundsAmount, liquid);
    const illiquidFunds = resolve(financeState.illiquidFundsAmount, illiquid);
    const totalAssets = resolve(financeState.totalAssetsAmount, assets);
    const debt = financeState.debts !== undefined ? amount(financeState.debts) : sum(financeState.financialBurden, "debt");
    const income = resolve(financeState.income, financeState.actualEarnings);
    const expenses = resolve(financeState.expenses, financeState.mandatoryExpenses);
    const payments = financeState.payments !== undefined ? amount(financeState.payments) : sum(financeState.financialBurden, "payment");
    const reserve = Math.min(liquidFunds, resolve(financeState.cushion, financeState.financialCushion));
    const outflow = expenses + payments;
    const freeLiquid = Math.max(0, liquidFunds - reserve);

    const coverage = outflow > 0 ? income / outflow : (income > 0 ? Infinity : 0);
    const liquidityMonths = outflow > 0 ? freeLiquid / outflow : (freeLiquid > 0 ? Infinity : 0);
    const reserveMonths = outflow > 0 ? reserve / outflow : (reserve > 0 ? Infinity : 0);
    const dsr = income > 0 ? payments / income : (payments > 0 ? Infinity : 0);
    const dti = income > 0 ? debt / income : (debt > 0 ? Infinity : 0);
    const netWorth = totalAssets - debt;
    const credit = creditRisk(financeState.financialBurden, income);

    const components = {
        cashFlow: cashFlowScore(coverage),
        liquidityResilience: monthsScore(liquidityMonths),
        emergencyReserve: monthsScore(reserveMonths),
        debtSustainability: 0.45 * dsrScore(dsr) + 0.25 * dtiScore(dti) + 0.30 * credit.score,
        netFinancialPosition: netPositionScore(netWorth, outflow),
        financialTrend: financialTrend(
            financeState.incomeHistory,
            financeState.debtHistory,
            financeState.liquidityHistory,
            financeState.reserveHistory
        )
    };

    let value = 100 *
        components.cashFlow ** FSI_WEIGHTS.cashFlow *
        components.liquidityResilience ** FSI_WEIGHTS.liquidityResilience *
        components.emergencyReserve ** FSI_WEIGHTS.emergencyReserve *
        components.debtSustainability ** FSI_WEIGHTS.debtSustainability *
        components.netFinancialPosition ** FSI_WEIGHTS.netFinancialPosition *
        components.financialTrend ** FSI_WEIGHTS.financialTrend;

    const gates = [];
    if (outflow > 0 && income < outflow) {
        value = Math.min(value, 59);
        gates.push({ key: "cash_flow_deficit", maximumScore: 59 });
    }
    if (dsr > 0.50) {
        value = Math.min(value, 59);
        gates.push({ key: "high_debt_service", maximumScore: 59 });
    }
    if (credit.nonAmortizingProducts > 0) {
        value = Math.min(value, 39);
        gates.push({ key: "non_amortizing_credit", maximumScore: 39 });
    }
    if (income === 0 && outflow > 0) {
        value = Math.min(value, 19);
        gates.push({ key: "no_income_with_obligations", maximumScore: 19 });
    }

    const hasData = [assets, financeState.actualEarnings, financeState.financialBurden,
        financeState.mandatoryExpenses, financeState.financialCushion]
        .some((list) => Array.isArray(list) && list.length > 0);
    const finalValue = hasData ? round(clamp(value), 1) : 0;

    return {
        value: finalValue,
        scale: FSI_LIMITS.maximum,
        version: "3.0",
        category: category(finalValue),
        methodology: {
            aggregation: "weighted_geometric_mean",
            scientificallyGrounded: true,
            empiricallyValidated: false,
            weights: FSI_WEIGHTS
        },
        components: Object.fromEntries(
            Object.entries(components).map(([key, value]) => [key, round(value * 100, 1)])
        ),
        diagnostics: {
            totalAssets: round(totalAssets),
            liquidFunds: round(liquidFunds),
            illiquidFunds: round(illiquidFunds),
            emergencyReserve: round(reserve),
            freeLiquidFunds: round(freeLiquid),
            actualIncome: round(income),
            mandatoryExpenses: round(expenses),
            debtPayments: round(payments),
            mandatoryOutflow: round(outflow),
            totalDebt: round(debt),
            cashFlowCoverage: round(coverage),
            liquidityMonths: round(liquidityMonths),
            reserveMonths: round(reserveMonths),
            debtServiceRatio: round(dsr, 3),
            debtToIncome: round(dti),
            netWorth: round(netWorth),
            firstMonthCreditInterest: round(credit.firstMonthInterest),
            creditProducts: credit.products,
            nonAmortizingCreditProducts: credit.nonAmortizingProducts,
            gates
        },
        dataStatus: hasData ? "available" : "insufficient"
    };
}

export { calculateFinancialStabilityIndex };
