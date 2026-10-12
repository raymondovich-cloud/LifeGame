// pin-indicator.js — Version 1.0
// Responsibility: create the shared presentation-only pinned-state indicator.

export function createPinIndicator(label = "ЗАКРЕПЛЕНО", className = "") {
    const indicator = document.createElement("span");
    indicator.className = ["life-pin-indicator", className].filter(Boolean).join(" ");
    indicator.setAttribute("aria-label", label === "ЗАКРЕПЛЕНА" ? "Тренировка закреплена" : "Элемент закреплён");
    const dot = document.createElement("span");
    dot.className = "life-pin-indicator__dot";
    dot.setAttribute("aria-hidden", "true");
    const text = document.createElement("span");
    text.className = "life-pin-indicator__label";
    text.textContent = label;
    const icon = document.createElement("span");
    icon.className = "life-pin-indicator__icon";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = '<svg viewBox="0 0 16 16" focusable="false"><path d="M5.2 1.8h5.6l-.7 3.2 2.1 2.1v1.1H8.9v4.1l-.9 1.7-.9-1.7V8.2H3.8V7.1l2.1-2.1z"></path></svg>';
    indicator.append(dot, text, icon);
    return indicator;
}
