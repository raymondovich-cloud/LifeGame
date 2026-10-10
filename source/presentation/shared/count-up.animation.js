// count-up.animation.js — Version 1.1
// Responsibility: animate a presentation-only numeric value without changing its source data.

function animateCountUp(element, targetValue, options = {}) {
    if (!element || !Number.isFinite(targetValue)) return;

    const decimalPlaces = Number.isInteger(options.decimalPlaces)
        ? Math.max(0, Math.min(3, options.decimalPlaces))
        : 0;
    const scale = 10 ** decimalPlaces;
    const target = Math.max(0, Math.round(targetValue * scale) / scale);
    const formatValue = typeof options.formatter === "function"
        ? options.formatter
        : (value) => decimalPlaces ? value.toFixed(decimalPlaces) : String(Math.round(value));
    const duration = Math.max(100, Math.min(4000, Number(options.duration) || 1800));
    const reduceMotion = typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion || target === 0 || typeof requestAnimationFrame !== "function") {
        element.textContent = formatValue(target);
        return;
    }

    let startTime = null;
    let frameId = 0;

    const tick = (timestamp) => {
        if (!element.isConnected) {
            cancelAnimationFrame(frameId);
            return;
        }

        if (startTime === null) startTime = timestamp;

        const progress = Math.min((timestamp - startTime) / duration, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 5);
        const currentValue = Math.round(target * easedProgress * scale) / scale;

        element.textContent = formatValue(currentValue);

        if (progress < 1) {
            frameId = requestAnimationFrame(tick);
        } else {
            element.textContent = formatValue(target);
        }
    };

    frameId = requestAnimationFrame(tick);
}

export { animateCountUp };
