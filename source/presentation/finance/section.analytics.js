// section.analytics.js — Version 1.7

import { attachEntryEdit } from "./entry.edit.js";

function formatAmount(amount) {
    if (amount === null || amount === undefined || !Number.isFinite(Number(amount))) return "—";
    return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(Number(amount));
}

function formatFinancialBurdenAmount(entry) {
    const debt = "Долг " + formatAmount(entry.debt) + " ₽";
    if (!entry.isCreditProduct) return debt;

    const payment = "Платёж " + formatAmount(entry.payment) + " ₽";
    const rate = Number(entry.interestRate);
    const rateText = Number.isFinite(rate) ? " · " + formatAmount(rate) + "% годовых" : "";
    return debt + " · " + payment + rateText;
}

function formatCreditAnalytics(entry, financeApplication) {
    if (!entry?.isCreditProduct || typeof financeApplication?.calculateCreditProductAnalytics !== "function") return "";

    const result = financeApplication.calculateCreditProductAnalytics(entry);
    if (!result.payoffPossible) return "Платёж не покрывает проценты";

    const months = result.monthsToPayoff;
    const interest = formatAmount(result.totalInterest) + " ₽";
    return "Закрытие ~" + months + " мес. · Переплата " + interest;
}

function formatDate(timestamp) {
    return timestamp
        ? new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(timestamp))
        : "—";
}

function getPreviewEntries(entries, interaction) {
    const sorted = entries
        .map((entry, index) => ({
            entry,
            index,
            pinned: interaction?.isPinned?.(entry.id) === true
        }))
        .sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.index - b.index)
        .map((item) => item.entry);

    const pinned = sorted.filter((entry) => interaction?.isPinned?.(entry.id) === true);
    const latestUnpinned = sorted.filter((entry) => interaction?.isPinned?.(entry.id) !== true).reverse();

    return [...pinned, ...latestUnpinned].slice(0, 3);
}

function attachAnalyticsSwipeDelete(row, onDelete) {
    const content = row.querySelector(".swipe-delete-content");
    const action = row.querySelector(".swipe-delete-action");
    if (!content || !action || typeof onDelete !== "function") return;

    let startX = 0;
    let currentX = 0;
    let startY = 0;
    let tracking = false;
    let opened = false;

    const setOffset = (offset, animated = false) => {
        content.style.setProperty("--swipe-offset", offset + "px");
        content.classList.toggle("is-swiping", !animated);
    };

    const open = () => {
        opened = true;
        row.classList.add("is-delete-ready");
        setOffset(-88, true);
    };

    const close = () => {
        opened = false;
        row.classList.remove("is-delete-ready");
        setOffset(0, true);
    };

    action.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        onDelete();
    });

    content.addEventListener("pointerdown", (event) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        startX = event.clientX;
        currentX = startX;
        startY = event.clientY;
        tracking = true;
        content.classList.add("is-swiping");
        content.setPointerCapture?.(event.pointerId);
    });

    content.addEventListener("pointermove", (event) => {
        if (!tracking) return;
        currentX = event.clientX;
        const deltaX = currentX - startX;
        const deltaY = event.clientY - startY;

        if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
            tracking = false;
            close();
            return;
        }

        if (deltaX < -8 || opened) {
            const base = opened ? -88 : 0;
            setOffset(Math.min(0, Math.max(deltaX + base, -88)));
        }
    });

    const finish = () => {
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

    content.addEventListener("pointerup", finish);
    content.addEventListener("pointercancel", finish);
}

