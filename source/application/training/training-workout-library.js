// source/application/training/training-workout-library.js — Version 1.0
// Responsibility: validate exercise and workout-template commands before persistence.
function requireOwner(userContext) {
    const userId = userContext?.userId;
    if (typeof userId !== "string" || !userId.trim()) throw new TypeError("Training Workout Library: authenticated user context is required.");
    return userId.trim();
}
function normalizeName(value, label) {
    if (typeof value !== "string") throw new TypeError("Training Workout Library: " + label + " must be text.");
    const normalized = value.trim().replace(/\s+/g, " ");
    if (!normalized || normalized.length > 80) {
        const error = new Error(label === "title" ? "Название тренировки должно содержать от 1 до 80 символов." : "Название упражнения должно содержать от 1 до 80 символов.");
        error.code = "TRAINING_WORKOUT_LIBRARY_INVALID_NAME"; throw error;
    }
    return normalized;
}
function normalizeExercises(exercises) {
    if (!Array.isArray(exercises) || exercises.length < 1 || exercises.length > 50) {
        const error = new Error("Добавь от 1 до 50 упражнений."); error.code = "TRAINING_WORKOUT_LIBRARY_INVALID_EXERCISES"; throw error;
    }
    const seen = new Set();
    return exercises.map((exercise) => {
        if (!exercise || typeof exercise.id !== "string" || !exercise.id.trim()) throw new TypeError("Training Workout Library: each exercise requires an id.");
        const name = normalizeName(exercise.name, "exercise");
        const key = name.toLocaleLowerCase("ru-RU");
        if (seen.has(key)) {
            const error = new Error("В тренировке не должно быть повторяющихся упражнений."); error.code = "TRAINING_WORKOUT_LIBRARY_DUPLICATE_EXERCISE"; throw error;
        }
        seen.add(key);
        return { id: exercise.id, name, muscleGroups: Array.isArray(exercise.muscleGroups) ? exercise.muscleGroups : [], targetReps: Number.isInteger(exercise.targetReps) ? exercise.targetReps : 8 };
    });
}
function createTrainingWorkoutLibraryApplication({ api, userContext } = {}) {
    const methods = ["listExercises", "createExercise", "deleteExercise", "listTemplates", "saveTemplate", "deleteTemplate"];
    if (!api || !methods.every((method) => typeof api[method] === "function")) throw new TypeError("Training Workout Library: complete persistence API is required.");
    const owner = requireOwner(userContext);
    return Object.freeze({
        listExercises: () => api.listExercises(owner),
        createExercise: ({ name } = {}) => api.createExercise(owner, normalizeName(name, "exercise")),
        deleteExercise: ({ exerciseId } = {}) => api.deleteExercise(owner, exerciseId),
        listTemplates: () => api.listTemplates(owner),
        saveTemplate: ({ title, exercises, id = null } = {}) => api.saveTemplate(owner, { title: normalizeName(title, "title"), exercises: normalizeExercises(exercises), id }),
        deleteTemplate: ({ templateId } = {}) => api.deleteTemplate(owner, templateId)
    });
}
export { createTrainingWorkoutLibraryApplication };
