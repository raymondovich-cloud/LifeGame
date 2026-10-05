// finance.dashboard.js — Version 1.0

function formatAmount(amount) {
    return new Intl.NumberFormat("ru-RU", {
        maximumFractionDigits: 2
    }).format(Number(amount) || 0);
}

function formatSignedAmount(amount) {
    const value = Number(amount) || 0;
    return (value >= 0 ? "+" : "−") + formatAmount(Math.abs(value)) + " ₽";
}

function createMetric(label, value, caption, modifier = "") {
    const item = document.createElement("div");
    item.className = "finance-dashboard-metric" + (modifier ? " " + modifier : "");

    const meta = document.createElement("span");
    meta.className = "finance-dashboard-metric-label";
    meta.textContent = label;

    const metric = document.createElement("strong");
    metric.className = "finance-dashboard-metric-value";
    metric.textContent = value;

    const note = document.createElement("span");
    note.className = "finance-dashboard-metric-caption";
    note.textContent = caption;

    item.append(meta, metric, note);
    return item;
}

function createOverview(snapshot) {
    const section = document.createElement("section");
    section.className = "finance-dashboard-overview";

    const header = document.createElement("div");
    header.className = "finance-dashboard-heading";

    const eyebrow = document.createElement("span");
    eyebrow.className = "finance-section-meta";
    eyebrow.textContent = "FINANCIAL OVERVIEW";

    const description = document.createElement("p");
    description.textContent = "Ключевые отношения внутри финансовой системы.";

    header.append(eyebrow, description);

    const metrics = document.createElement("div");
    metrics.className = "finance-dashboard-metrics";

    const liquidityPercent = snapshot.capital > 0
        ? Math.round((snapshot.liquid / snapshot.capital) * 100)
        : 0;

    metrics.append(
        createMetric("LIQUID", formatAmount(snapshot.liquid) + " ₽", liquidityPercent + "% капитала"),
        createMetric("INCOME", formatAmount(snapshot.income) + " ₽", "фактически получено"),
        createMetric("EXPENSES", formatAmount(snapshot.expenses) + " ₽", "обязательная структура"),
        createMetric("RESERVE", formatAmount(snapshot.reserve) + " ₽", "финансовая подушка")
    );

    section.append(header, metrics);
    return section;
}

function createAllocation(snapshot) {
    const section = document.createElement("section");
    section.className = "finance-dashboard-allocation";

    const header = document.createElement("div");
    header.className = "finance-dashboard-heading";

    const eyebrow = document.createElement("span");
    eyebrow.className = "finance-section-meta";
    eyebrow.textContent = "CAPITAL ALLOCATION";

    const description = document.createElement("p");
    description.textContent = "Как распределён текущий капитал.";

    header.append(eyebrow, description);

    const total = snapshot.capital || 0;
    const liquidPercent = total > 0 ? (snapshot.liquid / total) * 100 : 0;
    const illiquidPercent = total > 0 ? (snapshot.illiquid / total) * 100 : 0;

    const track = document.createElement("div");
    track.className = "finance-dashboard-allocation-track";
    track.setAttribute("role", "img");
    track.setAttribute(
        "aria-label",
        "Распределение капитала: " +
        Math.round(liquidPercent) +
        "% ликвидные активы, " +
        Math.round(illiquidPercent) +
        "% неликвидные активы"
    );

    const liquid = document.createElement("span");
    liquid.className = "finance-dashboard-allocation-liquid";
    liquid.style.width = liquidPercent + "%";

    const illiquid = document.createElement("span");
    illiquid.className = "finance-dashboard-allocation-illiquid";
    illiquid.style.width = illiquidPercent + "%";

    track.append(liquid, illiquid);

    const legend = document.createElement("div");
    legend.className = "finance-dashboard-allocation-legend";

    [
        ["Ликвидные", snapshot.liquid, Math.round(liquidPercent)],
        ["Неликвидные", snapshot.illiquid, Math.round(illiquidPercent)]
    ].forEach(([label, value, percent]) => {
        const item = document.createElement("div");
        item.className = "finance-dashboard-allocation-item";

        const name = document.createElement("span");
        name.textContent = label;

        const valueNode = document.createElement("strong");
        valueNode.textContent = formatAmount(value) + " ₽ · " + percent + "%";

        item.append(name, valueNode);
        legend.appendChild(item);
    });

    section.append(header, track, legend);
    return section;
}

