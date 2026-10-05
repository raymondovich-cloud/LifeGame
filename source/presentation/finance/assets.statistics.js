// assets.statistics.js — Version 3.1

import { canAccessAssetsAnalyticsRange } from "../../application/finance/assets.analytics.access.js";
import { showSubscriptionLimitNotice } from "../shared/subscription.limit.js";

const PERIODS = Object.freeze([
    { id: "week", label: "Неделя" },
    { id: "month", label: "Месяц" },
    { id: "year", label: "Год" },
    { id: "custom", label: "Свой период" },
    { id: "all-time", label: "Всё время" }
]);

function formatAmount(amount) {
    if (amount === null || amount === undefined || !Number.isFinite(Number(amount))) return "—";
    return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(Number(amount));
}

function formatDate(timestamp) {
    return timestamp
        ? new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(timestamp))
        : "—";
}

function toDateInputValue(timestamp) {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.getFullYear() + "-" +
        String(date.getMonth() + 1).padStart(2, "0") + "-" +
        String(date.getDate()).padStart(2, "0");
}

function getDateInputTimestamp(value, endOfDay = false) {
    if (!value) return NaN;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    date.setHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
    return date.getTime();
}

function createMetric(label, value, detail = "") {
    const section = document.createElement("section");
    section.className = "assets-analytics-metric";

    const meta = document.createElement("span");
    meta.className = "statistics-meta";
    meta.textContent = label;

    const metricValue = document.createElement("strong");
    metricValue.className = "statistics-value";
    metricValue.textContent = value;

    section.append(meta, metricValue);

    if (detail) {
        const description = document.createElement("span");
        description.className = "assets-analytics-detail";
        description.textContent = detail;
        section.appendChild(description);
    }

    return section;
}

function renderDynamicsChart(container, dynamics) {
    const chart = document.createElement("div");
    chart.className = "assets-analytics-chart";
    chart.setAttribute("role", "img");
    chart.setAttribute("aria-label", "Динамика стоимости активов");

    if (!dynamics.length) {
        const empty = document.createElement("span");
        empty.className = "assets-analytics-empty";
        empty.textContent = "Недостаточно исторических данных.";
        chart.appendChild(empty);
        container.appendChild(chart);
        return;
    }

    const width = 640;
    const height = 220;
    const padding = 18;
    const values = dynamics.map((point) => Number(point.total) || 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const spread = max - min || Math.max(Math.abs(max), 1);

    const points = dynamics.map((point, index) => ({
        x: dynamics.length === 1
            ? width / 2
            : padding + (index / (dynamics.length - 1)) * (width - padding * 2),
        y: padding + (1 - ((Number(point.total) - min) / spread)) * (height - padding * 2),
        point
    }));

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("aria-hidden", "true");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", points.map((point, index) => (index === 0 ? "M" : "L") + " " + point.x + " " + point.y).join(" "));
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "3");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    svg.appendChild(path);

    points.forEach((point) => {
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", point.x);
        circle.setAttribute("cy", point.y);
        circle.setAttribute("r", "3.5");
        circle.setAttribute("fill", "currentColor");
        svg.appendChild(circle);
    });

    chart.appendChild(svg);

    const range = document.createElement("div");
    range.className = "assets-analytics-chart-range";
    const first = document.createElement("span");
    first.textContent = formatDate(dynamics[0].occurredAt);
    const last = document.createElement("span");
    last.textContent = formatDate(dynamics[dynamics.length - 1].occurredAt);
    range.append(first, last);
    chart.appendChild(range);
    container.appendChild(chart);
}

