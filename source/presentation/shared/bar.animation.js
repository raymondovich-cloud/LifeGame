// bar.animation.js — Version 1.1
// Responsibility: animate presentation-only horizontal bar widths consistently across modules.

function animateBarWidth(element, targetPercent, options = {}) {
    if (!element) return;

    const target = Number.isFinite(Number(targetPercent))
        ? Math.max(0, Math.min(100, Number(targetPercent)))
        : 0;
    const duration = Math.max(100, Math.min(4000, Number(options.duration) || 1800));
    const reduceMotion = typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    element.style.setProperty("--bar-animation-duration", reduceMotion ? "0ms" : duration + "ms");
    element.style.width = "0%";

    if (reduceMotion || target === 0 || typeof requestAnimationFrame !== "function") {
        element.style.width = target + "%";
        return;
    }

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            if (!element.isConnected) return;
            element.style.width = target + "%";
        });
    });
}

export { animateBarWidth };
