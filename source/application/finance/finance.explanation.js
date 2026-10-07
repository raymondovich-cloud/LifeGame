// source/application/finance/finance.explanation.js — Version 2.2

// Explanation engine for FSI.
// The engine does not store user-specific phrases.
// It derives explanation from component scores, weights, contributions,
// diagnostics and observed risk signals.

const FACTOR_META = Object.freeze({
    cashFlowSustainability: {
        title: "Денежный поток",
        cases: {
            nominative: "денежный поток",
            genitive: "денежного потока",
            dative: "денежному потоку",
            accusative: "денежный поток",
            instrumental: "денежным потоком",
            prepositional: "денежном потоке"
        },
        priority: 1,
        weightLabel: "25%"
    },
    operationalLiquidity: {
        title: "Ликвидность",
        cases: {
            nominative: "ликвидность",
            genitive: "ликвидности",
            dative: "ликвидности",
            accusative: "ликвидность",
            instrumental: "ликвидностью",
            prepositional: "ликвидности"
        },
        priority: 2,
        weightLabel: "15%"
    },
    emergencyResilience: {
        title: "Финансовый резерв",
        cases: {
            nominative: "финансовый резерв",
            genitive: "финансового резерва",
            dative: "финансовому резерву",
            accusative: "финансовый резерв",
            instrumental: "финансовым резервом",
            prepositional: "финансовом резерве"
        },
        priority: 3,
        weightLabel: "15%"
    },
    debtSustainability: {
        title: "Долговая устойчивость",
        cases: {
            nominative: "долговая устойчивость",
            genitive: "долговой устойчивости",
            dative: "долговой устойчивости",
            accusative: "долговую устойчивость",
            instrumental: "долговой устойчивостью",
            prepositional: "долговой устойчивости"
        },
        priority: 4,
        weightLabel: "20%"
    },
    solvencyPosition: {
        title: "Чистая финансовая позиция",
        cases: {
            nominative: "чистая финансовая позиция",
            genitive: "чистой финансовой позиции",
            dative: "чистой финансовой позиции",
            accusative: "чистую финансовую позицию",
            instrumental: "чистой финансовой позицией",
            prepositional: "чистой финансовой позиции"
        },
        priority: 5,
        weightLabel: "10%"
    },
    productiveCapital: {
        title: "Продуктивный капитал",
        cases: {
            nominative: "продуктивный капитал",
            genitive: "продуктивного капитала",
            dative: "продуктивному капиталу",
            accusative: "продуктивный капитал",
            instrumental: "продуктивным капиталом",
            prepositional: "продуктивном капитале"
        },
        priority: 6,
        weightLabel: "5%"
    },
    financialTrajectory: {
        title: "Финансовый тренд",
        cases: {
            nominative: "финансовый тренд",
            genitive: "финансового тренда",
            dative: "финансовому тренду",
            accusative: "финансовый тренд",
            instrumental: "финансовым трендом",
            prepositional: "финансовом тренде"
        },
        priority: 7,
        weightLabel: "10%"
    }
});

const LEVELS = Object.freeze([
    { max: 19.9, key: "critical", label: "критический" },
    { max: 39.9, key: "weak", label: "слабый" },
    { max: 59.9, key: "moderate", label: "средний" },
    { max: 74.9, key: "stable", label: "стабильный" },
    { max: 89.9, key: "strong", label: "сильный" },
    { max: 100, key: "excellent", label: "очень сильный" }
]);

function numeric(value, fallback = null) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function formatNumber(value, digits = 0) {
    const number = numeric(value);
    if (number === null) return "нет данных";

    return number.toLocaleString("ru-RU", {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits
    });
}

function formatMoney(value) {
    const number = numeric(value);
    return number === null ? "нет данных" : formatNumber(number) + " ₽";
}

function formatPercent(value, digits = 1) {
    const number = numeric(value);
    return number === null ? "нет данных" : formatNumber(number, digits) + "%";
}

