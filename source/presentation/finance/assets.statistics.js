// assets.statistics.js — Version 3.6

import { attachEntryEdit } from "./entry.edit.js";

function formatAmount(amount) {
    if (amount === null || amount === undefined || !Number.isFinite(Number(amount))) return "—";
    return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(Number(amount));
}

function formatDate(timestamp) {
    return timestamp
        ? new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(timestamp))
        : "—";
}

function renderLiquidity(container, liquidity) {
    const section = document.createElement("section");
    section.className = "assets-analytics-section";

    const title = document.createElement("span");
    title.className = "statistics-meta";
    title.textContent = "ЛИКВИДНОСТЬ";

    const total = document.createElement("span");
    total.className = "assets-analytics-section-total";
    total.textContent = formatAmount(liquidity.total) + " ₽";

    const bar = document.createElement("div");
    bar.className = "assets-analytics-liquidity-bar";

    const liquidBar = document.createElement("span");
    liquidBar.className = "assets-analytics-liquidity-bar__liquid";
    liquidBar.style.width = (liquidity.liquidPercent ?? 0) + "%";

    const illiquidBar = document.createElement("span");
    illiquidBar.className = "assets-analytics-liquidity-bar__illiquid";
    illiquidBar.style.width = (liquidity.illiquidPercent ?? 0) + "%";

    bar.append(liquidBar, illiquidBar);

    const rows = document.createElement("div");
    rows.className = "assets-analytics-liquidity-rows";

    [["Ликвидные", liquidity.liquid, liquidity.liquidPercent], ["Неликвидные", liquidity.illiquid, liquidity.illiquidPercent]]
        .forEach(([label, amount, percent]) => {
            const row = document.createElement("div");
            row.className = "assets-analytics-liquidity-row";

            const name = document.createElement("span");
            name.textContent = label;

            const value = document.createElement("span");
            value.textContent = formatAmount(amount) + " ₽ · " + (percent === null ? "—" : percent + "%");

            row.append(name, value);
            rows.appendChild(row);
        });

    section.append(title, total, bar, rows);
    container.appendChild(section);
}

function renderComposition(container, entries) {
    const section = document.createElement("section");
    section.className = "assets-analytics-section";

    const title = document.createElement("span");
    title.className = "statistics-meta";
    title.textContent = "СОСТАВ";
    section.appendChild(title);

    if (!entries.length) {
        const empty = document.createElement("span");
        empty.className = "assets-analytics-empty";
        empty.textContent = "Активов пока нет.";
        section.appendChild(empty);
        container.appendChild(section);
        return;
    }

    entries.forEach((entry) => {
        const row = document.createElement("div");
        row.className = "assets-statistics-history-row";

        const label = document.createElement("span");
        label.textContent = entry.label;

        const amount = document.createElement("span");
        amount.textContent = formatAmount(entry.amount) + " ₽";

        row.append(label, amount);
        section.appendChild(row);
    });

    container.appendChild(section);
}

function attachAnalyticsSwipeDelete(root, row, onDelete) {
    const content = row.querySelector(".swipe-delete-content");
    const action = row.querySelector(".swipe-delete-action");
    if (!content || !action || typeof onDelete !== "function") return;
    let startX = 0, currentX = 0, startY = 0, tracking = false, opened = false;
    const setOffset = (offset, animated = false) => {
        content.style.setProperty("--swipe-offset", offset + "px");
        content.classList.toggle("is-swiping", !animated);
    };
    const open = () => { opened = true; row.classList.add("is-delete-ready"); setOffset(-88, true); };
    const close = () => { opened = false; row.classList.remove("is-delete-ready"); setOffset(0, true); };
    action.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); onDelete(); });
    content.addEventListener("pointerdown", (event) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        startX = event.clientX; currentX = startX; startY = event.clientY; tracking = true;
        content.classList.add("is-swiping"); content.setPointerCapture?.(event.pointerId);
    });
    content.addEventListener("pointermove", (event) => {
        if (!tracking) return;
        currentX = event.clientX;
        const deltaX = currentX - startX; const deltaY = event.clientY - startY;
        if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) { tracking = false; close(); return; }
        if (deltaX < -8 || opened) { const base = opened ? -88 : 0; setOffset(Math.min(0, Math.max(deltaX + base, -88))); }
    });
    const finishSwipe = () => {
        if (!tracking) return; tracking = false; content.classList.remove("is-swiping");
        const distance = currentX - startX;
        if (opened && distance > 28) { close(); return; }
        if (!opened && distance <= -56) { open(); return; }
        opened ? open() : close();
    };
    content.addEventListener("pointerup", finishSwipe);
    content.addEventListener("pointercancel", finishSwipe);
}

