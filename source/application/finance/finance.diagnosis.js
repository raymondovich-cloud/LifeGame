// source/application/finance/finance.diagnosis.js — Version 1.4

const COMPONENT_LABELS = Object.freeze({
    cashFlowSustainability: "денежного потока",
    operationalLiquidity: "ликвидных средств",
    emergencyResilience: "финансового резерва",
    debtSustainability: "долговой устойчивости",
    solvencyPosition: "чистой финансовой позиции",
    productiveCapital: "продуктивного капитала",
    financialTrajectory: "финансового тренда"
});

const COMPONENT_WEAK_LABELS = Object.freeze({
    cashFlowSustainability: "денежный поток",
    operationalLiquidity: "ликвидные средства",
    emergencyResilience: "финансовый резерв",
    debtSustainability: "долговая устойчивость",
    solvencyPosition: "чистая финансовая позиция",
    productiveCapital: "продуктивный капитал",
    financialTrajectory: "финансовый тренд"
});

function percentageChange(current, previous) {
    if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
    return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

function buildFactorReason(key, result) {
    const diagnostics = result?.diagnostics || {};

    if (key === "cashFlowSustainability") {
        const income = Number(diagnostics.actualIncome || 0);
        const outflow = Number(diagnostics.mandatoryOutflow || 0);

        if (outflow > 0 && income < outflow) {
            return "денежного потока недостаточно для покрытия обязательных расходов и платежей";
        }

        if (outflow > 0 && income > 0) {
            return "денежный поток покрывает обязательные расходы, но запас покрытия пока ограничен";
        }

        return "текущий денежный поток пока недостаточно поддерживает финансовую устойчивость";
    }

    if (key === "operationalLiquidity") {
        const months = Number(diagnostics.operationalLiquidityMonths);

        if (Number.isFinite(months) && months < 1) {
            return "ликвидных средств недостаточно даже для покрытия одного месяца обязательных расходов";
        }

        if (Number.isFinite(months) && months < 3) {
            return "ликвидных средств хватит менее чем на три месяца обязательных расходов";
        }

        return "объём ликвидных средств пока остаётся ограничивающим фактором";
    }

    if (key === "emergencyResilience") {
        const months = Number(diagnostics.reserveMonths);

        if (Number.isFinite(months) && months < 1) {
            return "финансового резерва недостаточно даже для покрытия одного месяца обязательных расходов";
        }

        if (Number.isFinite(months) && months < 3) {
            return "финансовый резерв покрывает менее трёх месяцев обязательных расходов";
        }

        return "финансовый резерв пока не обеспечивает достаточного запаса прочности";
    }

    if (key === "debtSustainability") {
        const dsr = Number(diagnostics.debtServiceRatio);
        const debtToIncome = Number(diagnostics.debtToIncome);

        if (diagnostics.nonAmortizingCreditProducts > 0) {
            return "часть кредитных обязательств не имеет устойчивого графика погашения";
        }

        if (Number.isFinite(dsr) && dsr > 0.5) {
            return "долговые платежи занимают более половины текущего дохода";
        }

        if (Number.isFinite(debtToIncome) && debtToIncome > 6) {
            return "объём долга существенно превышает месячный доход";
        }

        return "долговая нагрузка пока заметно ограничивает финансовую устойчивость";
    }

    if (key === "solvencyPosition") {
        const netWorth = Number(diagnostics.netWorth);

        if (Number.isFinite(netWorth) && netWorth < 0) {
            return "общая стоимость обязательств превышает стоимость активов";
        }

        return "чистая финансовая позиция пока не создаёт достаточного запаса прочности";
    }

    if (key === "productiveCapital") {
        const principal = Number(diagnostics.productiveCapital || 0);

        if (principal <= 0) {
            return "капитал пока не формирует наблюдаемый доход от активов";
        }

        return "доходность продуктивного капитала пока недостаточно влияет на устойчивость системы";
    }

    const observations = Number(diagnostics.trajectory?.observations || 0);

    if (observations < 3) {
        return "истории пока недостаточно, чтобы уверенно оценить финансовый тренд";
    }

    return "финансовый тренд пока не поддерживает устойчивое улучшение системы";
}

function buildFinancialStabilityDiagnosis(current, previous = null) {
    if (!current) return null;

    const changePercent = previous
        ? percentageChange(Number(current.value), Number(previous.value))
        : null;

    const weights = current?.methodology?.weights || {};

    const changes = Object.entries(current.components || {})
        .filter(([key]) => Object.prototype.hasOwnProperty.call(COMPONENT_LABELS, key))
        .map(([key, value]) => {
            const previousValue = previous?.components?.[key];
            const delta = Number.isFinite(Number(previousValue))
                ? Number(value) - Number(previousValue)
                : null;
            const weight = Number(weights[key]) || 0;
            return {
                key,
                label: COMPONENT_LABELS[key],
                value: Number(value),
                previous: previousValue ?? null,
                delta,
                weightedDelta: delta === null ? null : delta * weight
            };
        })
        .filter((item) => item.delta !== null)
        .sort((a, b) => Math.abs(b.weightedDelta) - Math.abs(a.weightedDelta));

    const positive = changes.filter((item) => item.weightedDelta > 0.5);
    const negative = changes.filter((item) => item.weightedDelta < -0.5);

    const factors = Object.entries(current.components || {})
        .filter(([key]) => Object.prototype.hasOwnProperty.call(COMPONENT_LABELS, key))
        .map(([key, value]) => {
            const numericValue = Number(value);
            const weight = Number(weights[key]) || 0;
            return {
                key,
                label: COMPONENT_WEAK_LABELS[key],
                value: numericValue,
                weight,
                weightedDeficit: (100 - numericValue) * weight,
                reason: buildFactorReason(key, current)
            };
        })
        .sort((a, b) => b.weightedDeficit - a.weightedDeficit);

    const limitingFactor = factors[0] || null;

    let trend = "stable";
    if (changePercent !== null) {
        if (changePercent >= 5) trend = "strongly_improving";
        else if (changePercent >= 1) trend = "improving";
        else if (changePercent <= -5) trend = "strongly_declining";
        else if (changePercent <= -1) trend = "declining";
    }

    return {
        hasComparison: Boolean(previous),
        current: Number(current.value),
        previous: previous ? Number(previous.value) : null,
        change: previous ? Number(current.value) - Number(previous.value) : 0,
        changePercent,
        trend,
        primaryPositiveFactor: positive[0] || null,
        secondaryPositiveFactor: positive[1] || null,
        primaryNegativeFactor: negative[0] || null,
        secondaryNegativeFactor: negative[1] || null,
        weakestFactor: limitingFactor,
        limitingFactor
    };
}

export { buildFinancialStabilityDiagnosis };
