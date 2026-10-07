// source/application/finance/finance.diagnosis.js — Version 1.2

const COMPONENT_LABELS = Object.freeze({
    cashFlowSustainability: "денежного потока",
    operationalLiquidity: "ликвидных средств",
    emergencyResilience: "финансовой подушки",
    debtSustainability: "долговой устойчивости",
    solvencyPosition: "чистой финансовой позиции",
    productiveCapital: "продуктивного капитала",
    financialTrajectory: "финансового тренда"
});

const COMPONENT_WEAK_LABELS = Object.freeze({
    cashFlowSustainability: "денежный поток",
    operationalLiquidity: "ликвидные средства",
    emergencyResilience: "финансовая подушка",
    debtSustainability: "долговая устойчивость",
    solvencyPosition: "чистая финансовая позиция",
    productiveCapital: "продуктивный капитал",
    financialTrajectory: "финансовый тренд"
});

function percentageChange(current, previous) {
    if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
    return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
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

    const weakest = Object.entries(current.components || {})
        .filter(([key]) => Object.prototype.hasOwnProperty.call(COMPONENT_LABELS, key))
        .sort((a, b) => Number(a[1]) - Number(b[1]))[0];

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
        weakestFactor: weakest
            ? { key: weakest[0], label: COMPONENT_WEAK_LABELS[weakest[0]], value: Number(weakest[1]) }
            : null
    };
}

export { buildFinancialStabilityDiagnosis };
