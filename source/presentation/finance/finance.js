// source/presentation/finance/finance.js — Version 1.14

import {
    listFinanceEntries,
    addFinanceEntry,
    addFinancialBurdenEntry,
    removeFinanceEntry,
    getLiquidFundsTotal,
    getLiquidFundsStatistics,
    getFinancialStabilityIndex
} from "../../application/finance/finance.js";

import { renderLiquidFundsStatisticsScreen } from "./liquid.funds.statistics.js";

const FINANCE_SUBBLOCKS = Object.freeze([
    { id: "liquid-funds", number: "01", title: "Ликвидные средства", description: "Деньги, которыми пользователь может распоряжаться сейчас." },
    { id: "actual-earnings", number: "02", title: "Фактически заработанно", description: "Фактически полученный доход за выбранный период." },
    { id: "financial-burden", number: "03", title: "Финансовая нагрузка", description: "Обязательства и финансовые нагрузки, влияющие на устойчивость." },
    { id: "mandatory-expenses", number: "04", title: "Обязательные траты", description: "Регулярные расходы, которые необходимо учитывать в первую очередь." },
    { id: "financial-cushion", number: "05", title: "Финансовая подушка", description: "Резерв, предназначенный для защиты финансовой устойчивости." },
    { id: "financial-stability-index", number: "06", title: "Индекс финансовой стабильности", description: "Сводная оценка текущей финансовой устойчивости." }
]);

function formatAmount(amount) {
    return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(amount);
}

function createEntryRow(root, subblock, entry) {
    const row = document.createElement("div");
    row.className = "swipe-delete-item";
    row.dataset.entryId = entry.id;
    row.dataset.subblockId = subblock.id;

    const content = document.createElement("div");
    content.className = "swipe-delete-content";

    const label = document.createElement("span");
    label.className = "finance-entry-label";
    label.textContent = entry.label;

    if (subblock.id === "financial-burden") {
        const details = document.createElement("span");
        details.className = "finance-entry-amount";
        details.textContent =
            "Долг " + formatAmount(entry.debt) +
            " · Платёж " + formatAmount(entry.payment);

        content.append(label, details);
    } else {
        const amount = document.createElement("span");
        amount.className = "finance-entry-amount";
        amount.textContent = formatAmount(entry.amount);

        content.append(label, amount);
    }
    row.append(content);

    return row;
}

function attachSwipeDelete(root, onWriteAttempt = null) {
    const items = [...root.querySelectorAll(".swipe-delete-item")];

    items.forEach((item) => {
        const content = item.querySelector(".swipe-delete-content");
        if (!content) return;

        let startX = 0;
        let currentX = 0;
        let startY = 0;
        let tracking = false;
        let horizontalSwipe = false;

        const close = () => {
            content.style.setProperty("--swipe-offset", "0px");
            item.classList.remove("is-delete-ready");
        };

        content.addEventListener("pointerdown", (event) => {
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
                content.classList.remove("is-swiping");
                close();
                return;
            }

            if (deltaX < -8) {
                horizontalSwipe = true;
                const offset = Math.max(deltaX, -96);
                content.style.setProperty("--swipe-offset", offset + "px");
            }
        });

        const finishSwipe = () => {
            if (!tracking) return;

            tracking = false;
            content.classList.remove("is-swiping");

            const distance = currentX - startX;

            if (distance <= -64) {
                const remove = () => {
                    removeFinanceEntry(item.dataset.subblockId, item.dataset.entryId);
                    renderFinance(root, item.dataset.subblockId, onWriteAttempt);
                };

                if (typeof onWriteAttempt === "function") {
                    onWriteAttempt(remove);
                } else {
                    remove();
                }
            } else {
                close();
            }
        };

        content.addEventListener("pointerup", finishSwipe);
        content.addEventListener("pointercancel", finishSwipe);

    });
}

function formatSnapshotDate(timestamp) {
    return new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    }).format(timestamp ? new Date(timestamp) : new Date());
}

