// source/presentation/finance/finance.js — Version 3.7

import { beginOperation, endOperation, trace } from "../../core/diagnostics/lifecycle.trace.js";



import { renderAssetsStatisticsScreen } from "./assets.statistics.js";
import { getAssetsAnalytics, getAssetsAnalyticsRange } from "../../application/finance/assets.analytics.js";
import { createInfoTooltip } from "../shared/info.tooltip.js";
import { attachEntryEdit } from "./entry.edit.js";
import { showSubscriptionLimitNotice } from "../shared/subscription.limit.js";

const pinnedEntries = new Set();

function getEntryKey(subblockId, entryId) {
    return subblockId + ":" + entryId;
}

function isEntryPinned(subblockId, entryId) {
    return pinnedEntries.has(getEntryKey(subblockId, entryId));
}

const MAX_PINNED_ENTRIES_PER_BLOCK = 3;

function countPinnedEntries(subblockId, financeApplication) {
    return financeApplication.listFinanceEntries(subblockId).filter((entry) =>
        pinnedEntries.has(getEntryKey(subblockId, entry.id))
    ).length;
}

function toggleEntryPinned(subblockId, entryId) {
    const key = getEntryKey(subblockId, entryId);

    if (pinnedEntries.has(key)) {
        pinnedEntries.delete(key);
        return false;
    }

    pinnedEntries.add(key);
    return true;
}

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

    const action = document.createElement("button");
    action.type = "button";
    action.className = "swipe-delete-action";
    action.setAttribute("aria-label", "Удалить " + entry.label);
    action.textContent = "Удалить";

    const content = document.createElement("div");
    content.className = "swipe-delete-content";

    const label = document.createElement("span");
    label.className = "finance-entry-label";
    label.textContent = entry.label;

    const pinIndicator = document.createElement("span");
    pinIndicator.className = "finance-entry-pin";
    pinIndicator.setAttribute("aria-hidden", "true");
    pinIndicator.innerHTML =
        '<svg viewBox="0 0 16 16" focusable="false">' +
            '<path d="M5.2 1.8h5.6l-.7 3.2 2.1 2.1v1.1H8.9v4.1l-.9 1.7-.9-1.7V8.2H3.8V7.1l2.1-2.1z"></path>' +
        '</svg>';

    const labelGroup = document.createElement("span");
    labelGroup.className = "finance-entry-label-group";
    labelGroup.appendChild(label);

    const trailingGroup = document.createElement("span");
    trailingGroup.className = "finance-entry-trailing";

    if (subblock.id === "financial-burden") {
        const details = document.createElement("span");
        details.className = "finance-entry-amount";
        details.textContent =
            "Долг " + formatAmount(entry.debt) +
            " · Платёж " + formatAmount(entry.payment);

        trailingGroup.append(details, pinIndicator);
    } else {
        const amount = document.createElement("span");
        amount.className = "finance-entry-amount";
        amount.textContent = formatAmount(entry.amount);

        trailingGroup.append(amount, pinIndicator);
    }

    if (subblock.id === "assets") {
        const liquidity = document.createElement("span");
        liquidity.className = "finance-entry-liquidity";
        liquidity.textContent =
            entry.liquidity === "illiquid" ? "Неликвидно" : "Ликвидно";
        labelGroup.appendChild(liquidity);
    }

    content.append(labelGroup, trailingGroup);

    row.append(action, content);
    return row;
}

function refreshAssetsSummary(root, financeApplication) {
    const summary = root.querySelector(".assets-summary");
    if (!summary) return;

    const amount = summary.querySelector(".assets-total-value");
    if (!amount) return;

    const statistics = getAssetsAnalytics(getAssetsAnalyticsRange("month"));
    const amountText = formatAmount(statistics.current?.total ?? 0) + " ₽";
    amount.textContent = amountText;

    const numericLength = amountText.replace(/\D/g, "").length;
    const fontSize = Math.max(
        1.45,
        Math.min(2.6, 2.6 - Math.max(0, numericLength - 7) * 0.12)
    );
    amount.style.fontSize = fontSize + "rem";

    const date = summary.querySelector(".assets-summary-date");

    if (date) {
        date.textContent = formatSnapshotDate(statistics.current?.occurredAt);
    }
}

function finalizeDeletedItem(root, item) {
    const subblockId = item.dataset.subblockId;
    const entryList = item.closest(".finance-entry-list");

    item.remove();

    if (entryList && entryList.children.length === 0) {
        const emptyState = document.createElement("div");
        emptyState.className = "list-empty";
        emptyState.innerHTML =
            '<span class="list-empty-label">ДАННЫЕ</span>' +
            "<p>Записей пока нет.</p>";
        entryList.replaceWith(emptyState);
    }

    if (subblockId === "assets") {
        refreshAssetsSummary(root, financeApplication);
    }
}

