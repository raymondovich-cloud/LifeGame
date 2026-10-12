// source/presentation/training/training-overview.js — Version 2.0
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

function renderTrainingOverview(container, { onOpenAnalytics = null } = {}) {
    if (!container || typeof container.replaceChildren !== "function") {
        throw new TypeError("Training Overview: a container element is required.");
    }

    container.replaceChildren();

    const screen = createElement("section", "training-overview");
    screen.setAttribute("aria-label", "Тренировки");

    const analytics = createSection("Аналитика тренировок", "training-overview__analytics");
    const analyticsCopy = createElement("div", "training-overview__analytics-copy-group");
    analyticsCopy.append(
        createElement("span", "training-overview__eyebrow", "АНАЛИТИКА ТРЕНИРОВОК"),
        createElement(
            "p",
            "training-overview__analytics-copy",
            "Следи за рабочими весами, нагрузкой и регулярностью занятий. Вся история твоего прогресса — в одном месте."
        )
    );
    const openAnalytics = createElement("button", "finance-text-action training-overview__analytics-action", "Открыть →");
    openAnalytics.type = "button";
    openAnalytics.setAttribute("aria-label", "Открыть отдельный экран аналитики тренировок");
    openAnalytics.addEventListener("click", () => { if (typeof onOpenAnalytics === "function") onOpenAnalytics(); });
    analytics.append(analyticsCopy, openAnalytics);
    screen.appendChild(analytics);

    container.appendChild(screen);
}

export { renderTrainingOverview };
