// source/index/health/health.strength-session-qualification.js — Version 1.0
// Responsibility: validate explicit strength-session evidence without inferring physiological intensity.

/**
 * Validates whether a recorded session can be counted as a qualifying strength-activity day.
 *
 * Intensity must be explicitly supplied by the diary/user workflow. This function does not
 * infer moderate or vigorous intensity from weight, repetitions, duration, or muscle groups.
 * Weekly coverage of major muscle groups is evaluated separately by
 * prepareStrengthActivityData().
 */
function classifyStrengthSession({
    activityType,
    intensity,
    exercises,
    isSessionComplete
} = {}) {
    const unavailable = (reason) => ({
        available: false,
        isQualifyingStrengthSession: null,
        reason,
        status: "insufficient_data"
    });

    if (typeof isSessionComplete !== "boolean" || !isSessionComplete) {
        return unavailable("incomplete_session");
    }

    if (activityType !== "strength" && activityType !== "other") {
        return unavailable("unknown_activity_type");
    }

    if (activityType === "other") {
        return {
            available: true,
            isQualifyingStrengthSession: false,
            reason: "not_strength_activity",
            status: "classified"
        };
    }

    if (!["light", "moderate", "vigorous", "unknown"].includes(intensity)) {
        return unavailable("unknown_intensity");
    }

    if (intensity === "unknown") {
        return unavailable("unknown_intensity");
    }

    if (!Array.isArray(exercises)) {
        return unavailable("missing_exercise_records");
    }

    let completedWorkingSets = 0;
    const muscleGroups = new Set();

    for (const exercise of exercises) {
        if (!exercise || !Number.isInteger(exercise.completedSets) || exercise.completedSets < 0) {
            return unavailable("invalid_completed_sets");
        }

        if (!Array.isArray(exercise.muscleGroups)) {
            return unavailable("missing_muscle_groups");
        }

        if (exercise.muscleGroups.some((group) =>
            typeof group !== "string" || !group.trim()
        )) {
            return unavailable("invalid_muscle_groups");
        }

        if (exercise.completedSets > 0 && exercise.muscleGroups.length === 0) {
            return unavailable("missing_muscle_groups");
        }

        completedWorkingSets += exercise.completedSets;

        if (exercise.completedSets > 0) {
            for (const group of exercise.muscleGroups) {
                muscleGroups.add(group.trim());
            }
        }
    }

    const hasCompletedResistanceWork = completedWorkingSets > 0 && muscleGroups.size > 0;
    const meetsDeclaredIntensity = intensity === "moderate" || intensity === "vigorous";
    const qualifies = hasCompletedResistanceWork && meetsDeclaredIntensity;

    return {
        available: true,
        isQualifyingStrengthSession: qualifies,
        status: "classified",
        reason: qualifies
            ? "explicit_intensity_and_completed_resistance_work"
            : intensity === "light"
                ? "below_qualifying_intensity"
                : "no_completed_resistance_work",
        intensity,
        completedWorkingSets,
        muscleGroups: [...muscleGroups].sort()
    };
}

export { classifyStrengthSession };
