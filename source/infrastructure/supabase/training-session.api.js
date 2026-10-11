// training-session.api.js — Version 1.0
// Responsibility: expose authenticated training-session commands through the browser Supabase Functions client.
function createTrainingSessionApi({ client } = {}) {
    if (!client?.functions || typeof client.functions.invoke !== "function") {
        throw new TypeError("Training Session API: Supabase Functions client is required.");
    }

    async function invoke(body) {
        const { data, error } = await client.functions.invoke("training-sessions", { body });
        if (error) {
            const status = Number(error.context?.status);
            const failure = new Error("Training Session API: remote request failed.");
            failure.code = status === 409 ? "TRAINING_SESSION_CONFLICT"
                : status === 404 ? "TRAINING_SESSION_NOT_FOUND"
                : status === 403 ? "TRAINING_SESSION_SCOPE_MISMATCH"
                : status === 503 ? "ENCRYPTION_KEY_UNAVAILABLE"
                : "TRAINING_SESSION_API_UNAVAILABLE";
            throw failure;
        }
        if (!data || typeof data !== "object" || Object.hasOwn(data, "error")) {
            const failure = new Error("Training Session API: invalid response.");
            failure.code = "TRAINING_SESSION_API_INVALID_RESPONSE";
            throw failure;
        }
        return data.data;
    }

    function envelope(value, expectedStatus = null) {
        if (!value || typeof value !== "object" || !value.session ||
            !Number.isSafeInteger(value.revision) || value.revision < 1 ||
            (expectedStatus && value.session.status !== expectedStatus)) {
            const failure = new Error("Training Session API: invalid session envelope.");
            failure.code = "TRAINING_SESSION_API_INVALID_RESPONSE";
            throw failure;
        }
        return value;
    }

    async function createSession({ session } = {}) {
        return envelope(await invoke({ action: "create", session }), "planned");
    }
    async function startSession({ sessionId, expectedRevision } = {}) {
        return envelope(await invoke({ action: "start", sessionId, expectedRevision }), "in_progress");
    }
    async function reviseSession({ sessionId, expectedRevision, changes } = {}) {
        return envelope(await invoke({ action: "revise", sessionId, expectedRevision, changes }), "in_progress");
    }
    async function completeSession({ sessionId, expectedRevision } = {}) {
        return envelope(await invoke({ action: "complete", sessionId, expectedRevision }), "completed");
    }

    return Object.freeze({ createSession, startSession, reviseSession, completeSession });
}

export { createTrainingSessionApi };
