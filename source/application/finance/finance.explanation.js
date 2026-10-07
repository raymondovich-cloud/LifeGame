// source/application/finance/finance.explanation.js — Version 1.0

const FACTOR_META = Object.freeze({
    cashFlowSustainability: {
        title: "Денежный поток",
        priority: 1
    },
    operationalLiquidity: {
        title: "Ликвидность",
        priority: 2
    },
    emergencyResilience: {
        title: "Финансовая подушка",
        priority: 3
    },
    debtSustainability: {
        title: "Долговая устойчивость",
        priority: 4
    },
    solvencyPosition: {
        title: "Чистая финансовая позиция",
        priority: 5
    },
    productiveCapital: {
        title: "Продуктивный капитал",
        priority: 6
    },
    financialTrajectory: {
        title: "Финансовый тренд",
        priority: 7
    }
});

function scoreLevel(score) {
    const value = Number(score);
    if (!Number.isFinite(value)) return "unknown";
    if (value < 20) return "critical";
    if (value < 40) return "weak";
    if (value < 60) return "moderate";
    if (value < 75) return "stable";
    if (value < 90) return "strong";
    return "excellent";
}

function factorExplanation(factor, result) {
    const diagnostics = result?.diagnostics || {};
    const key = factor?.key;

    if (key === "cashFlowSustainability") {
        const income = Number(diagnostics.actualIncome || 0);
        const outflow = Number(diagnostics.mandatoryOutflow || 0);
        if (outflow > 0 && income < outflow) {
            return "Текущего дохода недостаточно для покрытия обязательных расходов и платежей.";
        }
        if (outflow > 0 && income > 0) {
            return "Доход покрывает обязательный отток, но запас финансовой прочности пока ограничен.";
        }
        return "Текущих данных недостаточно для формирования сильного денежного потока.";
    }

    if (key === "operationalLiquidity") {
        const months = Number(diagnostics.operationalLiquidityMonths);
        if (Number.isFinite(months) && months < 1) {
            return "Ликвидных средств недостаточно для покрытия одного месяца обязательных расходов.";
        }
        if (Number.isFinite(months) && months < 3) {
            return "Ликвидных средств хватит менее чем на три месяца обязательных расходов.";
        }
        return "Объём ликвидных средств пока остаётся ограничивающим фактором.";
    }

    if (key === "emergencyResilience") {
        const months = Number(diagnostics.reserveMonths);
        if (Number.isFinite(months) && months < 1) {
            return "Финансовой подушки недостаточно даже для покрытия одного месяца обязательных расходов.";
        }
        if (Number.isFinite(months) && months < 3) {
            return "Финансовая подушка покрывает менее трёх месяцев обязательных расходов.";
        }
        return "Финансовая подушка пока не обеспечивает достаточного запаса прочности.";
    }

    if (key === "debtSustainability") {
        const dsr = Number(diagnostics.debtServiceRatio);
        if (diagnostics.nonAmortizingCreditProducts > 0) {
            return "Часть кредитных обязательств не имеет устойчивого графика погашения.";
        }
        if (Number.isFinite(dsr) && dsr > 0.5) {
            return "Долговые платежи занимают более половины текущего дохода.";
        }
        return "Долговая нагрузка заметно влияет на финансовую устойчивость.";
    }

    if (key === "solvencyPosition") {
        const netWorth = Number(diagnostics.netWorth);
        if (Number.isFinite(netWorth) && netWorth < 0) {
            return "Общая стоимость обязательств превышает стоимость активов.";
        }
        return "Чистая финансовая позиция пока не создаёт достаточного запаса прочности.";
    }

    if (key === "productiveCapital") {
        if (Number(diagnostics.productiveCapital || 0) <= 0) {
            return "Капитал пока не формирует наблюдаемый доход от активов.";
        }
        return "Доходность продуктивного капитала пока слабо влияет на общий результат.";
    }

    const observations = Number(diagnostics.trajectory?.observations || 0);
    if (observations < 3) {
        return "Истории пока недостаточно для уверенной оценки финансового тренда.";
    }
    return "Динамика финансовой системы пока не поддерживает устойчивое улучшение.";
}

function buildSummary(result, factors) {
    const score = Number(result?.value || 0);
    const category = result?.category?.label || "недостаточный";

    if (!factors.length) {
        return "Недостаточно данных для персональной расшифровки индекса.";
    }

    const critical = factors.filter((item) => item.level === "critical").length;
    const weakest = factors[0];

    if (critical > 0) {
        return "Индекс находится на уровне «" + category.toLowerCase() +
            "». Основное давление на результат создаёт " +
            weakest.title.toLowerCase() + ".";
    }

    if (score < 60) {
        return "Индекс находится на уровне «" + category.toLowerCase() +
            "». Система имеет несколько зон, которые ограничивают финансовую устойчивость.";
    }

    return "Индекс находится на уровне «" + category.toLowerCase() +
        "». Основные ограничения определяются факторами с наибольшим дефицитом.";
}

function createFinanceExplanation(result) {
    if (!result) return null;

    const diagnosis = result.diagnosis || {};
    const factors = Object.entries(result.components || {})
        .filter(([key]) => Object.prototype.hasOwnProperty.call(FACTOR_META, key))
        .map(([key, value]) => {
            const score = Number(value);
            const meta = FACTOR_META[key];
            const diagnosisFactor = [diagnosis.limitingFactor, diagnosis.weakestFactor]
                .find((item) => item?.key === key);

            return {
                key,
                title: meta.title,
                score: Number.isFinite(score) ? score : null,
                level: scoreLevel(score),
                weight: Number(result.methodology?.weights?.[key]) || 0,
                weightedDeficit: Number(diagnosisFactor?.weightedDeficit ?? ((100 - score) * (Number(result.methodology?.weights?.[key]) || 0))),
                explanation: factorExplanation({ key, score }, result),
                priority: meta.priority
            };
        })
        .sort((a, b) => b.weightedDeficit - a.weightedDeficit || a.priority - b.priority);

    const priority = factors[0] || null;

    return Object.freeze({
        score: Number(result.value || 0),
        category: result.category?.label || "—",
        summary: buildSummary(result, factors),
        factors: Object.freeze(factors),
        priority: priority ? Object.freeze({
            key: priority.key,
            title: priority.title,
            score: priority.score,
            explanation: priority.explanation
        }) : null,
        comparison: Object.freeze({
            available: Boolean(diagnosis.hasComparison),
            change: Number(diagnosis.change || 0),
            changePercent: diagnosis.changePercent === null ? null : Number(diagnosis.changePercent),
            trend: diagnosis.trend || "stable"
        })
    });
}

export { createFinanceExplanation };
