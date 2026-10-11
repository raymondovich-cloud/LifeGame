// source/presentation/training/training-overview.js — Version 1.5
// Responsibility: render the Training Overview from an explicit presentation model; never invent user progress.

function createElement(tag, className = "", text = null) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== null) element.textContent = text;
    return element;
}

function createSection(label, className) {
    const section = createElement("section", className);
    section.setAttribute("aria-label", label);
    return section;
}

function renderProgram(section, program, onStartWorkout, onCreateWorkout) {
    section.appendChild(createElement("span", "training-overview__eyebrow", "ТВОЯ ПРОГРАММА"));

    if (!program) {
        section.append(
            createElement("h4", "training-overview__empty-title", "Собери свою первую тренировку"),
            createElement("p", "training-overview__description", "Добавь упражнения, которые выполняешь сам. В тренировке не будет ничего лишнего.")
        );
        if (typeof onCreateWorkout === "function") {
            const create = document.createElement("button");
            create.type = "button";
            create.className = "training-overview__start";
            create.textContent = "СОЗДАТЬ ПЕРВУЮ ТРЕНИРОВКУ";
            create.addEventListener("click", onCreateWorkout);
            section.appendChild(create);
        }
        return;
    }

    const currentWeek = Number(program.currentWeek);
    const totalWeeks = Number(program.totalWeeks);
    const completed = Number(program.completedWorkouts);
    const target = Number(program.targetWorkouts);
    const validProgress = Number.isInteger(currentWeek) && currentWeek > 0 &&
        Number.isInteger(totalWeeks) && totalWeeks >= currentWeek &&
        Number.isInteger(completed) && completed >= 0 &&
        Number.isInteger(target) && target > 0;

    section.appendChild(
        createElement(
            "h4",
            "training-overview__program-week",
            validProgress ? `Неделя ${currentWeek} из ${totalWeeks}` : "Программа тренировок"
        )
    );

    if (validProgress) {
        const progress = createElement("div", "training-overview__progress");
        progress.setAttribute("role", "progressbar");
        progress.setAttribute("aria-label", "Выполнение тренировок за неделю");
        progress.setAttribute("aria-valuemin", "0");
        progress.setAttribute("aria-valuemax", String(target));
        progress.setAttribute("aria-valuenow", String(Math.min(completed, target)));

        const track = createElement("span", "training-overview__progress-track");
        const fill = createElement("span", "training-overview__progress-fill");
        fill.style.width = Math.min(100, completed / target * 100) + "%";
        track.appendChild(fill);
        progress.appendChild(track);

        section.append(
            progress,
            createElement(
                "p",
                "training-overview__progress-copy",
                `Выполнено ${completed} из ${target} тренировок`
            )
        );
    }

    const nextWorkout = program.nextWorkout;
    const next = createSection("Следующая тренировка", "training-overview__next");
    next.appendChild(createElement("span", "training-overview__eyebrow", "Следующая тренировка"));

    if (!nextWorkout) {
        next.appendChild(
            createElement("p", "training-overview__description", "Следующее занятие пока не задано.")
        );
    } else {
        next.appendChild(
            createElement(
                "h4",
                "training-overview__workout-title",
                typeof nextWorkout.title === "string" && nextWorkout.title.trim()
                    ? nextWorkout.title.trim().toLocaleUpperCase("ru-RU")
                    : "ТРЕНИРОВКА"
            )
        );

        const details = [];
        if (Number.isInteger(nextWorkout.exerciseCount) && nextWorkout.exerciseCount >= 0) {
            details.push(`${nextWorkout.exerciseCount} упражнений`);
        }
        if (Number.isInteger(nextWorkout.durationMinutes) && nextWorkout.durationMinutes > 0) {
            details.push(`Около ${nextWorkout.durationMinutes} минут`);
        }
        if (details.length) {
            next.appendChild(createElement("p", "training-overview__description", details.join(" · ")));
        }

        const start = document.createElement("button");
        start.type = "button";
        start.className = "training-overview__start";
        start.textContent = "НАЧАТЬ";
        start.disabled = typeof onStartWorkout !== "function";
        if (typeof onStartWorkout === "function") {
            start.addEventListener("click", () => onStartWorkout(nextWorkout));
        } else {
            start.setAttribute("aria-describedby", "training-overview-start-hint");
        }
        next.appendChild(start);

        if (start.disabled) {
            const hint = createElement(
                "p",
                "training-overview__hint",
                "Запуск занятия появится после подключения сценария тренировки."
            );
            hint.id = "training-overview-start-hint";
            next.appendChild(hint);
        }
    }

    section.appendChild(next);
}


function renderTrainingOverview(container, {
    program = null,
    hasSavedTemplates = false,
    onStartWorkout = null,
    onCreateWorkout = null
} = {}) {
    if (!container || typeof container.replaceChildren !== "function") {
        throw new TypeError("Training Overview: a container element is required.");
    }

    container.replaceChildren();

    const screen = createElement("section", "training-overview");
    screen.setAttribute("aria-label", "Тренировки");

    const systemHeader = createElement("div", "training-overview__system");
    const brand = createElement("span", "training-overview__brand", "LIFE GAME");
    const status = createElement("span", "training-overview__status", "SYSTEM ONLINE");
    status.prepend(createElement("span", "training-overview__status-dot"));
    systemHeader.append(brand, status);

    const heading = createElement("h3", "training-overview__title", "ТРЕНИРОВКИ");
    const showProgramSection = Boolean(program) || !hasSavedTemplates;
    let programSection = null;
    if (showProgramSection) {
        programSection = createSection("Твоя программа", "training-overview__program");
        renderProgram(programSection, program, onStartWorkout, onCreateWorkout);
    }

    screen.append(systemHeader, heading);
    if (programSection) screen.appendChild(programSection);

    const analytics = createSection("Аналитика тренировок", "training-overview__analytics");
    analytics.append(
        createElement("span", "training-overview__eyebrow", "АНАЛИТИКА ТРЕНИРОВОК"),
        createElement("h4", "training-overview__analytics-title", "Твоя динамика — в одном месте"),
        createElement(
            "p",
            "training-overview__analytics-copy",
            "Здесь появится аналитика рабочих весов, объёма нагрузки и регулярности тренировок."
        )
    );
    const comingSoon = createElement("span", "training-overview__analytics-status", "СКОРО");
    comingSoon.setAttribute("aria-label", "Аналитика тренировок скоро появится");
    analytics.appendChild(comingSoon);
    screen.appendChild(analytics);

    container.appendChild(screen);
}

export { renderTrainingOverview };