function formatMonths(value) {
    const number = numeric(value);
    if (number === null) return "нет данных";
    return number.toLocaleString("ru-RU", {
        maximumFractionDigits: 1,
        minimumFractionDigits: 0
    });
}

function levelFor(score) {
    const value = numeric(score, 0);
    return LEVELS.find((level) => value <= level.max) || LEVELS[LEVELS.length - 1];
}

function scoreMeaning(score) {
    const level = levelFor(score);

    return {
        key: level.key,
        label: level.label,
        text: level.key === "critical"
            ? "сильно ограничивает индекс"
            : level.key === "weak"
                ? "заметно ограничивает индекс"
                : level.key === "moderate"
                    ? "ограничивает индекс умеренно"
                    : level.key === "stable"
                        ? "поддерживает индекс на стабильном уровне"
                        : "существенно поддерживает индекс"
    };
}

function factorCase(key, grammaticalCase = "nominative") {
    return FACTOR_META[key]?.cases?.[grammaticalCase] || FACTOR_META[key]?.title || "этот фактор";
}

function semanticState(score) {
    const level = levelFor(score);

    return level.key === "critical" || level.key === "weak"
        ? "needsAttention"
        : level.key === "moderate"
            ? "developing"
            : level.key === "stable"
                ? "stable"
                : "strength";
}

function componentStateText(state) {
    return {
        needsAttention: "требует усиления",
        developing: "находится в зоне развития",
        stable: "поддерживает устойчивость системы",
        strength: "является сильной стороной системы"
    }[state];
}

function componentContribution(score, weight) {
    const safeScore = numeric(score, 0);
    const safeWeight = numeric(weight, 0);

    return safeScore * safeWeight;
}

function buildFacts(key, result) {
    const diagnostics = result?.diagnostics || {};

    if (key === "cashFlowSustainability") {
        const income = numeric(diagnostics.actualIncome, 0);
        const outflow = numeric(diagnostics.mandatoryOutflow, 0);

        return {
            income,
            outflow,
            coverage: numeric(diagnostics.cashFlowCoverage),
            sentence:
                outflow > 0
                    ? "Доход " + formatMoney(income) +
                      " при обязательном оттоке " + formatMoney(outflow) + "."
                    : "Обязательный финансовый отток сейчас не сформирован."
        };
    }

    if (key === "operationalLiquidity") {
        const liquid = numeric(diagnostics.operationalLiquidFunds, 0);
        const months = numeric(diagnostics.operationalLiquidityMonths);

        return {
            liquid,
            months,
            sentence: Number.isFinite(months)
                ? "Ликвидные средства " + formatMoney(liquid) +
                  " покрывают около " + formatMonths(months) +
                  " мес. обязательного оттока."
                : "Ликвидные средства не удалось сопоставить с обязательным оттоком."
        };
    }

    if (key === "emergencyResilience") {
        const reserve = numeric(diagnostics.emergencyReserve, 0);
        const months = numeric(diagnostics.reserveMonths);

        return {
            reserve,
            months,
            sentence: Number.isFinite(months)
                ? "Финансовый резерв " + formatMoney(reserve) +
                  " покрывает около " + formatMonths(months) +
                  " мес. обязательного оттока."
                : "Финансовый резерв не удалось сопоставить с обязательным оттоком."
        };
    }

    if (key === "debtSustainability") {
        const debt = numeric(diagnostics.totalDebt, 0);
        const payment = numeric(diagnostics.debtPayments, 0);
        const dsr = numeric(diagnostics.debtServiceRatio);
        const debtToIncome = numeric(diagnostics.debtToIncome);

        return {
            debt,
            payment,
            dsr,
            debtToIncome,
            nonAmortizing: numeric(diagnostics.nonAmortizingCreditProducts, 0),
            sentence:
                "Общий долг " + formatMoney(debt) +
                ", платежи " + formatMoney(payment) +
                (dsr !== null ? ", доля платежей в доходе " + formatPercent(dsr * 100) + "." : ".")
        };
    }

    if (key === "solvencyPosition") {
        const assets = numeric(diagnostics.totalAssets, 0);
        const debt = numeric(diagnostics.totalDebt, 0);
        const netWorth = numeric(diagnostics.netWorth);

        return {
            assets,
            debt,
            netWorth,
            sentence:
                "Активы " + formatMoney(assets) +
                " против обязательств " + formatMoney(debt) +
                (netWorth !== null ? "; чистая позиция " + formatMoney(netWorth) + "." : ".")
        };
    }

    if (key === "productiveCapital") {
        const principal = numeric(diagnostics.productiveCapital, 0);
        const income = numeric(diagnostics.projectedAnnualProductiveIncome, 0);
        const yieldRate = numeric(diagnostics.projectedAnnualProductiveYield);

        return {
            principal,
            income,
            yieldRate,
            sentence:
                principal > 0
                    ? "Продуктивный капитал " + formatMoney(principal) +
                      (yieldRate !== null ? " при расчётной доходности " + formatPercent(yieldRate) + "." : ".")
                    : "Продуктивный капитал пока не сформирован."
        };
    }

    const trajectory = diagnostics.trajectory || {};
    const observations = numeric(trajectory.observations, 0);

    return {
        observations,
        incomeSlope: numeric(trajectory.incomeSlope),
        debtSlope: numeric(trajectory.debtSlope),
        liquiditySlope: numeric(trajectory.liquiditySlope),
        reserveSlope: numeric(trajectory.reserveSlope),
        sentence:
            observations > 0
                ? "Для оценки тренда доступно " + formatNumber(observations) + " наблюдений."
                : "История изменений пока отсутствует."
    };
}

