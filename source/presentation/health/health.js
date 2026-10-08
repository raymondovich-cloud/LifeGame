// health.js — Version 1.0
// Responsibility: render the authenticated Health module and collect manual Health facts.

const FACTOR_LABELS = Object.freeze({
    recovery: "Восстановление",
    activity: "Активность",
    training: "Тренировки",
    nutrition: "Питание",
    lifestyle: "Образ жизни",
    body: "Состояние тела"
});

function scoreText(score) {
    return Number.isFinite(Number(score)) ? Number(score).toFixed(1) : "—";
}

function createElement(tag, className, text = null) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== null) element.textContent = text;
    return element;
}

function renderFactor(factor, data) {
    const row = createElement("div", "health-factor");
    const top = createElement("div", "health-factor__top");
    top.append(
        createElement("span", "health-factor__label", FACTOR_LABELS[factor] || factor),
        createElement("strong", "health-factor__score", scoreText(data?.score))
    );

    const track = createElement("div", "health-factor__track");
    const fill = createElement("div", "health-factor__fill");
    const score = Number(data?.score);
    fill.style.width = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) + "%" : "0%";
    track.appendChild(fill);

    row.append(top, track);
    return row;
}

function createFactForm(application, onSaved) {
    const form = createElement("form", "health-input");
    form.noValidate = true;

    const title = createElement("div", "health-input__title", "Добавить данные");
    const grid = createElement("div", "health-input__grid");

    const fields = [
        ["sleep", "Сон, часов", "number", "7.5"],
        ["steps", "Шаги в день", "number", "8000"],
        ["activeMinutes", "Активность, мин/нед.", "number", "150"],
        ["recovery", "Восстановление 1–10", "number", "8"],
        ["stress", "Стресс 1–10", "number", "4"],
        ["mood", "Настроение 1–10", "number", "8"],
        ["wellbeing", "Самочувствие 1–10", "number", "8"],
        ["nutrition", "Качество питания 1–10", "number", "8"]
    ];

    const inputs = new Map();

    fields.forEach(([name, label, type, placeholder]) => {
        const wrapper = createElement("label", "health-input__field");
        wrapper.appendChild(createElement("span", "health-input__label", label));
        const input = document.createElement("input");
        input.type = type;
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
    submit.className = "health-input__submit";
    submit.textContent = "Сохранить данные";

    const status = createElement("p", "health-input__status");
    status.setAttribute("aria-live", "polite");

    form.append(title, grid, submit, status);

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

            for (const [category, fact] of [
                ["recovery", recovery],
                ["activity", activity],
                ["lifestyle", lifestyle]
            ]) {
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

async function renderHealth(container, healthApplication) {
    if (!healthApplication) {
        throw new Error("LifeGame Health: application is required.");
    }

    container.replaceChildren();

    const section = createElement("section", "health-module");
    const eyebrow = createElement("span", "health-module__eyebrow", "HEALTH");
    const heading = createElement("h1", "health-module__title", "Health System");
    const subtitle = createElement(
        "p",
        "health-module__subtitle",
        "Система оценивает устойчивость восстановления, активности, тренировок, питания, образа жизни и состояния тела."
    );

    const hero = createElement("div", "health-hero");
    const scoreLabel = createElement("span", "health-hero__label", "HEALTH INDEX");
    const score = createElement("strong", "health-hero__score", "—");
    const status = createElement("span", "health-hero__status", "Недостаточно данных");
    hero.append(scoreLabel, score, status);

    const diagnosis = createElement("div", "health-diagnosis");
    const factors = createElement("div", "health-factors");

    const refresh = async () => {
        const result = await healthApplication.calculateFromMemory();
        const index = result.index;

        score.textContent = index.value === null ? "—" : index.value.toFixed(1);
        status.textContent = index.value === null
            ? "Недостаточно данных"
            : (index.category?.label || "Оценка");

        diagnosis.textContent = result.diagnosis.message;
        factors.replaceChildren();

        Object.keys(FACTOR_LABELS).forEach((factor) => {
            factors.appendChild(renderFactor(factor, index.factors?.[factor]));
        });

        if (index.value === null) {
            diagnosis.dataset.state = "insufficient";
        } else {
            diagnosis.dataset.state = "active";
        }
    };

    await refresh();

    const input = createFactForm(healthApplication, refresh);
    section.append(eyebrow, heading, subtitle, hero, diagnosis, factors, input);
    container.appendChild(section);
}

export { renderHealth };
