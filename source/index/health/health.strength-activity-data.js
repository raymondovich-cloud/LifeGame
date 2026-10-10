// source/index/health/health.strength-activity-data.js — Version 1.0

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(value) {
    if (typeof value !== "string" || !ISO_DATE_PATTERN.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function uniqueSorted(values) {
    return [...new Set(values)].sort();
}

/**
 * Prepares a weekly strength-activity summary from already classified sessions.
 *
 * This function does not decide whether a workout is physiologically moderate
 * or vigorous. That classification must be supplied explicitly by a trusted
 * upstream workflow. An incomplete training log must never be treated as zero.
 */
function prepareStrengthActivityData({
    weekStartDate,
    weekEndDate,
    sessions,
    isLogComplete,
    requiredMuscleGroups
} = {}) {
    if (
        !isValidIsoDate(weekStartDate) ||
        !isValidIsoDate(weekEndDate) ||
        weekStartDate > weekEndDate
    ) {
        return { available: false, error: "invalid_week_range" };
    }

    if (!Array.isArray(sessions) || typeof isLogComplete !== "boolean") {
        return { available: false, reason: "incomplete_data" };
    }

    if (!Array.isArray(requiredMuscleGroups) ||
        requiredMuscleGroups.length === 0 ||
        requiredMuscleGroups.some((group) => typeof group !== "string" || !group.trim())) {
        return { available: false, error: "invalid_required_muscle_groups" };
    }

    const requiredGroups = uniqueSorted(requiredMuscleGroups.map((group) => group.trim()));
    const sessionsByDate = new Map();
    const coveredGroups = new Set();
    let hasUnknownQualification = false;
    let hasUnknownMuscleGroups = false;

    for (const session of sessions) {
        if (!session || !isValidIsoDate(session.date)) {
            return { available: false, error: "invalid_session_date" };
        }

        if (session.date < weekStartDate || session.date > weekEndDate) {
            return { available: false, error: "session_outside_week_range" };
        }

        if (
            session.isQualifyingStrengthSession !== true &&
            session.isQualifyingStrengthSession !== false &&
            session.isQualifyingStrengthSession !== null
        ) {
            hasUnknownQualification = true;
        } else if (session.isQualifyingStrengthSession === null) {
            hasUnknownQualification = true;
        }

        if (
            session.isQualifyingStrengthSession === true &&
            (!Array.isArray(session.muscleGroups) ||
                session.muscleGroups.some((group) => typeof group !== "string" || !group.trim()))
        ) {
            hasUnknownMuscleGroups = true;
        }

        const previous = sessionsByDate.get(session.date);
        const current = session.isQualifyingStrengthSession;

        // A day is qualifying if at least one session on that day is explicitly
        // classified as qualifying. Unknown sessions still make the week incomplete.
        if (!previous || current === true) {
            sessionsByDate.set(session.date, current);
        }

        if (current === true && Array.isArray(session.muscleGroups)) {
            for (const group of session.muscleGroups) {
                if (typeof group === "string" && group.trim()) {
                    coveredGroups.add(group.trim());
                }
            }
        }
    }

    const qualifyingDates = [...sessionsByDate.entries()]
        .filter(([, qualifies]) => qualifies === true)
        .map(([date]) => date)
        .sort();

    const missingMuscleGroups = requiredGroups.filter((group) => !coveredGroups.has(group));
    const dataComplete = isLogComplete && !hasUnknownQualification && !hasUnknownMuscleGroups;

    if (!dataComplete) {
        return {
            available: false,
            reason: "incomplete_data",
            qualifyingDaysPerWeek: null,
            qualifyingDates: [],
            muscleGroupCoverageAvailable: false,
            coveredMuscleGroups: [],
            missingMuscleGroups: null
        };
    }

    return {
        available: true,
        weekStartDate,
        weekEndDate,
        qualifyingDaysPerWeek: qualifyingDates.length,
        qualifyingDates,
        recommendationMetByDays: qualifyingDates.length >= 2,
        muscleGroupCoverageAvailable: true,
        coveredMuscleGroups: uniqueSorted([...coveredGroups]),
        missingMuscleGroups,
        requiredMuscleGroupsCovered: missingMuscleGroups.length === 0,
        status: "prepared_data_only"
    };
}

export { prepareStrengthActivityData };
