// source/presentation/health/health.js — Version 2.6
// Responsibility: render the authenticated Health module and collect manual Health facts.

import { createHealthAnalytics } from "../../application/health/health.analytics.js";
import { renderHealthAnalyticsScreen } from "./section.analytics.js";
import { createInfoTooltip } from "../shared/info.tooltip.js";
import { animateCountUp } from "../shared/count-up.animation.js";
import { animateBarWidth } from "../shared/bar.animation.js";

const FACTOR_LABELS = Object.freeze({
    recovery: "Восстановление",
    activity: "Активность",
    training: "Тренировки",
    nutrition: "Питание",
    lifestyle: "Образ жизни",
    body: "Состояние тела"
});

function createElement(tag, className = "", text = null) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== null) element.textContent = text;
    return element;
}

function scoreText(score) {
    if (score === null || score === undefined || score === "") return "—";
    return Number.isFinite(Number(score)) ? Number(score).toFixed(1) : "—";
}

function renderFactor(factor, data) {
    const row = createElement("div", "health-factor");
    const header = createElement("div", "health-factor__header");

    const label = createElement(
        "span",
        "health-factor__label",
        FACTOR_LABELS[factor] || factor
    );

    const hasNumericScore = data?.score !== null &&
        data?.score !== undefined &&
        data?.score !== "" &&
        Number.isFinite(Number(data.score));
    const score = createElement(
        "strong",
        "health-factor__score",
        scoreText(data?.score) + (hasNumericScore ? "/100" : "")
    );

    header.append(label, score);

    const track = createElement("div", "health-factor__track");
    const fill = createElement("span", "health-factor__fill");
    const numericScore = hasNumericScore ? Number(data.score) : NaN;

    animateBarWidth(
        fill,
        Number.isFinite(numericScore) ? Math.max(0, Math.min(100, numericScore)) : 0
    );

    track.appendChild(fill);
    row.append(header, track);
    return row;
}

const HEALTH_DATA_SECTIONS = Object.freeze([
    {
        key: "recovery",
        number: "01",
        info: "Показатели сна и субъективного восстановления, которые используются для оценки качества восстановления организма.",
        label: "Восстановление",
        description: "Сон и субъективное восстановление.",
        fields: [
            ["sleep", "Сон, часов", "7.5"],
            ["recovery", "Восстановление 1–10", "8"]
        ]
    },
    {
        key: "activity",
        number: "02",
        info: "Повседневная двигательная активность: шаги и активные минуты за неделю.",
        label: "Активность",
        description: "Повседневное движение и активность.",
        fields: [
            ["steps", "Шаги в день", "8000"],
            ["activeMinutes", "Активность, мин/нед.", "150"]
        ]
    },
    {
        key: "training",
        number: "03",
        info: "Факт тренировки и её длительность. Эти данные используются для оценки регулярности тренировочной нагрузки.",
        label: "Тренировки",
        description: "Тренировочная нагрузка. Детальный расчёт нагрузки будет подключён следующим этапом.",
        fields: [
            ["workout", "Тренировка сегодня", "0"],
            ["workoutDuration", "Длительность, мин.", "60"]
        ]
    },
    {
        key: "nutrition",
        number: "04",
        info: "Субъективная оценка качества питания. Используется как ручной показатель до подключения дополнительных источников данных.",
        label: "Питание",
        description: "Субъективная оценка качества питания.",
        fields: [
            ["nutrition", "Качество питания 1–10", "8"]
        ]
    },
    {
        key: "lifestyle",
        number: "05",
        info: "Субъективные показатели стресса, настроения и самочувствия, отражающие текущее состояние образа жизни.",
        label: "Образ жизни",
        description: "Стресс, настроение и субъективное самочувствие.",
        fields: [
            ["stress", "Стресс 1–10", "4"],
            ["mood", "Настроение 1–10", "8"],
            ["wellbeing", "Самочувствие 1–10", "8"]
        ]
    },
    {
        key: "body",
        number: "06",
        info: "Телесные показатели будут подключены после завершения слоя нормализации Body.",
        label: "Состояние тела",
        description: "Телесные показатели будут подключены к расчёту Body после завершения соответствующего слоя нормализации.",
        fields: []
    }
]);

