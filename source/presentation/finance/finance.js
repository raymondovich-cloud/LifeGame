// source/presentation/finance/finance.js — Version 4.6

import { beginOperation, endOperation, trace } from "../../core/diagnostics/lifecycle.trace.js";

import { renderAssetsStatisticsScreen } from "./assets.statistics.js";
import { createAssetsAnalytics } from "../../application/finance/assets.analytics.js";
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
    { id: "financial-stability-index", number: "06", title: "Индекс финансовой стабильности", description: "Текущая оценка финансовой устойчивости", info: "Сводная оценка финансовой устойчивости, учитывающая силу финансового положения, стабильность, ликвидность, резерв, долговую нагрузку и финансовый тренд." }
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
    description.textContent = "Сводная оценка устойчивости вашей финансовой системы.";

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

function createCapitalBlock(financeApplication, assetsAnalytics, root, onWriteAttempt) {
    const snapshot = getFinancialSnapshot(financeApplication, assetsAnalytics);

    const section = document.createElement("section");
    section.className = "finance-capital";
    section.setAttribute("aria-label", "Capital");

    const header = document.createElement("div");
    header.className = "finance-block-heading";

    const eyebrow = document.createElement("span");
    eyebrow.className = "finance-section-meta";
    eyebrow.textContent = "CAPITAL";

    const analytics = document.createElement("button");
    analytics.type = "button";
    analytics.className = "finance-text-action";
    analytics.textContent = "Аналитика →";
    analytics.addEventListener("click", () => {
        if (!assetsAnalytics) return;
        renderAssetsStatisticsScreen(
            root,
            () => renderFinanceData(root, "assets", onWriteAttempt, financeApplication),
            assetsAnalytics
        );
    });

    header.append(eyebrow, analytics);

    const amount = document.createElement("div");
    amount.className = "finance-capital-value";
    amount.textContent = formatAmount(snapshot.capital) + " ₽";

    const caption = document.createElement("p");
    caption.className = "finance-capital-caption";
    caption.textContent = "Общая стоимость активов";

    const split = document.createElement("div");
    split.className = "finance-capital-split";

    [
        ["Ликвидные", snapshot.liquid],
        ["Неликвидные", snapshot.illiquid]
    ].forEach(([label, value]) => {
        const item = document.createElement("div");
        item.className = "finance-capital-split-item";

        const name = document.createElement("span");
        name.textContent = label;

        const metric = document.createElement("strong");
        metric.textContent = formatAmount(value) + " ₽";

        item.append(name, metric);
        split.appendChild(item);
    });

    section.append(header, amount, caption, split);
    return section;
}

function createStructureRow(root, section, total, count, active, onWriteAttempt, financeApplication) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "finance-structure-row" + (active ? " is-active" : "");
    row.setAttribute("aria-expanded", String(active));
    const main = document.createElement("span");
    main.className = "finance-structure-main";
    const label = document.createElement("span");
    label.className = "finance-structure-label";
    label.textContent = section.label;
    const title = document.createElement("span");
    title.className = "finance-structure-title";
    title.textContent = section.title;
    const countLabel = document.createElement("span");
    countLabel.className = "finance-structure-count";
    countLabel.textContent = count + " " + (count === 1 ? "запись" : count >= 2 && count <= 4 ? "записи" : "записей");
    main.append(label, title, countLabel);
    const trailing = document.createElement("span");
    trailing.className = "finance-structure-trailing";
    const value = document.createElement("strong");
    value.textContent = formatAmount(total) + " ₽";
    const arrow = document.createElement("span");
    arrow.className = "finance-structure-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "→";
    trailing.append(value, arrow);
    row.append(main, trailing);
    row.addEventListener("click", () => {
        renderFinanceData(root, active ? null : section.id, onWriteAttempt, financeApplication);
    });
    return row;
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
    pin.textContent = "•";

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

