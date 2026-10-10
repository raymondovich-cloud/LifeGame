// source/application/training/training-session-persistence-result.js — Version 1.0
// Responsibility: validate the repository result envelope at the Application boundary.
import { createTrainingSession } from "../../domain/training/training-session.js";

function createTrainingSessionPersistenceResult(value, expectedSessionId) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new TypeError("Training session repository: result must contain session and revision.");
    }
    if (!Number.isSafeInteger(value.revision) || value.revision < 1) {
        throw new TypeError("Training session repository: revision must be a positive safe integer.");
    }
    const session = createTrainingSession(value.session);
    if (expectedSessionId != null && session.id !== expectedSessionId) {
        const error = new Error("Training session repository: returned session identity does not match.");
        error.code = "TRAINING_SESSION_REPOSITORY_CONTRACT_VIOLATION";
        throw error;
    }
    return Object.freeze({ session, revision: value.revision });
}

export { createTrainingSessionPersistenceResult };
