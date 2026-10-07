// source/index/finance/finance.index.js — Version 4.2

// FSI 4.1 — Financial Stability Index.
// Theory-driven composite model of cash-flow sustainability, operational liquidity,
// emergency resilience, debt sustainability, solvency, productive capital and trajectory.
// Scientifically grounded, not empirically calibrated.

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
    cashFlowSustainability: 0.25,
    operationalLiquidity: 0.15,
    emergencyResilience: 0.15,
    debtSustainability: 0.20,
    solvencyPosition: 0.10,
    productiveCapital: 0.05,
    financialTrajectory: 0.10
});

function amount(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : 0;
}

function sum(entries, field = "amount") {
    if (!Array.isArray(entries)) return 0;

    return entries.reduce(
        (total, entry) => total + amount(entry?.[field]),
        0
    );
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
    return FSI_CATEGORIES.find(
        (item) => value >= item.minimum && value <= item.maximum
    ) || FSI_CATEGORIES[FSI_CATEGORIES.length - 1];
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

function coverageScore(coverage) {
    if (coverage <= 0) return 0;
    if (!Number.isFinite(coverage)) return 1;

    // Diminishing marginal benefit: moving from deficit to coverage matters
    // more than increasing an already strong surplus.
    return clamp(1 - Math.exp(-coverage / 1.5));
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
    if (outflow <= 0) {
        if (netWorth > 0) return 1;
        if (netWorth === 0) return 0.5;
        return 0;
    }

    const ratio = netWorth / outflow;

    if (ratio < 0) {
        return clamp(0.40 * Math.exp(ratio));
    }

    return clamp(0.40 + 0.60 * (1 - Math.exp(-ratio / 6)));
}

function linearRegressionSlope(values) {
    const list = Array.isArray(values)
        ? values.map(Number).filter(Number.isFinite)
        : [];

    if (list.length < 3) return null;

    const n = list.length;
    const meanX = (n - 1) / 2;
    const meanY = list.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let index = 0; index < n; index += 1) {
        const dx = index - meanX;
        numerator += dx * (list[index] - meanY);
        denominator += dx * dx;
    }

    return denominator > 0 ? numerator / denominator : null;
}

function trajectoryScore(values, direction = "positive") {
    const list = Array.isArray(values)
        ? values.map(amount)
        : [];

    if (list.length < 3) {
        return {
            score: 0.5,
            slope: null,
            observations: list.length,
            sufficientHistory: false
        };
    }

    const mean = list.reduce((a, b) => a + b, 0) / list.length;

    if (mean <= 0) {
        return {
            score: 0.5,
            slope: null,
            observations: list.length,
            sufficientHistory: false
        };
    }

    const slope = linearRegressionSlope(list);

    if (!Number.isFinite(slope)) {
        return {
            score: 0.5,
            slope: null,
            observations: list.length,
            sufficientHistory: false
        };
    }

    const normalizedSlope = slope / mean;
    const signedSlope = direction === "negative"
        ? -normalizedSlope
        : normalizedSlope;

    return {
        score: clamp(0.5 + 0.5 * Math.tanh(signedSlope * 8)),
        slope,
        normalizedSlope,
        observations: list.length,
        sufficientHistory: true
    };
}

function financialTrajectory(income, debt, liquidity, reserve) {
    const incomeTrend = trajectoryScore(income);
    const debtTrend = trajectoryScore(debt, "negative");
    const liquidityTrend = trajectoryScore(liquidity);
    const reserveTrend = trajectoryScore(reserve);

    return {
        score:
            0.30 * incomeTrend.score +
            0.25 * debtTrend.score +
            0.25 * liquidityTrend.score +
            0.20 * reserveTrend.score,
        income: incomeTrend,
        debt: debtTrend,
        liquidity: liquidityTrend,
        reserve: reserveTrend
    };
}