function renderLiquidity(container, liquidity) {
    const section = document.createElement("section");
    section.className = "assets-analytics-section";

    const title = document.createElement("span");
    title.className = "statistics-meta";
    title.textContent = "ЛИКВИДНОСТЬ";

    const total = document.createElement("span");
    total.className = "assets-analytics-section-total";
    total.textContent = formatAmount(liquidity.total) + " ₽";

    const bar = document.createElement("div");
    bar.className = "assets-analytics-liquidity-bar";

    const liquidBar = document.createElement("span");
    liquidBar.className = "assets-analytics-liquidity-bar__liquid";
    liquidBar.style.width = (liquidity.liquidPercent ?? 0) + "%";

    const illiquidBar = document.createElement("span");
    illiquidBar.className = "assets-analytics-liquidity-bar__illiquid";
    illiquidBar.style.width = (liquidity.illiquidPercent ?? 0) + "%";

    bar.append(liquidBar, illiquidBar);

    const rows = document.createElement("div");
    rows.className = "assets-analytics-liquidity-rows";

    [["Ликвидные", liquidity.liquid, liquidity.liquidPercent], ["Неликвидные", liquidity.illiquid, liquidity.illiquidPercent]]
        .forEach(([label, amount, percent]) => {
            const row = document.createElement("div");
            row.className = "assets-analytics-liquidity-row";

            const name = document.createElement("span");
            name.textContent = label;

            const value = document.createElement("span");
            value.textContent = formatAmount(amount) + " ₽ · " + (percent === null ? "—" : percent + "%");

            row.append(name, value);
            rows.appendChild(row);
        });

    section.append(title, total, bar, rows);
    container.appendChild(section);
}

function renderComposition(container, entries) {
    const section = document.createElement("section");
    section.className = "assets-analytics-section";

    const title = document.createElement("span");
    title.className = "statistics-meta";
    title.textContent = "СОСТАВ";
    section.appendChild(title);

    if (!entries.length) {
        const empty = document.createElement("span");
        empty.className = "assets-analytics-empty";
        empty.textContent = "Активов пока нет.";
        section.appendChild(empty);
        container.appendChild(section);
        return;
    }

    entries.forEach((entry) => {
        const row = document.createElement("div");
        row.className = "assets-statistics-history-row";

        const label = document.createElement("span");
        label.textContent = entry.label;

        const amount = document.createElement("span");
        amount.textContent = formatAmount(entry.amount) + " ₽";

        row.append(label, amount);
        section.appendChild(row);
    });

    container.appendChild(section);
}

