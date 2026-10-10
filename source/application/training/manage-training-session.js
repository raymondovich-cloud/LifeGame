// source/application/training/manage-training-session.js — Version 1.0
// Responsibility: orchestrate lifecycle changes for an existing user-scoped training session.
import { createTrainingSession } from "../../domain/training/training-session.js";
import { startTrainingSession, completeTrainingSession, reviseTrainingSession } from "../../domain/training/training-session-lifecycle.js";

function createManageTrainingSession({ repository, clock } = {}) {
    if (!repository || typeof repository.findForUser !== "function" || typeof repository.saveForUser !== "function") {
        throw new TypeError("Manage training session: repository.findForUser and repository.saveForUser are required.");
    }
    if (typeof clock !== "function") throw new TypeError("Manage training session: clock dependency is required.");

    async function execute({ userContext, sessionId, operation, changes } = {}) {
        const userId = userContext?.userId;
        if (typeof userId !== "string" || !userId.trim()) {
            throw new TypeError("Manage training session: authenticated user context is required.");
        }
        if (typeof sessionId !== "string" || !sessionId.trim()) {
            throw new TypeError("Manage training session: sessionId is required.");
        }
        const scopedUserId = userId.trim();
        const requestedId = sessionId.trim();
        const stored = await repository.findForUser(scopedUserId, requestedId);
        if (stored == null) {
            const error = new Error("Manage training session: session was not found.");
            error.code = "TRAINING_SESSION_NOT_FOUND";
            throw error;
        }
        const existing = createTrainingSession(stored);
        if (existing.id !== requestedId) throw new Error("Manage training session: repository returned a mismatched session.");

        const updatedAt = clock();
        if (!Number.isFinite(updatedAt) || updatedAt < 0) {
            throw new TypeError("Manage training session: clock must return a valid timestamp.");
        }
        let updated;
        switch (operation) {
            case "start": updated = startTrainingSession(existing, updatedAt); break;
            case "complete": updated = completeTrainingSession(existing, updatedAt); break;
            case "revise": updated = reviseTrainingSession(existing, changes, updatedAt); break;
            default: throw new TypeError("Manage training session: operation must be start, complete or revise.");
        }
        // The concrete adapter must authorize the user and enforce tenant isolation server-side.
        return repository.saveForUser(scopedUserId, updated);
    }

    return Object.freeze({
        start: ({ userContext, sessionId } = {}) => execute({ userContext, sessionId, operation: "start" }),
        complete: ({ userContext, sessionId } = {}) => execute({ userContext, sessionId, operation: "complete" }),
        revise: ({ userContext, sessionId, changes } = {}) => execute({ userContext, sessionId, operation: "revise", changes })
    });
}
export { createManageTrainingSession };
