// source/application/training/manage-training-session.js — Version 1.1
// Responsibility: orchestrate lifecycle changes with revision-based optimistic concurrency.
import { isTrainingSessionId } from "../../domain/training/training-session.js";
import { startTrainingSession, completeTrainingSession, reviseTrainingSession } from "../../domain/training/training-session-lifecycle.js";
import { createTrainingSessionPersistenceResult } from "./training-session-persistence-result.js";

function conflictError() {
    const error = new Error("Manage training session: the session changed; reload it before retrying.");
    error.code = "TRAINING_SESSION_CONFLICT";
    return error;
}

function createManageTrainingSession({ repository, clock } = {}) {
    if (!repository || typeof repository.findForUser !== "function" || typeof repository.updateForUser !== "function") {
        throw new TypeError("Manage training session: repository.findForUser and repository.updateForUser are required.");
    }
    if (typeof clock !== "function") throw new TypeError("Manage training session: clock dependency is required.");

    async function execute({ userContext, sessionId, expectedRevision, operation, changes } = {}) {
        const userId = userContext?.userId;
        if (typeof userId !== "string" || !userId.trim()) {
            throw new TypeError("Manage training session: authenticated user context is required.");
        }
        if (!isTrainingSessionId(sessionId)) {
            throw new TypeError("Manage training session: sessionId must be a canonical UUID.");
        }
        if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) {
            throw new TypeError("Manage training session: expectedRevision must be a positive safe integer.");
        }

        const scopedUserId = userId.trim();
        const requestedId = sessionId.trim().toLowerCase();
        const storedValue = await repository.findForUser(scopedUserId, requestedId);
        if (storedValue == null) {
            const error = new Error("Manage training session: session was not found.");
            error.code = "TRAINING_SESSION_NOT_FOUND";
            throw error;
        }
        const stored = createTrainingSessionPersistenceResult(storedValue, requestedId);
        if (stored.revision !== expectedRevision) throw conflictError();

        const existing = stored.session;
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

        // The adapter must perform this compare-and-swap atomically under database ownership/RLS.
        const savedValue = await repository.updateForUser(scopedUserId, updated, expectedRevision);
        if (savedValue == null) throw conflictError();
        const saved = createTrainingSessionPersistenceResult(savedValue, requestedId);
        if (saved.revision !== expectedRevision + 1) {
            const error = new Error("Manage training session: repository did not increment revision exactly once.");
            error.code = "TRAINING_SESSION_REPOSITORY_CONTRACT_VIOLATION";
            throw error;
        }
        return saved;
    }

    return Object.freeze({
        start: ({ userContext, sessionId, expectedRevision } = {}) => execute({ userContext, sessionId, expectedRevision, operation: "start" }),
        complete: ({ userContext, sessionId, expectedRevision } = {}) => execute({ userContext, sessionId, expectedRevision, operation: "complete" }),
        revise: ({ userContext, sessionId, expectedRevision, changes } = {}) => execute({ userContext, sessionId, expectedRevision, operation: "revise", changes })
    });
}
export { createManageTrainingSession };
