// finance.js — Version 7.39

import { beginOperation, endOperation, trace } from "../../core/diagnostics/lifecycle.trace.js";

import { renderAssetsStatisticsScreen } from "./assets.statistics.js";
import { renderSectionAnalyticsScreen } from "./section.analytics.js";
import { createAssetsAnalytics } from "../../application/finance/assets.analytics.js";
import { createFinanceAnalytics } from "../../application/finance/finance.analytics.js";
import { createInfoTooltip } from "../shared/info.tooltip.js";
import { attachEntryEdit } from "./entry.edit.js";
import { showSubscriptionLimitNotice } from "../shared/subscription.limit.js";
import { animateCountUp } from "../shared/count-up.animation.js";
import { animateBarWidth } from "../shared/bar.animation.js";
import { confirmFinancialBurdenClosure } from "./financial-burden-close-confirmation.js";
import {
    loadFinanceCarouselPreferences,
    saveFinanceCarouselPreferences,
    resolveFinanceCarouselOrder,
    toggleFinanceCarouselPin
} from "./finance.carousel.js";
import { createSpeechRecognition } from "../../infrastructure/voice/speech-recognition.adapter.js";
import { parseFinanceVoiceCommand, parseFinanceVoiceAction, isCreditProductLabel } from "../../application/voice/finance-command.parser.js";

const pinnedEntries = new Set();
const MAX_PINNED_ENTRIES_PER_BLOCK = 3;
const financeRenderContexts = new WeakMap();

function resolveFinanceRenderOptions(root, options = {}) {
    const previous = financeRenderContexts.get(root) || {};
    const resolved = { ...previous, ...options };
    financeRenderContexts.set(root, resolved);
    return resolved;
}

const FINANCE_DATA_SUBBLOCKS = Object.freeze([
    { id: "assets", number: "01", title: "Активы", description: "Имущество и средства, которыми вы владеете", info: "Активы, которыми вы владеете: недвижимость, автомобиль, наличные, средства на картах, счета и другие активы, которые пользователь хочет учитывать в своей финансовой картине." },
    { id: "actual-earnings", number: "02", title: "Фактически заработанно", description: "Реально полученный доход", info: "Доход, который вы фактически получили за выбранный период." },
    { id: "financial-burden", number: "03", title: "Финансовая нагрузка", description: "Обязательства, влияющие на бюджет", info: "Обязательства и регулярные финансовые нагрузки, которые уменьшают доступные средства и влияют на устойчивость." },
    { id: "mandatory-expenses", number: "04", title: "Обязательные траты", description: "Расходы, которые нельзя пропустить", info: "Расходы, которые необходимо оплачивать регулярно независимо от других трат." },
]);

const FINANCE_SECTIONS = Object.freeze([
    {
        id: "assets",
        label: "CAPITAL",
        title: "Активы",
        description: "Деньги и имущество под вашим контролем",
        info: "Все активы, которые вы хотите учитывать в финансовой картине: наличные, карты, счета, недвижимость, автомобиль и другое имущество."
    },
    {
        id: "actual-earnings",
        label: "INCOME",
        title: "Фактически заработано",
        description: "Реально полученный доход",
        info: "Доход, который вы фактически получили."
    },
    {
        id: "financial-burden",
        label: "BURDEN",
        title: "Финансовая нагрузка",
        description: "Долги и регулярные платежи",
        info: "Обязательства и регулярные финансовые нагрузки, влияющие на устойчивость."
    },
    {
        id: "mandatory-expenses",
        label: "EXPENSES",
        title: "Обязательные траты",
        description: "Расходы, которые нельзя пропустить",
        info: "Регулярные расходы, которые необходимо оплачивать."
    }
]);

function getEntryKey(sectionId, entryId) {
    return sectionId + ":" + entryId;
}

function isEntryPinned(sectionId, entryId) {
    return pinnedEntries.has(getEntryKey(sectionId, entryId));
}

function countPinnedEntries(sectionId, financeApplication) {
    return financeApplication
        .listFinanceEntries(sectionId)
        .filter((entry) => pinnedEntries.has(getEntryKey(sectionId, entry.id)))
        .length;
}

function toggleEntryPinned(sectionId, entryId) {
    const key = getEntryKey(sectionId, entryId);

    if (pinnedEntries.has(key)) {
        pinnedEntries.delete(key);
        return false;
    }

    pinnedEntries.add(key);
    return true;
}

function formatAmount(amount) {
    return new Intl.NumberFormat("ru-RU", {
        maximumFractionDigits: 2
    }).format(Number(amount) || 0);
}

function formatSignedAmount(amount) {
    const value = Number(amount) || 0;
    return (value >= 0 ? "+" : "−") + formatAmount(Math.abs(value)) + " ₽";
}

function getSection(id) {
    return FINANCE_SECTIONS.find((section) => section.id === id) || FINANCE_SECTIONS[0];
}

function getSectionTotal(financeApplication, sectionId) {
    const entries = financeApplication.listFinanceEntries(sectionId);

    if (sectionId === "financial-burden") {
        return entries.reduce((total, entry) => total + Number(entry.debt || 0), 0);
    }

    return entries.reduce((total, entry) => total + Number(entry.amount || 0), 0);
}

function getFinancialSnapshot(financeApplication, assetsAnalytics) {
    const assets = financeApplication.listFinanceEntries("assets");
    const liquid = assets
        .filter((entry) => entry?.liquidity !== "illiquid")
        .reduce((total, entry) => total + Number(entry.amount || 0), 0);
    const illiquid = assets
        .filter((entry) => entry?.liquidity === "illiquid")
        .reduce((total, entry) => total + Number(entry.amount || 0), 0);

    const statistics = assetsAnalytics
        ? assetsAnalytics.getAssetsAnalytics(assetsAnalytics.getAssetsAnalyticsRange("month"))
        : null;

    return {
        capital: Number(statistics?.current?.total ?? liquid + illiquid),
        liquid,
        illiquid,
        income: getSectionTotal(financeApplication, "actual-earnings"),
        burden: getSectionTotal(financeApplication, "financial-burden"),
        burdenPayment: financeApplication
            .listFinanceEntries("financial-burden")
            .reduce((total, entry) => total + Number(entry.payment || 0), 0),
        expenses: getSectionTotal(financeApplication, "mandatory-expenses"),
        reserve: assets
            .filter((entry) => Boolean(entry?.isReserve))
            .reduce((total, entry) => total + Number(entry.amount || 0), 0)
    };
}

function createAdaptiveDiagnosisText(result) {
    const diagnosis = result?.diagnosis;
    if (!diagnosis) return "Недостаточно данных для персональной диагностики.";

    if (!diagnosis.hasComparison) {
        const limiting = diagnosis.limitingFactor || diagnosis.weakestFactor;

        if (limiting?.reason) {
            return "Пока недостаточно данных, чтобы оценить динамику вашего индекса. " +
                "Основное ограничение сейчас — " + limiting.reason + ".";
        }

        return "Пока недостаточно данных, чтобы оценить динамику вашего индекса.";
    }

    const percent = Math.abs(Number(diagnosis.changePercent || 0));
    const roundedPercent = Number.isFinite(percent)
        ? Math.round(percent)
        : 0;

    let text = "";

    if (diagnosis.changePercent > 0) {
        text = "За последний месяц индекс вырос на " + roundedPercent + "%.";
    } else if (diagnosis.changePercent < 0) {
        text = "За последний месяц индекс снизился на " + roundedPercent + "%.";
    } else {
        text = "За последний месяц индекс практически не изменился.";
    }

    const positive = diagnosis.primaryPositiveFactor;
    const negative = diagnosis.primaryNegativeFactor;
    const limiting = diagnosis.limitingFactor;

    if (diagnosis.changePercent > 0 && positive) {
        text += " Основным фактором улучшения стало изменение " + positive.label + ".";
        if (diagnosis.secondaryPositiveFactor) {
            text += " Дополнительную поддержку дало улучшение " +
                diagnosis.secondaryPositiveFactor.label + ".";
        }
    } else if (diagnosis.changePercent < 0 && negative) {
        text += " Основным фактором снижения стало ухудшение " + negative.label + ".";
        if (diagnosis.secondaryNegativeFactor) {
            text += " Дополнительное давление оказало изменение " +
                diagnosis.secondaryNegativeFactor.label + ".";
        }
    }

    if (limiting?.reason && limiting.weightedDeficit > 20) {
        text += " Сейчас сильнее всего ограничивает результат то, что " +
            limiting.reason + ".";
    }

    return text;
}

