// source/presentation/training/training-overview.js — Version 1.6
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

function renderTrainingOverview(container) {
    if (!container || typeof container.replaceChildren !== "function") {
        throw new TypeError("Training Overview: a container element is required.");
    }

    container.replaceChildren();

    const screen = createElement("section", "training-overview");
    screen.setAttribute("aria-label", "Тренировки");

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