function deleteFinanceEntryItem(root, item, onWriteAttempt = null, financeApplication = null) {
    const operationId = beginOperation("finance.delete", {
        subblockId: item.dataset.subblockId,
        entryId: item.dataset.entryId
    });

    trace("ui", "finance.delete.requested", {
        subblockId: item.dataset.subblockId,
        entryId: item.dataset.entryId
    });

    const remove = () => {
        item.classList.add("is-deleting");
        item.style.setProperty("--delete-height", item.getBoundingClientRect().height + "px");

        window.setTimeout(async () => {
            try {
                trace("ui", "finance.delete.domain_call", {
                    subblockId: item.dataset.subblockId,
                    entryId: item.dataset.entryId
                });

                const result = await financeApplication.removeFinanceEntry(
                    item.dataset.subblockId,
                    item.dataset.entryId
                );

                pinnedEntries.delete(getEntryKey(item.dataset.subblockId, item.dataset.entryId));
                finalizeDeletedItem(root, item);

                trace("ui", "finance.delete.ui_finalized", {
                    subblockId: item.dataset.subblockId,
                    entryId: item.dataset.entryId,
                    result
                });

                endOperation(operationId, result ? "completed" : "not_found");
            } catch (error) {
                trace("ui", "finance.delete.failed", {
                    subblockId: item.dataset.subblockId,
                    entryId: item.dataset.entryId,
                    error: error?.message || "unknown"
                });

                item.classList.remove("is-deleting");
                endOperation(operationId, "failed");
                throw error;
            }
        }, 230);
    };

    if (typeof onWriteAttempt === "function") {
        trace("ui", "finance.delete.write_guard", {
            subblockId: item.dataset.subblockId,
            entryId: item.dataset.entryId
        });
        onWriteAttempt(remove);
        return;
    }

    remove();
}