function createAnalyticsRow(root, sectionId, entry, financeApplication, onWriteAttempt, interaction) {
    const row = document.createElement("div");
    row.className = "swipe-delete-item";
    row.dataset.entryId = entry.id;
    row.dataset.subblockId = sectionId;
    row.classList.toggle("is-pinned", interaction?.isPinned?.(entry.id) === true);

    const action = document.createElement("button");
    action.type = "button";
    action.className = "swipe-delete-action";
    action.setAttribute("aria-label", "Удалить " + entry.label);
    action.textContent = "Удалить";

    const content = document.createElement("div");
    content.className = "swipe-delete-content assets-statistics-history-row";

    const main = document.createElement("div");
    main.className = "assets-analytics-composition-main";

    const label = document.createElement("span");
    label.textContent = entry.label;

    const creditAnalytics = document.createElement("span");
    creditAnalytics.className = "assets-analytics-composition-type";
    creditAnalytics.textContent = sectionId === "financial-burden"
        ? formatCreditAnalytics(entry, financeApplication)
        : "";

    if (creditAnalytics.textContent) main.append(label, creditAnalytics);
    else main.appendChild(label);

    const value = document.createElement("div");
    value.className = "assets-analytics-composition-value";

    const amount = document.createElement("strong");
    amount.textContent = sectionId === "financial-burden"
        ? formatFinancialBurdenAmount(entry)
        : formatAmount(entry.amount) + " ₽";

    const meta = document.createElement("div");
    meta.className = "assets-analytics-composition-meta";

    const pin = document.createElement("span");
    pin.className = "finance-entry-pin";
    pin.setAttribute("aria-hidden", "true");
    pin.innerHTML =
        '<svg viewBox="0 0 16 16" focusable="false">' +
            '<path d="M5.2 1.8h5.6l-.7 3.2 2.1 2.1v1.1H8.9v4.1l-.9 1.7-.9-1.7V8.2H3.8V7.1l2.1-2.1z"></path>' +
        "</svg>";

    meta.append(pin);
    main.append(label);
    value.append(amount, meta);
    content.append(main, value);
    row.append(action, content);

    const refresh = () => {
        if (typeof interaction?.onChanged === "function") interaction.onChanged();
    };

    attachEntryEdit(
        row,
        sectionId,
        entry,
        onWriteAttempt,
        financeApplication,
        (updated) => {
            label.textContent = updated.label;
            amount.textContent = sectionId === "financial-burden"
                ? formatFinancialBurdenAmount(updated)
                : formatAmount(updated.amount) + " ₽";
            creditAnalytics.textContent = sectionId === "financial-burden"
                ? formatCreditAnalytics(updated, financeApplication)
                : "";
            refresh();
        },
        () => {
            interaction?.onPin?.(entry.id);
            refresh();
        },
        () => interaction?.onDelete?.(entry.id),
        () => typeof interaction?.onPinLimit === "function" ? interaction.onPinLimit(entry.id) : false
    );

    attachAnalyticsSwipeDelete(row, () => interaction?.onDelete?.(entry.id));
    return row;
}

