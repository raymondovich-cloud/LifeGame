// source/infrastructure/supabase/training-workout-library.api.js — Version 1.2
// Responsibility: persist exercise library and workout templates through the authenticated Supabase client.
// Payload-level encryption is deferred to the planned unified application encryption standard; ownership is enforced by auth checks and database RLS.
function createTrainingWorkoutLibraryApi({ client } = {}) {
    if (!client?.auth || typeof client.auth.getUser !== "function" || typeof client.from !== "function") {
        throw new TypeError("Training Workout Library API: authenticated Supabase client is required.");
    }
    async function assertOwner(userId) {
        if (typeof userId !== "string" || !userId.trim()) throw new TypeError("Training Workout Library API: authenticated user id is required.");
        const { data, error } = await client.auth.getUser();
        if (error || data?.user?.id !== userId) {
            const failure = new Error("Training Workout Library API: authenticated user scope mismatch.");
            failure.code = "TRAINING_WORKOUT_LIBRARY_SCOPE_MISMATCH"; throw failure;
        }
        return userId;
    }
    async function listExercises(userId) {
        const owner = await assertOwner(userId);
        const { data, error } = await client.from("training_exercises").select("id,name,exercise_type,created_at").eq("user_id", owner).order("name", { ascending: true });
        if (error) throw error;
        if (!Array.isArray(data)) throw new TypeError("Training Workout Library API: exercise list is invalid.");
        return data.map((item) => Object.freeze({ id: item.id, name: item.name, exerciseType: item.exercise_type === "cardio" ? "cardio" : "strength", createdAt: item.created_at }));
    }
    async function createExercise(userId, name, exerciseType = "strength") {
        const owner = await assertOwner(userId);
        const { data, error } = await client.from("training_exercises").insert({ user_id: owner, name, exercise_type: exerciseType }).select("id,name,exercise_type,created_at").single();
        if (error) {
            const failure = new Error("Не удалось сохранить упражнение. Проверь название и попробуй ещё раз.");
            failure.code = error.code === "23505" ? "TRAINING_EXERCISE_DUPLICATE" : "TRAINING_EXERCISE_SAVE_FAILED"; throw failure;
        }
        if (!data?.id || typeof data.name !== "string") throw new TypeError("Training Workout Library API: created exercise response is invalid.");
        return Object.freeze({ id: data.id, name: data.name, exerciseType: data.exercise_type === "cardio" ? "cardio" : "strength", createdAt: data.created_at });
    }
    async function deleteExercise(userId, exerciseId) {
        const owner = await assertOwner(userId);
        if (typeof exerciseId !== "string" || !exerciseId.trim()) throw new TypeError("Training Workout Library API: exercise id is required.");
        const { data, error } = await client.rpc("delete_training_exercise_cascade", { p_exercise_id: exerciseId });
        if (error) throw error;
        if (data !== true && data !== false) throw new TypeError("Training Workout Library API: exercise deletion response is invalid.");
        return data;
    }
    async function listTemplates(userId) {
        const owner = await assertOwner(userId);
        const { data, error } = await client.from("training_workout_templates").select("id,title,exercises,is_pinned,created_at,updated_at").eq("user_id", owner).order("is_pinned", { ascending: false }).order("updated_at", { ascending: false });
        if (error) throw error;
        if (!Array.isArray(data)) throw new TypeError("Training Workout Library API: template list is invalid.");
        return data.map((item) => {
            if (typeof item.id !== "string" || typeof item.title !== "string" || !Array.isArray(item.exercises)) throw new TypeError("Training Workout Library API: stored template is invalid.");
            return Object.freeze({ id: item.id, title: item.title, exercises: item.exercises, isPinned: item.is_pinned === true, createdAt: item.created_at, updatedAt: item.updated_at });
        });
    }
    async function saveTemplate(userId, { title, exercises, id = null } = {}) {
        const owner = await assertOwner(userId);
        const row = { user_id: owner, title, exercises, updated_at: new Date().toISOString() };
        const query = id ? client.from("training_workout_templates").update(row).eq("user_id", owner).eq("id", id) : client.from("training_workout_templates").insert(row);
        const { data, error } = await query.select("id,title,exercises,created_at,updated_at").single();
        if (error) throw error;
        if (!data?.id || !Array.isArray(data.exercises)) throw new TypeError("Training Workout Library API: saved template response is invalid.");
        return Object.freeze({ id: data.id, title: data.title, exercises: data.exercises, createdAt: data.created_at, updatedAt: data.updated_at });
    }
    async function setTemplatePinned(userId, templateId, isPinned) {
        const owner = await assertOwner(userId);
        if (typeof templateId !== "string" || !templateId.trim()) throw new TypeError("Training Workout Library API: template id is required.");
        if (typeof isPinned !== "boolean") throw new TypeError("Training Workout Library API: pinned state must be boolean.");
        const { data, error } = await client.from("training_workout_templates")
            .update({ is_pinned: isPinned, updated_at: new Date().toISOString() })
            .eq("user_id", owner).eq("id", templateId)
            .select("id,title,exercises,is_pinned,created_at,updated_at").maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("Тренировка не найдена или уже удалена.");
        return Object.freeze({ id: data.id, title: data.title, exercises: data.exercises, isPinned: data.is_pinned === true, createdAt: data.created_at, updatedAt: data.updated_at });
    }
    async function deleteTemplate(userId, templateId) {
        const owner = await assertOwner(userId);
        const { error } = await client.from("training_workout_templates").delete().eq("user_id", owner).eq("id", templateId);
        if (error) throw error;
        return true;
    }
    return Object.freeze({ listExercises, createExercise, deleteExercise, listTemplates, saveTemplate, setTemplatePinned, deleteTemplate });
}
export { createTrainingWorkoutLibraryApi };