function createHealthBlock(financeApplication) {
    const result = financeApplication.getFinancialStabilityIndex();

    const section = document.createElement("section");
    section.className = "finance-health";
    section.setAttribute("aria-label", "Financial health");

    const meta = document.createElement("div");
    meta.className = "finance-section-meta";
    meta.textContent = "FINANCIAL HEALTH";

    const valueRow = document.createElement("div");
    valueRow.className = "finance-health-value-row";

    const value = document.createElement("span");
    value.className = "finance-health-value";
    value.setAttribute("aria-live", "off");

    const rawScore = Number(result?.value);
    const displayScore = Number.isFinite(rawScore)
        ? Math.round(rawScore * 10)
        : null;
    value.textContent = displayScore === null ? "—" : "0";

    const suffix = document.createElement("span");
    suffix.className = "finance-health-suffix";
    suffix.textContent = "/1000";

    valueRow.append(value, suffix);

    const category = document.createElement("span");
    category.className = "finance-health-category";
    category.textContent = result.category?.label || "Недостаточно данных";

    const healthHeader = document.createElement("div");
    healthHeader.className = "finance-health-header";

    const diagnostics = document.createElement("button");
    diagnostics.type = "button";
    diagnostics.className = "finance-text-action";
    diagnostics.textContent = "Показать диагностику →";
    diagnostics.addEventListener("click", () => {
        const target = section.querySelector(".finance-health-diagnostics");
        if (!target) return;
        const isOpen = target.hidden;
        target.hidden = !isOpen;
        diagnostics.textContent = isOpen
            ? "Скрыть диагностику ↑"
            : "Показать диагностику →";
    });

    const description = document.createElement("p");
    description.className = "finance-health-description";
    description.textContent = result.explanation?.summary || createAdaptiveDiagnosisText(result);

    healthHeader.append(meta, diagnostics);

    const diagnosticsPanel = document.createElement("div");
    diagnosticsPanel.className = "finance-health-diagnostics";
    diagnosticsPanel.hidden = true;

    const explanation = result.explanation;
    if (explanation?.composition) {
        const composition = document.createElement("p");
        composition.className = "finance-diagnostic-composition";
        composition.textContent = explanation.composition;
        diagnosticsPanel.appendChild(composition);
    }

    if (explanation?.impact) {
        const impact = document.createElement("p");
        impact.className = "finance-diagnostic-impact";
        impact.textContent = explanation.impact;
        diagnosticsPanel.appendChild(impact);
    }

    const explanationFactors = explanation?.factors || [];
    const factorRows = explanationFactors.length
        ? explanationFactors.map((factor) => [factor.title, factor.score, "/100", factor.explanation])
        : [
            ["Денежный поток", result.components.cashFlow, "/100", null],
            ["Ликвидность", result.components.liquidityResilience, "/100", null],
            ["Финансовый резерв", result.components.emergencyReserve, "/100", null],
            ["Долговая устойчивость", result.components.debtSustainability, "/100", null],
            ["Чистая финансовая позиция", result.components.netFinancialPosition, "/100", null],
            ["Продуктивный капитал", result.components.productiveCapital, "/100", null],
            ["Финансовый тренд", result.components.financialTrend, "/100", null]
        ];

    factorRows.forEach(([label, componentValue, suffixText, factorExplanation]) => {
        const row = document.createElement("div");
        row.className = "finance-diagnostic-row";

        const name = document.createElement("span");
        name.textContent = label;

        const metric = document.createElement("span");
        metric.textContent = componentValue === null || componentValue === undefined
            ? "—"
            : (typeof componentValue === "number" ? componentValue.toFixed(1) : componentValue) + suffixText;

        row.append(name, metric);
        diagnosticsPanel.appendChild(row);

        if (factorExplanation) {
            const explanationNode = document.createElement("p");
            explanationNode.className = "finance-diagnostic-explanation";
            explanationNode.textContent = factorExplanation;
            diagnosticsPanel.appendChild(explanationNode);
        }
    });

    section.append(healthHeader, valueRow, category, description, diagnosticsPanel);

    if (displayScore !== null) {
        animateCountUp(value, displayScore, { duration: 1800 });
    }

    return section;
}

function formatPercentChange(change) {
    if (!change || !change.hasComparison || change.percent === null) return "—";
    const value = Number(change.percent);
    return (value >= 0 ? "+" : "−") + formatAmount(Math.abs(value)) + "%";
}