function createCategoryFields(section, inputs) {
    const wrapper = createElement("div", "health-data-category-fields");

    section.fields.forEach(([name, label, placeholder]) => {
        const field = createElement("label", "health-input__field");
        field.appendChild(createElement("span", "health-input__label", label));

        const input = document.createElement("input");
        input.className = "input-control";
        input.type = name === "workout" ? "checkbox" : "number";
        input.name = name;
        input.placeholder = placeholder;
        input.min = "0";
        input.inputMode = "decimal";

        field.appendChild(input);
        inputs.set(name, input);
        wrapper.appendChild(field);
    });

    return wrapper;
}

function createCategoryFactForm(application, section, onSaved) {
    const form = createElement("form", "health-input health-data-category-form");
    form.noValidate = true;

    const inputs = new Map();
    form.appendChild(createCategoryFields(section, inputs));

    const submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "button-control";
    submit.textContent = "Сохранить";

    const status = createElement("p", "health-input__status");
    status.setAttribute("aria-live", "polite");

    form.append(submit, status);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        submit.disabled = true;
        status.textContent = "Сохраняем…";

        const value = (name) => {
            const input = inputs.get(name);
            if (!input) return null;
            if (input.type === "checkbox") return input.checked;
            const parsed = Number(input.value);
            return Number.isFinite(parsed) ? parsed : null;
        };

        try {
            const now = Date.now();
            const facts = [];

            if (section.key === "recovery") {
                facts.push(["recovery", {
                    recordedAt: now,
                    sleepDurationHours: value("sleep"),
                    subjectiveRecovery: value("recovery")
                }]);
            }

            if (section.key === "activity") {
                facts.push(["activity", {
                    recordedAt: now,
                    stepsPerDay: value("steps"),
                    activeMinutesPerWeek: value("activeMinutes")
                }]);
            }

            if (section.key === "training" && value("workout")) {
                facts.push(["activity", {
                    recordedAt: now,
                    type: "workout",
                    workout: true,
                    durationMinutes: value("workoutDuration")
                }]);
            }

            if (section.key === "nutrition") {
                facts.push(["lifestyle", {
                    recordedAt: now,
                    subjectiveQuality: value("nutrition")
                }]);
            }

            if (section.key === "lifestyle") {
                facts.push(["lifestyle", {
                    recordedAt: now,
                    stress: value("stress"),
                    mood: value("mood"),
                    subjectiveWellbeing: value("wellbeing")
                }]);
            }

            for (const [category, fact] of facts) {
                const clean = Object.fromEntries(
                    Object.entries(fact).filter(([, item]) => item !== null)
                );

                if (Object.keys(clean).length > 1) {
                    await application.recordFact(category, clean);
                }
            }

            status.textContent = "Данные сохранены.";
            form.reset();
            if (typeof onSaved === "function") await onSaved();
        } catch (error) {
            status.textContent = error?.message || "Не удалось сохранить данные.";
        } finally {
            submit.disabled = false;
        }
    });

    return form;
}

function createAnalyticsAction(container, healthApplication, section, onBack) {
    const action = document.createElement("button");
    action.type = "button";
    action.className = "finance-text-action health-data-category__analytics";
    action.textContent = "Аналитика →";

    action.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const healthAnalytics = createHealthAnalytics({ healthApplication });
        renderHealthAnalyticsScreen(
            container,
            healthAnalytics,
            section,
            onBack
        );
    });

    return action;
}

