// training-session.js — Version 1.0
// Responsibility: render the active workout interaction without owning business rules or persistence.
function createElement(tag, className = "", text = null) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== null) element.textContent = text;
    return element;
}

function renderTrainingSession(container, { sessionResult, workout, application, onFinished } = {}) {
    if (!container || typeof container.replaceChildren !== "function") throw new TypeError("Training Session: a container element is required.");
    if (!sessionResult?.session || !Number.isSafeInteger(sessionResult.revision)) throw new TypeError("Training Session: a valid session envelope is required.");
    if (!workout || !Array.isArray(workout.exercises) || !application ||
        typeof application.recordSet !== "function" || typeof application.completeWorkout !== "function") {
        throw new TypeError("Training Session: workout and application commands are required.");
    }

    let current = sessionResult;

    function render() {
        container.replaceChildren();
        const screen = createElement("section", "training-session");
        screen.setAttribute("aria-label", "Активная тренировка");

        const header = createElement("header", "training-session__header");
        header.append(
            createElement("span", "training-session__eyebrow", "TRAINING SESSION · IN PROGRESS"),
            createElement("h3", "training-session__title", workout.title || "Тренировка"),
            createElement("p", "training-session__copy", "Записывай выполненные подходы. Каждый сохранённый подход сразу защищённо сохраняется в твоей тренировочной истории.")
        );

        const exerciseHost = createElement("div", "training-session__exercises");
        current.session.exercises.forEach((exercise) => {
            const definition = workout.exercises.find((item) => item.id === exercise.id) || exercise;
            const section = createElement("section", "training-session__exercise");
            section.append(
                createElement("h4", "training-session__exercise-title", exercise.name),
                createElement("p", "training-session__copy",
                    Number.isInteger(definition.targetSets) && Number.isInteger(definition.targetReps)
                        ? `Цель: ${definition.targetSets} подхода × ${definition.targetReps} повторений`
                        : "Зафиксируй фактические повторения и нагрузку.")
            );

            const list = createElement("ol", "training-session__set-list");
            exercise.sets.forEach((set, index) => {
                const load = set.resistance?.unit === "bodyweight" ? "собственный вес"
                    : set.resistance?.value == null ? set.resistance?.unit || "—"
                    : `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(set.resistance.value)} ${set.resistance.unit}`;
                list.appendChild(createElement("li", "training-session__set", `Подход ${index + 1} · ${set.reps} повт.` + " — " + load));
            });
            if (exercise.sets.length === 0) list.appendChild(createElement("li", "training-session__set-copy", "Пока нет сохранённых подходов."));
            section.appendChild(list);

            const form = createElement("form", "training-session__set-form");
            form.noValidate = true;
            const reps = document.createElement("input");
            reps.type = "number"; reps.name = "reps"; reps.min = "1"; reps.max = "100"; reps.step = "1"; reps.required = true;
            reps.value = String(definition.targetReps || 8); reps.inputMode = "numeric";
            const repsField = createElement("label", "training-session__field", "Повторения");
            repsField.appendChild(reps);

            const targetResistance = definition.targetResistance;
            const unit = document.createElement("select");
            unit.name = "unit";
            for (const value of ["kg", "lb", "bodyweight", "band", "machine", "other"]) {
                const option = document.createElement("option");
                option.value = value;
                option.textContent = value === "bodyweight" ? "Собственный вес" : value;
                unit.appendChild(option);
            }
            unit.value = targetResistance?.unit || "kg";
            const load = document.createElement("input");
            load.type = "number"; load.name = "resistance"; load.min = "0"; load.max = "10000"; load.step = "0.1";
            load.inputMode = "decimal"; load.value = targetResistance?.value == null ? "" : String(targetResistance.value);
            load.required = unit.value !== "bodyweight";
            const loadField = createElement("label", "training-session__field", "Нагрузка");
            loadField.append(load, unit);
            unit.addEventListener("change", () => { load.required = unit.value !== "bodyweight"; load.disabled = unit.value === "bodyweight"; });

            const save = document.createElement("button");
            save.type = "submit"; save.className = "training-session__save-set"; save.textContent = "СОХРАНИТЬ ПОДХОД";
            const status = createElement("p", "training-session__status");
            status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
            form.append(repsField, loadField, save, status);
            form.addEventListener("submit", async (event) => {
                event.preventDefault();
                const repetitions = Number(reps.value);
                const amount = load.value.trim() === "" ? null : Number(load.value);
                if (!Number.isInteger(repetitions) || repetitions < 1 || repetitions > 100 ||
                    (unit.value !== "bodyweight" && (!Number.isFinite(amount) || amount < 0 || amount > 10000))) {
                    status.textContent = "Проверь количество повторений и нагрузку.";
                    return;
                }
                save.disabled = true;
                status.textContent = "Сохраняем подход…";
                try {
                    current = await application.recordSet({
                        sessionResult: current,
                        exercise: definition,
                        reps: repetitions,
                        resistance: { unit: unit.value, value: unit.value === "bodyweight" ? null : amount }
                    });
                    render();
                } catch (error) {
                    status.textContent = error?.code === "TRAINING_SESSION_CONFLICT"
                        ? "Тренировка изменилась в другом запросе. Обнови экран перед продолжением."
                        : "Не удалось сохранить подход. Попробуй ещё раз.";
                    save.disabled = false;
                }
            });
            section.appendChild(form);
            exerciseHost.appendChild(section);
        });

        const footer = createElement("footer", "training-session__footer");
        const status = createElement("p", "training-session__status");
        status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
        const complete = document.createElement("button");
        complete.type = "button"; complete.className = "training-session__complete"; complete.textContent = "ЗАВЕРШИТЬ ТРЕНИРОВКУ";
        complete.disabled = !current.session.exercises.some((exercise) => exercise.sets.some((set) => set.completed === true));
        complete.addEventListener("click", async () => {
            complete.disabled = true;
            status.textContent = "Сохраняем результат…";
            try {
                current = await application.completeWorkout({ sessionResult: current });
                status.textContent = "Тренировка завершена. Результат сохранён.";
                if (typeof onFinished === "function") await onFinished();
            } catch (error) {
                status.textContent = error?.code === "TRAINING_SESSION_CONFLICT"
                    ? "Тренировка изменилась в другом запросе. Обнови экран перед продолжением."
                    : error?.message || "Не удалось завершить тренировку.";
                complete.disabled = false;
            }
        });
        footer.append(status, complete);
        screen.append(header, exerciseHost, footer);
        container.appendChild(screen);
    }

    render();
}

export { renderTrainingSession };