function createAnalyticsAssetRow(root, entry, financeApplication, onWriteAttempt, interaction) {
    const row = document.createElement("div");
    row.className = "swipe-delete-item";
    row.dataset.entryId = entry.id;
    row.dataset.subblockId = "assets";
    row.classList.toggle("is-pinned", interaction?.isPinned?.(entry.id) === true);

    const action = document.createElement("button");
    action.type = "button"; action.className = "swipe-delete-action";
    action.setAttribute("aria-label", "Удалить " + entry.label); action.textContent = "Удалить";

    const content = document.createElement("div");
    content.className = "swipe-delete-content assets-statistics-history-row";

    const main = document.createElement("div"); main.className = "assets-analytics-composition-main";
    const label = document.createElement("span"); label.textContent = entry.label;

    const liquidity = document.createElement("span");
    liquidity.className = "assets-analytics-composition-type";
    liquidity.textContent = entry.liquidity === "illiquid" ? "Неликвидный" : "Ликвидный";

    const value = document.createElement("div");
    value.className = "assets-analytics-composition-value";

    const amount = document.createElement("strong");
    amount.textContent = formatAmount(entry.amount) + " ₽";

    const meta = document.createElement("div");
    meta.className = "assets-analytics-composition-meta";

    const percent = document.createElement("span");
    const currentTotal = Number(interaction?.currentTotal ?? 0);
    const entryPercent = currentTotal > 0 ? Math.round((Number(entry.amount) / currentTotal) * 1000) / 10 : null;
    percent.textContent = entryPercent === null ? "—" : entryPercent + "%";

    const pin = document.createElement("span");
    pin.className = "finance-entry-pin";
    pin.setAttribute("aria-hidden", "true");
    pin.innerHTML =
        '<svg viewBox="0 0 16 16" focusable="false">' +
            '<path d="M5.2 1.8h5.6l-.7 3.2 2.1 2.1v1.1H8.9v4.1l-.9 1.7-.9-1.7V8.2H3.8V7.1l2.1-2.1z"></path>' +
        "</svg>";

    main.append(label, liquidity);
    meta.append(percent, pin);
    value.append(amount, meta);
    content.append(main, value);
    row.append(action, content);

    const rerender = () => { if (typeof interaction?.onChanged === "function") interaction.onChanged(); };
    attachEntryEdit(row, "assets", entry, onWriteAttempt, financeApplication,
        () => rerender(),
        () => { interaction?.onPin?.(entry.id); rerender(); },
        () => { interaction?.onDelete?.(entry.id); },
        () => typeof interaction?.onPinLimit === "function" ? interaction.onPinLimit(entry.id) : false
    );
    attachAnalyticsSwipeDelete(root, row, () => interaction?.onDelete?.(entry.id));
    return row;
}