function createCapitalBlock(financeApplication, assetsAnalytics, root, onWriteAttempt, options = {}) {
    const snapshot = getFinancialSnapshot(financeApplication, assetsAnalytics);
    const stabilityResult = financeApplication.getFinancialStabilityIndex();
    const stabilityDiagnostics = stabilityResult?.diagnostics || {};
    const assetEntries = financeApplication.listFinanceEntries("assets");
    const productiveCapital = assetEntries
        .filter((entry) => Boolean(entry?.incomeEnabled))
        .reduce((total, entry) => total + Number(entry.amount || 0), 0);
    const section = document.createElement("section");
    section.className = "finance-capital";
    section.setAttribute("aria-label", "Financial overview");

    const carousel = document.createElement("div");
    carousel.className = "finance-capital-carousel";
    carousel.dataset.financeViewCarousel = "";
    carousel.tabIndex = 0;
    carousel.setAttribute("role", "region");
    carousel.setAttribute("aria-roledescription", "carousel");
    carousel.setAttribute(
        "aria-label",
        "Финансовый обзор. Проведите влево или вправо для смены экрана."
    );

    const header = document.createElement("div");
    header.className = "finance-block-heading";

    const eyebrow = document.createElement("span");
    eyebrow.className = "finance-section-meta";
    eyebrow.textContent = "FINANCIAL OVERVIEW";
    header.appendChild(eyebrow);

    const viewHeading = document.createElement("div");
    viewHeading.className = "finance-capital-view-heading";

    const viewLabel = document.createElement("span");
    viewLabel.className = "finance-capital-view-label";

    const viewTitle = document.createElement("h3");
    viewTitle.className = "finance-capital-view-title";

    viewHeading.append(viewLabel, viewTitle);

    const amount = document.createElement("div");
    amount.className = "finance-capital-value";
    amount.textContent = "0 ₽";

    const caption = document.createElement("p");
    caption.className = "finance-capital-caption";

    const context = document.createElement("p");
    context.className = "finance-capital-view-context";

    const pinStatus = document.createElement("span");
    pinStatus.className = "finance-capital-view-pin-status";
    pinStatus.setAttribute("aria-label", "Экран закреплён");
    const pinIcon = document.createElement("span");
    pinIcon.className = "finance-capital-view-pin-icon";
    pinIcon.setAttribute("aria-hidden", "true");
    pinIcon.textContent = "📌";
    const pinLabel = document.createElement("span");
    pinLabel.textContent = "ЗАКРЕПЛЕНО";
    pinStatus.append(pinIcon, pinLabel);
    pinStatus.hidden = true;

    const chart = document.createElement("div");
    chart.className = "finance-capital-chart";
    chart.setAttribute("aria-label", "Показатели текущего финансового состояния");

    const chartTitle = document.createElement("span");
    chartTitle.className = "finance-capital-chart-title";

    const chartBars = document.createElement("div");
    chartBars.className = "finance-capital-chart-bars";

    chart.append(chartTitle, chartBars);
    carousel.append(header, viewHeading, amount, caption, context, pinStatus, chart);

    const pinMenu = document.createElement("div");
    pinMenu.className = "row-interaction-backdrop";
    pinMenu.hidden = true;
    pinMenu.setAttribute("role", "presentation");

    const interactionMenu = document.createElement("div");
    interactionMenu.className = "row-interaction-menu";
    interactionMenu.setAttribute("role", "menu");
    interactionMenu.setAttribute("aria-label", "Действия с финансовым экраном");

    const pinAction = document.createElement("button");
    pinAction.type = "button";
    pinAction.className = "row-interaction-menu__item";
    pinAction.setAttribute("role", "menuitem");

    const closeMenu = document.createElement("button");
    closeMenu.type = "button";
    closeMenu.className = "row-interaction-menu__item";
    closeMenu.textContent = "Закрыть";
    closeMenu.setAttribute("role", "menuitem");

    interactionMenu.append(pinAction, closeMenu);
    pinMenu.appendChild(interactionMenu);
    section.append(carousel);
    // Match row interactions: keep the fixed overlay outside transformed finance containers.
    document.body.appendChild(pinMenu);

    const viewDefinitions = Object.freeze({
        assets: {
            id: "assets",
            label: "CAPITAL",
            title: "Активы",
            value: snapshot.capital,
            valueFormat: "currency",
            caption: "Общая стоимость активов",
            context: "Ликвидные средства: " + formatAmount(snapshot.liquid) +
                " ₽ · Неликвидные активы: " + formatAmount(snapshot.illiquid) + " ₽",
            chartTitle: "Структура активов",
        },
        "debt-repayment": {
            id: "debt-repayment",
            label: "DEBT REPAYMENT",
            title: "Погашение долгов",
            value: snapshot.burden,
            valueFormat: "currency",
            caption: "Остаток долговых обязательств",
            context: "Регулярные платежи: " + formatAmount(snapshot.burdenPayment) + " ₽",
            chartTitle: "Долги и обязательства по погашению",
        },
        "financial-stability": {
            id: "financial-stability",
            label: "FINANCIAL STABILITY",
            title: "Финансовая устойчивость",
            value: stabilityResult?.dataStatus === "insufficient" ? null : stabilityResult?.value,
            valueFormat: "score",
            caption: "Индекс финансовой устойчивости",
            context: "Ликвидные средства: " + formatAmount(snapshot.liquid) +
                " ₽ · Резерв: " + formatAmount(snapshot.reserve) + " ₽",
            chartTitle: "Показатели финансовой устойчивости",
        }
    });

    const userId = options.userId ?? null;
    const recommendation = options.financeViewRecommendation ?? null;
    let preferences = loadFinanceCarouselPreferences(userId);
    let order = resolveFinanceCarouselOrder(recommendation, preferences.pinnedPositions);
    const pinnedDefaultViewId = Object.entries(preferences.pinnedPositions || {})
        .sort((first, second) => first[1] - second[1])[0]?.[0];
    let activeViewId = pinnedDefaultViewId && order.includes(pinnedDefaultViewId)
        ? pinnedDefaultViewId
        : order[0];
    let activeViewIndex = Math.max(0, order.indexOf(activeViewId));

    function formatViewValue(value, format = "currency") {
        if (value === null || value === undefined || !Number.isFinite(Number(value))) {
            return format === "score" ? "—/100" : "— ₽";
        }
        return format === "score"
            ? formatAmount(value) + "/100"
            : formatAmount(value) + " ₽";
    }

    function renderChart(viewId) {
        const definition = viewDefinitions[viewId];
        const diagnostics = stabilityDiagnostics;
        const debtToIncome = diagnostics.debtToIncome;
        const debtServiceRatio = diagnostics.debtServiceRatio;
        const totalAssets = Math.max(0, snapshot.capital);
        const income = Math.max(0, snapshot.income);

        const asAmount = (value) => formatAmount(value) + " ₽";
        const asPercent = (value) => value !== null && value !== undefined && Number.isFinite(Number(value))
            ? formatAmount(Number(value) * 100) + "%"
            : "—";
        const asMonths = (value) => value !== null && value !== undefined && Number.isFinite(Number(value))
            ? formatAmount(value) + " мес."
            : "—";
        const clampPercent = (value) => Number.isFinite(Number(value))
            ? Math.max(0, Math.min(100, Number(value)))
            : 0;

        let metrics = [];

        if (viewId === "assets") {
            metrics = [
                {
                    id: "liquid",
                    label: "Ликвидные средства",
                    valueText: asAmount(snapshot.liquid),
                    fillPercent: totalAssets > 0 ? snapshot.liquid / totalAssets * 100 : 0,
                    ariaText: "Доля ликвидных средств в активах"
                },
                {
                    id: "illiquid",
                    label: "Неликвидные активы",
                    valueText: asAmount(snapshot.illiquid),
                    fillPercent: totalAssets > 0 ? snapshot.illiquid / totalAssets * 100 : 0,
                    ariaText: "Доля неликвидных активов"
                },
                {
                    id: "reserve",
                    label: "Средства в резерве",
                    valueText: asAmount(snapshot.reserve),
                    fillPercent: totalAssets > 0 ? snapshot.reserve / totalAssets * 100 : 0,
                    ariaText: "Доля активов, отмеченных как финансовый резерв"
                },
                {
                    id: "productive",
                    label: "Продуктивный капитал",
                    valueText: asAmount(productiveCapital),
                    fillPercent: totalAssets > 0 ? productiveCapital / totalAssets * 100 : 0,
                    ariaText: "Доля активов, настроенных на формирование дохода"
                }
            ];
        } else if (viewId === "debt-repayment") {
            metrics = [
                {
                    id: "debt",
                    label: "Остаток долгов",
                    valueText: asAmount(snapshot.burden),
                    fillPercent: totalAssets > 0
                        ? snapshot.burden / Math.max(totalAssets, snapshot.burden) * 100
                        : (snapshot.burden > 0 ? 100 : 0),
                    ariaText: "Общая сумма непогашенных долгов"
                },
                {
                    id: "payment",
                    label: "Регулярные платежи",
                    valueText: asAmount(snapshot.burdenPayment),
                    fillPercent: income > 0
                        ? snapshot.burdenPayment / income * 100
                        : (snapshot.burdenPayment > 0 ? 100 : 0),
                    ariaText: "Регулярные платежи относительно фактического дохода"
                },
                {
                    id: "debt-service",
                    label: "Доля дохода на платежи",
                    valueText: asPercent(debtServiceRatio),
                    fillPercent: clampPercent(Number(debtServiceRatio) * 100),
                    ariaText: "Доля фактического дохода, направляемая на платежи"
                },
                {
                    id: "debt-to-income",
                    label: "Долг к месячному доходу",
                    valueText: debtToIncome !== null && debtToIncome !== undefined && Number.isFinite(Number(debtToIncome))
                        ? formatAmount(debtToIncome) + "×"
                        : "—",
                    fillPercent: debtToIncome !== null && debtToIncome !== undefined && Number.isFinite(Number(debtToIncome))
                        ? clampPercent(Number(debtToIncome) / 6 * 100)
                        : 0,
                    ariaText: "Отношение общего долга к фактическому доходу"
                }
            ];
        } else {
            const components = stabilityResult?.components || {};
            const confidence = stabilityResult?.dataConfidence;
            metrics = [
                {
                    id: "index",
                    label: "Индекс устойчивости",
                    valueText: stabilityResult?.dataStatus === "insufficient"
                        ? "Недостаточно данных"
                        : formatAmount(stabilityResult.value) + "/100",
                    fillPercent: stabilityResult?.dataStatus === "insufficient"
                        ? 0
                        : clampPercent(stabilityResult.value),
                    ariaText: "Индекс финансовой устойчивости по шкале от нуля до ста"
                },
                {
                    id: "liquidity",
                    label: "Финансовая выживаемость",
                    valueText: asMonths(diagnostics.operationalLiquidityMonths),
                    fillPercent: Number.isFinite(Number(diagnostics.operationalLiquidityMonths))
                        ? clampPercent(Number(diagnostics.operationalLiquidityMonths) / 9 * 100)
                        : 0,
                    ariaText: "Сколько месяцев ликвидные средства покрывают обязательные расходы и платежи"
                },
                {
                    id: "reserve",
                    label: "Покрытие расходов резервом",
                    valueText: asMonths(diagnostics.reserveMonths),
                    fillPercent: Number.isFinite(Number(diagnostics.reserveMonths))
                        ? clampPercent(Number(diagnostics.reserveMonths) / 9 * 100)
                        : 0,
                    ariaText: "Сколько месяцев резерв покрывает обязательные расходы и платежи"
                },
                {
                    id: "coverage",
                    label: "Покрытие обязательств доходом",
                    valueText: Number.isFinite(Number(diagnostics.cashFlowCoverage))
                        ? formatAmount(diagnostics.cashFlowCoverage) + "×"
                        : "—",
                    fillPercent: Number.isFinite(Number(diagnostics.cashFlowCoverage))
                        ? clampPercent(Number(diagnostics.cashFlowCoverage) / 3 * 100)
                        : 0,
                    ariaText: "Отношение фактического дохода к обязательным расходам и платежам"
                },
                {
                    id: "trajectory",
                    label: "Финансовая динамика",
                    valueText: components.financialTrajectory === null || components.financialTrajectory === undefined
                        ? "—"
                        : formatAmount(components.financialTrajectory) + "/100",
                    fillPercent: clampPercent(components.financialTrajectory),
                    ariaText: "Оценка финансовой динамики в составе индекса"
                },
                ...(Number(confidence?.historyObservations) >= 3 &&
                    diagnostics.trajectory?.incomeSlope !== null &&
                    diagnostics.trajectory?.incomeSlope !== undefined &&
                    Number.isFinite(Number(diagnostics.trajectory.incomeSlope))
                    ? [{
                        id: "income-trend",
                        label: "Тренд дохода",
                        valueText: diagnostics.trajectory.incomeSlope > 0
                            ? "Растёт"
                            : diagnostics.trajectory.incomeSlope < 0
                                ? "Снижается"
                                : "Без выраженного изменения",
                        fillPercent: diagnostics.trajectory.incomeSlope > 0 ? 100
                            : diagnostics.trajectory.incomeSlope < 0 ? 0 : 50,
                        ariaText: "Направление изменения дохода по доступной истории"
                    }]
                    : [])
            ];
        }

        chartTitle.textContent = definition.chartTitle;
        chartBars.replaceChildren();

        metrics.forEach(({ id, label, valueText, fillPercent, ariaText }, index) => {
            const row = document.createElement("div");
            row.className = "finance-capital-chart-column";

            const labelNode = document.createElement("span");
            labelNode.className = "finance-capital-chart-label";
            labelNode.textContent = label;

            const metric = document.createElement("strong");
            metric.className = "finance-capital-chart-value";
            metric.textContent = valueText;

            const chartHeader = document.createElement("div");
            chartHeader.className = "finance-capital-chart-footer";
            chartHeader.append(labelNode, metric);

            const barTrack = document.createElement("span");
            barTrack.className = "finance-capital-chart-track";
            barTrack.setAttribute("role", "img");
            barTrack.setAttribute("aria-label", label + ": " + ariaText + ". " + valueText);

            const bar = document.createElement("span");
            bar.className = "finance-capital-chart-bar";
            bar.classList.add(fillPercent > 0 ? "is-positive" : "is-neutral");
            animateBarWidth(bar, clampPercent(fillPercent));

            barTrack.appendChild(bar);
            row.append(chartHeader, barTrack);
            chartBars.appendChild(row);
        });
    }

    function isPinned(viewId) {
        return Object.prototype.hasOwnProperty.call(preferences.pinnedPositions, viewId);
    }

    function renderActiveView(animateValue = false) {
        const definition = viewDefinitions[activeViewId];
        if (!definition) return;

        viewLabel.textContent = definition.label;
        viewTitle.textContent = definition.title;
        caption.textContent = definition.caption;
        context.textContent = definition.context;
        pinStatus.hidden = !isPinned(activeViewId);
        carousel.setAttribute(
            "aria-label",
            definition.title + ". Проведите влево или вправо для смены финансового экрана."
        );

        const targetValue = Number(definition.value);
        if (!Number.isFinite(targetValue)) {
            amount.textContent = definition.valueFormat === "score" ? "—/100" : "— ₽";
        } else if (animateValue) {
            amount.textContent = definition.valueFormat === "score" ? "0/100" : "0 ₽";
            animateCountUp(amount, targetValue, {
                duration: 1800,
                formatter: (value) => definition.valueFormat === "score"
                    ? formatAmount(value) + "/100"
                    : formatAmount(value) + " ₽"
            });
        } else {
            amount.textContent = formatViewValue(targetValue, definition.valueFormat);
        }

        renderChart(activeViewId);
    }

    let pinMenuHideTimer = null;

    function hidePinMenu() {
        pinMenu.classList.remove("is-visible");
        if (pinMenuHideTimer !== null) window.clearTimeout(pinMenuHideTimer);
        pinMenuHideTimer = window.setTimeout(() => {
            if (!pinMenu.classList.contains("is-visible")) pinMenu.hidden = true;
            pinMenuHideTimer = null;
        }, 300);
    }

    function showPinMenu() {
        if (pinMenuHideTimer !== null) {
            window.clearTimeout(pinMenuHideTimer);
            pinMenuHideTimer = null;
        }
        pinAction.textContent = isPinned(activeViewId) ? "Открепить" : "Закрепить";
        pinMenu.hidden = false;
        window.requestAnimationFrame(() => pinMenu.classList.add("is-visible"));
    }

    function changeView(direction) {
        hidePinMenu();
        activeViewIndex = Math.max(
            0,
            Math.min(order.length - 1, activeViewIndex + direction)
        );
        activeViewId = order[activeViewIndex];
        renderActiveView(false);
    }

    pinAction.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        preferences = toggleFinanceCarouselPin(
            preferences,
            activeViewId
        );
        saveFinanceCarouselPreferences(userId, preferences);
        order = resolveFinanceCarouselOrder(recommendation, preferences.pinnedPositions);
        activeViewIndex = order.indexOf(activeViewId);
        if (activeViewIndex < 0) {
            activeViewIndex = 0;
            activeViewId = order[0];
        }
        renderActiveView(false);
        hidePinMenu();
        carousel.focus({ preventScroll: true });
    });

    closeMenu.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        hidePinMenu();
        carousel.focus({ preventScroll: true });
    });

    pinMenu.addEventListener("click", (event) => {
        if (event.target === pinMenu) hidePinMenu();
    });

    const stopMenuClick = (event) => event.stopPropagation();
    pinMenu.querySelector(".row-interaction-menu")?.addEventListener("click", stopMenuClick);

    let pointerStartX = 0;
    let pointerStartY = 0;
    let gestureMode = "idle";
    let longPressTimer = null;
    let longPressTriggered = false;
    let gestureStartedAt = 0;
    let latestX = 0;
    let latestY = 0;

    function clearLongPressTimer() {
        if (longPressTimer !== null) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    }

    function beginGesture(x, y) {
        if (!pinMenu.hidden) hidePinMenu();
        pointerStartX = latestX = x;
        pointerStartY = latestY = y;
        gestureStartedAt = performance.now();
        gestureMode = "pending";
        longPressTriggered = false;
        clearLongPressTimer();
        longPressTimer = setTimeout(() => {
            if (gestureMode !== "pending") return;
            gestureMode = "longpress";
            longPressTriggered = true;
            showPinMenu();
        }, 550);
    }

    function moveGesture(x, y, event) {
        if (gestureMode === "idle" || gestureMode === "longpress") return;
        latestX = x;
        latestY = y;
        const dx = x - pointerStartX;
        const dy = y - pointerStartY;
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) clearLongPressTimer();
        if (gestureMode === "pending" && Math.abs(dx) >= 10 && Math.abs(dx) > Math.abs(dy) * 1.15) {
            gestureMode = "horizontal";
        } else if (gestureMode === "pending" && Math.abs(dy) >= 10 && Math.abs(dy) > Math.abs(dx)) {
            gestureMode = "vertical";
        }
        if (gestureMode === "horizontal" && event?.cancelable) event.preventDefault();
    }

    function finishGesture(x, y, allowSwipe) {
        clearLongPressTimer();
        const dx = x - pointerStartX;
        const dy = y - pointerStartY;
        const elapsed = Math.max(1, performance.now() - gestureStartedAt);
        const distanceLimit = Math.max(26, Math.min(34, carousel.clientWidth * 0.075));
        const fastFlick = Math.abs(dx) >= 18 && Math.abs(dx) / elapsed >= 0.45;
        const horizontal = Math.abs(dx) > Math.abs(dy) * 1.15;
        if (allowSwipe && gestureMode === "horizontal" && !longPressTriggered && horizontal &&
            (Math.abs(dx) >= distanceLimit || fastFlick)) {
            changeView(dx < 0 ? 1 : -1);
        }
        gestureMode = "idle";
        longPressTriggered = false;
    }

    carousel.addEventListener("touchstart", (event) => {
        if (event.touches.length !== 1) {
            clearLongPressTimer();
            gestureMode = "idle";
            return;
        }
        const touch = event.touches[0];
        beginGesture(touch.clientX, touch.clientY);
    }, { passive: true });

    carousel.addEventListener("touchmove", (event) => {
        if (event.touches.length !== 1) {
            clearLongPressTimer();
            gestureMode = "idle";
            return;
        }
        const touch = event.touches[0];
        moveGesture(touch.clientX, touch.clientY, event);
    }, { passive: false });

    carousel.addEventListener("touchend", (event) => {
        const touch = event.changedTouches[0];
        if (touch) finishGesture(touch.clientX, touch.clientY, true);
        else finishGesture(latestX, latestY, false);
    }, { passive: true });

    carousel.addEventListener("touchcancel", () => finishGesture(latestX, latestY, false), { passive: true });

    carousel.addEventListener("pointerdown", (event) => {
        if (event.pointerType === "touch") return;
        if (event.pointerType === "mouse" && event.button !== 0) return;
        beginGesture(event.clientX, event.clientY);
    });
    carousel.addEventListener("pointermove", (event) => {
        if (event.pointerType === "touch") return;
        moveGesture(event.clientX, event.clientY, event);
    }, { passive: false });
    carousel.addEventListener("pointerup", (event) => {
        if (event.pointerType === "touch") return;
        finishGesture(event.clientX, event.clientY, true);
    });
    carousel.addEventListener("pointercancel", (event) => {
        if (event.pointerType === "touch") return;
        finishGesture(latestX, latestY, false);
    });

    carousel.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        showPinMenu();
    });

    carousel.addEventListener("keydown", (event) => {
        if (event.key === "ArrowLeft") {
            event.preventDefault();
            changeView(-1);
        } else if (event.key === "ArrowRight") {
            event.preventDefault();
            changeView(1);
        } else if (event.key === "Escape") {
            hidePinMenu();
        }
    });

    renderActiveView(true);
    return section;
}