function attachSwipeDelete(root, onWriteAttempt = null, financeApplication = null) {
    const items = [...root.querySelectorAll(".swipe-delete-item")];
    const maxReveal = 88;
    const activationDistance = 56;

    const deleteItem = (item) => deleteFinanceEntryItem(root, item, onWriteAttempt, financeApplication);

    items.forEach((item) => {
        if (item.dataset.subblockId === "financial-stability-index") return;

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
            setOffset(-maxReveal, true);
        };

        const close = () => {
            opened = false;
            item.classList.remove("is-delete-ready");
            setOffset(0, true);
        };

        action.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            deleteItem(item);
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

                const base = opened ? -maxReveal : 0;
                const offset = Math.min(0, Math.max(deltaX + base, -maxReveal));
                setOffset(offset);
            }
        });

        const finishSwipe = () => {
            if (!tracking) return;

            tracking = false;
            content.classList.remove("is-swiping");

            const distance = currentX - startX;

            if (opened && distance > activationDistance / 2) {
                close();
                return;
            }

            if (!opened && distance <= -activationDistance) {
                open();
                return;
            }

            if (opened) {
                open();
                return;
            }

            close();
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

function createAssetsSummary(root, onWriteAttempt = null, financeApplication = null) {
    const wrapper = document.createElement("div");
    wrapper.className = "assets-summary";

    const statistics = getAssetsAnalytics(getAssetsAnalyticsRange("month"));

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
            () => renderFinance(root, "assets", onWriteAttempt, financeApplication)
        );
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

function createAddForm(root, subblock, onWriteAttempt = null, financeApplication = null) {
    const wrapper = document.createElement("form");
    wrapper.className = "finance-add-form";

    const labelInput = document.createElement("input");
    labelInput.className = "input-control";
    labelInput.name = "label";
    labelInput.type = "text";
    labelInput.placeholder = subblock.id === "assets" ? "Актив" : "Название";
    labelInput.autocomplete = "off";
    labelInput.required = true;

    let assetLiquidity = "liquid";
    const liquidityControl = subblock.id === "assets"
        ? document.createElement("div")
        : null;

    if (liquidityControl) {
        liquidityControl.className = "liquidity-switch-field";

        const liquidityLabel = document.createElement("span");
        liquidityLabel.className = "liquidity-switch-label";
        liquidityLabel.textContent = "Ликвидность";

        const liquidityState = document.createElement("span");
        liquidityState.className = "liquidity-switch-state";

        const liquiditySwitch = document.createElement("button");
        liquiditySwitch.type = "button";
        liquiditySwitch.className = "liquidity-switch";
        liquiditySwitch.setAttribute("role", "switch");
        liquiditySwitch.setAttribute("aria-checked", "true");
        liquiditySwitch.setAttribute("aria-label", "Переключить ликвидность актива");

        const updateLiquidityControl = () => {
            const isLiquid = assetLiquidity === "liquid";
            liquiditySwitch.setAttribute("aria-checked", String(isLiquid));
            liquiditySwitch.classList.toggle("is-on", isLiquid);
            liquidityState.textContent = isLiquid ? "Ликвидный" : "Неликвидный";
        };

        liquiditySwitch.addEventListener("click", () => {
            assetLiquidity = assetLiquidity === "liquid" ? "illiquid" : "liquid";
            updateLiquidityControl();
        });

        liquidityControl.append(liquidityLabel, liquidityState, liquiditySwitch);
        updateLiquidityControl();
    }

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
    if (liquidityControl) wrapper.appendChild(liquidityControl);
    if (paymentInput) wrapper.appendChild(paymentInput);
    wrapper.append(addButton, error);

    wrapper.addEventListener("submit", async (event) => {
        event.preventDefault();
        error.hidden = true;

        const save = async () => {
            try {
                if (subblock.id === "financial-burden") {
                    await financeApplication.addFinancialBurdenEntry(
                        labelInput.value,
                        amountInput.value,
                        paymentInput.value
                    );
                } else {
                    await financeApplication.addFinanceEntry(subblock.id, labelInput.value, amountInput.value, assetLiquidity);
                }

                renderFinance(root, subblock.id, onWriteAttempt, financeApplication);
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

function createSubblock(root, subblock, isOpen, onWriteAttempt = null, financeApplication = null) {
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

    const entries = subblock.id === "financial-stability-index" || !financeApplication
        ? []
        : financeApplication.listFinanceEntries(subblock.id).sort((first, second) => {
            const firstPinned = isEntryPinned(subblock.id, first.id);
            const secondPinned = isEntryPinned(subblock.id, second.id);
            return Number(secondPinned) - Number(firstPinned);
        });

    if (subblock.id === "financial-stability-index") {
        if (financeApplication) {
            content.appendChild(createFinancialStabilityIndexPanel(financeApplication));
        }
    }

    if (subblock.id === "assets") {
        content.appendChild(createAssetsSummary(root, onWriteAttempt, financeApplication));
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
                const row = createEntryRow(root, subblock, entry);
                row.classList.toggle("is-pinned", isEntryPinned(subblock.id, entry.id));
                entryList.appendChild(row);

                if (subblock.id !== "financial-stability-index") {
                    attachEntryEdit(
                        row,
                        subblock.id,
                        entry,
                        onWriteAttempt,
                        financeApplication,
                        (updated) => {
                            const label = row.querySelector(".finance-entry-label");
                            const amount = row.querySelector(".finance-entry-amount");

                            if (label) label.textContent = updated.label;

                            if (amount) {
                                amount.textContent = subblock.id === "financial-burden"
                                    ? "Долг " + formatAmount(updated.debt) +
                                      " · Платёж " + formatAmount(updated.payment)
                                    : formatAmount(updated.amount);
                            }

                            if (subblock.id === "assets") {
                                const liquidity = row.querySelector(".finance-entry-liquidity");

                                if (liquidity) {
                                    liquidity.textContent =
                                        updated.liquidity === "illiquid"
                                            ? "Неликвидно"
                                            : "Ликвидно";
                                }

                                refreshAssetsSummary(root);
                            }
                        },
                        () => {
                            toggleEntryPinned(subblock.id, entry.id);
                            renderFinance(root, subblock.id, onWriteAttempt);
                        },
                        () => {
                            deleteFinanceEntryItem(root, row, onWriteAttempt, financeApplication);
                        },
                        () => {
                            if (countPinnedEntries(subblock.id, financeApplication) >= MAX_PINNED_ENTRIES_PER_BLOCK) {
                                showSubscriptionLimitNotice();
                                return true;
                            }

                            return false;
                        }
                    );
                }
            });

            content.appendChild(entryList);
        }
    }

    if (subblock.id !== "financial-stability-index") {
        content.appendChild(createAddForm(root, subblock, onWriteAttempt, financeApplication));
    }
    wrapper.append(header, content);

    button.addEventListener("click", () => {
        const nextOpen = button.getAttribute("aria-expanded") !== "true";
        renderFinance(root, nextOpen ? subblock.id : null, onWriteAttempt);
    });

    return wrapper;
}

function renderFinance(root, openSubblockId = null, onWriteAttempt = null, financeApplication = null) {
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
        list.appendChild(createSubblock(root, subblock, subblock.id === openSubblockId, onWriteAttempt, financeApplication));
    });

    section.append(heading, list);
    root.appendChild(section);

    attachSwipeDelete(root, onWriteAttempt, financeApplication);
}

export { renderFinance, attachSwipeDelete, deleteFinanceEntryItem };
