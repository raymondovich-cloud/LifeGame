// source/presentation/training/training.js — Version 1.9
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
function renderExerciseBuilder(container, { libraryApplication, libraryExercises, onStartWorkout, onSaved, onCancel, initialTemplate = null }) {
    const draft = initialTemplate ? initialTemplate.exercises.map(normalizeExercise) : []; container.replaceChildren();
    const builder = el("section", "training-workout-builder"); builder.setAttribute("aria-label", "Конструктор тренировки");
    const header = el("header", "training-workout-builder__header");
    header.append(el("span", "training-overview__eyebrow", "ТВОЯ ТРЕНИРОВКА"), el("h3", "training-workout-builder__title", "Собери своё занятие"),
        el("p", "training-overview__description", "Добавляй упражнения из своей библиотеки или создавай новые. Сохрани шаблон, чтобы повторять тренировку позже."));
    const titleLabel = el("label", "training-exercise-modal__label", "Название тренировки");
    const titleInput = document.createElement("input"); titleInput.type = "text"; titleInput.maxLength = 80; titleInput.value = initialTemplate?.title || "Моя тренировка"; titleInput.setAttribute("aria-label", "Название шаблона тренировки"); titleLabel.appendChild(titleInput);
    const libraryPanel = el("div", "training-workout-builder__library"); libraryPanel.appendChild(el("span", "training-overview__eyebrow", "МОЯ БИБЛИОТЕКА УПРАЖНЕНИЙ"));
    const libraryEmpty = el("p", "training-overview__description", "Библиотека пока пуста. Добавь упражнение — оно сохранится в аккаунте.");
    const libraryList = el("div", "training-workout-builder__library-list");
    const list = el("ol", "training-workout-builder__list");
    const empty = el("p", "training-workout-builder__empty", "Пока нет упражнений. Выбери упражнение из библиотеки или создай новое.");
    const status = el("p", "training-workout-builder__status"); status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
    const actions = el("div", "training-workout-builder__actions");
    const add = el("button", "training-workout-builder__add", "+ Создать упражнение"); add.type = "button";
    const saveTemplate = el("button", "training-workout-builder__add", initialTemplate ? "СОХРАНИТЬ ИЗМЕНЕНИЯ" : "СОХРАНИТЬ ШАБЛОН"); saveTemplate.type = "button";
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
            await libraryApplication.saveTemplate({ id: initialTemplate?.id ?? null, title: titleInput.value.trim().replace(/\s+/g, " "), exercises: draft.map((item) => ({ ...item })) });
            status.textContent = initialTemplate ? "Изменения сохранены." : "Шаблон сохранён. Его можно будет запускать повторно."; await onSaved();
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
function openSavedWorkoutMenu(item, template, onEditTemplate, onDeleteTemplate) {
    const backdrop = el("div", "row-interaction-backdrop");
    backdrop.setAttribute("role", "presentation");
    const menu = el("div", "row-interaction-menu");
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", "Действия с тренировкой «" + template.title + "»");

    const edit = el("button", "row-interaction-menu__item", "Изменить тренировку");
    edit.type = "button";
    edit.setAttribute("role", "menuitem");
    const remove = el("button", "row-interaction-menu__item", "Удалить тренировку");
    remove.type = "button";
    remove.setAttribute("role", "menuitem");

    menu.append(edit, remove);
    backdrop.appendChild(menu);
    document.body.appendChild(backdrop);

    let closing = false;
    const cleanup = () => {
        if (closing) return;
        closing = true;
        backdrop.classList.remove("is-visible");
        window.setTimeout(() => {
            backdrop.remove();
            item.classList.remove("is-editing-target");
        }, 220);
    };
    edit.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        cleanup();
        onEditTemplate(template);
    });
    remove.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        remove.disabled = true;
        try {
            cleanup();
            await onDeleteTemplate(template.id);
        } catch {
            remove.disabled = false;
        }
    });
    backdrop.addEventListener("click", (event) => {
        if (event.target === backdrop) cleanup();
    });
    menu.addEventListener("click", (event) => event.stopPropagation());
    window.requestAnimationFrame(() => backdrop.classList.add("is-visible"));
}

function attachSavedWorkoutInteractions(item, template, onEditTemplate, onDeleteTemplate, onLongPress) {
    let pressTimer = null;
    let longPressTriggered = false;
    let startX = 0;
    let startY = 0;
    let activePointerId = null;

    const clearPressTimer = () => {
        if (pressTimer !== null) {
            window.clearTimeout(pressTimer);
            pressTimer = null;
        }
    };
    const showMenu = () => {
        item.classList.add("is-editing-target");
        openSavedWorkoutMenu(item, template, onEditTemplate, onDeleteTemplate);
    };
    const cancelPress = () => {
        clearPressTimer();
        item.classList.remove("is-long-pressing");
    };

    item.addEventListener("pointerdown", (event) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        startX = event.clientX;
        startY = event.clientY;
        activePointerId = event.pointerId;
        longPressTriggered = false;
        clearPressTimer();
        item.classList.add("is-long-pressing");
        pressTimer = window.setTimeout(() => {
            longPressTriggered = true;
            if (typeof onLongPress === "function") onLongPress();
            pressTimer = null;
            item.classList.remove("is-long-pressing");
            showMenu();
        }, 500);
    });
    item.addEventListener("pointermove", (event) => {
        if (activePointerId !== event.pointerId) return;
        if (Math.abs(event.clientX - startX) > 10 || Math.abs(event.clientY - startY) > 10) cancelPress();
    });
    item.addEventListener("pointerup", (event) => {
        if (activePointerId !== event.pointerId) return;
        clearPressTimer();
        item.classList.remove("is-long-pressing");
        activePointerId = null;
        if (longPressTriggered) {
            event.preventDefault();
            event.stopPropagation();
        }
    });
    item.addEventListener("pointercancel", cancelPress);
    item.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        clearPressTimer();
        if (typeof onLongPress === "function") onLongPress();
        showMenu();
    });
}