function renderSectionAnalyticsPage(
    root,
    onBack,
    section,
    financeAnalytics,
    financeApplication,
    onWriteAttempt = null,
    interaction = null,
    mode = "preview",
    fullGroup = null
) {
    root.replaceChildren();

    const backButton = document.createElement("button");
    backButton.type = "button";
    backButton.className = "assets-statistics-back";
    backButton.textContent = fullGroup ? "← Аналитика" : "← " + section.title;
    backButton.addEventListener("click", () => {
        if (fullGroup) {
            renderSectionAnalyticsPage(root, onBack, section, financeAnalytics, financeApplication, onWriteAttempt, interaction, "preview", null);
            return;
        }
        if (typeof onBack === "function") onBack();
    });

    const screen = document.createElement("section");
    screen.className = "assets-statistics-screen";
    screen.setAttribute("aria-label", "Аналитика " + section.title);

    const header = document.createElement("header");
    header.className = "assets-statistics-header";

    const eyebrow = document.createElement("span");
    eyebrow.className = "statistics-meta";
    eyebrow.textContent = "FINANCE · " + section.number;

    const title = document.createElement("h2");
    title.className = "assets-statistics-title";
    title.textContent = "Аналитика";

    const description = document.createElement("p");
    description.className = "assets-statistics-description";
    description.textContent = section.id === "financial-burden"
        ? "Состав кредитных продуктов и долговой нагрузки."
        : "Состояние и история операций раздела «" + section.title + "».";

    header.append(eyebrow, title, description);
    screen.appendChild(header);
    root.append(backButton, screen);

    const content = document.createElement("div");
    content.className = "assets-analytics-content";
    screen.appendChild(content);

    const range = financeAnalytics.getFinanceAnalyticsRange("month");
    const analytics = financeAnalytics.getFinanceAnalytics(range);
    const metric = analytics.metrics[section.id];
    const currentTotal = metric?.current ?? 0;

    const overview = document.createElement("section");
    overview.className = "assets-analytics-overview";

    const overviewLabel = document.createElement("span");
    overviewLabel.className = "statistics-meta";
    overviewLabel.textContent = section.id === "actual-earnings"
        ? "ОБЩАЯ СУММА ДОХОДА"
        : section.id === "financial-burden"
            ? "ОБЩАЯ ФИНАНСОВАЯ НАГРУЗКА"
            : section.id === "mandatory-expenses"
                ? "ОБЩАЯ СУММА РАСХОДОВ"
                : "РАЗМЕР ФИНАНСОВОЙ ПОДУШКИ";

    const overviewValue = document.createElement("strong");
    overviewValue.className = "assets-analytics-overview-value";
    overviewValue.textContent = formatAmount(currentTotal) + " ₽";

    const overviewDate = document.createElement("span");
    overviewDate.className = "assets-analytics-overview-date";
    overviewDate.textContent = "Срез · " + formatDate(
        metric?.current !== null && metric?.current !== undefined
            ? analytics.endDate
            : null
    );

    overview.append(overviewLabel, overviewValue, overviewDate);
    content.appendChild(overview);

    const entries = financeApplication.listFinanceEntries(section.id);

    const renderEntryGroup = (titleText, groupEntries, emptyText, groupKey) => {
        const history = document.createElement("section");
        history.className = "assets-analytics-section assets-analytics-composition";

        const historyTitle = document.createElement("span");
        historyTitle.className = "statistics-meta";
        historyTitle.textContent = titleText;
        history.appendChild(historyTitle);

        if (!groupEntries.length) {
            const empty = document.createElement("span");
            empty.className = "assets-analytics-empty";
            empty.textContent = emptyText;
            history.appendChild(empty);
            content.appendChild(history);
            return;
        }

        const expanded = mode === "full" && fullGroup === groupKey;
        const visible = expanded ? groupEntries : getPreviewEntries(groupEntries, interaction);

        visible.forEach((entry) => {
            history.appendChild(createAnalyticsRow(
                root,
                section.id,
                entry,
                financeApplication,
                onWriteAttempt,
                {
                    ...interaction,
                    onChanged: () => renderSectionAnalyticsPage(
                        root, onBack, section, financeAnalytics, financeApplication, onWriteAttempt, interaction, mode, fullGroup
                    )
                }
            ));
        });

        if (!expanded && groupEntries.length > 3) {
            const openAll = document.createElement("button");
            openAll.type = "button";
            openAll.className = "assets-analytics-open-all";
            openAll.innerHTML = '<span>Открыть все</span><span aria-hidden="true">→</span>';
            openAll.addEventListener("click", () => {
                renderSectionAnalyticsPage(
                    root,
                    onBack,
                    section,
                    financeAnalytics,
                    financeApplication,
                    onWriteAttempt,
                    interaction,
                    "preview",
                    groupKey
                );
            });
            history.appendChild(openAll);
        }

        content.appendChild(history);
    };

    if (section.id === "financial-burden") {
        const creditProducts = entries.filter((entry) => entry.isCreditProduct === true);
        const debts = entries.filter((entry) => entry.isCreditProduct !== true);

        renderEntryGroup(
            "КРЕДИТНЫЕ ПРОДУКТЫ",
            creditProducts,
            "Кредитных продуктов пока нет.",
            "credit-products"
        );

        renderEntryGroup(
            "ДОЛГИ",
            debts,
            "Долгов пока нет.",
            "debts"
        );
    } else {
        renderEntryGroup(
            "ИСТОРИЯ ОПЕРАЦИЙ",
            entries,
            "Записей пока нет.",
            "history"
        );
    }
}

function renderSectionAnalyticsScreen(
    root,
    onBack,
    section,
    financeAnalytics,
    financeApplication,
    onWriteAttempt = null,
    interaction = null
) {
    renderSectionAnalyticsPage(
        root,
        onBack,
        section,
        financeAnalytics,
        financeApplication,
        onWriteAttempt,
        interaction,
        "preview"
    );
}

export { renderSectionAnalyticsScreen };
