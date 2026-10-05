// source/presentation/finance/finance.js — Version 2.0

import {
    listFinanceEntries,
    addFinanceEntry,
    addFinancialBurdenEntry,
    removeFinanceEntry,
    getAssetsTotal,
    getAssetsStatistics,
    getFinancialStabilityIndex
} from "../../application/finance/finance.js";

import { renderAssetsStatisticsScreen } from "./assets.statistics.js";
import { createInfoTooltip } from "../shared/info.tooltip.js";

const FINANCE_SUBBLOCKS = Object.freeze([
    { id: "assets", number: "01", title: "Активы", description: "Имущество и средства, которыми вы владеете", info: "Активы, которыми вы владеете: недвижимость, автомобиль, наличные, средства на картах, счета и другие активы, которые пользователь хочет учитывать в своей финансовой картине." },
    { id: "actual-earnings", number: "02", title: "Фактически заработанно", description: "Реально полученный доход", info: "Доход, который вы фактически получили за выбранный период." },
    { id: "financial-burden", number: "03", title: "Финансовая нагрузка", description: "Обязательства, влияющие на бюджет", info: "Обязательства и регулярные финансовые нагрузки, которые уменьшают доступные средства и влияют на устойчивость." },
    { id: "mandatory-expenses", number: "04", title: "Обязательные траты", description: "Расходы, которые нельзя пропустить", info: "Расходы, которые необходимо оплачивать регулярно независимо от других трат." },
    { id: "financial-cushion", number: "05", title: "Финансовая подушка", description: "Резерв на непредвиденные ситуации", info: "Резерв средств, предназначенный для покрытия непредвиденных расходов и периодов снижения дохода." },
    { id: "financial-stability-index", number: "06", title: "Индекс финансовой стабильности", description: "Текущая оценка финансовой устойчивости", info: "Сводная оценка финансовой устойчивости, учитывающая силу финансового положения, стабильность, ликвидность, резерв, долговую нагрузку и финансовый тренд." }
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
        month: "short",
        year: "numeric"
    }).format(timestamp ? new Date(timestamp) : new Date()).toUpperCase();
}

function createAssetsSummary(root, onWriteAttempt = null) {
    const wrapper = document.createElement("div");
    wrapper.className = "assets-summary";

    const statistics = getAssetsStatistics("month");

    const heading = document.createElement("div");
    heading.className = "assets-summary-heading";

    const title = document.createElement("span");
    title.className = "statistics-meta";
    title.textContent = "СОСТОЯНИЕ";

    const statisticsButton = document.createElement("button");
    statisticsButton.type = "button";
    statisticsButton.className = "assets-statistics-trigger";
    statisticsButton.innerHTML =
        '<span>Аналитика</span><span aria-hidden="true">›</span>';

    statisticsButton.addEventListener("click", () => {
        renderAssetsStatisticsScreen(
            root,
            () => renderFinance(root, "assets", onWriteAttempt)
        );
    });

    heading.append(title, statisticsButton);

    const amountRow = document.createElement("div");
    amountRow.className = "assets-total-row";

    const amount = document.createElement("span");
    amount.className = "assets-total-value";
    const amountText = formatAmount(getAssetsTotal()) + " ₽";
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
    date.textContent = formatSnapshotDate(statistics.currentOccurredAt);

    wrapper.append(heading, amountRow, date);
    return wrapper;
}

function createFinancialStabilityIndexPanel() {
    const result = getFinancialStabilityIndex();

    const wrapper = document.createElement("div");
    wrapper.className = "financial-stability-index-panel";

    const eyebrow = document.createElement("span");
    eyebrow.className = "financial-stability-index-eyebrow";
    eyebrow.textContent = "FSI 2.1";

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
    description.textContent =
        "Сводная оценка финансовой устойчивости с учётом ликвидности, дохода, долга, резерва и финансового тренда.";

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

function createAddForm(root, subblock, onWriteAttempt = null) {
    const wrapper = document.createElement("form");
    wrapper.className = "finance-add-form";

    const labelInput = document.createElement("input");
    labelInput.className = "input-control";
    labelInput.name = "label";
    labelInput.type = "text";
    labelInput.placeholder = subblock.id === "assets" ? "Актив" : "Название";
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

    const entries = subblock.id === "financial-stability-index"
        ? []
        : listFinanceEntries(subblock.id);

    if (subblock.id === "financial-stability-index") {
        content.appendChild(createFinancialStabilityIndexPanel());
    }

    if (subblock.id === "assets") {
        content.appendChild(createAssetsSummary(root, onWriteAttempt));
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
    wrapper.append(header, content);

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
