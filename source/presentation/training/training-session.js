// source/presentation/training/training-session.js — Version 2.8
// Responsibility: render the active workout interaction; delegate persistence and business rules to the application layer.
function createElement(tag, className = "", text = null) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== null) element.textContent = text;
    return element;
}

function renderTrainingSession(container, { sessionResult, workout, application, onFinished, onBack, onSessionChange } = {}) {
    if (!container || typeof container.replaceChildren !== "function") throw new TypeError("Training Session: a container element is required.");
    if (!sessionResult?.session || !Number.isSafeInteger(sessionResult.revision)) throw new TypeError("Training Session: a valid session envelope is required.");
    if (!workout || !Array.isArray(workout.exercises) || !application ||
        typeof application.recordSet !== "function" || typeof application.completeWorkout !== "function") {
        throw new TypeError("Training Session: workout and application commands are required.");
    }

    let current = sessionResult;
    const startedAt = Number.isFinite(current.session.startedAt)
        ? current.session.startedAt
        : current.session.status === "in_progress" && Number.isFinite(current.session.updatedAt)
            ? current.session.updatedAt
            : Number.isFinite(current.session.createdAt) ? current.session.createdAt : Date.now();
    let timerId = null;
    const expandedExerciseIds = new Set();

    function getPlannedSetCount(exercise) {
        const definition = workout.exercises.find((item) => item.id === exercise.id) || exercise;
        const targetSets = Math.max(4, Number.isInteger(definition.targetSets) ? definition.targetSets : 4);
        return Math.max(targetSets, exercise.sets.length);
    }

    function getCompletedSetCount(exercise) {
        return exercise.sets.filter((set) => set.completed === true).length;
    }

    const initialCurrentExercise = current.session.exercises.find(
        (exercise) => getCompletedSetCount(exercise) < getPlannedSetCount(exercise)
    );
    let activeExerciseId = initialCurrentExercise?.id ?? null;
    if (initialCurrentExercise) expandedExerciseIds.add(initialCurrentExercise.id);

    function render() {
        container.replaceChildren();
        const screen = createElement("section", "training-session training-session--active");
        screen.setAttribute("aria-label", "Активная тренировка");
        const header = createElement("header", "training-session__header");
        const title = createElement("h3", "training-session__title", workout.title || "Моя тренировка");
        const elapsed = createElement("p", "training-session__elapsed", "00:00");
        elapsed.setAttribute("aria-label", "Продолжительность тренировки");
        const back = createElement("button", "training-session__back", "← Назад");
        back.type = "button";
        back.addEventListener("click", () => {
            if (typeof onBack === "function") onBack();
        });
        header.append(back, title, elapsed);

        const completedSets = current.session.exercises.reduce(
            (total, exercise) => total + getCompletedSetCount(exercise),
            0
        );
        const plannedSets = current.session.exercises.reduce(
            (total, exercise) => total + getPlannedSetCount(exercise),
            0
        );
        const currentExerciseIndex = current.session.exercises.findIndex(
            (exercise) => getCompletedSetCount(exercise) < getPlannedSetCount(exercise)
        );
        const nextCurrentExercise = current.session.exercises[currentExerciseIndex];
        if (nextCurrentExercise && nextCurrentExercise.id !== activeExerciseId) {
            expandedExerciseIds.add(nextCurrentExercise.id);
            activeExerciseId = nextCurrentExercise.id;
        } else if (!nextCurrentExercise) {
            activeExerciseId = null;
        }

        const progress = createElement("section", "training-session__progress");
        progress.setAttribute("aria-label", "Прогресс тренировки");
        const progressHeading = createElement("div", "training-session__progress-heading");
        progressHeading.append(
            createElement("span", "training-session__progress-label", "ПРОГРЕСС ТРЕНИРОВКИ"),
            createElement("span", "training-session__progress-value", completedSets + " из " + plannedSets + " подходов")
        );
        const progressBar = document.createElement("progress");
        progressBar.className = "training-session__progress-bar";
        progressBar.max = Math.max(1, plannedSets);
        progressBar.value = completedSets;
        progressBar.setAttribute("aria-label", "Выполненные подходы");
        progress.append(progressHeading, progressBar);

        const exerciseHost = createElement("div", "training-session__exercises");
        current.session.exercises.forEach((exercise, exerciseIndex) => {
            const definition = workout.exercises.find((item) => item.id === exercise.id) || exercise;
            const completedExercise = getCompletedSetCount(exercise) >= getPlannedSetCount(exercise);
            const isCurrentExercise = exerciseIndex === currentExerciseIndex;
            const section = createElement(
                "section",
                "training-session__exercise-card" +
                    (completedExercise ? " training-session__exercise-card--complete" : "") +
                    (isCurrentExercise ? " training-session__exercise-card--current" : "") +
                    (!completedExercise && !isCurrentExercise ? " training-session__exercise-card--upcoming" : "")
            );
            if (isCurrentExercise) section.setAttribute("aria-current", "step");
            const top = createElement("div", "training-session__exercise-top");
            const toggle = createElement("button", "training-session__collapse", "⌄");
            toggle.type = "button";
            toggle.setAttribute("aria-label", "Свернуть или развернуть упражнение " + exercise.name);
            const isExpanded = expandedExerciseIds.has(exercise.id);
            toggle.setAttribute("aria-expanded", String(isExpanded));
            toggle.textContent = isExpanded ? "⌃" : "⌄";
            const heading = createElement("div", "training-session__exercise-heading");
            if (isCurrentExercise) {
                heading.appendChild(createElement("p", "training-session__exercise-kicker", "СЕЙЧАС"));
            }
            heading.append(
                createElement("h4", "training-session__exercise-title", exercise.name),
                createElement("p", "training-session__exercise-progress", getCompletedSetCount(exercise) + "/" + getPlannedSetCount(exercise) + " подходов выполнено")
            );
            top.append(toggle, heading);
            const body = createElement("div", "training-session__exercise-body");
            body.hidden = !isExpanded;
            const targetSets = Math.max(4, Number.isInteger(definition.targetSets) ? definition.targetSets : 4);
            const rowsCount = Math.max(targetSets, exercise.sets.length);
            for (let index = 0; index < rowsCount; index += 1) {
                const savedSet = exercise.sets[index];
                const row = createElement("div", "training-session__set-row");
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.className = "training-session__set-check";
                checkbox.checked = savedSet?.completed === true;
                checkbox.disabled = Boolean(savedSet);
                checkbox.setAttribute("aria-label", "Подход " + (index + 1) + " выполнен");
                const number = createElement("span", "training-session__set-number", String(index + 1));
                const reps = document.createElement("input");
                reps.type = "number"; reps.min = "1"; reps.max = "100"; reps.step = "1";
                reps.inputMode = "numeric"; reps.className = "training-session__set-reps";
                reps.value = String(savedSet?.reps ?? definition.targetReps ?? 8);
                reps.disabled = Boolean(savedSet);
                reps.setAttribute("aria-label", "Количество повторений, подход " + (index + 1));
                const isCardio = definition.exerciseType === "cardio";
                const resistance = document.createElement("input");
                resistance.type = "number";
                resistance.min = "0";
                resistance.max = "1000";
                resistance.step = "0.5";
                resistance.inputMode = "decimal";
                resistance.className = "training-session__set-weight";
                resistance.placeholder = "0";
                resistance.value = String(savedSet?.resistance?.value ?? definition.targetResistance?.value ?? "");
                resistance.disabled = Boolean(savedSet);
                resistance.setAttribute("aria-label", "Вес в килограммах, подход " + (index + 1));
                const label = createElement("span", "training-session__set-unit", "ПОВТ.");
                const weightLabel = createElement("span", "training-session__set-weight-unit", "КГ");
                if (isCardio) {
                    row.classList.add("training-session__set-row--cardio");
                    row.append(checkbox, number, reps, label);
                } else {
                    row.append(checkbox, number, reps, label, resistance, weightLabel);
                }
                if (savedSet) row.classList.add("is-complete");
                checkbox.addEventListener("change", async () => {
                    const repetitions = Number(reps.value);
                    const weightText = resistance.value.trim();
                    const weight = weightText === "" ? null : Number(weightText);
                    if (!Number.isInteger(repetitions) || repetitions < 1 || repetitions > 100 ||
                        (!isCardio && weight !== null && (!Number.isFinite(weight) || weight < 0 || weight > 1000))) {
                        checkbox.checked = false;
                        if (!Number.isInteger(repetitions) || repetitions < 1 || repetitions > 100) reps.focus();
                        else if (!isCardio) resistance.focus();
                        return;
                    }
                    checkbox.disabled = true;
                    try {
                        const selectedResistance = isCardio || weight === null
                            ? { unit: "bodyweight", value: null }
                            : { unit: "kg", value: weight };
                        current = await application.recordSet({
                            sessionResult: current,
                            exercise: definition,
                            reps: repetitions,
                            resistance: selectedResistance
                        });
                        if (typeof onSessionChange === "function") onSessionChange(current);
                        render();
                    } catch (error) {
                        checkbox.disabled = false;
                        checkbox.checked = false;
                        const message = screen.querySelector(".training-session__status");
                        if (message) message.textContent = error?.code === "TRAINING_SESSION_CONFLICT"
                            ? "Тренировка изменилась в другом запросе. Обнови экран."
                            : "Не удалось сохранить подход. Попробуй ещё раз.";
                    }
                });
                body.appendChild(row);
            }
            const addSet = createElement("button", "training-session__add-set", "+ Добавить подход");
            addSet.hidden = !isExpanded;
            addSet.type = "button";
            addSet.addEventListener("click", () => {
                definition.targetSets = rowsCount + 1;
                render();
            });
            toggle.addEventListener("click", () => {
                const nextExpanded = body.hidden;
                if (nextExpanded) expandedExerciseIds.add(exercise.id);
                else expandedExerciseIds.delete(exercise.id);
                body.hidden = !nextExpanded;
                addSet.hidden = !nextExpanded;
                toggle.textContent = nextExpanded ? "⌃" : "⌄";
                toggle.setAttribute("aria-expanded", String(nextExpanded));
            });
            section.append(top, body, addSet);
            exerciseHost.appendChild(section);
        });

        const footer = createElement("footer", "training-session__footer");
        const status = createElement("p", "training-session__status");
        status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
        const complete = createElement("button", "training-session__complete", "ЗАВЕРШИТЬ ТРЕНИРОВКУ");
        complete.type = "button";
        complete.disabled = !current.session.exercises.some((exercise) => exercise.sets.some((set) => set.completed === true));
        complete.addEventListener("click", async () => {
            complete.disabled = true;
            status.textContent = "Сохраняем результат…";
            try {
                current = await application.completeWorkout({ sessionResult: current });
                if (timerId !== null) window.clearInterval(timerId);
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
        screen.append(header, progress, exerciseHost, footer);
        container.appendChild(screen);
        const updateElapsed = () => {
            const seconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
            elapsed.textContent = String(Math.floor(seconds / 60)).padStart(2, "0") + ":" + String(seconds % 60).padStart(2, "0");
        };
        updateElapsed();
        if (timerId !== null) window.clearInterval(timerId);
        timerId = window.setInterval(updateElapsed, 1000);
    }

    render();
    return () => {
        if (timerId !== null) window.clearInterval(timerId);
        timerId = null;
    };
}

export { renderTrainingSession };
