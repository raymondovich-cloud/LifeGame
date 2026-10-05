// source/presentation/finance/assets.statistics.js — Version 2.0

import {
    getAssetsStatistics
} from "../../application/finance/finance.js";

const PERIODS = Object.freeze([
    { id: "week", label: "Неделя" },
    { id: "month", label: "Месяц" },
    { id: "year", label: "Год" }
]);

function formatAmount(amount) {
    return new Intl.NumberFormat("ru-RU", {
        maximumFractionDigits: 2
    }).format(amount);
}

function formatDate(timestamp) {
    return timestamp
        ? new Intl.DateTimeFormat("ru-RU", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }).format(new Date(timestamp))
        : "—";
}

function renderAssetsStatisticsScreen(root, onBack) {
    root.replaceChildren();

    let selectedPeriod = "month";

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

    const content = document.createElement("div");
    content.className = "assets-analytics-content";

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
                render();
            });

            selector.appendChild(button);
        });

        const analytics = getAssetsStatistics(selectedPeriod);

        const currentMetric = document.createElement("section");
        currentMetric.className = "assets-analytics-primary";

        const currentMeta = document.createElement("span");
        currentMeta.className = "statistics-meta";
        currentMeta.textContent = "ТЕКУЩЕЕ СОСТОЯНИЕ";

        const currentValue = document.createElement("span");
        currentValue.className = "statistics-value assets-analytics-primary-value";
        currentValue.textContent = formatAmount(analytics.currentTotal) + " ₽";

        const currentDate = document.createElement("span");
        currentDate.className = "statistics-meta assets-analytics-date";
        currentDate.textContent = "Срез · " + formatDate(analytics.currentOccurredAt);

        currentMetric.append(currentMeta, currentValue, currentDate);

        const changeMetric = document.createElement("section");
        changeMetric.className = "assets-statistics-metric";

        const changeMeta = document.createElement("span");
        changeMeta.className = "statistics-meta";
        changeMeta.textContent = "ДИНАМИКА";

        const changeValue = document.createElement("span");
        changeValue.className = "assets-statistics-change";

        if (analytics.hasComparison) {
            const sign = analytics.changePercent >= 0 ? "+" : "";
            changeValue.textContent = sign + analytics.changePercent + "%";
        } else {
            changeValue.textContent = "Нет базы для сравнения";
        }

        const changeDetail = document.createElement("span");
        changeDetail.className = "assets-analytics-detail";
        changeDetail.textContent = analytics.hasComparison
            ? (analytics.changeAmount >= 0 ? "+" : "") + formatAmount(analytics.changeAmount) + " ₽ за период"
            : "Добавьте больше данных, чтобы увидеть динамику.";

        changeMetric.append(changeMeta, changeValue, changeDetail);

        const history = document.createElement("section");
        history.className = "assets-statistics-history";

        const historyTitle = document.createElement("span");
        historyTitle.className = "statistics-meta";
        historyTitle.textContent = "ИЗМЕНЕНИЕ";
        history.appendChild(historyTitle);

        const baselineRow = document.createElement("div");
        baselineRow.className = "assets-statistics-history-row";
        baselineRow.innerHTML =
            "<span>Начало периода</span><span>" +
            (analytics.baselineTotal === null
                ? "—"
                : formatAmount(analytics.baselineTotal) + " ₽ · " + formatDate(analytics.baselineOccurredAt)) +
            "</span>";

        const currentRow = document.createElement("div");
        currentRow.className = "assets-statistics-history-row";
        currentRow.innerHTML =
            "<span>Текущее состояние</span><span>" +
            formatAmount(analytics.currentTotal) + " ₽ · " + formatDate(analytics.currentOccurredAt) +
            "</span>";

        history.append(baselineRow, currentRow);

        const assets = document.createElement("section");
        assets.className = "assets-statistics-assets";

        const assetsTitle = document.createElement("span");
        assetsTitle.className = "statistics-meta";
        assetsTitle.textContent = "СОСТАВ";
        assets.appendChild(assetsTitle);

        analytics.currentEntries.forEach((entry) => {
            const row = document.createElement("div");
            row.className = "assets-statistics-history-row";

            const label = document.createElement("span");
            label.textContent = entry.label;

            const amount = document.createElement("span");
            amount.textContent = formatAmount(entry.amount) + " ₽";

            row.append(label, amount);
            assets.appendChild(row);
        });

        content.append(currentMetric, changeMetric, history, assets);
    }

    screen.append(header, selector, content);
    root.appendChild(screen);
    render();
}

export { renderAssetsStatisticsScreen };
