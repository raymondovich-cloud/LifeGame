// source/presentation/finance/finance.js — Version 1.3

import {
    listFinanceEntries,
    addFinanceEntry,
    removeFinanceEntry
} from "../../application/finance/finance.js";

const FINANCE_SUBBLOCKS = Object.freeze([
    { id: "liquid-funds", number: "01", title: "Ликвидные средства", description: "Деньги, которыми пользователь может распоряжаться сейчас." },
    { id: "actual-earnings", number: "02", title: "Фактически заработанно", description: "Фактически полученный доход за выбранный период." },
    { id: "financial-burden", number: "03", title: "Финансовая нагрузка", description: "Обязательства и финансовые нагрузки, влияющие на устойчивость." },
    { id: "mandatory-expenses", number: "04", title: "Обязательные траты", description: "Регулярные расходы, которые необходимо учитывать в первую очередь." },
    { id: "financial-cushion", number: "05", title: "Финансовая подушка", description: "Резерв, предназначенный для защиты финансовой устойчивости." }
]);

function formatAmount(amount) {
    return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(amount);
}

function createEntryRow(root, subblock, entry) {
    const row = document.createElement("div");
    row.className = "swipe-delete-item";
    row.dataset.entryId = entry.id;

    const action = document.createElement("button");
    action.className = "swipe-delete-action";
    action.type = "button";
    action.textContent = "Удалить";
    action.setAttribute("aria-label", "Удалить " + entry.label);

    const content = document.createElement("div");
    content.className = "swipe-delete-content";

    const label = document.createElement("span");
    label.className = "finance-entry-label";
    label.textContent = entry.label;

    const amount = document.createElement("span");
    amount.className = "finance-entry-amount";
    amount.textContent = formatAmount(entry.amount);

    content.append(label, amount);
    row.append(action, content);

    action.addEventListener("click", () => {
        removeFinanceEntry(subblock.id, entry.id);
        renderFinance(root, subblock.id);
    });

    return row;
}

function attachSwipeDelete(root) {
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
                content.style.setProperty("--swipe-offset", "-96px");
                item.classList.add("is-delete-ready");
            } else {
                close();
            }
        };

        content.addEventListener("pointerup", finishSwipe);
        content.addEventListener("pointercancel", finishSwipe);

        content.addEventListener("click", () => {
            if (item.classList.contains("is-delete-ready")) close();
        });
    });
}

function createAddForm(root, subblock) {
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
    amountInput.placeholder = "Сумма";
    amountInput.required = true;

    const addButton = document.createElement("button");
    addButton.className = "button-control";
    addButton.type = "submit";
    addButton.textContent = "Добавить";

    const error = document.createElement("p");
    error.className = "finance-form-error";
    error.hidden = true;

    wrapper.append(labelInput, amountInput, addButton, error);

    wrapper.addEventListener("submit", (event) => {
        event.preventDefault();
        error.hidden = true;

        try {
            addFinanceEntry(subblock.id, labelInput.value, amountInput.value);
            renderFinance(root, subblock.id);
        } catch (formError) {
            error.textContent = formError.message;
            error.hidden = false;
        }
    });

    return wrapper;
}

function createSubblock(root, subblock, isOpen) {
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
    content.className = "accordion-content";
    content.id = subblock.id + "-content";
    content.hidden = !isOpen;

    const entries = listFinanceEntries(subblock.id);

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

    content.appendChild(createAddForm(root, subblock));
    wrapper.append(button, content);

    button.addEventListener("click", () => {
        const nextOpen = button.getAttribute("aria-expanded") !== "true";
        renderFinance(root, nextOpen ? subblock.id : null);
    });

    return wrapper;
}

function renderFinance(root, openSubblockId = null) {
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
        list.appendChild(createSubblock(root, subblock, subblock.id === openSubblockId));
    });

    section.append(heading, list);
    root.appendChild(section);

    attachSwipeDelete(root);
}

export { renderFinance, attachSwipeDelete };
