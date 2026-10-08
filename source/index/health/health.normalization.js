// source/index/health/health.normalization.js — Version 1.0

const LIMITS = Object.freeze({ minimum: 0, maximum: 100 });

function clamp(value, minimum = LIMITS.minimum, maximum = LIMITS.maximum) {
    return Math.max(minimum, Math.min(maximum, value));
}

function finite(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function interpolate(value, points) {
    const number = finite(value);
    if (number === null || !Array.isArray(points) || points.length === 0) {
        return null;
    }

    if (number <= points[0][0]) return points[0][1];

    for (let index = 1; index < points.length; index += 1) {
        const [x1, y1] = points[index - 1];
        const [x2, y2] = points[index];

        if (number <= x2) {
            const ratio = (number - x1) / (x2 - x1);
            return y1 + ratio * (y2 - y1);
        }
    }

    return points[points.length - 1][1];
}

function scoreSleepDuration(hours) {
    const value = finite(hours);
    if (value === null || value < 0) return null;

    if (value < 4) return interpolate(value, [[0, 0], [4, 10]]);
    if (value < 5) return interpolate(value, [[4, 10], [5, 35]]);
    if (value < 6) return interpolate(value, [[5, 35], [6, 65]]);
    if (value < 7) return interpolate(value, [[6, 65], [7, 90]]);
    if (value <= 9) return 100;
    if (value <= 10) return interpolate(value, [[9, 100], [10, 90]]);
    if (value <= 11) return interpolate(value, [[10, 90], [11, 70]]);
    if (value <= 12) return interpolate(value, [[11, 70], [12, 40]]);

    return null;
}

function scoreSleepRegularity(variabilityMinutes) {
    const value = finite(variabilityMinutes);
    if (value === null || value < 0) return null;

    if (value <= 30) return 100;
    if (value <= 60) return interpolate(value, [[30, 100], [60, 75]]);
    if (value <= 90) return interpolate(value, [[60, 75], [90, 50]]);
    if (value <= 120) return interpolate(value, [[90, 50], [120, 25]]);

    return interpolate(value, [[120, 25], [240, 0]]);
}

function scoreSubjectiveScale(value, minimum = 0, maximum = 10) {
    const number = finite(value);
    if (number === null || maximum <= minimum) return null;

    return clamp(((number - minimum) / (maximum - minimum)) * 100);
}

function scorePersonalBaseline(value, baseline, tolerance = 0.05, collapse = 0.40) {
    const current = finite(value);
    const base = finite(baseline);

    if (current === null || base === null || base <= 0) return null;

    const deviation = Math.abs(current - base) / base;

    if (deviation <= tolerance) return 100;

    const normalized = (deviation - tolerance) / Math.max(0.001, collapse - tolerance);
    return clamp(100 * (1 - normalized));
}

function scoreActiveMinutes(minutesPerWeek) {
    const value = finite(minutesPerWeek);
    if (value === null || value < 0) return null;

    return interpolate(value, [
        [0, 0],
        [30, 20],
        [60, 40],
        [100, 60],
        [150, 80],
        [300, 100]
    ]);
}

function scoreSteps(stepsPerDay) {
    const value = finite(stepsPerDay);
    if (value === null || value < 0) return null;

    return interpolate(value, [
        [0, 0],
        [2000, 20],
        [4000, 40],
        [6000, 60],
        [8000, 75],
        [10000, 95]
    ]);
}

function scoreTrainingFrequency(trainingsPerWeek) {
    const value = finite(trainingsPerWeek);
    if (value === null || value < 0) return null;

    if (value <= 0) return 0;
    if (value <= 1) return value * 30;
    if (value <= 2) return interpolate(value, [[1, 30], [2, 60]]);
    if (value <= 3) return interpolate(value, [[2, 60], [3, 80]]);
    if (value <= 4) return interpolate(value, [[3, 80], [4, 90]]);

    return 90;
}

function scoreTrend(current, baseline, direction = "higher") {
    const value = finite(current);
    const base = finite(baseline);

    if (value === null || base === null || base === 0) return null;

    const change = (value - base) / Math.abs(base);
    const signed = direction === "lower" ? -change : change;

    return clamp(50 + signed * 100);
}

export {
    LIMITS,
    clamp,
    interpolate,
    scoreSleepDuration,
    scoreSleepRegularity,
    scoreSubjectiveScale,
    scorePersonalBaseline,
    scoreActiveMinutes,
    scoreSteps,
    scoreTrainingFrequency,
    scoreTrend
};