function buildFactorExplanation(key, score, result) {
    const facts = buildFacts(key, result);
    const meaning = scoreMeaning(score);

    if (key === "cashFlowSustainability") {
        if (facts.outflow > 0 && facts.income < facts.outflow) {
            return facts.sentence + " Денежный поток не покрывает обязательный отток — фактор снижает индекс.";
        }

        if (facts.outflow > 0) {
            return facts.sentence + " Денежный поток покрывает обязательный отток — фактор поддерживает индекс.";
        }

        return facts.sentence + " При отсутствии обязательного оттока этот фактор не оказывает сильного ограничивающего воздействия.";
    }

    if (key === "operationalLiquidity") {
        if (facts.months !== null && facts.months < 1) {
            return facts.sentence + " Запаса ликвидности недостаточно для покрытия месяца обязательного оттока — фактор снижает индекс.";
        }

        if (facts.months !== null && facts.months < 3) {
            return facts.sentence + " Небольшой запас ликвидности ограничивает устойчивость — фактор снижает индекс.";
        }

        return facts.sentence + " Ликвидность обеспечивает текущую устойчивость системы.";
    }

    if (key === "emergencyResilience") {
        if (facts.months !== null && facts.months < 1) {
            return facts.sentence + " Резерв не покрывает даже месяц обязательного оттока — фактор существенно снижает индекс.";
        }

        if (facts.months !== null && facts.months < 3) {
            return facts.sentence + " Ограниченный резерв уменьшает способность системы выдерживать непредвиденную нагрузку.";
        }

        return facts.sentence + " Резерв создаёт дополнительную устойчивость системы.";
    }

    if (key === "debtSustainability") {
        if (facts.nonAmortizing > 0) {
            return facts.sentence + " Есть обязательства без устойчивого погашения — фактор существенно снижает индекс.";
        }

        if (facts.dsr !== null && facts.dsr > 0.5) {
            return facts.sentence + " Высокая доля дохода уходит на долговые платежи — фактор снижает индекс.";
        }

        if (facts.debtToIncome !== null && facts.debtToIncome > 6) {
            return facts.sentence + " Объём долга значительно превышает месячный доход — фактор ограничивает индекс.";
        }

        return facts.sentence + " Текущая долговая нагрузка не является сильным ограничением индекса.";
    }

    if (key === "solvencyPosition") {
        if (facts.netWorth !== null && facts.netWorth < 0) {
            return facts.sentence + " Обязательства превышают активы — фактор снижает индекс.";
        }

        return facts.sentence + " Активы покрывают обязательства — фактор поддерживает индекс.";
    }

    if (key === "productiveCapital") {
        if (facts.principal <= 0) {
            return facts.sentence + " Дополнительный вклад продуктивного капитала в индекс отсутствует.";
        }

        return facts.sentence + " Этот фактор оценивает способность капитала формировать дополнительный финансовый результат.";
    }

    if (facts.observations < 3) {
        return facts.sentence + " Истории недостаточно для надёжной оценки динамики.";
    }

    const direction = [
        facts.incomeSlope,
        facts.liquiditySlope,
        facts.reserveSlope
    ].filter((value) => value !== null);

    const debtSlope = facts.debtSlope;

    if (direction.length && direction.every((value) => value > 0) && (debtSlope === null || debtSlope <= 0)) {
        return facts.sentence + " Доступная динамика указывает на улучшение финансовой системы.";
    }

    if (direction.some((value) => value < 0) || (debtSlope !== null && debtSlope > 0)) {
        return facts.sentence + " Доступная динамика содержит признаки ухудшения отдельных финансовых показателей.";
    }

    return facts.sentence + " Доступная динамика пока не показывает выраженного направления.";
}