function creditProductAnalysis(entries, income) {
    const products = Array.isArray(entries)
        ? entries.filter((entry) => entry?.isCreditProduct)
        : [];

    if (products.length === 0) {
        return {
            score: 1,
            products: 0,
            nonAmortizingProducts: 0,
            debtTotal: 0,
            paymentTotal: 0,
            firstMonthInterest: 0,
            payoffPossible: true,
            totalInterest: 0,
            monthsToPayoff: 0
        };
    }

    let debtTotal = 0;
    let paymentTotal = 0;
    let firstMonthInterest = 0;
    let weightedAmortization = 0;
    let nonAmortizingProducts = 0;
    let allPayoffPossible = true;
    let totalInterest = 0;
    let maximumPayoffMonths = 0;

    products.forEach((entry) => {
        const debt = amount(entry?.debt);
        const payment = amount(entry?.payment);
        const annualRate = amount(entry?.interestRate);

        debtTotal += debt;
        paymentTotal += payment;

        const monthlyRate = annualRate / 100 / 12;
        const firstInterest = debt * monthlyRate;
        firstMonthInterest += firstInterest;

        if (debt <= 0 || payment <= 0) {
            nonAmortizingProducts += 1;
            allPayoffPossible = false;
            return;
        }

        if (payment <= firstInterest && firstInterest > 0) {
            nonAmortizingProducts += 1;
            allPayoffPossible = false;
            return;
        }

        let balance = debt;
        let productInterest = 0;
        let months = 0;

        while (balance > 0 && months < 1200) {
            const interest = balance * monthlyRate;
            const actualPayment = Math.min(payment, balance + interest);

            balance = Math.max(0, balance + interest - actualPayment);
            productInterest += interest;
            months += 1;

            if (actualPayment <= interest && balance > 0) {
                allPayoffPossible = false;
                break;
            }
        }

        const payoffPossible = balance <= 0;

        if (!payoffPossible) {
            allPayoffPossible = false;
        }

        if (payoffPossible) {
            totalInterest += productInterest;
            maximumPayoffMonths = Math.max(maximumPayoffMonths, months);
        }

        const principalRatio = firstInterest > 0
            ? clamp((payment - firstInterest) / payment)
            : 1;

        weightedAmortization += debt * (
            principalRatio > 0
                ? 1 - Math.exp(-principalRatio * 3)
                : 0
        );
    });

    const amortizationScore = debtTotal > 0
        ? weightedAmortization / debtTotal
        : 1;

    const dsr = income > 0
        ? paymentTotal / income
        : (paymentTotal > 0 ? Infinity : 0);

    return {
        score: 0.70 * amortizationScore + 0.30 * dsrScore(dsr),
        products: products.length,
        nonAmortizingProducts,
        debtTotal,
        paymentTotal,
        firstMonthInterest,
        payoffPossible: allPayoffPossible,
        totalInterest,
        monthsToPayoff: maximumPayoffMonths
    };
}

function productiveCapitalScore(assets) {
    const entries = Array.isArray(assets) ? assets : [];

    let productivePrincipal = 0;
    let projectedAnnualIncome = 0;

    entries.forEach((entry) => {
        if (!entry?.incomeEnabled) return;

        const principal = amount(entry?.amount);
        const annualRate = Number(entry?.annualYieldRate);

        if (
            principal <= 0 ||
            !Number.isFinite(annualRate) ||
            annualRate < 0
        ) {
            return;
        }

        productivePrincipal += principal;

        const rate = annualRate / 100;
        const frequency = entry?.compoundingFrequency;

        if (frequency === "monthly") {
            projectedAnnualIncome += principal * (Math.pow(1 + rate / 12, 12) - 1);
        } else if (frequency === "quarterly") {
            projectedAnnualIncome += principal * (Math.pow(1 + rate / 4, 4) - 1);
        } else {
            projectedAnnualIncome += principal * rate;
        }
    });

    if (productivePrincipal <= 0) {
        return {
            score: 0.5,
            productivePrincipal: 0,
            projectedAnnualIncome: 0,
            projectedAnnualYield: 0
        };
    }

    const projectedYield = projectedAnnualIncome / productivePrincipal;

    // Potential income is deliberately not added to actual cash flow.
    // The component has only 5% weight because risk and realized yield
    // are not yet observable in the Finance data model.
    return {
        score: clamp(0.5 + 0.5 * (1 - Math.exp(-Math.max(0, projectedYield) / 0.10))),
        productivePrincipal,
        projectedAnnualIncome,
        projectedAnnualYield: projectedYield
    };
}

function dataConfidence({
    income,
    assets,
    financialBurden,
    mandatoryExpenses,
    history
}) {
    const populatedSources = [
        assets.length > 0,
        income.length > 0,
        financialBurden.length > 0,
        mandatoryExpenses.length > 0
    ].filter(Boolean).length;

    const observations = [
        history.income.length,
        history.debt.length,
        history.liquidity.length,
        history.reserve.length
    ];

    const maxObservations = Math.max(...observations, 0);

    if (populatedSources === 0) {
        return {
            score: 0,
            level: "insufficient",
            populatedSources,
            historyObservations: maxObservations
        };
    }

    const sourceScore = populatedSources / 4;
    const historyScore = clamp(maxObservations / 12);
    const score = 0.60 * sourceScore + 0.40 * historyScore;

    return {
        score,
        level: score >= 0.75
            ? "high"
            : score >= 0.45
                ? "medium"
                : "low",
        populatedSources,
        historyObservations: maxObservations
    };
}

