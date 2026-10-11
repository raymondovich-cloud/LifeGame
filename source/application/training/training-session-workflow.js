// training-session-workflow.js — Version 1.0
// Responsibility: coordinate starting, recording sets, and completing a training session through the session API.
const RESISTANCE_UNITS = new Set(["kg", "lb", "bodyweight", "band", "machine", "other"]);

function requireUserContext(userContext) {
    if (typeof userContext?.userId !== "string" || !userContext.userId.trim()) {
        throw new TypeError("Training session workflow: authenticated user context is required.");
    }
}

function requireEnvelope(value, expectedStatus) {
    if (!value || typeof value !== "object" || !value.session ||
        !Number.isSafeInteger(value.revision) || value.revision < 1) {
        throw new TypeError("Training session workflow: API returned an invalid session envelope.");
    }
    if (expectedStatus && value.session.status !== expectedStatus) {
        throw new TypeError("Training session workflow: API returned an unexpected session status.");
    }
    return value;
}

function createTrainingSessionWorkflow({ api, clock = () => Date.now() } = {}) {
    if (!api || typeof api.createSession !== "function" || typeof api.startSession !== "function" ||
        typeof api.reviseSession !== "function" || typeof api.completeSession !== "function") {
        throw new TypeError("Training session workflow: complete session API is required.");
    }
    if (typeof clock !== "function") throw new TypeError("Training session workflow: clock is required.");

    async function startWorkout({ userContext, workout } = {}) {
        requireUserContext(userContext);
        if (!workout || typeof workout !== "object" || typeof workout.title !== "string" ||
            !Array.isArray(workout.exercises) || workout.exercises.length === 0) {
            throw new TypeError("Training session workflow: a workout with exercises is required.");
        }
        const now = clock();
        if (!Number.isFinite(now) || now < 0) throw new TypeError("Training session workflow: clock must return a timestamp.");
        const date = new Date(now).toISOString().slice(0, 10);
        const exercises = workout.exercises.map((exercise) => {
            if (!exercise || typeof exercise.id !== "string" || !exercise.id.trim() ||
                typeof exercise.name !== "string" || !exercise.name.trim() ||
                !Array.isArray(exercise.muscleGroups)) {
                throw new TypeError("Training session workflow: workout contains an invalid exercise.");
            }
            return {
                id: exercise.id,
                name: exercise.name,
                muscleGroups: exercise.muscleGroups,
                sets: []
            };
        });
        const created = requireEnvelope(await api.createSession({
            session: {
                date,
                activityType: "strength",
                status: "planned",
                intensity: "unknown",
                durationMinutes: Number.isInteger(workout.durationMinutes) ? workout.durationMinutes : null,
                notes: "",
                exercises
            }
        }), "planned");
        if (created.revision !== 1) throw new TypeError("Training session workflow: new sessions must start at revision 1.");
        return requireEnvelope(await api.startSession({
            sessionId: created.session.id,
            expectedRevision: created.revision
        }), "in_progress");
    }

    async function recordSet({ userContext, sessionResult, exercise, reps, resistance } = {}) {
        requireUserContext(userContext);
        const current = requireEnvelope(sessionResult, "in_progress");
        if (!exercise || typeof exercise.id !== "string" ||
            !Number.isInteger(reps) || reps < 1 || reps > 100) {
            throw new TypeError("Training session workflow: exercise and reps from 1 to 100 are required.");
        }
        if (!resistance || typeof resistance !== "object" || !RESISTANCE_UNITS.has(resistance.unit)) {
            throw new TypeError("Training session workflow: resistance unit is invalid.");
        }
        if (resistance.unit === "bodyweight") {
            if (resistance.value != null) throw new TypeError("Training session workflow: bodyweight resistance must not contain a numeric value.");
        } else if (typeof resistance.value !== "number" || !Number.isFinite(resistance.value) ||
            resistance.value < 0 || resistance.value > 10000) {
            throw new TypeError("Training session workflow: resistance must be a valid non-negative number.");
        }

        const exerciseIndex = current.session.exercises.findIndex((item) => item.id === exercise.id);
        if (exerciseIndex < 0) throw new TypeError("Training session workflow: exercise does not belong to this session.");
        const exercises = current.session.exercises.map((item, index) => index === exerciseIndex
            ? { ...item, sets: [...item.sets, { reps, completed: true, resistance: { value: resistance.value ?? null, unit: resistance.unit } }] }
            : item);
        return requireEnvelope(await api.reviseSession({
            sessionId: current.session.id,
            expectedRevision: current.revision,
            changes: { exercises }
        }), "in_progress");
    }

    async function completeWorkout({ userContext, sessionResult } = {}) {
        requireUserContext(userContext);
        const current = requireEnvelope(sessionResult, "in_progress");
        const hasCompletedSet = current.session.exercises.some((exercise) =>
            exercise.sets.some((set) => set.completed === true));
        if (!hasCompletedSet) {
            const error = new Error("Сохрани хотя бы один подход перед завершением тренировки.");
            error.code = "TRAINING_SESSION_EMPTY";
            throw error;
        }
        return requireEnvelope(await api.completeSession({
            sessionId: current.session.id,
            expectedRevision: current.revision
        }), "completed");
    }

    return Object.freeze({ startWorkout, recordSet, completeWorkout });
}

export { createTrainingSessionWorkflow };