function createEntryRow(root, section, entry, onWriteAttempt, financeApplication, assetsAnalytics) {
    const row = document.createElement("div");
    row.className = "swipe-delete-item";
    row.dataset.entryId = entry.id;
    row.dataset.subblockId = section.id;

    const action = document.createElement("button");
    action.type = "button";
    action.className = "swipe-delete-action";
    action.setAttribute("aria-label", "Удалить " + entry.label);
    action.textContent = "Удалить";

    const content = document.createElement("div");
    content.className = "swipe-delete-content finance-detail-row";

    const labelGroup = document.createElement("span");
    labelGroup.className = "finance-entry-label-group";

    const label = document.createElement("span");
    label.className = "finance-entry-label";
    label.textContent = entry.label;

    labelGroup.appendChild(label);

    if (section.id === "assets") {
        const liquidity = document.createElement("span");
        liquidity.className = "finance-entry-liquidity";
        liquidity.textContent = entry.liquidity === "illiquid" ? "Неликвидный" : "Ликвидный";
        labelGroup.appendChild(liquidity);
    }

    const trailing = document.createElement("span");
    trailing.className = "finance-entry-trailing";

    const amount = document.createElement("span");
    amount.className = "finance-entry-amount";
    amount.textContent = section.id === "financial-burden"
        ? "Долг " + formatAmount(entry.debt) + (entry.isCreditProduct ? " · Платёж " + formatAmount(entry.payment) + " · " + formatAmount(entry.interestRate) + "% годовых" : "")
        : formatAmount(entry.amount) + " ₽";

    const pin = document.createElement("span");
    pin.className = "finance-entry-pin";
    pin.setAttribute("aria-hidden", "true");
    pin.innerHTML =
        '<svg viewBox="0 0 16 16" focusable="false">' +
            '<path d="M5.2 1.8h5.6l-.7 3.2 2.1 2.1v1.1H8.9v4.1l-.9 1.7-.9-1.7V8.2H3.8V7.1l2.1-2.1z"></path>' +
        "</svg>";

    trailing.append(amount, pin);
    content.append(labelGroup, trailing);
    row.append(action, content);

    attachEntryEdit(
        row,
        section.id,
        entry,
        onWriteAttempt,
        financeApplication,
        (updated) => {
            const updatedLabel = row.querySelector(".finance-entry-label");
            const updatedAmount = row.querySelector(".finance-entry-amount");

            if (updatedLabel) updatedLabel.textContent = updated.label;

            if (updatedAmount) {
                updatedAmount.textContent = section.id === "financial-burden"
                    ? "Долг " + formatAmount(updated.debt) + (updated.isCreditProduct ? " · Платёж " + formatAmount(updated.payment) + " · " + formatAmount(updated.interestRate) + "% годовых" : "")
                    : formatAmount(updated.amount) + " ₽";
            }

            if (section.id === "assets") {
                const liquidity = row.querySelector(".finance-entry-liquidity");
                if (liquidity) {
                    liquidity.textContent = updated.liquidity === "illiquid" ? "Неликвидный" : "Ликвидный";
                }
            }
        },
        () => {
            toggleEntryPinned(section.id, entry.id);
            renderFinanceData(root, section.id, onWriteAttempt, financeApplication);
        },
        () => {
            deleteFinanceEntryItem(root, row, onWriteAttempt, financeApplication, assetsAnalytics);
        },
        () => {
            if (countPinnedEntries(section.id, financeApplication) >= MAX_PINNED_ENTRIES_PER_BLOCK) {
                showSubscriptionLimitNotice();
                return true;
            }
            return false;
        }
    );

    return row;
}