function createLiquidFundsSummary(root, onWriteAttempt = null) {
    const wrapper = document.createElement("div");
    wrapper.className = "liquid-funds-summary";

    const statistics = getLiquidFundsStatistics("month");

    const current = document.createElement("div");
    current.className = "statistics liquid-funds-current-total";

    const date = document.createElement("span");
    date.className = "statistics-meta";
    date.textContent = formatSnapshotDate(statistics.currentOccurredAt);

    const title = document.createElement("span");
    title.className = "statistics-meta";
    title.textContent = "СОСТОЯНИЕ ИМУЩЕСТВЕННЫХ АКТИВОВ";

    const value = document.createElement("span");
    value.className = "statistics-value";
    value.textContent = formatAmount(getLiquidFundsTotal());

    current.append(date, title, value);

    const change = document.createElement("div");
    change.className = "liquid-funds-period-change";

    const changeLabel = document.createElement("span");
    changeLabel.className = "statistics-meta";
    changeLabel.textContent = "ЗА ПОСЛЕДНИЙ МЕСЯЦ";

    const changeValue = document.createElement("span");
    changeValue.className = "liquid-funds-period-change-value";

    if (statistics.hasComparison) {
        const direction = statistics.changePercent >= 0
            ? "увеличилось"
            : "уменьшилось";
        const sign = statistics.changePercent >= 0 ? "+" : "";

        changeValue.textContent =
            "Состояние " +
            direction +
            " на " +
            sign +
            statistics.changePercent +
            "%";
    } else {
        changeValue.textContent = "Недостаточно данных для расчёта";
    }

    change.append(changeLabel, changeValue);

    const statisticsButton = document.createElement("button");
    statisticsButton.type = "button";
    statisticsButton.className = "button-control button-control--accent liquid-funds-statistics-trigger";
    statisticsButton.innerHTML =
        '<span>Статистика</span><span aria-hidden="true">›</span>';

    statisticsButton.addEventListener("click", () => {
        renderLiquidFundsStatisticsScreen(
            root,
            () => renderFinance(root, "liquid-funds", onWriteAttempt)
        );
    });

    wrapper.append(current, change, statisticsButton);
    return wrapper;
}

function createFinancialStabilityIndexPanel() {
    const result = getFinancialStabilityIndex();

    const wrapper = document.createElement("div");
    wrapper.className = "financial-stability-index-panel";

    const label = document.createElement("span");
    label.className = "statistics-meta";
    label.textContent = "FSI 2.1 · ИНДЕКС ФИНАНСОВОЙ СТАБИЛЬНОСТИ";

    const value = document.createElement("span");
    value.className = "statistics-value";
    value.textContent = result.value + "/100";

    const category = document.createElement("span");
    category.className = "statistics-meta";
    category.textContent = result.category?.label || "—";

    const description = document.createElement("p");
    description.className = "financial-stability-index-description";
    description.textContent =
        "FSI 2.1 оценивает не только текущее финансовое положение, но и устойчивость дохода, долга, ликвидности, резерва и финансового тренда.";

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

    wrapper.append(label, value, category, description, components);
    return wrapper;
}

