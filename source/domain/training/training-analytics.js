// source/domain/training/training-analytics.js — Version 1.1
// Responsibility: calculate training analytics from session values without infrastructure or presentation dependencies.
const MINUTE_MS = 60_000;
const LB_TO_KG = 0.45359237;
const WEEKDAY_LABELS = Object.freeze(["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"]);
const MONTH_LABELS = Object.freeze(["ЯНВ", "ФЕВ", "МАР", "АПР", "МАЙ", "ИЮН", "ИЮЛ", "АВГ", "СЕН", "ОКТ", "НОЯ", "ДЕК"]);

function isoDate(date) {
    return date.getUTCFullYear() + "-" + String(date.getUTCMonth() + 1).padStart(2, "0") + "-" + String(date.getUTCDate()).padStart(2, "0");
}
function parseDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new TypeError("Training analytics: today must be an ISO calendar date.");
    const date = new Date(value + "T00:00:00.000Z");
    if (Number.isNaN(date.getTime()) || isoDate(date) !== value) throw new TypeError("Training analytics: today must be a valid calendar date.");
    return date;
}
function shiftDate(date, days) {
    const result = new Date(date.getTime());
    result.setUTCDate(result.getUTCDate() + days);
    return result;
}
function completedSessions(sessions) {
    if (!Array.isArray(sessions)) throw new TypeError("Training analytics: sessions must be an array.");
    return sessions.filter((session) => session && session.status === "completed" && typeof session.date === "string");
}
function sessionDate(session, timeZone) {
    if (!Number.isFinite(session.startedAt)) return session.date;
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone, year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(new Date(session.startedAt));
    const part = (type) => parts.find((item) => item.type === type)?.value;
    const year = part("year"), month = part("month"), day = part("day");
    return year && month && day ? year + "-" + month + "-" + day : session.date;
}
function durationMinutes(session) {
    if (!Number.isFinite(session.startedAt) || !Number.isFinite(session.updatedAt) || session.updatedAt < session.startedAt) return null;
    return Math.floor((session.updatedAt - session.startedAt) / MINUTE_MS);
}
function sessionVolumeKg(session) {
    let total = 0;
    for (const exercise of Array.isArray(session.exercises) ? session.exercises : []) {
        for (const set of Array.isArray(exercise?.sets) ? exercise.sets : []) {
            if (set?.completed !== true || !Number.isInteger(set.reps) || set.reps < 1) continue;
            const resistance = set.resistance;
            if (!resistance || !Number.isFinite(resistance.value) || resistance.value <= 0) continue;
            if (resistance.unit === "kg") total += resistance.value * set.reps;
            else if (resistance.unit === "lb") total += resistance.value * LB_TO_KG * set.reps;
        }
    }
    return total;
}
function sumMinutes(sessions) {
    return sessions.reduce((sum, session) => sum + (durationMinutes(session) ?? 0), 0);
}
function daySeries(sessions, dates, timeZone) {
    return dates.map((date) => {
        const group = sessions.filter((session) => sessionDate(session, timeZone) === date);
        return Object.freeze({ date, workouts: group.length, minutes: sumMinutes(group) });
    });
}
function buildSeries(sessions, today, period, timeZone) {
    if (!["week", "month", "year"].includes(period)) throw new TypeError("Training analytics: period is invalid.");
    if (period === "year") {
        const year = today.getUTCFullYear();
        return MONTH_LABELS.map((label, index) => {
            const key = year + "-" + String(index + 1).padStart(2, "0");
            const group = sessions.filter((session) => sessionDate(session, timeZone).startsWith(key));
            return Object.freeze({ date: key, label, workouts: group.length, minutes: sumMinutes(group) });
        });
    }
    if (period === "month") {
        const first = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
        const count = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0)).getUTCDate();
        const dates = Array.from({ length: count }, (_, index) => isoDate(shiftDate(first, index)));
        return daySeries(sessions, dates, timeZone).map((item) => Object.freeze({ ...item, label: String(Number(item.date.slice(-2))) }));
    }
    const monday = shiftDate(today, -((today.getUTCDay() + 6) % 7));
    return daySeries(sessions, Array.from({ length: 7 }, (_, index) => isoDate(shiftDate(monday, index))), timeZone)
        .map((item, index) => Object.freeze({ ...item, label: WEEKDAY_LABELS[index] }));
}
function createTrainingAnalytics(sessions, { today, timeZone = "UTC" } = {}) {
    const currentDate = parseDate(today);
    try { new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date(0)); }
    catch { throw new TypeError("Training analytics: timeZone must be a valid IANA time zone."); }
    const completed = completedSessions(sessions);
    const knownDurationCount = completed.filter((session) => durationMinutes(session) !== null).length;
    const todayKey = isoDate(currentDate);
    const monday = shiftDate(currentDate, -((currentDate.getUTCDay() + 6) % 7));
    const weekDates = Array.from({ length: 7 }, (_, index) => isoDate(shiftDate(monday, index)));
    const weekSessions = completed.filter((session) => weekDates.includes(sessionDate(session, timeZone)));
    const todaySessions = completed.filter((session) => sessionDate(session, timeZone) === todayKey);
    const calendar = weekDates.map((date, index) => Object.freeze({
        date, label: WEEKDAY_LABELS[index], day: Number(date.slice(-2)),
        hasWorkout: completed.some((session) => sessionDate(session, timeZone) === date),
        isToday: date === todayKey
    }));
    const totalWeightKg = completed.reduce((sum, session) => sum + sessionVolumeKg(session), 0);
    return Object.freeze({
        totalWorkouts: completed.length,
        totalMinutes: sumMinutes(completed),
        totalWeightKg: Math.round(totalWeightKg * 100) / 100,
        sessionsWithoutDuration: completed.length - knownDurationCount,
        todayMinutes: sumMinutes(todaySessions),
        weeklyAverageMinutes: Math.round(sumMinutes(weekSessions) / 7),
        calendar: Object.freeze(calendar),
        buildSeries: (period) => Object.freeze(buildSeries(completed, currentDate, period, timeZone))
    });
}
export { createTrainingAnalytics, durationMinutes, sessionVolumeKg };
