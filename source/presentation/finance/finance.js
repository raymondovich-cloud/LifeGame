// source/presentation/finance/finance.js — Version 1.11

import {
    listFinanceEntries,
    addFinanceEntry,
    addFinancialBurdenEntry,
    removeFinanceEntry,
    getLiquidFundsTotal,
    getLiquidFundsStatistics,
    getFinancialStabilityIndex
} from "../../application/finance/finance.js";

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

let liquidFundsStatisticsOpen = false;
let selectedLiquidFundsPeriod = "week";

const LIQUID_FUNDS_PERIODS = Object.freeze([
    { id: "week", label: "Неделя" },
    { id: "month", label: "Месяц" },
    { id: "year", label: "Год" }
]);

function createLiquidFundsStatistics(root, onWriteAttempt = null) {
    const wrapper = document.createElement("div");
    wrapper.className = "liquid-funds-statistics-panel";

    const selector = document.createElement("div");
    selector.className = "statistics-period-selector";
    selector.setAttribute("role", "group");
    selector.setAttribute("aria-label", "Период статистики");

    const result = document.createElement("div");
    result.className = "statistics-period-result";

    const renderPeriod = () => {
        selector.replaceChildren();

        LIQUID_FUNDS_PERIODS.forEach((period) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "button-control statistics-period-button";
            button.textContent = period.label;
            button.setAttribute("aria-pressed", String(selectedLiquidFundsPeriod === period.id));

            if (selectedLiquidFundsPeriod === period.id) {
                button.classList.add("is-active");
            }

            button.addEventListener("click", () => {
                selectedLiquidFundsPeriod = period.id;
                renderPeriod();
            });

            selector.appendChild(button);
        });

        const statistics = getLiquidFundsStatistics(selectedLiquidFundsPeriod);
        result.replaceChildren();

        const heading = document.createElement("span");
        heading.className = "statistics-meta";
        heading.textContent = "СОСТОЯНИЕ НА СРЕЗЕ";

        const value = document.createElement("span");
        value.className = "statistics-value";
        value.textContent = formatAmount(statistics.total);

        result.append(heading, value);

        if (statistics.occurredAt) {
            const meta = document.createElement("span");
            meta.className = "statistics-meta";
            meta.textContent =
                "Срез: " +
                new Intl.DateTimeFormat("ru-RU", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric"
                }).format(statistics.occurredAt);
            result.appendChild(meta);
        } else {
            const meta = document.createElement("span");
            meta.className = "statistics-meta";
            meta.textContent = "Исторических данных пока нет";
            result.appendChild(meta);
        }

        if (statistics.entries.length > 0) {
            const entryList = document.createElement("div");
            entryList.className = "finance-entry-list";

            statistics.entries.forEach((entry) => {
                const row = document.createElement("div");
                row.className = "finance-entry-row";

                const label = document.createElement("span");
                label.className = "finance-entry-label";
                label.textContent = entry.label;

                const amount = document.createElement("span");
                amount.className = "finance-entry-amount";
                amount.textContent = formatAmount(entry.amount);

                row.append(label, amount);
                entryList.appendChild(row);
            });

            result.appendChild(entryList);
        }
    };

    renderPeriod();
    wrapper.appendChild(selector);
    wrapper.appendChild(result);

    return wrapper;
}

function createLiquidFundsSummary(root, onWriteAttempt = null) {
    const wrapper = document.createElement("div");
    wrapper.className = "liquid-funds-summary";

    const current = document.createElement("div");
    current.className = "statistics liquid-funds-current-total";
    current.innerHTML =
        '<span class="statistics-meta">ТЕКУЩЕЕ СОСТОЯНИЕ</span>' +
        '<span class="statistics-value">' + formatAmount(getLiquidFundsTotal()) + "</span>";

    const statisticsButton = document.createElement("button");
    statisticsButton.type = "button";
    statisticsButton.className = "button-control button-control--accent liquid-funds-statistics-trigger";
    statisticsButton.setAttribute("aria-expanded", String(liquidFundsStatisticsOpen));
    statisticsButton.innerHTML =
        '<span>Статистика</span><span aria-hidden="true">›</span>';

    const statisticsContainer = document.createElement("div");
    statisticsContainer.className = "liquid-funds-statistics-container";
    statisticsContainer.hidden = !liquidFundsStatisticsOpen;

    if (liquidFundsStatisticsOpen) {
        statisticsContainer.appendChild(createLiquidFundsStatistics(root, onWriteAttempt));
    }

    statisticsButton.addEventListener("click", () => {
        liquidFundsStatisticsOpen = !liquidFundsStatisticsOpen;
        renderFinance(root, "liquid-funds", onWriteAttempt);
    });

    wrapper.append(current, statisticsButton, statisticsContainer);
    return wrapper;
}

function createFinancialStabilityIndexPanel() {
    const result = getFinancialStabilityIndex();

    const wrapper = document.createElement("div");
    wrapper.className = "financial-stability-index-panel";

    const label = document.createElement("span");
    label.className = "statistics-meta";
    label.textContent = "ИНДЕКС ФИНАНСОВОЙ СТАБИЛЬНОСТИ";

    const value = document.createElement("span");
    value.className = "statistics-value";
    value.textContent = result.value + "/" + result.scale;

    const description = document.createElement("p");
    description.className = "financial-stability-index-description";
    description.textContent =
        "Индекс рассчитывается на основе ликвидности, финансовой нагрузки и финансовой подушки.";

    const components = document.createElement("div");
    components.className = "financial-stability-index-components";

    [
        ["Ликвидность", result.components.liquidity],
        ["Нагрузка", result.components.burden],
        ["Подушка", result.components.cushion]
    ].forEach(([name, componentValue]) => {
        const item = document.createElement("div");
        item.className = "financial-stability-index-component";

        const itemName = document.createElement("span");
        itemName.textContent = name;

        const itemValue = document.createElement("span");
        itemValue.textContent = componentValue + "/100";

        item.append(itemName, itemValue);
        components.appendChild(item);
    });

    wrapper.append(label, value, description, components);
    return wrapper;
}

function createAddForm(root, subblock, onWriteAttempt = null) {
    const wrapper = document.createElement("form");
    wrapper.className = "finance-add-form";

    const labelInput = document.createElement("input");
    labelInput.className = "input-control";
    labelInput.name = "label";
    labelInput.type = "text";
    labelInput.placeholder = "Название";
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