function createAddForm(root, section, onWriteAttempt, financeApplication) {
    const form = document.createElement("form");
    form.className = "finance-add-form finance-detail-form";

    const labelInput = document.createElement("input");
    labelInput.className = "input-control";
    labelInput.name = "label";
    labelInput.type = "text";
    labelInput.placeholder = section.id === "assets" ? "Название актива" : "Название";
    labelInput.autocomplete = "off";
    labelInput.required = true;

    const amountInput = document.createElement("input");
    amountInput.className = "input-control";
    amountInput.name = "amount";
    amountInput.type = "number";
    amountInput.inputMode = "decimal";
    amountInput.min = "0.01";
    amountInput.step = "0.01";
    amountInput.placeholder = section.id === "financial-burden" ? "Общий долг" : "Сумма";
    amountInput.required = true;

    let assetLiquidity = "liquid";
    let liquidityControl = null;
    let assetType = "cash";
    let isReserve = false;
    let incomeEnabled = false;
    let annualYieldRateInput = null;
    let compoundingFrequency = "none";
    let assetTypeControl = null;
    let reserveControl = null;
    let incomeControl = null;
    let compoundingSelect = null;

    if (section.id === "assets") {
        liquidityControl = document.createElement("div");
        liquidityControl.className = "liquidity-switch-field";

        const label = document.createElement("span");
        label.className = "liquidity-switch-label";
        label.textContent = "Ликвидность";

        const state = document.createElement("span");
        state.className = "liquidity-switch-state";

        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "liquidity-switch";
        toggle.setAttribute("role", "switch");

        const update = () => {
            const liquid = assetLiquidity === "liquid";
            toggle.setAttribute("aria-checked", String(liquid));
            toggle.classList.toggle("is-on", liquid);
            state.textContent = liquid ? "Ликвидный" : "Неликвидный";
        };

        toggle.addEventListener("click", () => {
            assetLiquidity = assetLiquidity === "liquid" ? "illiquid" : "liquid";
            update();
        });

        liquidityControl.append(label, state, toggle);
        update();
    }

    if (section.id === "assets") {
        assetTypeControl = document.createElement("select");
        assetTypeControl.className = "input-control";
        assetTypeControl.name = "assetType";
        [
            ["cash", "Денежные средства"],
            ["bank-account", "Банковский счёт"],
            ["real-estate", "Недвижимость"],
            ["vehicle", "Транспорт"],
            ["bank-deposit", "Банковский вклад"],
            ["bond", "Облигации"],
            ["investment", "Инвестиции"],
            ["other", "Другое"]
        ].forEach(([value, label]) => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = label;
            assetTypeControl.appendChild(option);
        });

        reserveControl = document.createElement("div");
        reserveControl.className = "liquidity-switch-field";
        const reserveLabel = document.createElement("span");
        reserveLabel.className = "liquidity-switch-label";
        reserveLabel.textContent = "Финансовый резерв";
        const reserveState = document.createElement("span");
        reserveState.className = "liquidity-switch-state";
        const reserveToggle = document.createElement("button");
        reserveToggle.type = "button";
        reserveToggle.className = "liquidity-switch";
        reserveToggle.setAttribute("role", "switch");
        const updateReserve = () => {
            reserveToggle.setAttribute("aria-checked", String(isReserve));
            reserveToggle.classList.toggle("is-on", isReserve);
            reserveState.textContent = isReserve ? "Да" : "Нет";
        };
        reserveToggle.addEventListener("click", () => {
            isReserve = !isReserve;
            updateReserve();
        });
        reserveControl.append(reserveLabel, reserveState, reserveToggle);
        updateReserve();

        incomeControl = document.createElement("div");
        incomeControl.className = "liquidity-switch-field";
        const incomeLabel = document.createElement("span");
        incomeLabel.className = "liquidity-switch-label";
        incomeLabel.textContent = "Доходный актив";
        const incomeState = document.createElement("span");
        incomeState.className = "liquidity-switch-state";
        const incomeToggle = document.createElement("button");
        incomeToggle.type = "button";
        incomeToggle.className = "liquidity-switch";
        incomeToggle.setAttribute("role", "switch");

        annualYieldRateInput = document.createElement("input");
        annualYieldRateInput.className = "input-control";
        annualYieldRateInput.name = "annualYieldRate";
        annualYieldRateInput.type = "number";
        annualYieldRateInput.inputMode = "decimal";
        annualYieldRateInput.min = "0";
        annualYieldRateInput.step = "0.01";
        annualYieldRateInput.placeholder = "Доходность, % годовых";
        annualYieldRateInput.hidden = true;

        compoundingSelect = document.createElement("select");
        compoundingSelect.className = "input-control";
        compoundingSelect.name = "compoundingFrequency";
        [
            ["none", "Без капитализации"],
            ["monthly", "Капитализация ежемесячно"],
            ["quarterly", "Капитализация ежеквартально"],
            ["annual", "Капитализация ежегодно"]
        ].forEach(([value, label]) => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = label;
            compoundingSelect.appendChild(option);
        });
        compoundingSelect.hidden = true;

        const updateIncome = () => {
            incomeToggle.setAttribute("aria-checked", String(incomeEnabled));
            incomeToggle.classList.toggle("is-on", incomeEnabled);
            incomeState.textContent = incomeEnabled ? "Включён" : "Выключен";
            annualYieldRateInput.hidden = !incomeEnabled;
            compoundingSelect.hidden = !incomeEnabled;
            annualYieldRateInput.required = incomeEnabled;
        };
        incomeToggle.addEventListener("click", () => {
            incomeEnabled = !incomeEnabled;
            updateIncome();
        });
        incomeControl.append(incomeLabel, incomeState, incomeToggle);
        updateIncome();

        assetTypeControl.addEventListener("change", () => {
            if (assetTypeControl.value === "bank-deposit" || assetTypeControl.value === "bond") {
                incomeEnabled = true;
                updateIncome();
            }
        });
        assetTypeControl.addEventListener("change", () => {
            assetType = assetTypeControl.value;
        });
    }

    let isCreditProduct = false;
    let creditProductControl = null;

    const paymentInput = section.id === "financial-burden"
        ? document.createElement("input")
        : null;
    const interestRateInput = section.id === "financial-burden"
        ? document.createElement("input")
        : null;

    if (section.id === "financial-burden") {
        creditProductControl = document.createElement("div");
        creditProductControl.className = "liquidity-switch-field";

        const label = document.createElement("span");
        label.className = "liquidity-switch-label";
        label.textContent = "Кредитный продукт";

        const state = document.createElement("span");
        state.className = "liquidity-switch-state";

        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "liquidity-switch";
        toggle.setAttribute("role", "switch");

        const updateCreditProduct = () => {
            toggle.setAttribute("aria-checked", String(isCreditProduct));
            toggle.classList.toggle("is-on", isCreditProduct);
            state.textContent = isCreditProduct ? "Включён" : "Выключен";
            paymentInput.hidden = !isCreditProduct;
            interestRateInput.hidden = !isCreditProduct;
            paymentInput.required = isCreditProduct;
            interestRateInput.required = isCreditProduct;
        };

        toggle.addEventListener("click", () => {
            isCreditProduct = !isCreditProduct;
            updateCreditProduct();
        });

        creditProductControl.append(label, state, toggle);
        updateCreditProduct();
    }

    if (paymentInput) {
        paymentInput.className = "input-control";
        paymentInput.name = "payment";
        paymentInput.type = "number";
        paymentInput.inputMode = "decimal";
        paymentInput.min = "0";
        paymentInput.step = "0.01";
        paymentInput.placeholder = "Регулярный платёж";
        paymentInput.required = false;
    }

    if (interestRateInput) {
        interestRateInput.className = "input-control";
        interestRateInput.name = "interestRate";
        interestRateInput.type = "number";
        interestRateInput.inputMode = "decimal";
        interestRateInput.min = "0";
        interestRateInput.step = "0.01";
        interestRateInput.placeholder = "Процентная ставка, % годовых";
        interestRateInput.required = false;
    }

    if (section.id === "financial-burden") {
        paymentInput.hidden = true;
        interestRateInput.hidden = true;
    }

    const submit = document.createElement("button");
    submit.className = "button-control";
    submit.type = "submit";
    submit.textContent = "Добавить";

    const error = document.createElement("p");
    error.className = "finance-form-error";
    error.hidden = true;

    form.append(labelInput, amountInput);

    if (section.id === "assets") {
        const advancedDetails = document.createElement("details");
        advancedDetails.className = "finance-progressive-details";

        const summary = document.createElement("summary");
        summary.className = "finance-progressive-summary";
        summary.textContent = "Дополнительные параметры";

        const advancedBody = document.createElement("div");
        advancedBody.className = "finance-progressive-body";
        advancedBody.append(
            assetTypeControl,
            liquidityControl,
            reserveControl,
            incomeControl,
            annualYieldRateInput,
            compoundingSelect
        );

        advancedDetails.append(summary, advancedBody);
        form.appendChild(advancedDetails);
    }

    if (creditProductControl) form.appendChild(creditProductControl);
    if (paymentInput) form.appendChild(paymentInput);
    if (interestRateInput) form.appendChild(interestRateInput);
    form.append(submit, error);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        error.hidden = true;

        const save = async () => {
            try {
                if (section.id === "financial-burden") {
                    await financeApplication.addFinancialBurdenEntry(
                        labelInput.value,
                        amountInput.value,
                        isCreditProduct ? paymentInput.value : null,
                        isCreditProduct,
                        isCreditProduct ? interestRateInput.value : null
                    );
                } else {
                    await financeApplication.addFinanceEntry(
                        section.id,
                        labelInput.value,
                        amountInput.value,
                        assetLiquidity,
                        {
                            assetType,
                            isReserve,
                            incomeEnabled,
                            annualYieldRate: incomeEnabled ? annualYieldRateInput.value : null,
                            compoundingFrequency: incomeEnabled ? compoundingSelect.value : "none"
                        }
                    );
                }

                renderFinanceData(root, section.id, onWriteAttempt, financeApplication);
            } catch (formError) {
                error.textContent = formError.message;
                error.hidden = false;
            }
        };

        if (typeof onWriteAttempt === "function") {
            onWriteAttempt(save);
        } else {
            save();
        }
    });

    return form;
}

function finalizeDeletedItem(root, item, financeApplication, assetsAnalytics, onWriteAttempt = null) {
    const entryList = item.closest(".finance-entry-list");
    item.remove();

    if (entryList && entryList.children.length === 0) {
        const empty = document.createElement("div");
        empty.className = "list-empty";
        empty.innerHTML = '<span class="list-empty-label">EMPTY STATE</span><p>Данных пока нет. Добавьте первую запись.</p>';
        entryList.appendChild(empty);
    }

    renderFinanceData(root, item.dataset.subblockId, onWriteAttempt, financeApplication);
}

