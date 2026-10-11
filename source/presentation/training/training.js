// source/presentation/training/training.js — Version 1.2
// Responsibility: render the Training workspace and coordinate user actions through Application callbacks only.
import { renderTrainingOverview } from "./training-overview.js";
import { renderTrainingSession } from "./training-session.js";
function el(tag, cls = "", text = null) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== null) node.textContent = text;
    return node;
}
function renderStatus(container, message) {
    const status = el("p", "training-overview__description", message);
    status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
    container.replaceChildren(status);
}
function renderTrainingShell(container, onBack) {
    container.replaceChildren();
    const page = el("section", "finance-workspace training-workspace");
    page.setAttribute("aria-label", "Тренировки");
    const back = el("button", "finance-text-action training-workspace__back", "← Здоровье");
    back.type = "button"; back.addEventListener("click", () => { if (typeof onBack === "function") onBack(); });
    const intro = el("header", "finance-workspace-header");
    intro.append(el("span", "finance-section-meta", "TRAINING SYSTEM"), el("h2", "", "Тренировки"),
        el("p", "", "Планируй занятия, фиксируй подходы и отслеживай рабочие веса в отдельном пространстве."));
    const content = el("div", "training-workspace__content");
    page.append(back, intro, content); container.appendChild(page); return content;
}
function normalizeExercise(exercise) {
    return { id: exercise.id, name: exercise.name, muscleGroups: Array.isArray(exercise.muscleGroups) ? exercise.muscleGroups : [], targetReps: Number.isInteger(exercise.targetReps) ? exercise.targetReps : 8 };
}
function localId() {
    if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
    return "workout-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
}
function openExerciseModal(container, onSave) {
    const previousFocus = document.activeElement;
    const overlay = el("div", "training-exercise-modal"); overlay.setAttribute("role", "presentation");
    const dialog = el("section", "training-exercise-modal__dialog");
    dialog.setAttribute("role", "dialog"); dialog.setAttribute("aria-modal", "true"); dialog.setAttribute("aria-labelledby", "training-exercise-modal-title");
    const heading = el("h3", "training-exercise-modal__title", "Новое упражнение"); heading.id = "training-exercise-modal-title";
    const description = el("p", "training-overview__description", "Упражнение сохранится в библиотеке и останется доступным в следующих тренировках.");
    const form = document.createElement("form"); form.className = "training-exercise-modal__form"; form.noValidate = true;
    const label = el("label", "training-exercise-modal__label", "Название упражнения");
    const input = document.createElement("input"); input.type = "text"; input.name = "exerciseName"; input.autocomplete = "off";
    input.maxLength = 80; input.required = true; input.placeholder = "Например, жим лёжа"; input.setAttribute("aria-describedby", "training-exercise-modal-error");
    label.appendChild(input);
    const error = el("p", "training-exercise-modal__error"); error.id = "training-exercise-modal-error"; error.setAttribute("role", "alert");
    const footer = el("div", "training-exercise-modal__actions");
    const save = el("button", "training-overview__start", "СОХРАНИТЬ УПРАЖНЕНИЕ"); save.type = "submit";
    const cancel = el("button", "training-workout-builder__cancel", "Отмена"); cancel.type = "button";
    footer.append(save, cancel); form.append(label, error, footer); dialog.append(heading, description, form); overlay.appendChild(dialog); container.appendChild(overlay);
    let closed = false;
    const close = () => { if (closed) return; closed = true; document.removeEventListener("keydown", onKeydown); overlay.remove(); if (previousFocus?.isConnected) previousFocus.focus(); };
    const onKeydown = (event) => { if (event.key === "Escape") close(); };
    document.addEventListener("keydown", onKeydown); cancel.addEventListener("click", close);
    overlay.addEventListener("click", (event) => { if (event.target === overlay) close(); });
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const name = input.value.trim().replace(/\s+/g, " ");
        if (!name) { error.textContent = "Введи название упражнения."; input.focus(); return; }
        save.disabled = true; cancel.disabled = true; error.textContent = "Сохраняем упражнение…";
        try { await onSave(name); close(); }
        catch (failure) {
            error.textContent = failure?.code === "TRAINING_EXERCISE_DUPLICATE" ? "Такое упражнение уже есть в библиотеке." : failure?.message || "Не удалось сохранить упражнение. Попробуй ещё раз.";
            save.disabled = false; cancel.disabled = false; input.focus();
        }
    });
    input.focus();
}
function renderExerciseBuilder(container, { libraryApplication, libraryExercises, onStartWorkout, onSaved, onCancel }) {
    const draft = []; container.replaceChildren();
    const builder = el("section", "training-workout-builder"); builder.setAttribute("aria-label", "Конструктор тренировки");
    const header = el("header", "training-workout-builder__header");
    header.append(el("span", "training-overview__eyebrow", "ТВОЯ ТРЕНИРОВКА"), el("h3", "training-workout-builder__title", "Собери своё занятие"),
        el("p", "training-overview__description", "Добавляй упражнения из своей библиотеки или создавай новые. Сохрани шаблон, чтобы повторять тренировку позже."));
    const titleLabel = el("label", "training-exercise-modal__label", "Название тренировки");
    const titleInput = document.createElement("input"); titleInput.type = "text"; titleInput.maxLength = 80; titleInput.value = "Моя тренировка"; titleInput.setAttribute("aria-label", "Название шаблона тренировки"); titleLabel.appendChild(titleInput);
    const libraryPanel = el("div", "training-workout-builder__library"); libraryPanel.appendChild(el("span", "training-overview__eyebrow", "МОЯ БИБЛИОТЕКА УПРАЖНЕНИЙ"));
    const libraryEmpty = el("p", "training-overview__description", "Библиотека пока пуста. Добавь упражнение — оно сохранится в аккаунте.");
    const libraryList = el("div", "training-workout-builder__library-list");
    const list = el("ol", "training-workout-builder__list");
    const empty = el("p", "training-workout-builder__empty", "Пока нет упражнений. Выбери упражнение из библиотеки или создай новое.");
    const status = el("p", "training-workout-builder__status"); status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
    const actions = el("div", "training-workout-builder__actions");
    const add = el("button", "training-workout-builder__add", "+ Создать упражнение"); add.type = "button";
    const saveTemplate = el("button", "training-workout-builder__add", "СОХРАНИТЬ ШАБЛОН"); saveTemplate.type = "button";
    const start = el("button", "training-overview__start", "НАЧАТЬ ТРЕНИРОВКУ"); start.type = "button"; start.disabled = true;
    const cancel = el("button", "training-workout-builder__cancel", "← Назад"); cancel.type = "button"; cancel.addEventListener("click", onCancel);
    function renderList() {
        list.replaceChildren(); empty.hidden = draft.length > 0; start.disabled = draft.length === 0; saveTemplate.disabled = draft.length === 0;
        draft.forEach((exercise, index) => {
            const item = el("li", "training-workout-builder__item");
            const number = el("span", "training-workout-builder__number", String(index + 1).padStart(2, "0"));
            const name = el("span", "training-workout-builder__exercise-name", exercise.name);
            const remove = el("button", "training-workout-builder__remove", "Убрать"); remove.type = "button"; remove.setAttribute("aria-label", "Убрать упражнение «" + exercise.name + "»");
            remove.addEventListener("click", () => { draft.splice(index, 1); renderList(); });
            item.append(number, name, remove); list.appendChild(item);
        });
    }
    function renderLibraryItems() {
        libraryList.replaceChildren();
        libraryExercises.forEach((exercise) => {
            const button = el("button", "training-workout-builder__library-item", "+ " + exercise.name); button.type = "button";
            button.addEventListener("click", () => {
                if (draft.some((item) => item.id === exercise.id)) { status.textContent = "Это упражнение уже добавлено в тренировку."; return; }
                draft.push(normalizeExercise(exercise)); renderList(); status.textContent = "Добавлено: " + exercise.name;
            });
            libraryList.appendChild(button);
        });
        libraryEmpty.hidden = libraryExercises.length > 0; libraryList.hidden = libraryExercises.length === 0;
    }
    libraryPanel.append(libraryEmpty, libraryList);
    add.addEventListener("click", () => openExerciseModal(container, async (name) => {
        const saved = await libraryApplication.createExercise({ name });
        if (!draft.some((item) => item.id === saved.id)) draft.push(normalizeExercise(saved));
        if (!libraryExercises.some((item) => item.id === saved.id)) libraryExercises.push(saved);
        libraryExercises.sort((a, b) => a.name.localeCompare(b.name, "ru")); renderLibraryItems(); renderList();
        status.textContent = "Упражнение сохранено в библиотеке: " + saved.name; await onSaved({ refreshOnly: true });
    }));
    saveTemplate.addEventListener("click", async () => {
        if (!draft.length) return;
        saveTemplate.disabled = true; add.disabled = true; status.textContent = "Сохраняем шаблон…";
        try {
            await libraryApplication.saveTemplate({ title: titleInput.value.trim().replace(/\s+/g, " "), exercises: draft.map((item) => ({ ...item })) });
            status.textContent = "Шаблон сохранён. Его можно будет запускать повторно."; await onSaved();
        } catch (error) { status.textContent = error?.message || "Не удалось сохранить шаблон. Попробуй ещё раз."; saveTemplate.disabled = draft.length === 0; add.disabled = false; }
    });
    start.addEventListener("click", async () => {
        if (!draft.length) return;
        start.disabled = true; add.disabled = true; saveTemplate.disabled = true; status.textContent = "Запускаем твою тренировку…";
        try { await onStartWorkout({ id: localId(), title: titleInput.value.trim() || "Моя тренировка", durationMinutes: null, exercises: draft.map((exercise) => ({ ...exercise })) }); }
        finally { if (container.isConnected) { start.disabled = draft.length === 0; add.disabled = false; saveTemplate.disabled = draft.length === 0; } }
    });
    actions.append(add, saveTemplate, start); builder.append(header, titleLabel, libraryPanel, list, empty, status, actions, cancel); container.appendChild(builder); renderLibraryItems(); renderList();
}
function renderSavedResources(container, { exercises, templates, onCreateWorkout, onStartWorkout, onDeleteTemplate }) {
    const section = el("section", "training-saved-resources"); section.setAttribute("aria-label", "Мои упражнения и шаблоны");
    const heading = el("header", "training-saved-resources__header");
    heading.append(el("span", "training-overview__eyebrow", "ТВОИ ДАННЫЕ"), el("h3", "training-workout-builder__title", "Библиотека тренировок"),
        el("p", "training-overview__description", "Упражнения и шаблоны сохраняются в аккаунте и доступны после повторного входа."));
    const create = el("button", "training-overview__start", "СОБРАТЬ ТРЕНИРОВКУ"); create.type = "button"; create.addEventListener("click", onCreateWorkout);
    const templatePanel = el("div", "training-saved-resources__panel"); templatePanel.appendChild(el("span", "training-overview__eyebrow", "СОХРАНЁННЫЕ ШАБЛОНЫ"));
    if (!templates.length) templatePanel.appendChild(el("p", "training-overview__description", "После сохранения первой тренировки её шаблон появится здесь."));
    else {
        const list = el("div", "training-saved-resources__list");
        templates.forEach((template) => {
            const item = el("article", "training-saved-resources__item"), info = el("div", "training-saved-resources__item-info");
            info.append(el("h4", "training-overview__workout-title", template.title), el("p", "training-overview__description", template.exercises.length + " упражнений"));
            const actions = el("div", "training-saved-resources__item-actions");
            const start = el("button", "training-overview__start", "НАЧАТЬ"); start.type = "button";
            start.addEventListener("click", () => onStartWorkout({ id: template.id, title: template.title, durationMinutes: null, exercises: template.exercises.map(normalizeExercise) }));
            const remove = el("button", "training-workout-builder__remove", "Удалить шаблон"); remove.type = "button";
            remove.addEventListener("click", async () => { remove.disabled = true; try { await onDeleteTemplate(template.id); } catch { remove.disabled = false; } });
            actions.append(start, remove); item.append(info, actions); list.appendChild(item);
        });
        templatePanel.appendChild(list);
    }
    const exercisePanel = el("div", "training-saved-resources__panel"); exercisePanel.appendChild(el("span", "training-overview__eyebrow", "БИБЛИОТЕКА УПРАЖНЕНИЙ"));
    if (!exercises.length) exercisePanel.appendChild(el("p", "training-overview__description", "Пока нет сохранённых упражнений."));
    else { const list = el("div", "training-saved-resources__exercise-list"); exercises.forEach((exercise) => list.appendChild(el("span", "training-saved-resources__exercise", exercise.name))); exercisePanel.appendChild(list); }
    section.append(heading, create, templatePanel, exercisePanel); container.appendChild(section);
}
async function renderTraining(container, { trainingOverviewApplication = null, trainingSessionApplication = null, trainingWorkoutLibraryApplication = null, onBack = null } = {}) {
    if (!container || typeof container.replaceChildren !== "function") throw new TypeError("LifeGame Training: a container element is required.");
    const content = renderTrainingShell(container, onBack);
    if (!trainingOverviewApplication || typeof trainingOverviewApplication.execute !== "function" ||
        !trainingWorkoutLibraryApplication || typeof trainingWorkoutLibraryApplication.listExercises !== "function") {
        renderStatus(content, "Тренировочные данные пока недоступны. Вернись в раздел позже."); return;
    }
    const loadOverview = async () => {
        renderStatus(content, "Загружаем тренировочные данные…");
        try {
            const [overview, exercises, templates] = await Promise.all([trainingOverviewApplication.execute(), trainingWorkoutLibraryApplication.listExercises(), trainingWorkoutLibraryApplication.listTemplates()]);
            if (!content.isConnected) return;
            renderTrainingOverview(content, { program: overview?.program ?? null, previousWorkout: overview?.previousWorkout ?? null, onCreateWorkout: () => renderBuilder(exercises), onStartWorkout: startWorkout });
            renderSavedResources(content, { exercises, templates, onCreateWorkout: () => renderBuilder(exercises), onStartWorkout: startWorkout,
                onDeleteTemplate: async (templateId) => { await trainingWorkoutLibraryApplication.deleteTemplate({ templateId }); await loadOverview(); } });
        } catch (error) { if (content.isConnected) renderStatus(content, error?.message || "Не удалось загрузить тренировочные данные. Попробуй обновить экран позже."); }
    };
    const renderBuilder = (exercises) => renderExerciseBuilder(content, {
        libraryApplication: trainingWorkoutLibraryApplication, libraryExercises: [...exercises], onStartWorkout: startWorkout,
        onSaved: async ({ refreshOnly = false } = {}) => { if (!refreshOnly) await loadOverview(); }, onCancel: loadOverview
    });
    const startWorkout = async (workout) => {
        if (!trainingSessionApplication || typeof trainingSessionApplication.startWorkout !== "function") { renderStatus(content, "Запуск тренировки пока недоступен. Попробуй позже."); return; }
        renderStatus(content, "Запускаем тренировку…");
        try {
            const sessionResult = await trainingSessionApplication.startWorkout({ workout });
            if (content.isConnected) renderTrainingSession(content, { sessionResult, workout, application: trainingSessionApplication, onFinished: loadOverview });
        } catch (error) {
            if (content.isConnected) renderStatus(content, error?.code === "TRAINING_SESSION_CONFLICT" ? "Данные тренировки изменились. Обнови экран и попробуй снова." : "Не удалось запустить тренировку. Проверь соединение и повтори попытку.");
        }
    };
    await loadOverview();
}
export { renderTraining };