function buildFactorModel(result) {
    const diagnosis = result?.diagnosis || {};
    const components = result?.components || {};
    const weights = result?.methodology?.weights || {};

    return Object.entries(FACTOR_META)
        .map(([key, meta]) => {
            const score = numeric(components[key]);
            const weight = numeric(weights[key], 0);
            const contribution = componentContribution(score, weight);
            const maximumContribution = 100 * weight;
            const deficit = Math.max(0, maximumContribution - contribution);
            const meaning = scoreMeaning(score);
            const explanation = buildFactorExplanation(key, score, result);

            return {
                key,
                title: meta.title,
                score,
                level: meaning.key,
                levelLabel: meaning.label,
                weight,
                weightLabel: meta.weightLabel,
                contribution: Number(contribution.toFixed(2)),
                maximumContribution: Number(maximumContribution.toFixed(2)),
                deficit: Number(deficit.toFixed(2)),
                explanation,
                priority: meta.priority,
                comparisonDelta:
                    diagnosis?.primaryPositiveFactor?.key === key
                        ? diagnosis.primaryPositiveFactor.delta
                        : diagnosis?.primaryNegativeFactor?.key === key
                            ? diagnosis.primaryNegativeFactor.delta
                            : null
            };
        })
        .filter((factor) => factor.score !== null)
        .sort((a, b) => b.deficit - a.deficit || a.priority - b.priority);
}

function buildCompositionText(factors) {
    const parts = factors
        .slice()
        .sort((a, b) => a.priority - b.priority)
        .map((factor) => factor.title + " " + formatNumber(factor.weight * 100, 0) + "%");

    return "Индекс состоит из семи факторов: " + parts.join(", ") + ".";
}

function buildImpactText(factors) {
    const limiting = factors[0];
    const strongest = factors.slice().sort((a, b) => b.score - a.score)[0];

    if (!limiting) return "Недостаточно данных, чтобы определить влияние факторов.";

    const limitingTitle = factorCase(limiting.key, "nominative");
    const strongestTitle = strongest ? factorCase(strongest.key, "nominative") : null;

    if (strongest && strongest.key !== limiting.key && strongest.score >= 75) {
        return "Основная зона для усиления — " + limitingTitle + ". " +
            "Сильнейшая сторона системы — " + strongestTitle + ".";
    }

    return "Основная зона для усиления — " + limitingTitle + ".";
}