function createFactForm(application, onSaved, container, onAnalyticsBack) {
    const wrapper = createElement("div", "health-input");

    const title = createElement("strong", "health-input__title", "Составляющие здоровья");
    const description = createElement(
        "p",
        "health-input__description",
        "Выберите составляющую здоровья и измените показатели внутри неё. Эти же категории используются на главном экране Health."
    );

    const categories = createElement("div", "health-data-categories");

    HEALTH_DATA_SECTIONS.forEach((section, sectionIndex) => {
        const details = document.createElement("details");
        details.className = "health-data-category";
        if (sectionIndex === 0) details.open = true;

        const summary = createElement("summary", "health-data-category__summary");

        const sectionNumber = createElement("span", "accordion-index", section.number);
        const summaryCopy = createElement("span", "health-data-category__copy");
        summaryCopy.append(
            createElement("strong", "", section.label),
            createElement("span", "", section.description)
        );

        summary.append(sectionNumber, summaryCopy);

        const infoTooltip = createInfoTooltip({
            label: "Информация: " + section.label,
            text: section.info
        });
        summary.appendChild(infoTooltip);

        details.appendChild(summary);

        // Health Data uses the same single-open accordion behavior as Finance Data.
        details.addEventListener("toggle", () => {
            if (!details.open) return;

            categories.querySelectorAll(".health-data-category[open]").forEach((item) => {
                if (item !== details) item.open = false;
            });
        });

        const content = createElement("div", "health-data-category__content");

        const analyticsAction = createAnalyticsAction(
            container,
            application,
            section,
            onAnalyticsBack
        );
        const analyticsRow = createElement("div", "health-data-category__analytics-row");
        analyticsRow.appendChild(analyticsAction);
        content.appendChild(analyticsRow);

        if (section.fields.length) {
            content.appendChild(
                createCategoryFactForm(application, section, onSaved)
            );
        } else {
            content.appendChild(
                createElement(
                    "p",
                    "health-data-category__pending",
                    "Категория уже является частью Health Index. Ручные показатели тела подключаются после завершения нормализации Body."
                )
            );
        }

        details.appendChild(content);
        categories.appendChild(details);
    });

    wrapper.append(title, description, categories);
    return wrapper;
}

function createHealthIndexBlock(healthApplication) {
    const section = createElement("section", "finance-health health-index-block");
    section.setAttribute("aria-label", "Health Index");

    const header = createElement("div", "finance-health-header");

    const meta = createElement("span", "finance-section-meta", "HEALTH INDEX");

    const diagnostics = document.createElement("button");
    diagnostics.type = "button";
    diagnostics.className = "finance-text-action";
    diagnostics.textContent = "Показать диагностику →";

    const valueRow = createElement("div", "finance-health-value-row");
    const value = createElement("span", "finance-health-value", "—");
    const suffix = createElement("span", "finance-health-suffix", "/100");
    valueRow.append(value, suffix);

    const category = createElement("span", "finance-health-category", "Недостаточно данных");
    const description = createElement("p", "finance-health-description");

    const diagnosticsPanel = createElement("div", "finance-health-diagnostics");
    diagnosticsPanel.hidden = true;

    diagnostics.addEventListener("click", () => {
        diagnosticsPanel.hidden = !diagnosticsPanel.hidden;
        diagnostics.textContent = diagnosticsPanel.hidden
            ? "Показать диагностику →"
            : "Скрыть диагностику ↑";
    });

    header.append(meta, diagnostics);
    section.append(header, valueRow, category, description, diagnosticsPanel);

    return {
        section,
        value,
        category,
        description,
        diagnosticsPanel
    };
}

function renderDiagnostics(panel, index) {
    panel.replaceChildren();

    Object.keys(FACTOR_LABELS).forEach((factor) => {
        const data = index.factors?.[factor];
        const row = createElement("div", "finance-diagnostic-row");

        row.append(
            createElement("span", "", FACTOR_LABELS[factor]),
            createElement(
                "span",
                "",
                data?.score !== null &&
                data?.score !== undefined &&
                data?.score !== "" &&
                Number.isFinite(Number(data.score))
                    ? Number(data.score).toFixed(1) + "/100"
                    : "—"
            )
        );

        panel.appendChild(row);
    });
}

