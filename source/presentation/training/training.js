// source/presentation/training/training.js — Version 1.0
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
    back.type = "button";
    back.className = "finance-text-action training-workspace__back";
    back.textContent = "← Здоровье";
    back.addEventListener("click", () => {
        if (typeof onBack === "function") onBack();
    });

    const intro = createElement("header", "finance-workspace-header");
    intro.append(
        createElement("span", "finance-section-meta", "TRAINING SYSTEM"),
        createElement("h2", "", "Тренировки"),
        createElement("p", "", "Планируй занятия, фиксируй подходы и отслеживай рабочие веса в отдельном пространстве.")
    );

    const content = createElement("div", "training-workspace__content");
    page.append(back, intro, content);
    container.appendChild(page);
    return content;
}

async function renderTraining(container, {
    trainingOverviewApplication = null,
    trainingSessionApplication = null,
    onBack = null
} = {}) {
    if (!container || typeof container.replaceChildren !== "function") {
        throw new TypeError("LifeGame Training: a container element is required.");
    }

    const content = renderTrainingShell(container, onBack);
    if (!trainingOverviewApplication || typeof trainingOverviewApplication.execute !== "function") {
        renderStatus(content, "Тренировочные данные пока недоступны. Вернись в раздел позже.");
        return;
    }

    const loadOverview = async () => {
        renderStatus(content, "Загружаем тренировочную программу…");
        try {
            const overview = await trainingOverviewApplication.execute();
            if (!content.isConnected) return;

            renderTrainingOverview(content, {
                program: overview?.program ?? null,
                previousWorkout: overview?.previousWorkout ?? null,
                onStartWorkout: trainingSessionApplication &&
                    typeof trainingSessionApplication.startWorkout === "function"
                    ? async (workout) => {
                        renderStatus(content, "Запускаем тренировку…");
                        try {
                            const sessionResult = await trainingSessionApplication.startWorkout({ workout });
                            if (!content.isConnected) return;
                            renderTrainingSession(content, {
                                sessionResult,
                                workout,
                                application: trainingSessionApplication,
                                onFinished: loadOverview
                            });
                        } catch (error) {
                            if (!content.isConnected) return;
                            renderStatus(
                                content,
                                error?.code === "TRAINING_SESSION_CONFLICT"
                                    ? "Данные тренировки изменились. Обнови экран и попробуй снова."
                                    : "Не удалось запустить тренировку. Проверь соединение и повтори попытку."
                            );
                        }
                    }
                    : null
            });
        } catch {
            if (!content.isConnected) return;
            renderStatus(content, "Не удалось загрузить тренировочные данные. Попробуй обновить экран позже.");
        }
    };

    await loadOverview();
}

export { renderTraining };
