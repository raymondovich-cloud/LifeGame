// source/presentation/finance/finance.js — Version 4.31

import { beginOperation, endOperation, trace } from "../../core/diagnostics/lifecycle.trace.js";

import { renderAssetsStatisticsScreen } from "./assets.statistics.js";
import { renderSectionAnalyticsScreen } from "./section.analytics.js";
import { createAssetsAnalytics } from "../../application/finance/assets.analytics.js";
import { createFinanceAnalytics } from "../../application/finance/finance.analytics.js";
import { createInfoTooltip } from "../shared/info.tooltip.js";
import { attachEntryEdit } from "./entry.edit.js";
import { showSubscriptionLimitNotice } from "../shared/subscription.limit.js";

const pinnedEntries = new Set();
const MAX_PINNED_ENTRIES_PER_BLOCK = 3;

const FINANCE_DATA_SUBBLOCKS = Object.freeze([
    { id: "assets", number: "01", title: "Активы", description: "Имущество и средства, которыми вы владеете", info: "Активы, которыми вы владеете: недвижимость, автомобиль, наличные, средства на картах, счета и другие активы, которые пользователь хочет учитывать в своей финансовой картине." },
    { id: "actual-earnings", number: "02", title: "Фактически заработанно", description: "Реально полученный доход", info: "Доход, который вы фактически получили за выбранный период." },
    { id: "financial-burden", number: "03", title: "Финансовая нагрузка", description: "Обязательства, влияющие на бюджет", info: "Обязательства и регулярные финансовые нагрузки, которые уменьшают доступные средства и влияют на устойчивость." },
    { id: "mandatory-expenses", number: "04", title: "Обязательные траты", description: "Расходы, которые нельзя пропустить", info: "Расходы, которые необходимо оплачивать регулярно независимо от других трат." },
    { id: "financial-cushion", number: "05", title: "Финансовая подушка", description: "Резерв на непредвиденные ситуации", info: "Резерв средств, предназначенный для покрытия непредвиденных расходов и периодов снижения дохода." },
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
    },
    {
        id: "financial-cushion",
        label: "RESERVE",
        title: "Финансовая подушка",
        description: "Резерв на непредвиденные ситуации",
        info: "Резерв средств для покрытия непредвиденных расходов и периодов снижения дохода."
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
        reserve: getSectionTotal(financeApplication, "financial-cushion")
    };
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
    value.textContent = String(result.value);

    const suffix = document.createElement("span");
    suffix.className = "finance-health-suffix";
    suffix.textContent = "/100";

    valueRow.append(value, suffix);

    const category = document.createElement("span");
    category.className = "finance-health-category";
    category.textContent = result.category?.label || "Недостаточно данных";

    const description = document.createElement("p");
    description.className = "finance-health-description";
    description.textContent = "Комплексная оценка вашего финансового положения, которая показывает уровень устойчивости системы и помогает понять, насколько уверенно вы справляетесь с текущими расходами и обязательствами.";

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

    const diagnosticsPanel = document.createElement("div");
    diagnosticsPanel.className = "finance-health-diagnostics";
    diagnosticsPanel.hidden = true;

    [
        ["Финансовая сила", result.components.financialStrength, "/100"],
        ["Стабильность", result.components.stabilityFactor, "/1"],
        ["Выживаемость", result.diagnostics.survivalMonths, " мес."],
        ["Покрытие расходов", result.diagnostics.incomeCoverage, "×"],
        ["Долговая нагрузка", result.diagnostics.debtBurdenRatio, "×"],
        ["Долговая экспозиция", result.diagnostics.debtExposureRatio, "×"]
    ].forEach(([label, componentValue, suffixText]) => {
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
    });

    section.append(meta, valueRow, category, description, diagnostics, diagnosticsPanel);
    return section;
}

function formatPercentChange(change) {
    if (!change || !change.hasComparison || change.percent === null) return "—";
    const value = Number(change.percent);
    return (value >= 0 ? "+" : "−") + formatAmount(Math.abs(value)) + "%";
}