function createFactorsBlock(index) {
    const section = createElement("section", "finance-capital health-factors-block");
    section.setAttribute("aria-label", "Health factors");

    const heading = createElement("div", "finance-block-heading");
    heading.appendChild(
        createElement("span", "finance-section-meta", "HEALTH FACTORS")
    );

    const description = createElement(
        "p",
        "finance-capital-caption",
        "Шесть факторов, из которых формируется итоговая оценка состояния системы."
    );

    const list = createElement("div", "health-factors-list");

    Object.keys(FACTOR_LABELS).forEach((factor) => {
        list.appendChild(renderFactor(factor, index.factors?.[factor]));
    });

    section.append(heading, description, list);
    return section;
}

function renderHealthData(container, healthApplication, onBack, options = {}) {
    const showPresentationHeader = options.showPresentationHeader !== false;
    if (!healthApplication) {
        throw new Error("LifeGame Health: application is required.");
    }

    container.replaceChildren();

    const page = createElement("section", "finance-workspace finance-data-screen health-data-screen");
    page.setAttribute("aria-label", "Health data");

    const backNavigation = createElement("div", "finance-data-back");
    const back = document.createElement("button");
    back.type = "button";
    back.className = "finance-text-action";
    back.textContent = "← Health";
    back.addEventListener("click", () => {
        if (typeof onBack === "function") onBack();
    });
    backNavigation.appendChild(back);

    const intro = createElement("header", "finance-workspace-header");
    intro.append(
        createElement("h2", "", "Данные здоровья"),
        createElement(
            "p",
            "",
            "Добавляйте и обновляйте показатели, на основе которых система рассчитывает Health Index."
        )
    );

    const content = createElement("div", "health-data-content");
    const formHost = createElement("div", "health-input-host");

    const refreshAndReturn = async () => {
        await healthApplication.calculateFromMemory();
        if (typeof onBack === "function") onBack();
    };

    const returnToHealthData = () => renderHealthData(container, healthApplication, onBack);
    formHost.appendChild(createFactForm(healthApplication, refreshAndReturn, container, returnToHealthData));
    content.appendChild(formHost);

    page.append(backNavigation, intro, content);
    container.appendChild(page);
}


const HEALTH_CATEGORY_LABELS = Object.freeze({
    critical: "Критический уровень",
    weak: "Низкий уровень",
    attention: "Требует внимания",
    good: "Хороший уровень",
    excellent: "Отличное состояние"
});

function hasValue(value) {
    return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
}

function latestField(records, field) {
    return (Array.isArray(records) ? records : [])
        .filter((record) => hasValue(record?.[field]))
        .sort((left, right) => Number(left.recordedAt || 0) - Number(right.recordedAt || 0))
        .at(-1) || null;
}

function formatMetric(value, unit = "") {
    if (!hasValue(value)) return "Нет данных";
    const formatted = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(Number(value));
    return unit ? formatted + " " + unit : formatted;
}

function createHealthPriorityBlock() {
    const section = createElement("section", "health-priority-panel");
    section.setAttribute("aria-label", "Приоритетное действие");
    return section;
}