function renderAssetsStatisticsScreen(root, onBack, assetsAnalytics) {
    root.replaceChildren();

    let selectedPeriod = "month";
    let customStart = "";
    let customEnd = "";

    const screen = document.createElement("section");
    screen.className = "assets-statistics-screen";
    screen.setAttribute("aria-label", "Аналитика активов");

    const header = document.createElement("header");
    header.className = "assets-statistics-header";

    const backButton = document.createElement("button");
    backButton.type = "button";
    backButton.className = "assets-statistics-back";
    backButton.textContent = "← Активы";
    backButton.addEventListener("click", () => {
        if (typeof onBack === "function") onBack();
    });

    const heading = document.createElement("div");
    heading.className = "assets-statistics-heading";

    const eyebrow = document.createElement("span");
    eyebrow.className = "statistics-meta";
    eyebrow.textContent = "FINANCE · 01";

    const title = document.createElement("h2");
    title.className = "assets-statistics-title";
    title.textContent = "Аналитика";

    const description = document.createElement("p");
    description.className = "assets-statistics-description";
    description.textContent = "Как менялась стоимость ваших активов за выбранный период.";

    heading.append(eyebrow, title, description);
    header.append(backButton, heading);

    const selector = document.createElement("div");
    selector.className = "statistics-period-selector";
    selector.setAttribute("role", "group");
    selector.setAttribute("aria-label", "Период аналитики");

    const customControls = document.createElement("section");
    customControls.className = "assets-analytics-custom-period";

    const content = document.createElement("div");
    content.className = "assets-analytics-content";

    function renderCustomControls() {
        customControls.replaceChildren();
        customControls.hidden = selectedPeriod !== "custom";
        if (selectedPeriod !== "custom") return;

        const startLabel = document.createElement("label");
        startLabel.className = "assets-analytics-date-field";
        startLabel.textContent = "От";

        const startInput = document.createElement("input");
        startInput.type = "date";
        startInput.value = customStart;
        startInput.addEventListener("change", () => {
            customStart = startInput.value;
            render();
        });

        const endLabel = document.createElement("label");
        endLabel.className = "assets-analytics-date-field";
        endLabel.textContent = "До";

        const endInput = document.createElement("input");
        endInput.type = "date";
        endInput.value = customEnd;
        endInput.addEventListener("change", () => {
            customEnd = endInput.value;
            render();
        });

        const hint = document.createElement("span");
        hint.className = "assets-analytics-custom-hint";
        hint.textContent = "До 6 месяцев для Free";

        startLabel.appendChild(startInput);
        endLabel.appendChild(endInput);
        customControls.append(startLabel, endLabel, hint);
    }

    function getSelectedRange() {
        if (selectedPeriod === "custom") {
            return {
                startDate: getDateInputTimestamp(customStart),
                endDate: getDateInputTimestamp(customEnd, true)
            };
        }

        return assetsAnalytics.getAssetsAnalyticsRange(selectedPeriod);
    }

    function render() {
        selector.replaceChildren();
        content.replaceChildren();

        PERIODS.forEach((period) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "button-control statistics-period-button";
            button.textContent = period.label;
            button.setAttribute("aria-pressed", String(selectedPeriod === period.id));
            if (selectedPeriod === period.id) button.classList.add("is-active");

            button.addEventListener("click", () => {
                selectedPeriod = period.id;

                if (selectedPeriod === "custom") {
                    const now = Date.now();
                    const start = new Date(now);
                    start.setMonth(start.getMonth() - 1);
                    customStart = toDateInputValue(start.getTime());
                    customEnd = toDateInputValue(now);
                }

                render();
            });

            selector.appendChild(button);
        });

        renderCustomControls();

        if (selectedPeriod === "all-time" && !canAccessAssetsAnalyticsRange({
            allTime: true,
            startDate: 0,
            endDate: Date.now()
        })) {
            const locked = document.createElement("section");
            locked.className = "assets-analytics-locked";

            const label = document.createElement("span");
            label.className = "statistics-meta";
            label.textContent = "PRO";

            const title = document.createElement("strong");
            title.textContent = "Вся история активов";

            const detail = document.createElement("span");
            detail.textContent = "Доступно с подпиской Pro.";

            const action = document.createElement("button");
            action.type = "button";
            action.className = "button-control";
            action.textContent = "Открыть Pro";
            action.addEventListener("click", showSubscriptionLimitNotice);

            locked.append(label, title, detail, action);
            content.appendChild(locked);
            return;
        }

        const range = getSelectedRange();

        if (!Number.isFinite(range.startDate) || !Number.isFinite(range.endDate)) {
            const empty = document.createElement("section");
            empty.className = "assets-analytics-empty-state";
            empty.textContent = "История активов пока недоступна.";
            content.appendChild(empty);
            return;
        }

        if (selectedPeriod === "custom" && !canAccessAssetsAnalyticsRange(range)) {
            showSubscriptionLimitNotice();
            return;
        }

        const analytics = assetsAnalytics.getAssetsAnalytics(range);

        const currentMetric = createMetric(
            "ТЕКУЩЕЕ СОСТОЯНИЕ",
            formatAmount(analytics.current?.total) + " ₽",
            "Срез · " + formatDate(analytics.current?.occurredAt)
        );

        const changeValue = analytics.change.hasComparison
            ? (analytics.change.percent >= 0 ? "+" : "") + analytics.change.percent + "%"
            : "—";

        const changeDetail = analytics.change.hasComparison
            ? (analytics.change.amount >= 0 ? "+" : "") + formatAmount(analytics.change.amount) + " ₽ за период"
            : "Недостаточно данных для сравнения.";

        const changeMetric = createMetric("ИЗМЕНЕНИЕ", changeValue, changeDetail);

        const dynamics = document.createElement("section");
        dynamics.className = "assets-analytics-section";

        const dynamicsTitle = document.createElement("span");
        dynamicsTitle.className = "statistics-meta";
        dynamicsTitle.textContent = "ДИНАМИКА";
        dynamics.appendChild(dynamicsTitle);
        renderDynamicsChart(dynamics, analytics.dynamics);

        content.append(currentMetric, changeMetric, dynamics);
        renderLiquidity(content, analytics.liquidity);
        renderComposition(content, analytics.composition);
    }

    screen.append(header, selector, customControls, content);
    root.appendChild(screen);
    render();
}

export { renderAssetsStatisticsScreen };
