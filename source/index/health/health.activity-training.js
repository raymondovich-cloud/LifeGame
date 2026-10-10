// source/index/health/health.activity-training.js — Version 1.0

const WHO_ACTIVITY_GUIDELINES = Object.freeze({
    minimumModerateEquivalentMinutesPerWeek: 150,
    maximumModerateEquivalentMinutesPerWeek: 300,
    minimumVigorousMinutesPerWeek: 75,
    maximumVigorousMinutesPerWeek: 150,
    minimumStrengthDaysPerWeek: 2
});

function finiteNonNegative(value) {
    if (
        value === null ||
        value === undefined ||
        (typeof value === "string" && value.trim() === "")
    ) {
        return null;
    }

    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : null;
}

function calculateAerobicActivity(input = {}) {
    const moderateMinutes = finiteNonNegative(input.moderateMinutesPerWeek);
    const vigorousMinutes = finiteNonNegative(input.vigorousMinutesPerWeek);

    if (moderateMinutes === null && vigorousMinutes === null) {
        return {
            available: false,
            equivalentModerateMinutesPerWeek: null,
            minimumRecommendationMet: null,
            recommendedRange: "unknown"
        };
    }

    const equivalentModerateMinutesPerWeek =
        (moderateMinutes ?? 0) + 2 * (vigorousMinutes ?? 0);

    const minimum = WHO_ACTIVITY_GUIDELINES.minimumModerateEquivalentMinutesPerWeek;
    const maximum = WHO_ACTIVITY_GUIDELINES.maximumModerateEquivalentMinutesPerWeek;

    return {
        available: true,
        moderateMinutesPerWeek: moderateMinutes,
        vigorousMinutesPerWeek: vigorousMinutes,
        equivalentModerateMinutesPerWeek,
        minimumRecommendationMet: equivalentModerateMinutesPerWeek >= minimum,
        recommendedRange:
            equivalentModerateMinutesPerWeek < minimum
                ? "below"
                : equivalentModerateMinutesPerWeek <= maximum
                    ? "within"
                    : "above"
    };
}

function calculateStrengthActivity(input = {}) {
    const rawDays = input.qualifyingDaysPerWeek;

    if (
        rawDays === null ||
        rawDays === undefined ||
        (typeof rawDays === "string" && rawDays.trim() === "")
    ) {
        return {
            available: false,
            qualifyingDaysPerWeek: null,
            recommendationMet: null,
            recommendationAttainmentPercent: null
        };
    }

    const days = Number(rawDays);

    if (!Number.isInteger(days) || days < 0 || days > 7) {
        return {
            available: false,
            qualifyingDaysPerWeek: null,
            recommendationMet: null,
            recommendationAttainmentPercent: null,
            error: "invalid_qualifying_days"
        };
    }

    const targetDays = WHO_ACTIVITY_GUIDELINES.minimumStrengthDaysPerWeek;

    return {
        available: true,
        qualifyingDaysPerWeek: days,
        recommendationMet: days >= targetDays,
        recommendationAttainmentPercent: Math.min(100, (days / targetDays) * 100)
    };
}

function calculateActivityTraining(input = {}) {
    const aerobic = calculateAerobicActivity(input.aerobic);
    const strength = calculateStrengthActivity(input.strength);
    const stepsPerDay = finiteNonNegative(input.stepsPerDay);

    return {
        methodologyVersion: "1.0",
        status: "components_only",
        score: null,
        aerobic,
        strength,
        supportingMetrics: {
            stepsPerDay
        },
        note: "Components are reported separately; no combined factor score is calculated."
    };
}

export {
    WHO_ACTIVITY_GUIDELINES,
    calculateAerobicActivity,
    calculateStrengthActivity,
    calculateActivityTraining
};
