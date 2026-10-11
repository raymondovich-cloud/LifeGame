// source/infrastructure/supabase/training-overview.api.js — Version 1.0
// Responsibility: call authenticated Supabase Edge Functions from the browser; no privileged keys or server-only imports.
function createTrainingOverviewApi({ client } = {}) {
    if (!client?.functions || typeof client.functions.invoke !== "function") {
        throw new TypeError("Training Overview API: Supabase Functions client is required.");
    }

    async function invoke(name, body) {
        const { data, error } = await client.functions.invoke(name, { body });
        if (error) {
            const failure = new Error("Training Overview API: remote request failed.");
            failure.code = "TRAINING_OVERVIEW_API_UNAVAILABLE";
            throw failure;
        }
        if (!data || typeof data !== "object" || Object.hasOwn(data, "error")) {
            const failure = new Error("Training Overview API: invalid response.");
            failure.code = "TRAINING_OVERVIEW_API_INVALID_RESPONSE";
            throw failure;
        }
        return data.data;
    }

    async function getProgram() {
        const result = await invoke("training-programs", { action: "get" });
        if (result === null) return null;
        if (!result || typeof result !== "object" || !result.program || !Number.isSafeInteger(result.revision)) {
            const failure = new Error("Training Overview API: invalid program envelope.");
            failure.code = "TRAINING_OVERVIEW_API_INVALID_RESPONSE";
            throw failure;
        }
        return result;
    }

    async function listSessions() {
        const result = await invoke("training-sessions", { action: "list" });
        if (!Array.isArray(result) || result.some(item =>
            !item || typeof item !== "object" || !item.session || !Number.isSafeInteger(item.revision))) {
            const failure = new Error("Training Overview API: invalid session history.");
            failure.code = "TRAINING_OVERVIEW_API_INVALID_RESPONSE";
            throw failure;
        }
        return result;
    }

    return Object.freeze({ getProgram, listSessions });
}

export { createTrainingOverviewApi };
