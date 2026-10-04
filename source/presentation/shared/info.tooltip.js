// source/presentation/shared/info.tooltip.js — Version 1.0

const ACTIVE_TOOLTIP_SELECTOR = "[data-info-tooltip][aria-expanded=\"true\"]";

function closeActiveTooltip(except = null) {
    document.querySelectorAll(ACTIVE_TOOLTIP_SELECTOR).forEach((trigger) => {
        if (trigger === except) return;
        trigger.setAttribute("aria-expanded", "false");
        const tooltipId = trigger.getAttribute("aria-controls");
        const tooltip = tooltipId ? document.getElementById(tooltipId) : null;
        if (tooltip) tooltip.hidden = true;
    });
}

function createTooltipId() {
    return "info-tooltip-" + Math.random().toString(36).slice(2, 10);
}

function createInfoTooltip({ label, text, placement = "bottom-end" }) {
    const wrapper = document.createElement("span");
    wrapper.className = "info-tooltip";
    wrapper.dataset.placement = placement;

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "info-tooltip-trigger";
    trigger.dataset.infoTooltip = "true";
    trigger.setAttribute("aria-label", label);
    trigger.setAttribute("aria-expanded", "false");
    trigger.innerHTML = '<span aria-hidden="true">i</span>';

    const tooltip = document.createElement("span");
    tooltip.className = "info-tooltip-content";
    tooltip.id = createTooltipId();
    tooltip.setAttribute("role", "tooltip");
    tooltip.hidden = true;
    tooltip.textContent = text;

    trigger.setAttribute("aria-controls", tooltip.id);

    const setOpen = (open) => {
        closeActiveTooltip(open ? trigger : null);
        trigger.setAttribute("aria-expanded", String(open));
        tooltip.hidden = !open;
    };

    trigger.addEventListener("click", (event) => {
        event.stopPropagation();
        setOpen(trigger.getAttribute("aria-expanded") !== "true");
    });

    trigger.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            setOpen(false);
            trigger.focus();
        }
    });

    document.addEventListener("click", (event) => {
        if (!wrapper.contains(event.target)) setOpen(false);
    });

    wrapper.addEventListener("mouseenter", () => {
        if (window.matchMedia("(hover: hover)").matches) setOpen(true);
    });

    wrapper.addEventListener("mouseleave", () => {
        if (window.matchMedia("(hover: hover)").matches) setOpen(false);
    });

    wrapper.append(trigger, tooltip);
    return wrapper;
}

export { createInfoTooltip, closeActiveTooltip };