function renderHealthPriority(panel, index, onOpenData) {
    panel.replaceChildren();

    const copy = createElement("div", "health-priority-panel__copy");
    copy.appendChild(createElement("span", "finance-section-meta", "NEXT BEST ACTION"));

    const title = createElement("h3", "health-priority-panel__title");
    const description = createElement("p", "health-priority-panel__description");
    const action = document.createElement("button");
    action.type = "button";
    action.className = "health-priority-panel__action";
    action.textContent = "Обновить показатели →";
    action.addEventListener("click", onOpenData);

    if (index.value === null) {
        title.textContent = "Начни с базовых данных";
        description.textContent = "Добавь первые наблюдения, чтобы LifeGame смог показать текущее состояние и выделить приоритетную область.";
        action.textContent = "Добавить данные →";
    } else {
        const primary = index.constraints?.[0];
        const label = primary ? (FACTOR_LABELS[primary.factor] || primary.factor) : null;
        title.textContent = primary ? "Фокус внимания — " + label.toLowerCase() : "Система выглядит сбалансированной";
        description.textContent = primary
            ? "Этот фактор сейчас сильнее всего влияет на общий Health Index. Начни с регулярного наблюдения за ним и небольших последовательных действий."
            : "По доступным данным нет выраженного ограничивающего фактора. Поддерживай устойчивые привычки и обновляй показатели.";
    }

    copy.append(title, description);
    panel.append(copy, action);
}

function createHealthMetricsBlock(className, eyebrow, title, description = "") {
    const section = createElement("section", className);
    section.appendChild(createElement("span", "finance-section-meta", eyebrow));
    section.appendChild(createElement("h3", "health-overview-section__title", title));
    if (description) section.appendChild(createElement("p", "health-overview-section__description", description));
    return section;
}

function createHealthMetric(label, value, note = "") {
    const item = createElement("div", "health-overview-metric");
    item.appendChild(createElement("span", "health-overview-metric__label", label));
    item.appendChild(createElement("strong", "health-overview-metric__value", value));
    if (note) item.appendChild(createElement("span", "health-overview-metric__note", note));
    return item;
}

async function renderDailyActivity(panel, healthApplication) {
    const [activityFacts, recoveryFacts] = await Promise.all([
        healthApplication.listFacts("activity"),
        healthApplication.listFacts("recovery")
    ]);

    const steps = latestField(activityFacts, "stepsPerDay");
    const activeMinutes = latestField(activityFacts, "activeMinutesPerWeek");
    const sleep = latestField(recoveryFacts, "sleepDurationHours");

    panel.querySelector(".health-overview-metrics")?.remove();
    const metrics = createElement("div", "health-overview-metrics");
    metrics.append(
        createHealthMetric("Шаги в день", formatMetric(steps?.stepsPerDay, "шагов"), steps ? "Ручной ввод" : "Добавь первое значение"),
        createHealthMetric("Активность за неделю", formatMetric(activeMinutes?.activeMinutesPerWeek, "мин"), activeMinutes ? "Ручной ввод" : "Добавь первое значение"),
        createHealthMetric("Сон", formatMetric(sleep?.sleepDurationHours, "ч"), sleep ? "Последнее наблюдение" : "Добавь первое значение")
    );
    panel.appendChild(metrics);
}

async function renderTrainingSummary(panel, healthApplication) {
    const activityFacts = await healthApplication.listFacts("activity");
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const workouts = (Array.isArray(activityFacts) ? activityFacts : [])
        .filter((fact) => (fact?.type === "workout" || fact?.workout === true) && fact?.workout !== false);
    const recentWorkouts = workouts.filter((fact) => Number(fact.recordedAt) >= weekAgo && Number(fact.recordedAt) <= now);
    const latestWorkout = workouts
        .slice()
        .sort((left, right) => Number(left.recordedAt || 0) - Number(right.recordedAt || 0))
        .at(-1);

    panel.querySelector(".health-overview-metrics")?.remove();
    const metrics = createElement("div", "health-overview-metrics health-overview-metrics--training");
    metrics.append(
        createHealthMetric("За 7 дней", String(recentWorkouts.length), "Тренировок"),
        createHealthMetric("Последняя", latestWorkout ? new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(new Date(latestWorkout.recordedAt)) : "Нет записей", latestWorkout ? "Дата занятия" : "История пока пуста"),
        createHealthMetric("Длительность", formatMetric(latestField(workouts, "durationMinutes")?.durationMinutes, "мин"), "Последняя записанная")
    );
    panel.appendChild(metrics);

    const note = panel.querySelector(".health-training-note") || createElement("p", "health-training-note");
    note.textContent = "Дневник тренировок развивается как отдельный раздел и не зависит от подключения Apple Health.";
    if (!note.isConnected) panel.appendChild(note);
}