function createAddForm(root, subblock, onWriteAttempt = null) {
    const wrapper = document.createElement("form");
    wrapper.className = "finance-add-form";

    const labelInput = document.createElement("input");
    labelInput.className = "input-control";
    labelInput.name = "label";
    labelInput.type = "text";
    labelInput.placeholder = subblock.id === "liquid-funds" ? "Актив" : "Название";
    labelInput.autocomplete = "off";
    labelInput.required = true;

    const amountInput = document.createElement("input");
    amountInput.className = "input-control";
    amountInput.name = "amount";
    amountInput.type = "number";
    amountInput.inputMode = "decimal";
    amountInput.min = "0.01";
    amountInput.step = "0.01";
    amountInput.placeholder = subblock.id === "financial-burden" ? "Общий долг" : "Сумма";
    amountInput.required = true;

    const paymentInput = subblock.id === "financial-burden"
        ? document.createElement("input")
        : null;

    if (paymentInput) {
        paymentInput.className = "input-control";
        paymentInput.name = "payment";
        paymentInput.type = "number";
        paymentInput.inputMode = "decimal";
        paymentInput.min = "0";
        paymentInput.step = "0.01";
        paymentInput.placeholder = "Регулярный платёж";
        paymentInput.required = true;
    }

    const addButton = document.createElement("button");
    addButton.className = "button-control";
    addButton.type = "submit";
    addButton.textContent = "Добавить";

    const error = document.createElement("p");
    error.className = "finance-form-error";
    error.hidden = true;

    wrapper.append(labelInput, amountInput);
    if (paymentInput) wrapper.appendChild(paymentInput);
    wrapper.append(addButton, error);

    wrapper.addEventListener("submit", (event) => {
        event.preventDefault();
        error.hidden = true;

        const save = () => {
            try {
                if (subblock.id === "financial-burden") {
                    addFinancialBurdenEntry(
                        labelInput.value,
                        amountInput.value,
                        paymentInput.value
                    );
                } else {
                    addFinanceEntry(subblock.id, labelInput.value, amountInput.value);
                }

                renderFinance(root, subblock.id, onWriteAttempt);
            } catch (formError) {
                error.textContent = formError.message;
                error.hidden = false;
            }
        };

        if (typeof onWriteAttempt === "function") {
            onWriteAttempt(save);
            return;
        }

        save();
    });

    return wrapper;
}

function createSubblock(root, subblock, isOpen, onWriteAttempt = null) {
    const wrapper = document.createElement("article");
    wrapper.className = "accordion-item finance-subblock";
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
        "</span>" +
        '<span class="accordion-icon" aria-hidden="true">' + (isOpen ? "−" : "+") + "</span>";

    const content = document.createElement("div");
    content.className = "accordion-content" + (isOpen ? " is-open" : "");
    content.id = subblock.id + "-content";
    content.hidden = false;

    const entries = subblock.id === "financial-stability-index"
        ? []
        : listFinanceEntries(subblock.id);

    if (subblock.id === "financial-stability-index") {
        content.appendChild(createFinancialStabilityIndexPanel());
    }

    if (subblock.id === "liquid-funds") {
        content.appendChild(createLiquidFundsSummary(root, onWriteAttempt));
    }

    if (subblock.id !== "financial-stability-index") {
        if (entries.length === 0) {
            const emptyState = document.createElement("div");
            emptyState.className = "list-empty";
            emptyState.innerHTML =
                '<span class="list-empty-label">ДАННЫЕ</span>' +
                "<p>Записей пока нет.</p>";
            content.appendChild(emptyState);
        } else {
            const entryList = document.createElement("div");
            entryList.className = "finance-entry-list";

            entries.forEach((entry) => {
                entryList.appendChild(createEntryRow(root, subblock, entry));
            });

            content.appendChild(entryList);
        }
    }

    if (subblock.id !== "financial-stability-index") {
        content.appendChild(createAddForm(root, subblock, onWriteAttempt));
    }
    wrapper.append(button, content);

    button.addEventListener("click", () => {
        const nextOpen = button.getAttribute("aria-expanded") !== "true";
        renderFinance(root, nextOpen ? subblock.id : null, onWriteAttempt);
    });

    return wrapper;
}

function renderFinance(root, openSubblockId = null, onWriteAttempt = null) {
    if (!root) {
        throw new Error("LifeGame Finance: presentation root was not found.");
    }

    root.replaceChildren();

    const section = document.createElement("section");
    section.className = "module-subblocks";
    section.setAttribute("aria-label", "Finance subblocks");

    const heading = document.createElement("div");
    heading.className = "module-subblocks-header";
    heading.innerHTML =
        '<span class="module-subblocks-label">FINANCE SYSTEM</span>' +
        "<p>Финансовая система разделена на независимые блоки.</p>";

    const list = document.createElement("div");
    list.className = "accordion-list";

    FINANCE_SUBBLOCKS.forEach((subblock) => {
        list.appendChild(createSubblock(root, subblock, subblock.id === openSubblockId, onWriteAttempt));
    });

    section.append(heading, list);
    root.appendChild(section);

    attachSwipeDelete(root, onWriteAttempt);
}

export { renderFinance, attachSwipeDelete };
