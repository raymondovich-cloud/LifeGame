// source/presentation/training/training.js — Version 1.1
// Responsibility: render the standalone Training workspace and coordinate presentation callbacks only.
import { renderTrainingOverview } from "./training-overview.js";
import { renderTrainingSession } from "./training-session.js";

function createElement(tag, className = "", text = null) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== null) element.textContent = text;
    return element;
}
function renderStatus(container, message) {
    const status = createElement("p", "training-overview__description", message);
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    container.replaceChildren(status);
}
function renderTrainingShell(container, onBack) {
    container.replaceChildren();
    const page = createElement("section", "finance-workspace training-workspace");
    page.setAttribute("aria-label", "Тренировки");
    const back = document.createElement("button");
    back.type = "button"; back.className = "finance-text-action training-workspace__back"; back.textContent = "← Здоровье";
    back.addEventListener("click", () => { if (typeof onBack === "function") onBack(); });
    const intro = createElement("header", "finance-workspace-header");
    intro.append(
        createElement("span", "finance-section-meta", "TRAINING SYSTEM"),
        createElement("h2", "", "Тренировки"),
        createElement("p", "", "Планируй занятия, фиксируй подходы и отслеживай рабочие веса в отдельном пространстве.")
    );
    const content = createElement("div", "training-workspace__content");
    page.append(back, intro, content); container.appendChild(page); return content;
}
function createExerciseId() {
    if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
    return "exercise-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
}
function renderExerciseBuilder(container, onStartWorkout, onCancel) {
    const draft = [];
    container.replaceChildren();
    const builder = createElement("section", "training-workout-builder");
    builder.setAttribute("aria-label", "Конструктор тренировки");
    const header = createElement("header", "training-workout-builder__header");
    header.append(
        createElement("span", "training-overview__eyebrow", "ТВОЯ ТРЕНИРОВКА"),
        createElement("h3", "training-workout-builder__title", "Собери своё занятие"),
        createElement("p", "training-overview__description", "Добавь упражнения в нужном порядке. Начни тренировку, когда список будет готов.")
    );
    const list = createElement("ol", "training-workout-builder__list");
    const empty = createElement("p", "training-workout-builder__empty", "Пока нет упражнений. Добавь первое, чтобы собрать тренировку.");
    const status = createElement("p", "training-workout-builder__status");
    status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
    const actions = createElement("div", "training-workout-builder__actions");
    const add = document.createElement("button");
    add.type = "button"; add.className = "training-workout-builder__add"; add.textContent = "+ Добавить упражнение";
    const start = document.createElement("button");
    start.type = "button"; start.className = "training-overview__start"; start.textContent = "НАЧАТЬ ТРЕНИРОВКУ"; start.disabled = true;
    const cancel = document.createElement("button");
    cancel.type = "button"; cancel.className = "training-workout-builder__cancel"; cancel.textContent = "← Назад";
    cancel.addEventListener("click", onCancel);

    function renderList() {
        list.replaceChildren(); empty.hidden = draft.length > 0; start.disabled = draft.length === 0;
        draft.forEach((exercise, index) => {
            const item = createElement("li", "training-workout-builder__item");
            const number = createElement("span", "training-workout-builder__number", String(index + 1).padStart(2, "0"));
            const name = createElement("span", "training-workout-builder__exercise-name", exercise.name);
            const remove = document.createElement("button");
            remove.type = "button"; remove.className = "training-workout-builder__remove"; remove.textContent = "Удалить";
            remove.setAttribute("aria-label", "Удалить упражнение «" + exercise.name + "»");
            remove.addEventListener("click", () => { draft.splice(index, 1); renderList(); });
            item.append(number, name, remove); list.appendChild(item);
        });
    }
    function closeModal(modal, previousFocus) {
        modal.remove(); if (previousFocus?.isConnected) previousFocus.focus();
    }
    function openExerciseModal() {
        const previousFocus = document.activeElement;
        const overlay = createElement("div", "training-exercise-modal");
        overlay.setAttribute("role", "presentation");
        const dialog = createElement("section", "training-exercise-modal__dialog");
        dialog.setAttribute("role", "dialog"); dialog.setAttribute("aria-modal", "true");
        dialog.setAttribute("aria-labelledby", "training-exercise-modal-title");
        const title = createElement("h3", "training-exercise-modal__title", "Добавить упражнение");
        title.id = "training-exercise-modal-title";
        const description = createElement("p", "training-overview__description", "Введи название так, как тебе удобно.");
        const form = document.createElement("form"); form.className = "training-exercise-modal__form"; form.noValidate = true;
        const label = createElement("label", "training-exercise-modal__label", "Название упражнения");
        const input = document.createElement("input");
        input.type = "text"; input.name = "exerciseName"; input.autocomplete = "off"; input.maxLength = 80;
        input.required = true; input.placeholder = "Например, жим лёжа"; input.setAttribute("aria-describedby", "training-exercise-modal-error");
        label.appendChild(input);
        const error = createElement("p", "training-exercise-modal__error");
        error.id = "training-exercise-modal-error"; error.setAttribute("role", "alert");
        const footer = createElement("div", "training-exercise-modal__actions");
        const save = document.createElement("button");
        save.type = "submit"; save.className = "training-overview__start"; save.textContent = "ДОБАВИТЬ";
        const dismiss = document.createElement("button");
        dismiss.type = "button"; dismiss.className = "training-workout-builder__cancel"; dismiss.textContent = "Отмена";
        footer.append(save, dismiss); form.append(label, error, footer); dialog.append(title, description, form);
        overlay.appendChild(dialog); container.appendChild(overlay);
        const onKeydown = (event) => {
            if (event.key === "Escape") { document.removeEventListener("keydown", onKeydown); closeModal(overlay, previousFocus); }
        };
        document.addEventListener("keydown", onKeydown);
        dismiss.addEventListener("click", () => { document.removeEventListener("keydown", onKeydown); closeModal(overlay, previousFocus); });
        overlay.addEventListener("click", (event) => {
            if (event.target === overlay) { document.removeEventListener("keydown", onKeydown); closeModal(overlay, previousFocus); }
        });
        form.addEventListener("submit", (event) => {
            event.preventDefault();
            const name = input.value.trim().replace(/\s+/g, " ");
            if (!name) { error.textContent = "Введи название упражнения."; input.focus(); return; }
            if (draft.some((exercise) => exercise.name.localeCompare(name, "ru", { sensitivity: "accent" }) === 0)) {
                error.textContent = "Это упражнение уже добавлено."; input.focus(); return;
            }
            draft.push({ id: createExerciseId(), name, muscleGroups: [], targetReps: 8 });
            status.textContent = "Добавлено упражнение: " + name; renderList();
            document.removeEventListener("keydown", onKeydown); closeModal(overlay, add);
        });
        input.focus();
    }
    add.addEventListener("click", openExerciseModal);
    start.addEventListener("click", async () => {
        if (!draft.length) return;
        start.disabled = true; add.disabled = true; status.textContent = "Запускаем твою тренировку…";
        try {
            await onStartWorkout({
                id: createExerciseId(), title: "Моя тренировка", durationMinutes: null,
                exercises: draft.map((exercise) => ({ ...exercise }))
            });
        } finally {
            if (container.isConnected) { start.disabled = draft.length === 0; add.disabled = false; }
        }
    });
    actions.append(add, start); builder.append(header, list, empty, status, actions, cancel);
    container.appendChild(builder); renderList();
}
async function renderTraining(container, {
    trainingOverviewApplication = null, trainingSessionApplication = null, onBack = null
} = {}) {
    if (!container || typeof container.replaceChildren !== "function") {
        throw new TypeError("LifeGame Training: a container element is required.");
    }
    const content = renderTrainingShell(container, onBack);
    if (!trainingOverviewApplication || typeof trainingOverviewApplication.execute !== "function") {
        renderStatus(content, "Тренировочные данные пока недоступны. Вернись в раздел позже."); return;
    }
    const loadOverview = async () => {
        renderStatus(content, "Загружаем тренировочные данные…");
        try {
            const overview = await trainingOverviewApplication.execute();
            if (!content.isConnected) return;
            renderTrainingOverview(content, {
                program: overview?.program ?? null, previousWorkout: overview?.previousWorkout ?? null,
                onCreateWorkout: () => renderExerciseBuilder(content, startWorkout, loadOverview),
                onStartWorkout: startWorkout
            });
        } catch {
            if (!content.isConnected) return;
            renderStatus(content, "Не удалось загрузить тренировочные данные. Попробуй обновить экран позже.");
        }
    };
    const startWorkout = async (workout) => {
        if (!trainingSessionApplication || typeof trainingSessionApplication.startWorkout !== "function") {
            renderStatus(content, "Запуск тренировки пока недоступен. Попробуй позже."); return;
        }
        renderStatus(content, "Запускаем тренировку…");
        try {
            const sessionResult = await trainingSessionApplication.startWorkout({ workout });
            if (!content.isConnected) return;
            renderTrainingSession(content, { sessionResult, workout, application: trainingSessionApplication, onFinished: loadOverview });
        } catch (error) {
            if (!content.isConnected) return;
            renderStatus(content, error?.code === "TRAINING_SESSION_CONFLICT"
                ? "Данные тренировки изменились. Обнови экран и попробуй снова."
                : "Не удалось запустить тренировку. Проверь соединение и повтори попытку.");
        }
    };
    await loadOverview();
}
export { renderTraining };
