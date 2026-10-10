// source/domain/training/exercise-catalog.js — Version 1.0
// Responsibility: expose stable identifiers and canonical metadata for the starter strength-exercise catalog.
const definitions = [
    { id: "barbell_bench_press", names: { ru: "Жим штанги лёжа", en: "Barbell bench press" }, muscleGroups: ["chest", "triceps", "shoulders"], equipment: "barbell" },
    { id: "incline_dumbbell_press", names: { ru: "Жим гантелей на наклонной скамье", en: "Incline dumbbell press" }, muscleGroups: ["chest", "triceps", "shoulders"], equipment: "dumbbell" },
    { id: "push_up", names: { ru: "Отжимания", en: "Push-up" }, muscleGroups: ["chest", "triceps", "shoulders"], equipment: "bodyweight" },
    { id: "lat_pulldown", names: { ru: "Тяга верхнего блока", en: "Lat pulldown" }, muscleGroups: ["back", "biceps"], equipment: "cable" },
    { id: "seated_cable_row", names: { ru: "Горизонтальная тяга блока", en: "Seated cable row" }, muscleGroups: ["back", "biceps"], equipment: "cable" },
    { id: "one_arm_dumbbell_row", names: { ru: "Тяга гантели одной рукой", en: "One-arm dumbbell row" }, muscleGroups: ["back", "biceps"], equipment: "dumbbell" },
    { id: "overhead_press", names: { ru: "Жим над головой", en: "Overhead press" }, muscleGroups: ["shoulders", "triceps"], equipment: "barbell" },
    { id: "dumbbell_lateral_raise", names: { ru: "Подъём гантелей в стороны", en: "Dumbbell lateral raise" }, muscleGroups: ["shoulders"], equipment: "dumbbell" },
    { id: "barbell_curl", names: { ru: "Подъём штанги на бицепс", en: "Barbell curl" }, muscleGroups: ["biceps", "forearms"], equipment: "barbell" },
    { id: "triceps_cable_pushdown", names: { ru: "Разгибание рук на блоке", en: "Triceps cable pushdown" }, muscleGroups: ["triceps"], equipment: "cable" },
    { id: "barbell_back_squat", names: { ru: "Приседания со штангой", en: "Barbell back squat" }, muscleGroups: ["quadriceps", "glutes", "hamstrings", "core"], equipment: "barbell" },
    { id: "leg_press", names: { ru: "Жим ногами", en: "Leg press" }, muscleGroups: ["quadriceps", "glutes"], equipment: "machine" },
    { id: "romanian_deadlift", names: { ru: "Румынская тяга", en: "Romanian deadlift" }, muscleGroups: ["hamstrings", "glutes", "back", "core"], equipment: "barbell" },
    { id: "seated_leg_curl", names: { ru: "Сгибание ног в тренажёре", en: "Seated leg curl" }, muscleGroups: ["hamstrings"], equipment: "machine" },
    { id: "standing_calf_raise", names: { ru: "Подъём на носки стоя", en: "Standing calf raise" }, muscleGroups: ["calves"], equipment: "machine" },
    { id: "hip_thrust", names: { ru: "Ягодичный мост со штангой", en: "Hip thrust" }, muscleGroups: ["glutes", "hamstrings"], equipment: "barbell" },
    { id: "plank", names: { ru: "Планка", en: "Plank" }, muscleGroups: ["core"], equipment: "bodyweight" },
    { id: "crunch", names: { ru: "Скручивания на пресс", en: "Crunch" }, muscleGroups: ["core"], equipment: "bodyweight" }
];
const EXERCISE_CATALOG = Object.freeze(definitions.map((item) => Object.freeze({
    ...item,
    names: Object.freeze({ ...item.names }),
    muscleGroups: Object.freeze([...item.muscleGroups].sort())
})));
const BY_ID = new Map(EXERCISE_CATALOG.map((exercise) => [exercise.id, exercise]));
function findExerciseById(id) {
    return typeof id === "string" ? BY_ID.get(id) ?? null : null;
}
function listExercises({ muscleGroup, equipment, query, locale = "ru" } = {}) {
    const normalizedQuery = typeof query === "string" ? query.trim().toLocaleLowerCase(locale) : "";
    return EXERCISE_CATALOG.filter((exercise) => {
        if (muscleGroup && !exercise.muscleGroups.includes(muscleGroup)) return false;
        if (equipment && exercise.equipment !== equipment) return false;
        if (normalizedQuery) {
            const name = exercise.names[locale] ?? exercise.names.en;
            if (!name.toLocaleLowerCase(locale).includes(normalizedQuery)) return false;
        }
        return true;
    });
}
export { EXERCISE_CATALOG, findExerciseById, listExercises };