function createCapitalBlock(financeApplication, assetsAnalytics, financeAnalytics, root, onWriteAttempt) {
    const snapshot = getFinancialSnapshot(financeApplication, assetsAnalytics);
    const range = financeAnalytics
        ? financeAnalytics.getFinanceAnalyticsRange("month")
        : null;
    const analyticsSnapshot = range
        ? financeAnalytics.getFinanceAnalytics(range)
        : null;

    const section = document.createElement("section");
    section.className = "finance-capital";
    section.setAttribute("aria-label", "Dynamics");

    const header = document.createElement("div");
    header.className = "finance-block-heading";

    const eyebrow = document.createElement("span");
    eyebrow.className = "finance-section-meta";
    eyebrow.textContent = "DYNAMICS";

    header.appendChild(eyebrow);

    const amount = document.createElement("div");
    amount.className = "finance-capital-value";
    amount.textContent = formatAmount(snapshot.capital) + " ₽";

    const caption = document.createElement("p");
    caption.className = "finance-capital-caption";
    caption.textContent = "Общая стоимость активов";

    const chart = document.createElement("div");
    chart.className = "finance-capital-chart";
    chart.setAttribute("aria-label", "Динамика пяти финансовых показателей за месяц");

    const chartTitle = document.createElement("span");
    chartTitle.className = "finance-capital-chart-title";
    chartTitle.textContent = "Динамика за месяц";

    const chartBars = document.createElement("div");
    chartBars.className = "finance-capital-chart-bars";

    const chartMetrics = [
        ["assets", "Активы"],
        ["actual-earnings", "Заработано"],
        ["financial-burden", "Нагрузка"],
        ["mandatory-expenses", "Траты"],
        ["financial-cushion", "Подушка"]
    ].map(([id, label]) => {
        const change = analyticsSnapshot?.metrics?.[id]?.change;
        const value = change?.hasComparison && Number.isFinite(Number(change.percent))
            ? Number(change.percent)
            : null;

        return { id, label, value };
    });

    const comparableValues = chartMetrics
        .map((metric) => metric.value)
        .filter((value) => value !== null)
        .map((value) => Math.abs(value));
    const maxChange = Math.max(...comparableValues, 1);

    chartMetrics.forEach(({ id, label, value }) => {
        const column = document.createElement("div");
        column.className = "finance-capital-chart-column";

        const labelNode = document.createElement("span");
        labelNode.className = "finance-capital-chart-label";
        labelNode.textContent = label;

        const metric = document.createElement("strong");
        metric.className = "finance-capital-chart-value";
        metric.textContent = value === null
            ? "—"
            : formatPercentChange({
                percent: value,
                hasComparison: true
            });

        const barTrack = document.createElement("span");
        barTrack.className = "finance-capital-chart-track";
        barTrack.setAttribute("aria-hidden", "true");

        const bar = document.createElement("span");
        bar.className = "finance-capital-chart-bar";
        if (value !== null) {
            bar.classList.add(value >= 0 ? "is-positive" : "is-negative");
            bar.style.height = Math.max(10, (Math.abs(value) / maxChange) * 100) + "%";
        }
        barTrack.appendChild(bar);

        const chartFooter = document.createElement("div");
        chartFooter.className = "finance-capital-chart-footer";
        chartFooter.append(metric, labelNode);

        column.append(barTrack, chartFooter);
        chartBars.appendChild(column);
    });

    chart.append(chartTitle, chartBars);
    section.append(header, amount, caption, chart);
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
        ? "Долг " + formatAmount(entry.debt) + " · Платёж " + formatAmount(entry.payment)
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
                    ? "Долг " + formatAmount(updated.debt) + " · Платёж " + formatAmount(updated.payment)
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

    const paymentInput = section.id === "financial-burden"
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

    const submit = document.createElement("button");
    submit.className = "button-control";
    submit.type = "submit";
    submit.textContent = "Добавить";

    const error = document.createElement("p");
    error.className = "finance-form-error";
    error.hidden = true;

    form.append(labelInput, amountInput);
    if (liquidityControl) form.appendChild(liquidityControl);
    if (paymentInput) form.appendChild(paymentInput);
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
                        paymentInput.value
                    );
                } else {
                    await financeApplication.addFinanceEntry(
                        section.id,
                        labelInput.value,
                        amountInput.value,
                        assetLiquidity
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
    description.textContent = "Сводная оценка финансовой устойчивости с учётом ликвидности, дохода, долга, резерва и финансового тренда.";

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

    if (subblock.id !== "financial-stability-index") {

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
        renderFinanceData(root, nextOpen ? subblock.id : null, onWriteAttempt, financeApplication);
    });

    return wrapper;
}


function renderFinanceData(root, activeSectionId = null, onWriteAttempt = null, financeApplication = null) {
    if (!root) {
        throw new Error("LifeGame Finance: presentation root was not found.");
    }

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
        renderFinance(root, onWriteAttempt, financeApplication);
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

    page.appendChild(list);
    root.appendChild(page);
    attachSwipeDelete(root, onWriteAttempt, financeApplication, assetsAnalytics);
}

function renderFinance(root, onWriteAttempt = null, financeApplication = null) {
    if (!root) {
        throw new Error("LifeGame Finance: presentation root was not found.");
    }

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
        intro,
        createHealthBlock(financeApplication),
        createCapitalBlock(financeApplication, assetsAnalytics, financeAnalytics, root, onWriteAttempt)
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
        renderFinanceData(root, null, onWriteAttempt, financeApplication);
    });

    data.append(copy, action);
    page.appendChild(data);

    root.appendChild(page);
    attachSwipeDelete(root, onWriteAttempt, financeApplication, assetsAnalytics);
}

export { renderFinance, renderFinanceData, attachSwipeDelete, deleteFinanceEntryItem };