function deleteFinanceEntryItem(root, item, onWriteAttempt = null, financeApplication = null, assetsAnalytics = null) {
    const operationId = beginOperation("finance.delete", {
        subblockId: item.dataset.subblockId,
        entryId: item.dataset.entryId
    });

    const remove = () => {
        item.classList.add("is-deleting");
        item.style.setProperty("--delete-height", item.getBoundingClientRect().height + "px");

        window.setTimeout(async () => {
            try {
                const result = await financeApplication.removeFinanceEntry(
                    item.dataset.subblockId,
                    item.dataset.entryId
                );

                pinnedEntries.delete(getEntryKey(item.dataset.subblockId, item.dataset.entryId));
                finalizeDeletedItem(root, item, financeApplication, assetsAnalytics, onWriteAttempt);
                endOperation(operationId, result ? "completed" : "not_found");
            } catch (error) {
                item.classList.remove("is-deleting");
                endOperation(operationId, "failed");
                throw error;
            }
        }, 230);
    };

    if (typeof onWriteAttempt === "function") {
        onWriteAttempt(remove);
        return;
    }

    remove();
}

function attachSwipeDelete(root, onWriteAttempt = null, financeApplication = null, assetsAnalytics = null) {
    root.querySelectorAll(".swipe-delete-item").forEach((item) => {
        const content = item.querySelector(".swipe-delete-content");
        const action = item.querySelector(".swipe-delete-action");
        if (!content || !action) return;

        let startX = 0;
        let currentX = 0;
        let startY = 0;
        let tracking = false;
        let horizontalSwipe = false;
        let opened = false;

        const setOffset = (offset, animated = false) => {
            content.style.setProperty("--swipe-offset", offset + "px");
            content.classList.toggle("is-swiping", !animated);
        };

        const open = () => {
            opened = true;
            item.classList.add("is-delete-ready");
            setOffset(-88, true);
        };

        const close = () => {
            opened = false;
            item.classList.remove("is-delete-ready");
            setOffset(0, true);
        };

        action.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            deleteFinanceEntryItem(root, item, onWriteAttempt, financeApplication, assetsAnalytics);
        });

        content.addEventListener("pointerdown", (event) => {
            if (event.pointerType === "mouse" && event.button !== 0) return;
            startX = event.clientX;
            currentX = startX;
            startY = event.clientY;
            tracking = true;
            horizontalSwipe = false;
            content.classList.add("is-swiping");
            content.setPointerCapture?.(event.pointerId);
        });

        content.addEventListener("pointermove", (event) => {
            if (!tracking) return;

            currentX = event.clientX;
            const deltaX = currentX - startX;
            const deltaY = event.clientY - startY;

            if (!horizontalSwipe && Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
                tracking = false;
                close();
                return;
            }

            if (deltaX < -8 || opened) {
                horizontalSwipe = true;
                const base = opened ? -88 : 0;
                const offset = Math.min(0, Math.max(deltaX + base, -88));
                setOffset(offset);
            }
        });

        const finishSwipe = () => {
            if (!tracking) return;
            tracking = false;
            content.classList.remove("is-swiping");

            const distance = currentX - startX;

            if (opened && distance > 28) {
                close();
                return;
            }

            if (!opened && distance <= -56) {
                open();
                return;
            }

            opened ? open() : close();
        };

        content.addEventListener("pointerup", finishSwipe);
        content.addEventListener("pointercancel", finishSwipe);
    });
}


function formatSnapshotDate(timestamp) {
    return new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    }).format(timestamp ? new Date(timestamp) : new Date()).toUpperCase();
}

function createAssetsSummary(root, onWriteAttempt = null, financeApplication = null, assetsAnalytics = null) {
    const wrapper = document.createElement("div");
    wrapper.className = "assets-summary";

    const statistics = assetsAnalytics
        ? assetsAnalytics.getAssetsAnalytics(assetsAnalytics.getAssetsAnalyticsRange("month"))
        : { current: null };

    const heading = document.createElement("div");
    heading.className = "assets-summary-heading";

    const title = document.createElement("span");
    title.className = "statistics-meta";
    title.textContent = "СОСТОЯНИЕ";

    const statisticsButton = document.createElement("button");
    statisticsButton.type = "button";
    statisticsButton.className = "assets-statistics-trigger";
    statisticsButton.innerHTML = '<span>Аналитика</span><span aria-hidden="true">›</span>';

    statisticsButton.addEventListener("click", () => {
        if (!assetsAnalytics) {
            if (typeof onWriteAttempt === "function") onWriteAttempt(() => {});
            return;
        }

        const renderAnalytics = () => renderAssetsStatisticsScreen(
            root,
            () => renderFinanceData(root, "assets", onWriteAttempt, financeApplication),
            assetsAnalytics,
            financeApplication,
            onWriteAttempt,
            {
                isPinned: (entryId) => isEntryPinned("assets", entryId),
                onChanged: renderAnalytics,
                onPin: (entryId) => {
                    toggleEntryPinned("assets", entryId);
                },
                onDelete: (entryId) => {
                    const remove = async () => {
                        const result = await financeApplication.removeFinanceEntry("assets", entryId);
                        if (!result) return;

                        pinnedEntries.delete(getEntryKey("assets", entryId));
                        renderAnalytics();
                    };

                    if (typeof onWriteAttempt === "function") {
                        onWriteAttempt(remove);
                    } else {
                        remove();
                    }
                },
                onPinLimit: (entryId) => {
                    if (isEntryPinned("assets", entryId)) return false;
                    if (countPinnedEntries("assets", financeApplication) >= MAX_PINNED_ENTRIES_PER_BLOCK) {
                        showSubscriptionLimitNotice();
                        return true;
                    }
                    return false;
                }
            }
        );

        renderAnalytics();
    });

    heading.append(title, statisticsButton);

    const amountRow = document.createElement("div");
    amountRow.className = "assets-total-row";

    const amount = document.createElement("span");
    amount.className = "assets-total-value";
    const amountText = formatAmount(statistics.current?.total ?? 0) + " ₽";
    amount.textContent = amountText;

    const numericLength = amountText.replace(/\D/g, "").length;
    const fontSize = Math.max(
        1.45,
        Math.min(2.6, 2.6 - Math.max(0, numericLength - 7) * 0.12)
    );
    amount.style.fontSize = fontSize + "rem";

    amountRow.appendChild(amount);

    const date = document.createElement("span");
    date.className = "statistics-meta assets-summary-date";
    date.textContent = formatSnapshotDate(statistics.current?.occurredAt);

    wrapper.append(heading, amountRow, date);
    return wrapper;
}

function createFinancialStabilityIndexPanel(financeApplication) {
    const result = financeApplication.getFinancialStabilityIndex();

    const wrapper = document.createElement("div");
    wrapper.className = "financial-stability-index-panel";

    const eyebrow = document.createElement("span");
    eyebrow.className = "financial-stability-index-eyebrow";
    eyebrow.textContent = "FSI 4.1";

    const scoreRow = document.createElement("div");
    scoreRow.className = "financial-stability-index-score-row";

    const value = document.createElement("span");
    value.className = "financial-stability-index-value";
    value.textContent = result.value + "/100";

    const category = document.createElement("span");
    category.className = "financial-stability-index-category";
    category.textContent = result.category?.label || "—";

    scoreRow.append(value, category);

    const description = document.createElement("p");
    description.className = "financial-stability-index-description";
    description.textContent = "Сводная оценка финансовой устойчивости по денежному потоку, ликвидности, резерву, долговой устойчивости, капиталу и финансовому тренду.";

    const components = document.createElement("div");
    components.className = "financial-stability-index-components";

    [
        ["Финансовая сила", result.components.financialStrength, "/100"],
        ["Стабильность", result.components.stabilityFactor, "/1"],
        ["Финансовая выживаемость", result.diagnostics.survivalMonths, " мес."],
        ["Покрытие расходов", result.diagnostics.incomeCoverage, "×"],
        ["Долговая нагрузка", result.diagnostics.debtBurdenRatio, "×"],
        ["Долговая экспозиция", result.diagnostics.debtExposureRatio, "×"]
    ].forEach(([name, componentValue, suffix]) => {
        const item = document.createElement("div");
        item.className = "financial-stability-index-component";

        const itemName = document.createElement("span");
        itemName.textContent = name;

        const itemValue = document.createElement("span");
        itemValue.textContent = componentValue === null || componentValue === undefined
            ? "—"
            : (typeof componentValue === "number"
                ? componentValue.toFixed(1)
                : componentValue) + suffix;

        item.append(itemName, itemValue);
        components.appendChild(item);
    });

    wrapper.append(eyebrow, scoreRow, description, components);
    return wrapper;
}

