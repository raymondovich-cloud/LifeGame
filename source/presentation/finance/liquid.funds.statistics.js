// source/presentation/finance/liquid.funds.statistics.js — Version 1.2

import {
    getLiquidFundsStatistics
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

function renderLiquidFundsStatisticsScreen(root, onBack) {
    root.replaceChildren();

    let selectedPeriod = "month";

    const screen = document.createElement("section");
    screen.className = "liquid-funds-statistics-screen";
    screen.setAttribute("aria-label", "Аналитика ликвидных средств");

    const header = document.createElement("header");
    header.className = "liquid-funds-statistics-header";

    const backButton = document.createElement("button");
    backButton.type = "button";
    backButton.className = "liquid-funds-statistics-back";
    backButton.textContent = "← Ликвидные средства";
    backButton.addEventListener("click", () => {
        if (typeof onBack === "function") {
            onBack();
        }
    });

    const heading = document.createElement("div");
    heading.className = "liquid-funds-statistics-heading";

    const eyebrow = document.createElement("span");
    eyebrow.className = "statistics-meta";
    eyebrow.textContent = "FINANCE · 01";

    const title = document.createElement("span");
    title.className = "accordion-title";
    title.textContent = "Аналитика";

    heading.append(eyebrow, title);
    header.append(backButton, heading);

    const selector = document.createElement("div");
    selector.className = "statistics-period-selector";
    selector.setAttribute("role", "group");
    selector.setAttribute("aria-label", "Период аналитики");

    const content = document.createElement("div");

    function render() {
        selector.replaceChildren();
        content.replaceChildren();

        PERIODS.forEach((period) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "button-control statistics-period-button";
            button.textContent = period.label;
            button.setAttribute(
                "aria-pressed",
                String(selectedPeriod === period.id)
            );

            if (selectedPeriod === period.id) {
                button.classList.add("is-active");
            }

            button.addEventListener("click", () => {
                selectedPeriod = period.id;
                render();
            });

            selector.appendChild(button);
        });

        const statistics = getLiquidFundsStatistics(selectedPeriod);

        const currentMetric = document.createElement("div");
        currentMetric.className = "liquid-funds-statistics-metric";

        const currentMeta = document.createElement("span");
        currentMeta.className = "statistics-meta";
        currentMeta.textContent = "ТЕКУЩЕЕ СОСТОЯНИЕ";

        const currentValue = document.createElement("span");
        currentValue.className = "statistics-value";
        currentValue.textContent = formatAmount(statistics.currentTotal);

        const currentDate = document.createElement("span");
        currentDate.className = "statistics-meta";
        currentDate.textContent = "Срез: " + formatDate(statistics.currentOccurredAt);

        currentMetric.append(currentMeta, currentValue, currentDate);

        const changeMetric = document.createElement("div");
        changeMetric.className = "liquid-funds-statistics-metric";

        const changeMeta = document.createElement("span");
        changeMeta.className = "statistics-meta";
        changeMeta.textContent = "ИЗМЕНЕНИЕ ЗА ПЕРИОД";

        const changeValue = document.createElement("span");
        changeValue.className = "liquid-funds-statistics-change";

        if (statistics.hasComparison) {
            const sign = statistics.changePercent >= 0 ? "+" : "";
            changeValue.textContent =
                sign + statistics.changePercent + "% · " +
                (statistics.changeAmount >= 0 ? "+" : "") +
                formatAmount(statistics.changeAmount) + " ₽";
        } else {
            changeValue.textContent = "Недостаточно данных для расчёта";
        }

        changeMetric.append(changeMeta, changeValue);

        const history = document.createElement("div");
        history.className = "liquid-funds-statistics-history";

        const historyTitle = document.createElement("span");
        historyTitle.className = "statistics-meta";
        historyTitle.textContent = "ИСТОРИЯ СОСТОЯНИЯ";
        history.appendChild(historyTitle);

        const baselineRow = document.createElement("div");
        baselineRow.className = "liquid-funds-statistics-history-row";
        baselineRow.innerHTML =
            "<span>Начало периода</span><span>" +
            (statistics.baselineTotal === null
                ? "—"
                : formatAmount(statistics.baselineTotal) + " ₽ · " +
                    formatDate(statistics.baselineOccurredAt)) +
            "</span>";

        const currentRow = document.createElement("div");
        currentRow.className = "liquid-funds-statistics-history-row";
        currentRow.innerHTML =
            "<span>Текущее состояние</span><span>" +
            formatAmount(statistics.currentTotal) +
            " ₽ · " +
            formatDate(statistics.currentOccurredAt) +
            "</span>";

        history.append(baselineRow, currentRow);

        const assets = document.createElement("div");
        assets.className = "liquid-funds-statistics-assets";

        const assetsTitle = document.createElement("span");
        assetsTitle.className = "statistics-meta";
        assetsTitle.textContent = "АКТИВЫ";
        assets.appendChild(assetsTitle);

        statistics.currentEntries.forEach((entry) => {
            const row = document.createElement("div");
            row.className = "liquid-funds-statistics-history-row";

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

export {
    renderLiquidFundsStatisticsScreen
};