function calculateFinancialStabilityIndex(financeState = {}) {
    const assets = Array.isArray(financeState.assets)
        ? financeState.assets
        : [];

    const liquid = Array.isArray(financeState.liquidAssets)
        ? financeState.liquidAssets
        : assets.filter((entry) => entry?.liquidity !== "illiquid");

    const illiquid = Array.isArray(financeState.illiquidAssets)
        ? financeState.illiquidAssets
        : assets.filter((entry) => entry?.liquidity === "illiquid");

    const liquidFunds = resolve(financeState.liquidFundsAmount, liquid);
    const illiquidFunds = resolve(financeState.illiquidFundsAmount, illiquid);
    const totalAssets = resolve(financeState.totalAssetsAmount, assets);

    const debt = financeState.debts !== undefined
        ? amount(financeState.debts)
        : sum(financeState.financialBurden, "debt");

    const income = resolve(financeState.income, financeState.actualEarnings);
    const expenses = resolve(financeState.expenses, financeState.mandatoryExpenses);

    const payments = financeState.payments !== undefined
        ? amount(financeState.payments)
        : sum(financeState.financialBurden, "payment");

    const reserve = Math.min(
        liquidFunds,
        resolve(financeState.cushion, financeState.financialCushion)
    );

    const operationalLiquidFunds = liquidFunds;
    const mandatoryOutflow = expenses + payments;

    const cashFlowCoverage = mandatoryOutflow > 0
        ? income / mandatoryOutflow
        : (income > 0 ? Infinity : 0);

    const operationalLiquidityMonths = mandatoryOutflow > 0
        ? operationalLiquidFunds / mandatoryOutflow
        : (operationalLiquidFunds > 0 ? Infinity : 0);

    const reserveMonths = mandatoryOutflow > 0
        ? reserve / mandatoryOutflow
        : (reserve > 0 ? Infinity : 0);

    const dsr = income > 0
        ? payments / income
        : (payments > 0 ? Infinity : 0);

    const debtToMonthlyIncome = income > 0
        ? debt / income
        : (debt > 0 ? Infinity : 0);

    const netWorth = totalAssets - debt;

    const credit = creditProductAnalysis(
        financeState.financialBurden,
        income
    );

    const trajectory = financialTrajectory(
        financeState.incomeHistory,
        financeState.debtHistory,
        financeState.liquidityHistory,
        financeState.reserveHistory
    );

    const productiveCapital = productiveCapitalScore(assets);

    const components = {
        cashFlowSustainability: coverageScore(cashFlowCoverage),
        operationalLiquidity: monthsScore(operationalLiquidityMonths),
        emergencyResilience: monthsScore(reserveMonths),
        debtSustainability:
            0.45 * dsrScore(dsr) +
            0.25 * dtiScore(debtToMonthlyIncome) +
            0.30 * credit.score,
        solvencyPosition: netPositionScore(netWorth, mandatoryOutflow),
        productiveCapital: productiveCapital.score,
        financialTrajectory: trajectory.score
    };

    // Weighted arithmetic aggregation is used because the component scores
    // are bounded index scores, not ratio-scale measurements. It preserves
    // non-compensatory weighting without allowing a zero component to collapse
    // the entire index to zero.
    const value = 100 * (
        components.cashFlowSustainability * FSI_WEIGHTS.cashFlowSustainability +
        components.operationalLiquidity * FSI_WEIGHTS.operationalLiquidity +
        components.emergencyResilience * FSI_WEIGHTS.emergencyResilience +
        components.debtSustainability * FSI_WEIGHTS.debtSustainability +
        components.solvencyPosition * FSI_WEIGHTS.solvencyPosition +
        components.productiveCapital * FSI_WEIGHTS.productiveCapital +
        components.financialTrajectory * FSI_WEIGHTS.financialTrajectory
    );

    const riskFlags = [];

    if (mandatoryOutflow > 0 && income < mandatoryOutflow) {
        riskFlags.push({ key: "cash_flow_deficit", severity: "critical" });
    }

    if (dsr > 0.50) {
        riskFlags.push({ key: "high_debt_service", severity: "high" });
    }

    if (credit.nonAmortizingProducts > 0) {
        riskFlags.push({ key: "non_amortizing_credit", severity: "critical" });
    }

    if (income === 0 && mandatoryOutflow > 0) {
        riskFlags.push({ key: "no_income_with_obligations", severity: "critical" });
    }

    if (netWorth < 0) {
        riskFlags.push({ key: "negative_net_position", severity: "high" });
    }

    const history = {
        income: Array.isArray(financeState.incomeHistory)
            ? financeState.incomeHistory
            : [],
        debt: Array.isArray(financeState.debtHistory)
            ? financeState.debtHistory
            : [],
        liquidity: Array.isArray(financeState.liquidityHistory)
            ? financeState.liquidityHistory
            : [],
        reserve: Array.isArray(financeState.reserveHistory)
            ? financeState.reserveHistory
            : [],
    };

    const confidence = dataConfidence({
        income: Array.isArray(financeState.actualEarnings)
            ? financeState.actualEarnings
            : [],
        assets,
        financialBurden: Array.isArray(financeState.financialBurden)
            ? financeState.financialBurden
            : [],
        mandatoryExpenses: Array.isArray(financeState.mandatoryExpenses)
            ? financeState.mandatoryExpenses
            : [],
        history
    });

    const hasData =
        assets.length > 0 ||
        (Array.isArray(financeState.actualEarnings) && financeState.actualEarnings.length > 0) ||
        (Array.isArray(financeState.financialBurden) && financeState.financialBurden.length > 0) ||
        (Array.isArray(financeState.mandatoryExpenses) && financeState.mandatoryExpenses.length > 0);

    const finalValue = hasData
        ? round(clamp(value, FSI_LIMITS.minimum, FSI_LIMITS.maximum), 1)
        : 0;

    return {
        value: finalValue,
        scale: FSI_LIMITS.maximum,
        version: "4.1",
        category: category(finalValue),

        methodology: {
            aggregation: "weighted_arithmetic_mean",
            componentFloor: 0,
            scientificallyGrounded: true,
            empiricallyValidated: false,
            weights: FSI_WEIGHTS
        },

        components: {
            cashFlowSustainability: round(components.cashFlowSustainability * 100, 1),
            operationalLiquidity: round(components.operationalLiquidity * 100, 1),
            emergencyResilience: round(components.emergencyResilience * 100, 1),
            debtSustainability: round(components.debtSustainability * 100, 1),
            solvencyPosition: round(components.solvencyPosition * 100, 1),
            productiveCapital: round(components.productiveCapital * 100, 1),
            financialTrajectory: round(components.financialTrajectory * 100, 1),

            // Compatibility aliases for the current presentation layer.
            cashFlow: round(components.cashFlowSustainability * 100, 1),
            liquidityResilience: round(components.operationalLiquidity * 100, 1),
            emergencyReserve: round(components.emergencyResilience * 100, 1),
            netFinancialPosition: round(components.solvencyPosition * 100, 1),
            financialTrend: round(components.financialTrajectory * 100, 1)
        },

        diagnostics: {
            totalAssets: round(totalAssets),
            liquidFunds: round(liquidFunds),
            illiquidFunds: round(illiquidFunds),
            emergencyReserve: round(reserve),
            operationalLiquidFunds: round(operationalLiquidFunds),

            actualIncome: round(income),
            mandatoryExpenses: round(expenses),
            debtPayments: round(payments),
            mandatoryOutflow: round(mandatoryOutflow),

            totalDebt: round(debt),
            cashFlowCoverage: round(cashFlowCoverage),
            operationalLiquidityMonths: round(operationalLiquidityMonths),
            reserveMonths: round(reserveMonths),

            debtServiceRatio: round(dsr, 3),
            debtToIncome: round(debtToMonthlyIncome),
            netWorth: round(netWorth),

            productiveCapital: round(productiveCapital.productivePrincipal),
            projectedAnnualProductiveIncome: round(productiveCapital.projectedAnnualIncome),
            projectedAnnualProductiveYield: round(productiveCapital.projectedAnnualYield * 100, 3),

            firstMonthCreditInterest: round(credit.firstMonthInterest),
            creditProducts: credit.products,
            nonAmortizingCreditProducts: credit.nonAmortizingProducts,
            creditPayoffPossible: credit.payoffPossible,
            creditTotalInterest: round(credit.totalInterest),
            creditMonthsToPayoff: credit.monthsToPayoff,

            trajectory: {
                incomeSlope: round(trajectory.income.slope, 4),
                debtSlope: round(trajectory.debt.slope, 4),
                liquiditySlope: round(trajectory.liquidity.slope, 4),
                reserveSlope: round(trajectory.reserve.slope, 4),
                observations: Math.max(
                    trajectory.income.observations,
                    trajectory.debt.observations,
                    trajectory.liquidity.observations,
                    trajectory.reserve.observations
                )
            },

            riskFlags,
            gates: []
        },

        dataStatus: hasData ? "available" : "insufficient",

        dataConfidence: {
            score: round(confidence.score * 100, 1),
            level: confidence.level,
            populatedSources: confidence.populatedSources,
            historyObservations: confidence.historyObservations
        }
    };
}

export { calculateFinancialStabilityIndex };