function createSectionSummary(root, subblock, onWriteAttempt, financeApplication, financeAnalytics) {
    const wrapper = document.createElement("div");
    wrapper.className = "assets-summary finance-section-summary";

    const heading = document.createElement("div");
    heading.className = "assets-summary-heading";

    const title = document.createElement("span");
    title.className = "statistics-meta";
    title.textContent = "СОСТОЯНИЕ";

    const statisticsButton = document.createElement("button");
    statisticsButton.type = "button";
    statisticsButton.className = "assets-statistics-trigger";
    statisticsButton.innerHTML = '<span>Аналитика</span><span aria-hidden="true">›</span>';

    statisticsButton.addEventListener("click", () => {
        if (!financeAnalytics) return;

        const renderAnalytics = () => renderSectionAnalyticsScreen(
            root,
            () => renderFinanceData(root, subblock.id, onWriteAttempt, financeApplication),
            subblock,
            financeAnalytics,
            financeApplication,
            onWriteAttempt,
            {
                isPinned: (entryId) => isEntryPinned(subblock.id, entryId),
                onChanged: renderAnalytics,
                onPin: (entryId) => toggleEntryPinned(subblock.id, entryId),
                onDelete: (entryId) => {
                    const remove = async () => {
                        const result = await financeApplication.removeFinanceEntry(subblock.id, entryId);
                        if (!result) return;
                        pinnedEntries.delete(getEntryKey(subblock.id, entryId));
                        renderAnalytics();
                    };

                    if (typeof onWriteAttempt === "function") {
                        onWriteAttempt(remove);
                    } else {
                        remove();
                    }
                },
                onPinLimit: () => {
                    if (countPinnedEntries(subblock.id, financeApplication) >= MAX_PINNED_ENTRIES_PER_BLOCK) {
                        showSubscriptionLimitNotice();
                        return true;
                    }
                    return false;
                }
            }
        );

        renderAnalytics();
    });

    heading.append(title, statisticsButton);

    const statistics = financeAnalytics.getFinanceAnalytics(
        financeAnalytics.getFinanceAnalyticsRange("month")
    );
    const metric = statistics.metrics[subblock.id];

    const amountRow = document.createElement("div");
    amountRow.className = "assets-total-row";

    const amount = document.createElement("span");
    amount.className = "assets-total-value";
    amount.textContent = formatAmount(metric?.current ?? getSectionTotal(financeApplication, subblock.id)) + " ₽";

    amountRow.appendChild(amount);

    const date = document.createElement("span");
    date.className = "statistics-meta assets-summary-date";
    date.textContent = "Срез · " + formatSnapshotDate(metric?.current !== null && metric?.current !== undefined ? statistics.endDate : null);

    wrapper.append(heading, amountRow, date);
    return wrapper;
}

function createSubblock(root, subblock, isOpen, onWriteAttempt = null, financeApplication = null, assetsAnalytics = null, financeAnalytics = null) {
    const wrapper = document.createElement("article");
    wrapper.className = "accordion-item finance-subblock" + (isOpen ? " is-open" : "");
    wrapper.dataset.subblock = subblock.id;

    const button = document.createElement("button");
    button.className = "accordion-trigger";
    button.type = "button";
    button.setAttribute("aria-expanded", String(isOpen));
    button.setAttribute("aria-controls", subblock.id + "-content");

    button.innerHTML =
        '<span class="accordion-index">' + subblock.number + "</span>" +
        '<span class="accordion-title-group">' +
            '<span class="accordion-title">' + subblock.title + "</span>" +
            '<span class="accordion-description">' + subblock.description + "</span>" +
        "</span>";

    const header = document.createElement("div");
    header.className = "accordion-header";

    const infoTooltip = createInfoTooltip({
        label: "Информация: " + subblock.title,
        text: subblock.info
    });

    header.append(button, infoTooltip);

    const content = document.createElement("div");
    content.className = "accordion-content" + (isOpen ? " is-open" : "");
    content.id = subblock.id + "-content";
    content.hidden = false;

    if (subblock.id === "financial-stability-index") {
        if (financeApplication) {
            content.appendChild(createFinancialStabilityIndexPanel(financeApplication));
        }
    }

    if (subblock.id === "assets") {
        content.appendChild(createAssetsSummary(root, onWriteAttempt, financeApplication, assetsAnalytics));
    }

    if (subblock.id !== "assets" && subblock.id !== "financial-stability-index" && financeAnalytics) {
        content.appendChild(createSectionSummary(root, subblock, onWriteAttempt, financeApplication, financeAnalytics));
    }

    if (subblock.id !== "financial-stability-index") {
        content.appendChild(createAddForm(root, subblock, onWriteAttempt, financeApplication));
    }

    wrapper.append(header, content);

    button.addEventListener("click", () => {
        const nextOpen = button.getAttribute("aria-expanded") !== "true";
        renderFinanceData(root, nextOpen ? subblock.id : null, onWriteAttempt, financeApplication);
    });

    return wrapper;
}


function createFinanceVoiceEntry(root, onWriteAttempt, financeApplication) {
    const panel = document.createElement("section");
    panel.className = "finance-voice-entry";
    panel.setAttribute("aria-label", "Голосовой помощник для финансовых данных");

    const heading = document.createElement("div");
    heading.className = "finance-voice-entry-heading";

    const title = document.createElement("strong");
    title.textContent = "Голосовой помощник";

    const hint = document.createElement("p");
    hint.textContent = "Добавляйте и удаляйте доходы, расходы, долги и активы голосом. LifeGame распознает вашу команду и поможет указать категорию.";

    heading.append(title, hint);

    const voiceControl = document.createElement("div");
    voiceControl.className = "finance-voice-control";

    const voiceButton = document.createElement("button");
    voiceButton.type = "button";
    voiceButton.className = "finance-voice-button";
    voiceButton.textContent = "🎙 Голосовой ввод";
    voiceButton.setAttribute("aria-label", "Добавить финансовую запись голосом");

    const status = document.createElement("p");
    status.className = "finance-voice-status";
    status.setAttribute("aria-live", "polite");
    status.hidden = true;

    const preview = document.createElement("form");
    preview.className = "finance-voice-preview";
    preview.hidden = true;

    const labelInput = document.createElement("input");
    labelInput.className = "input-control";
    labelInput.name = "label";
    labelInput.type = "text";
    labelInput.autocomplete = "off";
    labelInput.placeholder = "Название записи";
    labelInput.required = true;

    const amountInput = document.createElement("input");
    amountInput.className = "input-control";
    amountInput.name = "amount";
    amountInput.type = "number";
    amountInput.inputMode = "decimal";
    amountInput.min = "0.01";
    amountInput.step = "0.01";
    amountInput.placeholder = "Сумма, ₽";
    amountInput.required = true;

    const categorySelect = document.createElement("select");
    categorySelect.className = "input-control";
    categorySelect.name = "category";
    categorySelect.required = true;

    const placeholderOption = document.createElement("option");
    placeholderOption.value = "";
    placeholderOption.textContent = "Выберите категорию";
    categorySelect.appendChild(placeholderOption);

    FINANCE_DATA_SUBBLOCKS.forEach((item) => {
        const option = document.createElement("option");
        option.value = item.id;
        option.textContent = item.number + " · " + item.title;
        categorySelect.appendChild(option);
    });

    const creditPaymentInput = document.createElement("input");
    creditPaymentInput.className = "input-control";
    creditPaymentInput.name = "creditPayment";
    creditPaymentInput.type = "number";
    creditPaymentInput.inputMode = "decimal";
    creditPaymentInput.min = "0";
    creditPaymentInput.step = "0.01";
    creditPaymentInput.placeholder = "Ежемесячный платёж, ₽";
    creditPaymentInput.hidden = true;

    const creditRateInput = document.createElement("input");
    creditRateInput.className = "input-control";
    creditRateInput.name = "creditInterestRate";
    creditRateInput.type = "number";
    creditRateInput.inputMode = "decimal";
    creditRateInput.min = "0";
    creditRateInput.step = "0.01";
    creditRateInput.placeholder = "Ставка, % годовых";
    creditRateInput.hidden = true;

    const creditDetailsHint = document.createElement("p");
    creditDetailsHint.className = "finance-voice-status";
    creditDetailsHint.textContent = "Для кредитного продукта укажите ежемесячный платёж и ставку, чтобы LifeGame мог корректно рассчитать его параметры.";
    creditDetailsHint.hidden = true;

    const updateCreditDetailsVisibility = () => {
        const isCreditProduct = categorySelect.value === "financial-burden"
            && isCreditProductLabel(labelInput.value);
        creditPaymentInput.hidden = !isCreditProduct;
        creditRateInput.hidden = !isCreditProduct;
        creditDetailsHint.hidden = !isCreditProduct;
        creditPaymentInput.required = isCreditProduct;
        creditRateInput.required = isCreditProduct;
    };

    labelInput.addEventListener("input", updateCreditDetailsVisibility);
    categorySelect.addEventListener("change", updateCreditDetailsVisibility);

    const actions = document.createElement("div");
    actions.className = "finance-voice-preview-actions";

    const saveButton = document.createElement("button");
    saveButton.className = "button-control";
    saveButton.type = "submit";
    saveButton.textContent = "Подтвердить и добавить";

    const cancelButton = document.createElement("button");
    cancelButton.className = "finance-text-action";
    cancelButton.type = "button";
    cancelButton.textContent = "Отмена";
    cancelButton.addEventListener("click", () => {
        preview.reset();
        preview.hidden = true;
        status.hidden = true;
    });

    actions.append(saveButton, cancelButton);
    preview.append(
        labelInput,
        amountInput,
        categorySelect,
        creditDetailsHint,
        creditPaymentInput,
        creditRateInput,
        actions
    );

    const speech = createSpeechRecognition({
        onStart() {
            voiceButton.disabled = true;
            voiceButton.textContent = "Слушаю…";
            status.hidden = false;
            status.textContent = "Произнесите фразу целиком. После паузы распознавание завершится.";
            preview.hidden = true;
        },
        async onResult(transcript) {
            status.hidden = false;
            const voiceAction = parseFinanceVoiceAction(transcript);
            if (voiceAction) {
                preview.hidden = true;
                const target = voiceAction.target.toLocaleLowerCase("ru-RU");
                const candidates = financeApplication.listFinanceEntries("financial-burden")
                    .filter((entry) => entry.status !== "closed")
                    .filter((entry) => {
                        const label = String(entry.label || "").toLocaleLowerCase("ru-RU");
                        return label.includes(target) || target.includes(label);
                    });
                if (candidates.length === 0) {
                    status.textContent = "Не нашёл активное обязательство «" + voiceAction.target + "». Проверьте название в разделе «Финансовая нагрузка».";
                    return;
                }
                if (candidates.length > 1) {
                    status.textContent = "Нашёл несколько подходящих обязательств: " + candidates.map((entry) => entry.label).join(", ") + ". Уточните название и повторите команду.";
                    return;
                }
                const candidate = candidates[0];
                if (!(await confirmFinancialBurdenClosure(candidate))) {
                    status.textContent = "Закрытие отменено. Данные и FSI не изменены.";
                    return;
                }
                try {
                    const closed = await financeApplication.closeFinancialBurdenEntry(candidate.id);
                    if (!closed) {
                        status.textContent = "Не удалось закрыть обязательство. Обновите данные и попробуйте ещё раз.";
                        return;
                    }
                    const successMessage = "Обязательство «" + candidate.label + "» закрыто. Текущая финансовая нагрузка пересчитана; FSI отражает изменение с учётом остальных показателей.";
                    renderFinanceData(root, "financial-burden", onWriteAttempt, financeApplication);
                    const refreshedStatus = root.querySelector(".finance-voice-status");
                    if (refreshedStatus) {
                        refreshedStatus.hidden = false;
                        refreshedStatus.textContent = successMessage;
                    }
                } catch (error) {
                    status.textContent = error?.message || "Не удалось сохранить закрытие обязательства.";
                }
                return;
            }
            const speechResult = parseFinanceVoiceCommand(transcript);
            if (!speechResult) {
                preview.hidden = true;
                status.textContent = "Не удалось уверенно выделить сумму. Попробуйте назвать предмет или операцию и сумму, например: «Купил машину за полтора миллиона рублей».";
                return;
            }

            labelInput.value = speechResult.label || "";
            amountInput.value = String(speechResult.amount);
            categorySelect.value = speechResult.sectionId || "";
            updateCreditDetailsVisibility();
            preview.hidden = false;

            status.textContent = speechResult.sectionId
                ? "Предварительный результат распознан. Проверьте название, сумму и предложенную категорию перед сохранением."
                : "Сумма распознана, но категорию нельзя определить достаточно уверенно. Выберите её вручную перед сохранением.";
        },
        onError(message) {
            status.hidden = false;
            status.textContent = message;
        },
        onEnd() {
            voiceButton.disabled = false;
            voiceButton.textContent = "🎙 Голосовой ввод";
        }
    });

    voiceButton.addEventListener("click", () => {
        if (!speech) {
            status.hidden = false;
            status.textContent = "Распознавание речи не поддерживается этим браузером. Используйте ручное добавление в нужной категории.";
            return;
        }
        speech.start();
    });

    preview.addEventListener("submit", (event) => {
        event.preventDefault();
        status.hidden = false;

        const sectionId = categorySelect.value;
        const label = labelInput.value.trim();
        const amount = Number(amountInput.value);
        if (!FINANCE_DATA_SUBBLOCKS.some((item) => item.id === sectionId)) {
            status.textContent = "Выберите финансовую категорию перед сохранением.";
            categorySelect.focus({ preventScroll: true });
            return;
        }
        if (!label || !Number.isFinite(amount) || amount <= 0) {
            status.textContent = "Проверьте название и сумму. Сумма должна быть больше нуля.";
            return;
        }

        const save = async () => {
            saveButton.disabled = true;
            try {
                if (sectionId === "financial-burden") {
                    const isCreditProduct = isCreditProductLabel(label);
                    if (isCreditProduct && (
                        creditPaymentInput.value === ""
                        || creditRateInput.value === ""
                        || !Number.isFinite(Number(creditPaymentInput.value))
                        || !Number.isFinite(Number(creditRateInput.value))
                        || Number(creditPaymentInput.value) < 0
                        || Number(creditRateInput.value) < 0
                    )) {
                        status.textContent = "Для кредитного продукта укажите ежемесячный платёж и ставку. Оба значения должны быть неотрицательными.";
                        saveButton.disabled = false;
                        return;
                    }
                    await financeApplication.addFinancialBurdenEntry(
                        label,
                        amount,
                        isCreditProduct ? creditPaymentInput.value : null,
                        isCreditProduct,
                        isCreditProduct ? creditRateInput.value : null
                    );
                } else {
                    const labelText = label.toLocaleLowerCase("ru-RU");
                    const assetType = /машин|автомобил|транспорт|мотоцикл/u.test(labelText)
                        ? "vehicle"
                        : /квартир|недвижим|дом|земельн/u.test(labelText)
                            ? "real-estate"
                            : /вклад/u.test(labelText)
                                ? "bank-deposit"
                                : /облигац/u.test(labelText)
                                    ? "bond"
                                    : /сч[её]т|карта/u.test(labelText)
                                        ? "bank-account"
                                        : "cash";
                    const liquidity = sectionId === "assets" && ["vehicle", "real-estate"].includes(assetType)
                        ? "illiquid"
                        : "liquid";

                    await financeApplication.addFinanceEntry(
                        sectionId,
                        label,
                        amount,
                        liquidity,
                        {
                            assetType,
                            isReserve: false,
                            incomeEnabled: false,
                            annualYieldRate: null,
                            compoundingFrequency: "none"
                        }
                    );
                }

                renderFinanceData(root, sectionId, onWriteAttempt, financeApplication);
            } catch (error) {
                status.textContent = error?.message || "Не удалось сохранить запись. Проверьте данные и попробуйте ещё раз.";
                saveButton.disabled = false;
            }
        };

        if (typeof onWriteAttempt === "function") {
            onWriteAttempt(save);
        } else {
            save();
        }
    });

    voiceControl.append(voiceButton, status);
    panel.append(heading, voiceControl, preview);
    return panel;
}