function createDetail(root, section, onWriteAttempt, financeApplication, assetsAnalytics) {
    const detail = document.createElement("div");
    detail.className = "finance-detail";

    const header = document.createElement("div");
    header.className = "finance-detail-header";

    const title = document.createElement("div");
    title.className = "finance-detail-title-group";

    const meta = document.createElement("span");
    meta.className = "finance-section-meta";
    meta.textContent = section.label;

    const heading = document.createElement("h3");
    heading.textContent = section.title;

    const description = document.createElement("p");
    description.textContent = section.description;

    title.append(meta, heading, description);

    const info = createInfoTooltip({
        label: "Информация: " + section.title,
        text: section.info
    });

    header.append(title, info);

    const entries = financeApplication
        .listFinanceEntries(section.id)
        .sort((first, second) =>
            Number(isEntryPinned(section.id, second.id)) -
            Number(isEntryPinned(section.id, first.id))
        );

    const total = getSectionTotal(financeApplication, section.id);
    const summary = document.createElement("div");
    summary.className = "finance-detail-summary";

    const summaryMain = document.createElement("div");
    summaryMain.className = "finance-detail-summary-main";

    const summaryValue = document.createElement("strong");
    summaryValue.textContent = formatAmount(total) + " ₽";

    const summaryLabel = document.createElement("span");
    summaryLabel.textContent = section.id === "financial-burden" ? "Общий долг" : "Итого";

    summaryMain.append(summaryValue, summaryLabel);

    const summaryMeta = document.createElement("div");
    summaryMeta.className = "finance-detail-summary-meta";

    const count = document.createElement("strong");
    count.textContent = String(entries.length);

    const countLabel = document.createElement("span");
    countLabel.textContent = entries.length === 1 ? "запись" : entries.length >= 2 && entries.length <= 4 ? "записи" : "записей";

    summaryMeta.append(count, countLabel);

    summary.append(summaryMain, summaryMeta);

    if (section.id === "assets") {
        const liquid = entries
            .filter((entry) => entry?.liquidity !== "illiquid")
            .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
        const illiquid = entries
            .filter((entry) => entry?.liquidity === "illiquid")
            .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

        const split = document.createElement("div");
        split.className = "finance-detail-secondary";

        [
            ["Ликвидные", liquid],
            ["Неликвидные", illiquid]
        ].forEach(([label, value]) => {
            const item = document.createElement("div");
            item.className = "finance-detail-secondary-item";

            const name = document.createElement("span");
            name.textContent = label;

            const amount = document.createElement("strong");
            amount.textContent = formatAmount(value) + " ₽";

            item.append(name, amount);
            split.appendChild(item);
        });

        summary.appendChild(split);
    }

    if (section.id === "financial-burden") {
        const payment = entries.reduce((sum, entry) => sum + Number(entry.payment || 0), 0);
        const paymentItem = document.createElement("div");
        paymentItem.className = "finance-detail-secondary-item";

        const paymentLabel = document.createElement("span");
        paymentLabel.textContent = "Ежемесячные платежи";

        const paymentValue = document.createElement("strong");
        paymentValue.textContent = formatAmount(payment) + " ₽";

        paymentItem.append(paymentLabel, paymentValue);
        summary.appendChild(paymentItem);
    }

    const list = document.createElement("div");
    list.className = "finance-entry-list finance-detail-list";

    if (entries.length === 0) {
        const empty = document.createElement("div");
        empty.className = "list-empty";
        empty.innerHTML = '<span class="list-empty-label">EMPTY STATE</span><p>Данных пока нет. Добавьте первую запись.</p>';
        list.appendChild(empty);
    } else {
        entries.forEach((entry) => {
            const row = createEntryRow(root, section, entry, onWriteAttempt, financeApplication, assetsAnalytics);
            row.classList.toggle("is-pinned", isEntryPinned(section.id, entry.id));
            list.appendChild(row);
        });
    }

    const add = createAddForm(root, section, onWriteAttempt, financeApplication);
    detail.append(header, summary, list, add);
    return detail;
}