function buildSummary(result, factors) {
    if (!factors.length) {
        return "Недостаточно данных для построения персонального объяснения индекса.";
    }

    const limiting = factors[0];
    const strongest = factors.slice().sort((a, b) => b.score - a.score)[0];
    const limitingState = semanticState(limiting.score);
    const facts = buildFacts(limiting.key, result);

    let text = "Основная зона для усиления — " +
        factorCase(limiting.key, "nominative") + ". ";

    if (limitingState === "needsAttention") {
        if (limiting.key === "emergencyResilience" && facts.reserve <= 0) {
            text += "Финансовый резерв отсутствует, поэтому система не имеет отдельного запаса средств для покрытия обязательных расходов при снижении дохода.";
        } else {
            text += "Текущее состояние " + factorCase(limiting.key, "genitive") +
                " заметно ограничивает финансовую устойчивость системы.";
        }
    } else if (limitingState === "developing") {
        text += "Текущее состояние " + factorCase(limiting.key, "genitive") +
            " оставляет заметный потенциал для повышения финансовой устойчивости.";
    } else {
        text += "Текущее состояние " + factorCase(limiting.key, "genitive") +
            " уже поддерживает систему, но остаётся главным направлением для дальнейшего усиления.";
    }

    if (strongest && strongest.key !== limiting.key && strongest.score >= 75) {
        text += " Сильнейшая сторона системы — " +
            factorCase(strongest.key, "nominative") + ": " +
            buildStrongestSemanticText(strongest.key, result) + ".";
    }

    return text;
}

function buildStrongestSemanticText(key, result) {
    const facts = buildFacts(key, result);

    if (key === "cashFlowSustainability") {
        if (facts.outflow > 0 && facts.income >= facts.outflow) {
            return "текущего дохода достаточно для покрытия обязательных расходов";
        }

        return "денежный поток поддерживает текущую финансовую устойчивость";
    }

    if (key === "operationalLiquidity") {
        return Number.isFinite(facts.months)
            ? "ликвидных средств достаточно для покрытия текущего обязательного оттока"
            : "ликвидность поддерживает текущую финансовую устойчивость";
    }

    if (key === "emergencyResilience") {
        return Number.isFinite(facts.months)
            ? "резерв создаёт дополнительный запас для покрытия обязательных расходов"
            : "резерв поддерживает финансовую устойчивость";
    }

    if (key === "debtSustainability") {
        return "текущая долговая нагрузка не создаёт сильного давления на систему";
    }

    if (key === "solvencyPosition") {
        return facts.netWorth !== null && facts.netWorth >= 0
            ? "активы покрывают обязательства"
            : "финансовая позиция поддерживает устойчивость системы";
    }

    if (key === "productiveCapital") {
        return facts.principal > 0
            ? "капитал способен формировать дополнительный финансовый результат"
            : "система сохраняет потенциал для формирования продуктивного капитала";
    }

    return "доступная динамика поддерживает финансовую устойчивость системы";
}

function createFinanceExplanation(result) {
    if (!result) return null;

    const factors = buildFactorModel(result);

    return Object.freeze({
        score: numeric(result.value, 0),
        scale: numeric(result.scale, 100),
        category: result.category?.label || "—",
        summary: buildSummary(result, factors),
        composition: buildCompositionText(factors),
        impact: buildImpactText(factors),
        factors: Object.freeze(factors),
        priority: factors[0]
            ? Object.freeze({
                key: factors[0].key,
                title: factors[0].title,
                score: factors[0].score,
                contribution: factors[0].contribution,
                deficit: factors[0].deficit,
                explanation: factors[0].explanation
            })
            : null,
        comparison: Object.freeze({
            available: Boolean(result?.diagnosis?.hasComparison),
            change: numeric(result?.diagnosis?.change, 0),
            changePercent: numeric(result?.diagnosis?.changePercent),
            trend: result?.diagnosis?.trend || "stable"
        })
    });
}

export { createFinanceExplanation };