function renderSavedResources(container, { exercises, templates, onCreateWorkout, onStartWorkout, onEditTemplate, onDeleteTemplate }) {
    const section = el("section", "training-saved-resources"); section.setAttribute("aria-label", "Мои тренировки");
    const heading = el("header", "training-saved-resources__header");
    const headingRow = el("div", "training-saved-resources__heading-row");
    headingRow.appendChild(el("h3", "training-workout-builder__title", "Мои тренировки"));
    const create = el("button", "training-saved-resources__create", "+");
    create.type = "button";
    create.setAttribute("aria-label", "Создать тренировку");
    create.setAttribute("title", "Создать тренировку");
    create.addEventListener("click", onCreateWorkout);
    headingRow.appendChild(create);
    heading.append(headingRow,
        el("p", "training-overview__description", "Сохранённые тренировки доступны здесь и готовы к повторному запуску."));
    const templatePanel = el("div", "training-saved-resources__panel"); templatePanel.appendChild(el("span", "training-overview__eyebrow", "СОХРАНЁННЫЕ ТРЕНИРОВКИ"));
    {
        const list = el("div", "training-saved-resources__list");
        templates.forEach((template) => {
            const item = el("article", "training-saved-resources__item"), info = el("div", "training-saved-resources__item-info");
            const start = el("button", "training-overview__workout-title training-saved-resources__title-button", template.title);
            start.type = "button";
            start.setAttribute("aria-label", "Начать тренировку «" + template.title + "»");
            start.addEventListener("click", (event) => {
                if (longPressWasTriggered) {
                    longPressWasTriggered = false;
                    if (longPressResetTimer !== null) window.clearTimeout(longPressResetTimer);
                    longPressResetTimer = null;
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                }
                onStartWorkout({ id: template.id, title: template.title, durationMinutes: null, exercises: template.exercises.map(normalizeExercise) });
            });
            let longPressWasTriggered = false;
            let longPressResetTimer = null;
            const markLongPress = () => {
                longPressWasTriggered = true;
                if (longPressResetTimer !== null) window.clearTimeout(longPressResetTimer);
                longPressResetTimer = window.setTimeout(() => {
                    longPressWasTriggered = false;
                    longPressResetTimer = null;
                }, 800);
            };
            attachSavedWorkoutInteractions(item, template, onEditTemplate, onDeleteTemplate, markLongPress);
            info.append(start, el("p", "training-overview__description", template.exercises.length + " упражнений"));
            item.append(info); list.appendChild(item);
        });
        templatePanel.appendChild(list);
    }
    const exercisePanel = el("div", "training-saved-resources__panel training-saved-resources__library");
    const libraryToggle = el("button", "training-saved-resources__library-toggle");
    libraryToggle.type = "button";
    libraryToggle.setAttribute("aria-expanded", "false");
    libraryToggle.setAttribute("aria-controls", "training-exercise-library-content");
    libraryToggle.append(
        el("span", "training-overview__eyebrow", "БИБЛИОТЕКА УПРАЖНЕНИЙ"),
        el("span", "training-saved-resources__library-meta", String(exercises.length)),
        el("span", "training-saved-resources__library-chevron", "⌄")
    );
    const libraryContent = el("div", "training-saved-resources__library-content");
    libraryContent.id = "training-exercise-library-content";
    libraryContent.hidden = true;
    if (!exercises.length) libraryContent.appendChild(el("p", "training-overview__description", "Пока нет сохранённых упражнений."));
    else {
        const list = el("div", "training-saved-resources__exercise-list");
        exercises.forEach((exercise) => list.appendChild(el("span", "training-saved-resources__exercise", exercise.name)));
        libraryContent.appendChild(list);
    }
    libraryToggle.addEventListener("click", () => {
        const expanded = libraryToggle.getAttribute("aria-expanded") === "true";
        libraryToggle.setAttribute("aria-expanded", String(!expanded));
        libraryContent.hidden = expanded;
        libraryToggle.classList.toggle("is-expanded", !expanded);
    });
    exercisePanel.append(libraryToggle, libraryContent);
    section.append(heading, templatePanel, exercisePanel); container.appendChild(section);
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
            renderTrainingOverview(content, { program: overview?.program ?? null, hasSavedTemplates: templates.length > 0, onCreateWorkout: () => renderBuilder(exercises), onStartWorkout: startWorkout });
            if (templates.length > 0) {
                renderSavedResources(content, { exercises, templates, onCreateWorkout: () => renderBuilder(exercises), onStartWorkout: startWorkout,
                    onEditTemplate: (template) => renderBuilder(exercises, template),
                    onDeleteTemplate: async (templateId) => { await trainingWorkoutLibraryApplication.deleteTemplate({ templateId }); await loadOverview(); } });
            }
        } catch (error) { if (content.isConnected) renderStatus(content, error?.message || "Не удалось загрузить тренировочные данные. Попробуй обновить экран позже."); }
    };
    const renderBuilder = (exercises, initialTemplate = null) => renderExerciseBuilder(content, {
        libraryApplication: trainingWorkoutLibraryApplication, libraryExercises: [...exercises], onStartWorkout: startWorkout,
        initialTemplate, onSaved: async ({ refreshOnly = false } = {}) => { if (!refreshOnly) await loadOverview(); }, onCancel: loadOverview
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
