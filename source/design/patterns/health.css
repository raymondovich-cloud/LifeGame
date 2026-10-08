// source/presentation/health/health.js — Version 1.2
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

const HEALTH_DATA_SECTIONS = Object.freeze([
    {
        key: "recovery",
        label: "Восстановление",
        description: "Сон и субъективное восстановление.",
        fields: [
            ["sleep", "Сон, часов", "7.5"],
            ["recovery", "Восстановление 1–10", "8"]
        ]
    },
    {
        key: "activity",
        label: "Активность",
        description: "Повседневное движение и активность.",
        fields: [
            ["steps", "Шаги в день", "8000"],
            ["activeMinutes", "Активность, мин/нед.", "150"]
        ]
    },
    {
        key: "training",
        label: "Тренировки",
        description: "Тренировочная нагрузка. Детальный расчёт нагрузки будет подключён следующим этапом.",
        fields: [
            ["workout", "Тренировка сегодня", "0"],
            ["workoutDuration", "Длительность, мин.", "60"]
        ]
    },
    {
        key: "nutrition",
        label: "Питание",
        description: "Субъективная оценка качества питания.",
        fields: [
            ["nutrition", "Качество питания 1–10", "8"]
        ]
    },
    {
        key: "lifestyle",
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

function createFactForm(application, onSaved) {
    const form = createElement("form", "health-input");
    form.noValidate = true;

    const title = createElement("strong", "health-input__title", "Составляющие здоровья");
    const description = createElement(
        "p",
        "health-input__description",
        "Выберите составляющую здоровья и измените показатели внутри неё. Эти же категории используются на главном экране Health."
    );

    const categories = createElement("div", "health-data-categories");
    const inputs = new Map();

    HEALTH_DATA_SECTIONS.forEach((section, index) => {
        const details = document.createElement("details");
        details.className = "health-data-category";
        if (index === 0) details.open = true;

        const summary = document.createElement("summary");
        summary.className = "health-data-category__summary";

        const summaryCopy = createElement("span", "health-data-category__copy");
        summaryCopy.append(
            createElement("strong", "", section.label),
            createElement("span", "", section.description)
        );

        summary.append(summaryCopy);
        details.appendChild(summary);

        const content = createElement("div", "health-data-category__content");

        if (section.fields.length) {
            content.appendChild(createCategoryFields(section, inputs));
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

    const submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "button-control";
    submit.textContent = "Сохранить данные";

    const status = createElement("p", "health-input__status");
    status.setAttribute("aria-live", "polite");

    form.append(title, description, categories, submit, status);

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

            const recovery = {
                recordedAt: now,
                sleepDurationHours: value("sleep"),
                subjectiveRecovery: value("recovery")
            };

            const activity = {
                recordedAt: now,
                stepsPerDay: value("steps"),
                activeMinutesPerWeek: value("activeMinutes")
            };

            const lifestyle = {
                recordedAt: now,
                stress: value("stress"),
                mood: value("mood"),
                subjectiveWellbeing: value("wellbeing"),
                subjectiveQuality: value("nutrition")
            };

            if (Object.values(recovery).some((item) => item !== null && item !== now)) {
                facts.push(["recovery", recovery]);
            }

            if (Object.values(activity).some((item) => item !== null && item !== now)) {
                facts.push(["activity", activity]);
            }

            if (Object.values(lifestyle).some((item) => item !== null && item !== now)) {
                facts.push(["lifestyle", lifestyle]);
            }

            if (value("workout")) {
                facts.push(["activity", {
                    recordedAt: now,
                    type: "workout",
                    workout: true,
                    durationMinutes: value("workoutDuration")
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

function renderHealthData(container, healthApplication, onBack) {
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

    formHost.appendChild(createFactForm(healthApplication, refreshAndReturn));
    content.appendChild(formHost);

    page.append(backNavigation, intro, content);
    container.appendChild(page);
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
    action.textContent = "Открыть →";

    action.addEventListener("click", () => {
        renderHealthData(container, healthApplication, () => {
            renderHealth(container, healthApplication);
        });
    });

    dataEntry.append(copy, action);
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

    await refresh();
}

export { renderHealth, renderHealthData };
