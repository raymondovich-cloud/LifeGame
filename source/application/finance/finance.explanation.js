// source/application/finance/finance.explanation.js — Version 1.1

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

const CATEGORY_COPY = Object.freeze({
    "Критический": {
        state: "Финансовая система сейчас уязвима и требует внимания к ключевым ограничениям."
    },
    "Уязвимый": {
        state: "Финансовая система пока остаётся уязвимой к нагрузке и непредвиденным расходам."
    },
    "Нестабильный": {
        state: "Финансовая система уже имеет основу для устойчивости, но несколько факторов пока заметно её ограничивают."
    },
    "Стабильный": {
        state: "Финансовая система в целом устойчива, но отдельные показатели ещё можно усилить."
    },
    "Сильный": {
        state: "Финансовая система находится в хорошем состоянии и имеет высокий запас устойчивости."
    },
    "Устойчивый": {
        state: "Финансовая система находится в очень сильном состоянии; существенных ограничений по текущим данным не выявлено."
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

        if (outflow > 0 && income >= outflow) {
            return "Доход покрывает обязательный отток, поэтому текущий денежный поток поддерживает устойчивость системы.";
        }

        return "По текущим данным обязательный финансовый отток не сформирован, поэтому денежный поток имеет ограниченную диагностическую значимость.";
    }

    if (key === "operationalLiquidity") {
        const months = Number(diagnostics.operationalLiquidityMonths);

        if (Number.isFinite(months) && months < 1) {
            return "Ликвидных средств недостаточно даже для покрытия одного месяца обязательных расходов.";
        }

        if (Number.isFinite(months) && months < 3) {
            return "Ликвидных средств хватит менее чем на три месяца обязательных расходов.";
        }

        if (Number.isFinite(months)) {
            return "Ликвидных средств достаточно для покрытия примерно " + months.toFixed(1) + " месяцев обязательных расходов.";
        }

        return "По текущим данным объём ликвидных средств невозможно точно сопоставить с обязательными расходами.";
    }

    if (key === "emergencyResilience") {
        const months = Number(diagnostics.reserveMonths);

        if (Number.isFinite(months) && months < 1) {
            return "Финансовой подушки недостаточно даже для покрытия одного месяца обязательных расходов.";
        }

        if (Number.isFinite(months) && months < 3) {
            return "Финансовая подушка покрывает менее трёх месяцев обязательных расходов.";
        }

        if (Number.isFinite(months)) {
            return "Финансовая подушка покрывает примерно " + months.toFixed(1) + " месяцев обязательных расходов.";
        }

        return "По текущим данным размер финансовой подушки невозможно точно сопоставить с обязательными расходами.";
    }

    if (key === "debtSustainability") {
        const dsr = Number(diagnostics.debtServiceRatio);
        const debtToIncome = Number(diagnostics.debtToIncome);

        if (diagnostics.nonAmortizingCreditProducts > 0) {
            return "Часть кредитных обязательств не имеет устойчивого графика погашения.";
        }

        if (Number.isFinite(dsr) && dsr > 0.5) {
            return "Долговые платежи занимают более половины текущего дохода.";
        }

        if (Number.isFinite(debtToIncome) && debtToIncome > 6) {
            return "Объём долга существенно превышает месячный доход.";
        }

        return "Текущая долговая нагрузка не является главным ограничением финансовой системы.";
    }

    if (key === "solvencyPosition") {
        const netWorth = Number(diagnostics.netWorth);

        if (Number.isFinite(netWorth) && netWorth < 0) {
            return "Общая стоимость обязательств превышает стоимость активов.";
        }

        if (Number.isFinite(netWorth)) {
            return "Стоимость активов превышает обязательства, поэтому чистая финансовая позиция поддерживает устойчивость системы.";
        }

        return "Недостаточно данных для точной оценки чистой финансовой позиции.";
    }

    if (key === "productiveCapital") {
        const principal = Number(diagnostics.productiveCapital || 0);
        const yieldPercent = Number(diagnostics.projectedAnnualProductiveYield);

        if (principal <= 0) {
            return "Активы пока не формируют наблюдаемый продуктивный капитал, поэтому этот фактор не добавляет существенного запаса к индексу.";
        }

        if (Number.isFinite(yieldPercent) && yieldPercent > 0) {
            return "Продуктивный капитал составляет " + principal.toLocaleString("ru-RU") + " ₽ с расчётной доходностью около " + yieldPercent.toFixed(1) + "% годовых.";
        }

        return "Продуктивный капитал присутствует, но пока не формирует заметного дополнительного вклада в устойчивость системы.";
    }

    const observations = Number(diagnostics.trajectory?.observations || 0);

    if (observations < 3) {
        return "Истории пока недостаточно, чтобы уверенно оценить финансовый тренд.";
    }

    return "Динамика финансовой системы пока не показывает устойчивого улучшения.";
}

function buildSummary(result, factors) {
    if (!factors.length) {
        return "Недостаточно данных для персональной расшифровки финансового состояния.";
    }

    const category = result?.category?.label || "—";
    const state = CATEGORY_COPY[category]?.state || "Финансовое состояние рассчитано на основе доступных данных.";

    const strongest = [...factors].sort((a, b) => b.score - a.score)[0];
    const priority = factors[0];

    if (!priority) return state;

    if (category === "Устойчивый" && priority.score >= 75) {
        return state + " Все ключевые факторы находятся на высоком уровне.";
    }

    if (priority.score >= 75) {
        return state + " Главная зона для дальнейшего усиления — " +
            priority.title.toLowerCase() + ".";
    }

    if (strongest && strongest.key !== priority.key && strongest.score >= 75) {
        return state + " Сильная сторона системы — " +
            strongest.title.toLowerCase() + ", а главная зона для усиления — " +
            priority.title.toLowerCase() + ".";
    }

    return state + " Главная зона для усиления — " +
        priority.title.toLowerCase() + ": " + priority.explanation;
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
                weightedDeficit: Number(
                    diagnosisFactor?.weightedDeficit ??
                    ((100 - score) * (Number(result.methodology?.weights?.[key]) || 0))
                ),
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