function createFlow(snapshot) {
    const section = document.createElement("section");
    section.className = "finance-dashboard-flow";

    const header = document.createElement("div");
    header.className = "finance-dashboard-heading";

    const eyebrow = document.createElement("span");
    eyebrow.className = "finance-section-meta";
    eyebrow.textContent = "FINANCIAL FLOW";

    const description = document.createElement("p");
    description.textContent = "Доход против обязательных расходов и регулярных платежей.";

    header.append(eyebrow, description);

    const net = snapshot.income - snapshot.expenses - snapshot.burdenPayment;

    const netBlock = document.createElement("div");
    netBlock.className = "finance-dashboard-flow-net";

    const netLabel = document.createElement("span");
    netLabel.textContent = "NET POSITION";

    const netValue = document.createElement("strong");
    netValue.textContent = formatSignedAmount(net);

    const netCaption = document.createElement("span");
    netCaption.textContent = net >= 0
        ? "доход покрывает текущую обязательную структуру"
        : "обязательная структура превышает фактически полученный доход";

    netBlock.append(netLabel, netValue, netCaption);

    const flowGrid = document.createElement("div");
    flowGrid.className = "finance-dashboard-flow-grid";

    flowGrid.append(
        createMetric("INCOME", formatAmount(snapshot.income) + " ₽", "доход"),
        createMetric("EXPENSES", "−" + formatAmount(snapshot.expenses) + " ₽", "обязательные траты"),
        createMetric("PAYMENTS", "−" + formatAmount(snapshot.burdenPayment) + " ₽", "регулярные платежи")
    );

    section.append(header, netBlock, flowGrid);
    return section;
}

function createSignals(snapshot, health) {
    const section = document.createElement("section");
    section.className = "finance-dashboard-signals";

    const header = document.createElement("div");
    header.className = "finance-dashboard-heading";

    const eyebrow = document.createElement("span");
    eyebrow.className = "finance-section-meta";
    eyebrow.textContent = "FINANCIAL SIGNALS";

    const description = document.createElement("p");
    description.textContent = "Что система говорит о текущем состоянии.";

    header.append(eyebrow, description);

    const signals = document.createElement("div");
    signals.className = "finance-dashboard-signal-list";

    const liquidityRatio = snapshot.capital > 0
        ? Math.round((snapshot.liquid / snapshot.capital) * 100)
        : 0;

    const survivalMonths = Number(health?.diagnostics?.survivalMonths);
    const debtRatio = Number(health?.diagnostics?.debtBurdenRatio);

    const items = [
        [
            "CAPITAL",
            snapshot.capital > 0 ? "Сформирован" : "Не сформирован",
            snapshot.capital > 0 ? "positive" : "critical"
        ],
        [
            "LIQUIDITY",
            liquidityRatio + "% доступного капитала",
            liquidityRatio >= 30 ? "positive" : "warning"
        ],
        [
            "DEBT LOAD",
            Number.isFinite(debtRatio) ? debtRatio.toFixed(1) + "×" : "Нет данных",
            Number.isFinite(debtRatio) && debtRatio <= 0.35 ? "positive" : "critical"
        ],
        [
            "RESILIENCE",
            Number.isFinite(survivalMonths) ? survivalMonths.toFixed(1) + " мес." : "Нет данных",
            Number.isFinite(survivalMonths) && survivalMonths >= 3 ? "positive" : "warning"
        ]
    ];

    items.forEach(([label, value, status]) => {
        const item = document.createElement("div");
        item.className = "finance-dashboard-signal";

        const marker = document.createElement("span");
        marker.className = "finance-dashboard-signal-marker " + status;
        marker.setAttribute("aria-hidden", "true");

        const name = document.createElement("span");
        name.className = "finance-dashboard-signal-label";
        name.textContent = label;

        const metric = document.createElement("strong");
        metric.className = "finance-dashboard-signal-value";
        metric.textContent = value;

        item.append(marker, name, metric);
        signals.appendChild(item);
    });

    section.append(header, signals);
    return section;
}

function createManagementAction(onManage) {
    const section = document.createElement("section");
    section.className = "finance-dashboard-management";

    const copy = document.createElement("div");
    copy.className = "finance-dashboard-management-copy";

    const eyebrow = document.createElement("span");
    eyebrow.className = "finance-section-meta";
    eyebrow.textContent = "DATA";

    const title = document.createElement("strong");
    title.textContent = "Управление финансовыми данными";

    const description = document.createElement("p");
    description.textContent = "Добавление, редактирование и удаление записей.";

    copy.append(eyebrow, title, description);

    const action = document.createElement("button");
    action.type = "button";
    action.className = "finance-text-action";
    action.textContent = "Открыть →";
    action.addEventListener("click", onManage);

    section.append(copy, action);
    return section;
}

function createFinanceDashboard({ snapshot, health, onManage }) {
    const dashboard = document.createElement("div");
    dashboard.className = "finance-dashboard";

    dashboard.append(
        createOverview(snapshot),
        createAllocation(snapshot),
        createFlow(snapshot),
        createSignals(snapshot, health),
        createManagementAction(onManage)
    );

    return dashboard;
}

export { createFinanceDashboard };
