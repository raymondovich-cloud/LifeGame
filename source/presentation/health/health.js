// source/presentation/health/health.js — Version 1.1
// Responsibility: render the authenticated Health module and collect manual Health facts.

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

    const score = createElement(
        "strong",
        "health-factor__score",
        scoreText(data?.score) + (Number.isFinite(Number(data?.score)) ? "/100" : "")
    );

    header.append(label, score);

    const track = createElement("div", "health-factor__track");
    const fill = createElement("span", "health-factor__fill");
    const numericScore = Number(data?.score);

    fill.style.width = Number.isFinite(numericScore)
        ? Math.max(0, Math.min(100, numericScore)) + "%"
        : "0%";

    track.appendChild(fill);
    row.append(header, track);
    return row;
}

function createFactForm(application, onSaved) {
    const form = createElement("form", "health-input");
    form.noValidate = true;

    const title = createElement("strong", "health-input__title", "Ручной ввод данных");
    const description = createElement(
        "p",
        "health-input__description",
        "Добавляйте актуальные показатели восстановления, активности, образа жизни и питания."
    );

    const grid = createElement("div", "health-input__grid");
    const fields = [
        ["sleep", "Сон, часов", "7.5"],
        ["steps", "Шаги в день", "8000"],
        ["activeMinutes", "Активность, мин/нед.", "150"],
        ["recovery", "Восстановление 1–10", "8"],
        ["stress", "Стресс 1–10", "4"],
        ["mood", "Настроение 1–10", "8"],
        ["wellbeing", "Самочувствие 1–10", "8"],
        ["nutrition", "Качество питания 1–10", "8"]
    ];

    const inputs = new Map();

    fields.forEach(([name, label, placeholder]) => {
        const wrapper = createElement("label", "health-input__field");
        wrapper.appendChild(createElement("span", "health-input__label", label));

        const input = document.createElement("input");
        input.type = "number";
        input.name = name;
        input.placeholder = placeholder;
        input.min = "0";
        input.inputMode = "decimal";

        wrapper.appendChild(input);
        inputs.set(name, input);
        grid.appendChild(wrapper);
    });

    const submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "button-control";
    submit.textContent = "Сохранить данные";

    const status = createElement("p", "health-input__status");
    status.setAttribute("aria-live", "polite");

    form.append(title, description, grid, submit, status);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        submit.disabled = true;
        status.textContent = "Сохраняем…";

        const value = (name) => {
            const parsed = Number(inputs.get(name)?.value);
            return Number.isFinite(parsed) ? parsed : null;
        };

        try {
            const now = Date.now();

            const facts = [
                ["recovery", {
                    recordedAt: now,
                    sleepDurationHours: value("sleep"),
                    subjectiveRecovery: value("recovery")
                }],
                ["activity", {
                    recordedAt: now,
                    stepsPerDay: value("steps"),
                    activeMinutesPerWeek: value("activeMinutes")
                }],
                ["lifestyle", {
                    recordedAt: now,
                    stress: value("stress"),
                    mood: value("mood"),
                    subjectiveWellbeing: value("wellbeing"),
                    subjectiveQuality: value("nutrition")
                }]
            ];

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
            await onSaved();
        } catch (error) {
            status.textContent = error?.message || "Не удалось сохранить данные.";
        } finally {
            submit.disabled = false;
        }
    });

    return form;
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
                Number.isFinite(Number(data?.score))
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

async function renderHealth(container, healthApplication) {
    if (!healthApplication) {
        throw new Error("LifeGame Health: application is required.");
    }

    container.replaceChildren();

    const page = createElement("section", "finance-workspace health-workspace");
    page.setAttribute("aria-label", "Health");

    const intro = createElement("header", "finance-workspace-header");

    intro.append(
        createElement("span", "finance-section-meta", "HEALTH"),
        createElement("h2", "", "Система здоровья"),
        createElement(
            "p",
            "",
            "Понимайте состояние своего организма и образа жизни как единую систему."
        )
    );

    const healthIndex = createHealthIndexBlock(healthApplication);
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
    action.textContent = "Добавить данные →";

    const formHost = createElement("div", "health-input-host");
    formHost.hidden = true;

    action.addEventListener("click", () => {
        formHost.hidden = !formHost.hidden;
        action.textContent = formHost.hidden
            ? "Добавить данные →"
            : "Скрыть ввод ↑";
    });

    dataEntry.append(copy, action, formHost);
    page.append(intro, healthIndex.section, factorsContainer, dataEntry);
    container.appendChild(page);

    const refresh = async () => {
        const result = await healthApplication.calculateFromMemory();
        const index = result.index;

        healthIndex.value.textContent =
            index.value === null ? "—" : index.value.toFixed(1);

        healthIndex.category.textContent =
            index.value === null
                ? "Недостаточно данных"
                : (index.category?.label || "Оценка");

        healthIndex.description.textContent =
            result.diagnosis?.message ||
            "Недостаточно данных для персональной диагностики.";

        renderDiagnostics(healthIndex.diagnosticsPanel, index);

        factorsContainer.replaceChildren(
            createFactorsBlock(index)
        );
    };

    const input = createFactForm(healthApplication, refresh);
    formHost.appendChild(input);

    await refresh();
}

export { renderHealth };
