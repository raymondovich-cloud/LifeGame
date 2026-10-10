// source/domain/training/training-session-lifecycle.js — Version 1.0
// Responsibility: enforce valid lifecycle transitions and controlled edits for immutable training sessions.
import { createTrainingSession } from "./training-session.js";
const EDITABLE_FIELDS = new Set(["date", "activityType", "intensity", "durationMinutes", "notes", "exercises"]);
function assertSession(session) {
    if (!session || typeof session !== "object" || !session.id || !session.status) {
        throw new TypeError("Training session lifecycle: a valid session is required.");
    }
}
function assertTimestamp(session, updatedAt) {
    if (!Number.isFinite(updatedAt) || updatedAt < session.updatedAt) {
        throw new TypeError("Training session lifecycle: updatedAt must be a valid non-decreasing timestamp.");
    }
}
function transition(session, status, updatedAt) {
    assertSession(session);
    assertTimestamp(session, updatedAt);
    return createTrainingSession({ ...session, status, updatedAt });
}
function startTrainingSession(session, updatedAt) {
    assertSession(session);
    if (session.status !== "planned") {
        throw new Error("Training session lifecycle: only a planned session can be started.");
    }
    return transition(session, "in_progress", updatedAt);
}
function completeTrainingSession(session, updatedAt) {
    assertSession(session);
    if (session.status !== "in_progress") {
        throw new Error("Training session lifecycle: only an in-progress session can be completed.");
    }
    return transition(session, "completed", updatedAt);
}
function reviseTrainingSession(session, changes, updatedAt) {
    assertSession(session);
    assertTimestamp(session, updatedAt);
    if (!changes || typeof changes !== "object" || Array.isArray(changes)) {
        throw new TypeError("Training session lifecycle: changes must be an object.");
    }
    const keys = Object.keys(changes);
    if (keys.length === 0) {
        throw new TypeError("Training session lifecycle: at least one editable field is required.");
    }
    const forbidden = keys.find((key) => !EDITABLE_FIELDS.has(key));
    if (forbidden) {
        throw new TypeError("Training session lifecycle: field '" + forbidden + "' cannot be edited here.");
    }
    return createTrainingSession({ ...session, ...changes, id: session.id, createdAt: session.createdAt, updatedAt });
}
export { startTrainingSession, completeTrainingSession, reviseTrainingSession };
