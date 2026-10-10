// source/application/training/manage-training-session.test.mjs — Version 1.0
import test from "node:test";
import assert from "node:assert/strict";
import { createTrainingSession } from "../../domain/training/training-session.js";
import { createManageTrainingSession } from "./manage-training-session.js";

const planned = createTrainingSession({
    id: "session-1", date: "2026-10-10", activityType: "strength", status: "planned", intensity: "unknown",
    exercises: [{ id: "barbell_bench_press", name: "Жим штанги лёжа", muscleGroups: ["chest", "triceps"], sets: [] }],
    createdAt: 100, updatedAt: 100
});
function setup({ stored = planned, userId = "user-1", now = 200 } = {}) {
    const calls = [];
    const repository = {
        async findForUser(requestedUserId, sessionId) {
            calls.push({ operation: "find", userId: requestedUserId, sessionId });
            return requestedUserId === userId ? stored : null;
        },
        async saveForUser(requestedUserId, session) {
            calls.push({ operation: "save", userId: requestedUserId, session });
            return session;
        }
    };
    return { calls, useCase: createManageTrainingSession({ repository, clock: () => now }) };
}
test("starts a planned session and persists through the user-scoped repository", async () => {
    const { calls, useCase } = setup();
    const result = await useCase.start({ userContext: { userId: "user-1" }, sessionId: "session-1" });
    assert.equal(result.status, "in_progress");
    assert.equal(result.updatedAt, 200);
    assert.equal(calls.filter((call) => call.operation === "save").length, 1);
    assert.equal(calls[1].userId, "user-1");
});
test("completes only an in-progress session", async () => {
    const inProgress = createTrainingSession({ ...planned, status: "in_progress", updatedAt: 150 });
    const { useCase } = setup({ stored: inProgress, now: 200 });
    assert.equal((await useCase.complete({ userContext: { userId: "user-1" }, sessionId: "session-1" })).status, "completed");
});
test("revises allowed fields but preserves identity, status and creation time", async () => {
    const { useCase } = setup();
    const result = await useCase.revise({ userContext: { userId: "user-1" }, sessionId: "session-1", changes: { notes: "исправлено" } });
    assert.equal(result.notes, "исправлено");
    assert.equal(result.id, planned.id);
    assert.equal(result.status, planned.status);
    assert.equal(result.createdAt, planned.createdAt);
});
test("rejects missing user context before repository access", async () => {
    const { calls, useCase } = setup();
    await assert.rejects(useCase.start({ sessionId: "session-1" }), /authenticated user context/);
    assert.equal(calls.length, 0);
});
test("rejects sessions not found within the requested user scope", async () => {
    const { calls, useCase } = setup();
    await assert.rejects(useCase.start({ userContext: { userId: "other-user" }, sessionId: "session-1" }), (error) => error.code === "TRAINING_SESSION_NOT_FOUND");
    assert.equal(calls.some((call) => call.operation === "save"), false);
});
test("does not persist invalid transitions or invalid revisions", async () => {
    const { calls, useCase } = setup();
    await assert.rejects(useCase.complete({ userContext: { userId: "user-1" }, sessionId: "session-1" }), /only an in-progress session/);
    await assert.rejects(useCase.revise({ userContext: { userId: "user-1" }, sessionId: "session-1", changes: { status: "completed" } }), /cannot be edited/);
    assert.equal(calls.some((call) => call.operation === "save"), false);
});
test("rejects missing sessions and invalid dependency contracts", async () => {
    const { useCase } = setup();
    await assert.rejects(useCase.start({ userContext: { userId: "user-1" }, sessionId: "" }), /sessionId is required/);
    assert.throws(() => createManageTrainingSession({}), /repository.findForUser and repository.saveForUser/);
    assert.throws(() => createManageTrainingSession({ repository: { findForUser() {}, saveForUser() {} } }), /clock dependency/);
});
test("rejects a repository response whose identity does not match the request", async () => {
    const other = createTrainingSession({ ...planned, id: "other-session" });
    const { useCase } = setup({ stored: other });
    await assert.rejects(useCase.start({ userContext: { userId: "user-1" }, sessionId: "session-1" }), /mismatched session/);
});
