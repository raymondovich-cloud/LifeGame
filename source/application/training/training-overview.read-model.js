// source/application/training/training-overview.read-model.js — Version 1.0
// Responsibility: derive the Training Overview presentation model from a program and persisted sessions.
const DAY_MS = 86400000;
function isoDay(date) { return date.getUTCDay() || 7; }
function dateAt(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const parsed = new Date(value + "T00:00:00.000Z");
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? parsed : null;
}
function isoDate(date) { return date.toISOString().slice(0, 10); }
function shift(date, days) { return new Date(date.getTime() + days * DAY_MS); }
function workoutMatchesSession(workout, session) {
    if (session?.status !== "completed" || !Array.isArray(session.exercises)) return false;
    const recorded = new Set(session.exercises.map((exercise) => exercise?.id).filter((id) => typeof id === "string"));
    return workout.exercises.every((exercise) => recorded.has(exercise.id));
}
function completedDates(program, sessions) {
    const dates = new Set();
    for (const session of sessions) {
        if (session?.status !== "completed" || typeof session.date !== "string") continue;
        const date = dateAt(session.date);
        if (!date) continue;
        const workout = program.workouts.find((candidate) =>
            isoDay(date) === candidate.weekday && workoutMatchesSession(candidate, session));
        if (workout) dates.add(session.date + ":" + workout.id);
    }
    return dates;
}
function previousResult(sessions) {
    const ordered = sessions.filter((session) => session?.status === "completed" && dateAt(session.date))
        .sort((a, b) => b.date.localeCompare(a.date));
    for (const session of ordered) {
        for (const exercise of session.exercises || []) {
            const sets = (exercise.sets || []).filter((set) => set?.completed === true &&
                Number.isInteger(set.reps) && set.reps > 0 &&
                set.resistance?.unit === "kg" && Number.isFinite(set.resistance.value) && set.resistance.value >= 0);
            if (!sets.length) continue;
            const first = sets[0];
            if (sets.every((set) => set.reps === first.reps && set.resistance.value === first.resistance.value)) {
                return Object.freeze({ date: session.date, exerciseId: exercise.id, exerciseName: exercise.name,
                    sets: sets.length, reps: first.reps, weightKg: first.resistance.value });
            }
        }
    }
    return null;
}
function createTrainingOverviewReadModel({ clock = () => Date.now() } = {}) {
    if (typeof clock !== "function") throw new TypeError("Training Overview read model: clock is required.");
    function execute({ program = null, sessions = [] } = {}) {
        const now = clock();
        if (!Number.isFinite(now) || now < 0) throw new TypeError("Training Overview read model: clock must return a timestamp.");
        if (!Array.isArray(sessions)) throw new TypeError("Training Overview read model: sessions must be an array.");
        if (!Array.isArray(sessions)) throw new TypeError("Training Overview read model: sessions must be an array.");
        if (!program) return Object.freeze({ program: null, previousWorkout: previousResult(sessions) });
        const start = dateAt(program.startDate);
        if (!start || !Number.isInteger(program.totalWeeks) || program.totalWeeks < 1 ||
            !Array.isArray(program.workouts) || !program.workouts.length) {
            throw new TypeError("Training Overview read model: a valid program is required.");
        }
        const today = new Date(now);
        const todayDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
        const elapsedDays = Math.floor((todayDate.getTime() - start.getTime()) / DAY_MS);
        const currentWeek = Math.max(1, Math.min(program.totalWeeks, Math.floor(Math.max(0, elapsedDays) / 7) + 1));
        const weekStart = shift(start, (currentWeek - 1) * 7);
        const done = completedDates(program, sessions);
        const scheduledThisWeek = program.workouts.filter((workout) => {
            for (let day = 0; day < 7; day += 1) {
                const date = shift(weekStart, day);
                if (isoDay(date) === workout.weekday) return true;
            }
            return false;
        });
        const completedThisWeek = scheduledThisWeek.filter((workout) => {
            const date = shift(weekStart, (workout.weekday - isoDay(weekStart) + 7) % 7);
            return done.has(isoDate(date) + ":" + workout.id);
        }).length;
        let nextWorkout = null;
        if (program.status === "active" && elapsedDays >= 0 && currentWeek <= program.totalWeeks) {
            const candidates = [];
            for (let week = currentWeek; week <= program.totalWeeks; week += 1) {
                const base = shift(start, (week - 1) * 7);
                for (const workout of program.workouts) {
                    const date = shift(base, (workout.weekday - isoDay(base) + 7) % 7);
                    if (date.getTime() < todayDate.getTime()) continue;
                    if (done.has(isoDate(date) + ":" + workout.id)) continue;
                    candidates.push({ workout, date });
                }
                if (candidates.length) break;
            }
            candidates.sort((a, b) => a.date - b.date);
            if (candidates[0]) {
                const { workout, date } = candidates[0];
                nextWorkout = Object.freeze({ id: workout.id, title: workout.title, date: isoDate(date),
                    exerciseCount: workout.exercises.length, durationMinutes: workout.durationMinutes,
                    exercises: workout.exercises });
            }
        }
        return Object.freeze({
            program: Object.freeze({ name: program.name, currentWeek, totalWeeks: program.totalWeeks,
                completedWorkouts: completedThisWeek, targetWorkouts: scheduledThisWeek.length,
                nextWorkout }),
            previousWorkout: previousResult(sessions)
        });
    }
    return Object.freeze({ execute });
}
export { createTrainingOverviewReadModel };