function renderAssetsStatisticsScreen(root, onBack, assetsAnalytics, financeApplication = null, onWriteAttempt = null, interaction = null) {
    root.replaceChildren();

    const backButton = document.createElement("button");
    backButton.type = "button";
    backButton.className = "assets-statistics-back";
    backButton.textContent = "← Активы";
    backButton.addEventListener("click", () => {
        if (typeof onBack === "function") onBack();
    });

    const screen = document.createElement("section");
    screen.className = "assets-statistics-screen";
    screen.setAttribute("aria-label", "Аналитика активов");

    const header = document.createElement("header");
    header.className = "assets-statistics-header";

    const eyebrow = document.createElement("span");
    eyebrow.className = "statistics-meta";
    eyebrow.textContent = "FINANCE · 01";

    const title = document.createElement("h2");
    title.className = "assets-statistics-title";
    title.textContent = "Аналитика";

    const description = document.createElement("p");
    description.className = "assets-statistics-description";
    description.textContent = "Состав и распределение текущего капитала.";

    header.append(eyebrow, title, description);
    screen.appendChild(header);
    root.append(backButton, screen);

    const content = document.createElement("div");
    content.className = "assets-analytics-content";
    screen.appendChild(content);

    const range = assetsAnalytics.getAssetsAnalyticsRange("month");
    const analytics = assetsAnalytics.getAssetsAnalytics(range);
    const currentTotal = analytics.current?.total ?? 0;

    const overview = document.createElement("section");
    overview.className = "assets-analytics-overview";

    const overviewLabel = document.createElement("span");
    overviewLabel.className = "statistics-meta";
    overviewLabel.textContent = "ОБЩАЯ СТОИМОСТЬ АКТИВОВ";

    const overviewValue = document.createElement("strong");
    overviewValue.className = "assets-analytics-overview-value";
    overviewValue.textContent = formatAmount(currentTotal) + " ₽";

    const overviewDate = document.createElement("span");
    overviewDate.className = "assets-analytics-overview-date";
    overviewDate.textContent = "Срез · " + formatDate(analytics.current?.occurredAt);

    overview.append(overviewLabel, overviewValue, overviewDate);
    content.appendChild(overview);

    renderLiquidity(content, analytics.liquidity);

    const distribution = document.createElement("section");
    distribution.className = "assets-analytics-section assets-analytics-distribution";

    const distributionTitle = document.createElement("span");
    distributionTitle.className = "statistics-meta";
    distributionTitle.textContent = "РАСПРЕДЕЛЕНИЕ";

    const distributionBar = document.createElement("div");
    distributionBar.className = "assets-analytics-liquidity-bar";
    distributionBar.setAttribute("role", "img");
    distributionBar.setAttribute(
        "aria-label",
        "Распределение активов: " +
            (analytics.liquidity.liquidPercent ?? 0) +
            "% ликвидные, " +
            (analytics.liquidity.illiquidPercent ?? 0) +
            "% неликвидные"
    );

    const liquidBar = document.createElement("span");
    liquidBar.className = "assets-analytics-liquidity-bar__liquid";
    liquidBar.style.width = (analytics.liquidity.liquidPercent ?? 0) + "%";

    const illiquidBar = document.createElement("span");
    illiquidBar.className = "assets-analytics-liquidity-bar__illiquid";
    illiquidBar.style.width = (analytics.liquidity.illiquidPercent ?? 0) + "%";

    distributionBar.append(liquidBar, illiquidBar);
    distribution.append(distributionTitle, distributionBar);
    content.appendChild(distribution);

    const composition = document.createElement("section");
    composition.className = "assets-analytics-section assets-analytics-composition";

    const compositionTitle = document.createElement("span");
    compositionTitle.className = "statistics-meta";
    compositionTitle.textContent = "АКТИВЫ";
    composition.appendChild(compositionTitle);

    if (!analytics.composition.length) {
        const empty = document.createElement("span");
        empty.className = "assets-analytics-empty";
        empty.textContent = "Активов пока нет.";
        composition.appendChild(empty);
    } else {
        const compositionEntries = analytics.composition
            .map((entry, index) => ({
                entry,
                index,
                pinned: interaction?.isPinned?.(entry.id) === true
            }))
            .sort((first, second) => Number(second.pinned) - Number(first.pinned) || first.index - second.index)
            .map((item) => item.entry);

        compositionEntries.forEach((entry) => {
            const row = createAnalyticsAssetRow(
                root, entry, financeApplication, onWriteAttempt, {
                    ...interaction,
                    currentTotal,
                    onChanged: interaction?.onChanged || (() => renderAssetsStatisticsScreen(
                        root, onBack, assetsAnalytics, financeApplication, onWriteAttempt, interaction
                    ))
                }
            );
            composition.appendChild(row);
        });
    }

    content.appendChild(composition);
}

export { renderAssetsStatisticsScreen };