function createStructure(financeApplication, snapshot, root, activeSectionId, onWriteAttempt, assetsAnalytics) {
    const section = document.createElement("section");
    section.className = "finance-structure";
    section.setAttribute("aria-label", "Financial structure");

    const header = document.createElement("div");
    header.className = "finance-structure-header";

    const heading = document.createElement("div");
    heading.className = "finance-structure-heading";

    const eyebrow = document.createElement("span");
    eyebrow.className = "finance-section-meta";
    eyebrow.textContent = "FINANCIAL SYSTEMS";

    const description = document.createElement("p");
    description.className = "finance-structure-description";
    description.textContent = "Пять систем. Один финансовый контур.";

    const meta = document.createElement("div");
    meta.className = "finance-structure-meta";

    const systemCount = document.createElement("strong");
    systemCount.textContent = FINANCE_SECTIONS.length + " систем";

    const recordCount = document.createElement("span");
    const totalRecords = FINANCE_SECTIONS.reduce(
        (total, item) => total + financeApplication.listFinanceEntries(item.id).length,
        0
    );
    recordCount.textContent = totalRecords + " " + (
        totalRecords === 1 ? "запись" :
        totalRecords >= 2 && totalRecords <= 4 ? "записи" : "записей"
    );

    meta.append(systemCount, recordCount);
    heading.append(eyebrow, description);
    header.append(heading, meta);

    const rows = document.createElement("div");
    rows.className = "finance-structure-list";

    FINANCE_SECTIONS.forEach((item) => {
        const entries = financeApplication.listFinanceEntries(item.id);
        const total = getSectionTotal(financeApplication, item.id);

        rows.appendChild(
            createStructureRow(
                root,
                item,
                total,
                entries.length,
                item.id === activeSectionId,
                onWriteAttempt,
                financeApplication
            )
        );

        if (item.id === activeSectionId) {
            rows.appendChild(
                createDetail(
                    root,
                    item,
                    onWriteAttempt,
                    financeApplication,
                    assetsAnalytics
                )
            );
        }
    });

    section.append(header, rows);
    return section;
}
function formatSnapshotDate(timestamp) {
    return new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    }).format(timestamp ? new Date(timestamp) : new Date()).toUpperCase();
}