function renderFinanceData(root, activeSectionId = null, onWriteAttempt = null, financeApplication = null, options = {}) {
    if (!root) {
        throw new Error("LifeGame Finance: presentation root was not found.");
    }

    options = resolveFinanceRenderOptions(root, options);
    const showPresentationHeader = options.showPresentationHeader !== false;

    root.replaceChildren();

    const assetsAnalytics = financeApplication
        ? createAssetsAnalytics({ financeApplication })
        : null;
    const financeAnalytics = financeApplication
        ? createFinanceAnalytics({ financeApplication })
        : null;

    const page = document.createElement("section");
    page.className = "finance-workspace finance-data-screen";
    page.setAttribute("aria-label", "Finance data");

    const intro = document.createElement("header");
    intro.className = "finance-workspace-header";

    const title = document.createElement("h2");
    title.textContent = "Финансовые данные";

    const description = document.createElement("p");
    description.textContent = activeSectionId
        ? "Управление выбранной системой."
        : "Фиксируйте капитал, доходы, обязательства и резерв. На их основе система показывает финансовую устойчивость, её динамику и точки для улучшения.";

    const back = document.createElement("button");
    back.type = "button";
    back.className = "finance-text-action";
    back.textContent = "← Finance";
    back.addEventListener("click", () => {
        renderFinance(root, onWriteAttempt, financeApplication, options);
    });

    intro.append(title, description);

    const backNavigation = document.createElement("div");
    backNavigation.className = "finance-data-back";
    backNavigation.appendChild(back);

    page.append(backNavigation, intro);

    if (!financeApplication) {
        root.appendChild(page);
        return;
    }

    const list = document.createElement("div");
    list.className = "accordion-list finance-data-accordion";

    FINANCE_DATA_SUBBLOCKS.forEach((subblock) => {
        list.appendChild(
            createSubblock(
                root,
                subblock,
                subblock.id === activeSectionId,
                onWriteAttempt,
                financeApplication,
                assetsAnalytics,
                financeAnalytics
            )
        );
    });

    page.appendChild(createFinanceVoiceEntry(root, onWriteAttempt, financeApplication));
    page.appendChild(list);
    root.appendChild(page);
    attachSwipeDelete(root, onWriteAttempt, financeApplication, assetsAnalytics);
}

function renderFinance(root, onWriteAttempt = null, financeApplication = null, options = {}) {
    if (!root) {
        throw new Error("LifeGame Finance: presentation root was not found.");
    }

    options = resolveFinanceRenderOptions(root, options);
    const showPresentationHeader = options.showPresentationHeader !== false;

    root.replaceChildren();

    const assetsAnalytics = financeApplication
        ? createAssetsAnalytics({ financeApplication })
        : null;
    const financeAnalytics = financeApplication
        ? createFinanceAnalytics({ financeApplication })
        : null;

    const page = document.createElement("section");
    page.className = "finance-workspace";
    page.setAttribute("aria-label", "Finance");

    const intro = document.createElement("header");
    intro.className = "finance-workspace-header";

    const eyebrow = document.createElement("span");
    eyebrow.className = "finance-section-meta";
    eyebrow.textContent = "FINANCE";

    const title = document.createElement("h2");
    title.textContent = "Финансовая система";

    const description = document.createElement("p");
    description.textContent = "Понимайте состояние своих финансов и управляйте ими как единой системой.";

    intro.append(eyebrow, title, description);

    if (!financeApplication) {
        page.append(intro);
        root.appendChild(page);
        return;
    }

    page.append(
        ...(showPresentationHeader ? [intro] : []),
        createHealthBlock(financeApplication),
        createCapitalBlock(financeApplication, assetsAnalytics, root, onWriteAttempt, options)
    );

    const data = document.createElement("section");
    data.className = "finance-data-entry";

    const copy = document.createElement("div");
    copy.className = "finance-data-entry-copy";

    const dataTitle = document.createElement("strong");
    dataTitle.textContent = "Управление финансовыми данными";

    const dataDescription = document.createElement("p");
    dataDescription.textContent = "Добавление, редактирование и удаление записей.";

    copy.append(dataTitle, dataDescription);

    const action = document.createElement("button");
    action.type = "button";
    action.className = "finance-text-action";
    action.textContent = "Открыть →";
    action.addEventListener("click", () => {
        renderFinanceData(root, null, onWriteAttempt, financeApplication, options);
    });

    data.append(copy, action);
    page.appendChild(data);

    root.appendChild(page);
    attachSwipeDelete(root, onWriteAttempt, financeApplication, assetsAnalytics);
}

export { renderFinance, renderFinanceData, attachSwipeDelete, deleteFinanceEntryItem };