async function renderHealth(container, healthApplication, options = {}) {
    const showPresentationHeader = options.showPresentationHeader !== false;

    if (!healthApplication) {
        throw new Error("LifeGame Health: application is required.");
    }

    container.replaceChildren();

    const page = createElement("section", "finance-workspace health-workspace");
    page.setAttribute("aria-label", "Health");

    const intro = createElement("header", "finance-workspace-header");

    intro.append(
        createElement("span", "finance-section-meta", "HEALTH"),
        createElement("h2", "", "Твоё здоровье — твой ресурс."),
        createElement(
            "p",
            "",
            "Единая система физического состояния, повседневной активности и развития — без медицинских диагнозов."
        )
    );

    const healthIndex = createHealthIndexBlock(healthApplication);
    const priorityPanel = createHealthPriorityBlock();
    const activityPanel = createHealthMetricsBlock(
        "health-overview-section health-daily-activity",
        "DAILY ACTIVITY",
        "Повседневная активность",
        "Только сохранённые наблюдения. Интеграция с Apple Health будет подключена отдельно."
    );
    const trainingPanel = createHealthMetricsBlock(
        "health-overview-section health-training-summary",
        "TRAINING",
        "Тренировки",
        "Краткая сводка тренировочной регулярности."
    );
    const factorsContainer = createElement("div", "health-factors-container");

    const dataEntry = createElement("section", "finance-data-entry");

    const copy = createElement("div", "finance-data-entry-copy");
    copy.append(
        createElement("strong", "", "Управление данными здоровья"),
        createElement(
            "p",
            "",
            "Добавление и обновление показателей для расчёта Health Index."
        )
    );

    const action = document.createElement("button");
    action.type = "button";
    action.className = "finance-text-action";
    action.textContent = "Открыть →";

    action.addEventListener("click", () => {
        renderHealthData(container, healthApplication, () => {
            renderHealth(container, healthApplication);
        });
    });

    dataEntry.append(copy, action);
    page.append(
        ...(showPresentationHeader ? [intro] : []),
        healthIndex.section,
        priorityPanel,
        activityPanel,
        trainingPanel,
        factorsContainer,
        dataEntry
    );
    container.appendChild(page);

    const refresh = async () => {
        const result = await healthApplication.calculateFromMemory();
        const index = result.index;

        if (index.value === null || !Number.isFinite(Number(index.value))) {
            healthIndex.value.textContent = "—";
        } else {
            healthIndex.value.textContent = "0.0";
            animateCountUp(healthIndex.value, Number(index.value), {
                duration: 1800,
                decimalPlaces: 1
            });
        }

        const categoryKey = index.category?.key;
        healthIndex.category.textContent = index.value === null
            ? "Недостаточно данных"
            : (HEALTH_CATEGORY_LABELS[categoryKey] || "Предварительная оценка");

        healthIndex.description.textContent = index.value === null
            ? "Пока недостаточно наблюдений для устойчивой оценки. Добавь базовые данные и возвращайся к показателю регулярно."
            : "Покрытие доступных данных — " + Math.round(Number(index.coverage) || 0) + "%. Индекс помогает отслеживать динамику привычек, а не ставить диагнозы.";

        renderDiagnostics(healthIndex.diagnosticsPanel, index);
        renderHealthPriority(priorityPanel, index, () => {
            renderHealthData(container, healthApplication, () => renderHealth(container, healthApplication));
        });

        await Promise.all([
            renderDailyActivity(activityPanel, healthApplication),
            renderTrainingSummary(trainingPanel, healthApplication)
        ]);

        factorsContainer.replaceChildren(
            createFactorsBlock(index)
        );
    };

    await refresh();
}

export { renderHealth, renderHealthData };