function refreshAssetsSummary(root, financeApplication, assetsAnalytics) {
    const summary = root.querySelector(".assets-summary");
    if (!summary) return;

    const amount = summary.querySelector(".assets-total-value");
    if (!amount) return;

    const statistics = assetsAnalytics.getAssetsAnalytics(assetsAnalytics.getAssetsAnalyticsRange("month"));
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
    statisticsButton.innerHTML =
        '<span>Аналитика</span><span aria-hidden="true">›</span>';

    statisticsButton.addEventListener("click", () => {
        if (!assetsAnalytics) {
            if (typeof onWriteAttempt === "function") onWriteAttempt(() => {});
            return;
        }

        renderAssetsStatisticsScreen(
            root,
            () => renderFinanceData(root, "assets", onWriteAttempt, financeApplication),
            assetsAnalytics
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


function createSubblock(root, subblock, isOpen, onWriteAttempt = null, financeApplication = null, assetsAnalytics = null) {
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
        content.appendChild(createAssetsSummary(root, onWriteAttempt, financeApplication, assetsAnalytics));
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

                                refreshAssetsSummary(root, financeApplication);
                            }
                        },
                        () => {
                            toggleEntryPinned(subblock.id, entry.id);
                            renderFinanceData(root, subblock.id, onWriteAttempt, financeApplication);
                        },
                        () => {
                            deleteFinanceEntryItem(root, row, onWriteAttempt, financeApplication, assetsAnalytics);
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
        renderFinanceData(root, nextOpen ? subblock.id : null, onWriteAttempt, financeApplication);
    });

    return wrapper;
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

function createBackAction(root, onWriteAttempt, financeApplication) {
    const back = document.createElement("button");
    back.type = "button";
    back.className = "finance-text-action";
    back.textContent = "← Finance";
    back.addEventListener("click", () => {
        renderFinance(root, onWriteAttempt, financeApplication);
    });
    return back;
}

function renderFinanceData(root, activeSectionId = null, onWriteAttempt = null, financeApplication = null) {
    if (!root) {
        throw new Error("LifeGame Finance: presentation root was not found.");
    }

    root.replaceChildren();

    if (!financeApplication) {
        renderFinance(root, onWriteAttempt, financeApplication);
        return;
    }

    const assetsAnalytics = createAssetsAnalytics({ financeApplication });
    const page = document.createElement("section");
    page.className = "finance-workspace finance-data-screen";
    page.setAttribute("aria-label", "Financial data");

    const header = document.createElement("header");
    header.className = "finance-workspace-header";

    const headingRow = document.createElement("div");
    headingRow.className = "finance-block-heading";

    const copy = document.createElement("div");
    copy.className = "finance-data-screen-copy";

    const eyebrow = document.createElement("span");
    eyebrow.className = "finance-section-meta";
    eyebrow.textContent = "DATA";

    const title = document.createElement("h2");
    title.textContent = "Финансовые данные";

    const description = document.createElement("p");
    description.textContent = activeSectionId
        ? "Управление выбранной системой."
        : "Управление капиталом, доходами, обязательствами и резервом.";

    copy.append(eyebrow, title, description);

    headingRow.append(
        copy,
        createBackAction(root, onWriteAttempt, financeApplication)
    );
    header.appendChild(headingRow);
    page.appendChild(header);

    const snapshot = getFinancialSnapshot(financeApplication, assetsAnalytics);
    page.appendChild(
        createStructure(
            financeApplication,
            snapshot,
            root,
            activeSectionId,
            onWriteAttempt,
            assetsAnalytics,
            true
        )
    );

    root.appendChild(page);
    attachSwipeDelete(root, onWriteAttempt, financeApplication, assetsAnalytics);
}

function renderFinanceData(root, activeSectionId = null, onWriteAttempt = null, financeApplication = null) {
    if (!root) {
        throw new Error("LifeGame Finance: presentation root was not found.");
    }

    root.replaceChildren();

    const assetsAnalytics = financeApplication
        ? createAssetsAnalytics({ financeApplication })
        : null;

    const page = document.createElement("section");
    page.className = "finance-workspace finance-data-screen";
    page.setAttribute("aria-label", "Finance data");

    const intro = document.createElement("header");
    intro.className = "finance-workspace-header";

    const eyebrow = document.createElement("span");
    eyebrow.className = "finance-section-meta";
    eyebrow.textContent = "DATA";

    const title = document.createElement("h2");
    title.textContent = "Финансовые данные";

    const description = document.createElement("p");
    description.textContent = activeSectionId
        ? "Управление выбранной системой."
        : "Управление капиталом, доходами, обязательствами и резервом.";

    const back = document.createElement("button");
    back.type = "button";
    back.className = "finance-text-action";
    back.textContent = "← Finance";
    back.addEventListener("click", () => {
        renderFinance(root, onWriteAttempt, financeApplication);
    });

    intro.append(eyebrow, title, description, back);
    page.appendChild(intro);

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
                assetsAnalytics
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
    description.textContent = "Одна панель для капитала, доходов, обязательств и резерва.";

    intro.append(eyebrow, title, description);

    if (!financeApplication) {
        page.append(intro);
        root.appendChild(page);
        return;
    }

    page.append(
        intro,
        createHealthBlock(financeApplication),
        createCapitalBlock(financeApplication, assetsAnalytics, root, onWriteAttempt)
    );

    const data = document.createElement("section");
    data.className = "finance-data-entry";

    const copy = document.createElement("div");
    copy.className = "finance-data-entry-copy";

    const meta = document.createElement("span");
    meta.className = "finance-section-meta";
    meta.textContent = "DATA";

    const dataTitle = document.createElement("strong");
    dataTitle.textContent = "Управление финансовыми данными";

    const dataDescription = document.createElement("p");
    dataDescription.textContent = "Добавление, редактирование и удаление записей.";

    copy.append(meta, dataTitle, dataDescription);

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
