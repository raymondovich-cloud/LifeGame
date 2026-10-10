// source/application/training/manage-training-session.test.mjs — Version 1.1
import test from "node:test";
import assert from "node:assert/strict";
import { createTrainingSession } from "../../domain/training/training-session.js";
import { createManageTrainingSession } from "./manage-training-session.js";

const SESSION_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_SESSION_ID = "22222222-2222-4222-8222-222222222222";
const planned = createTrainingSession({
    id: SESSION_ID, date: "2026-10-10", activityType: "strength", status: "planned", intensity: "unknown",
    exercises: [{ id: "barbell_bench_press", name: "Жим штанги лёжа", muscleGroups: ["chest", "triceps"], sets: [] }],
    createdAt: 100, updatedAt: 100
});
function setup({ stored = planned, revision = 1, userId = "user-1", now = 200, updateResult } = {}) {
    const calls = [];
    const repository = {
        async findForUser(requestedUserId, sessionId) {
            calls.push({ operation: "find", userId: requestedUserId, sessionId });
            return requestedUserId === userId ? { session: stored, revision } : null;
        },
        async updateForUser(requestedUserId, session, expectedRevision) {
            calls.push({ operation: "update", userId: requestedUserId, session, expectedRevision });
            if (updateResult === null) return null;
            return updateResult || { session, revision: expectedRevision + 1 };
        }
    };
    return { calls, useCase: createManageTrainingSession({ repository, clock: () => now }) };
}
const context = { userId: "user-1" };
test("starts a planned session with expected revision and returns incremented revision", async () => {
    const { calls, useCase } = setup();
    const result = await useCase.start({ userContext: context, sessionId: SESSION_ID, expectedRevision: 1 });
    assert.equal(result.session.status, "in_progress");
    assert.equal(result.session.updatedAt, 200);
    assert.equal(result.revision, 2);
    assert.equal(calls[1].userId, "user-1");
    assert.equal(calls[1].expectedRevision, 1);
});
test("completes only an in-progress session", async () => {
    const inProgress = createTrainingSession({ ...planned, status: "in_progress", updatedAt: 150 });
    const { useCase } = setup({ stored: inProgress, now: 200 });
    assert.equal((await useCase.complete({ userContext: context, sessionId: SESSION_ID, expectedRevision: 1 })).session.status, "completed");
});
test("revises allowed fields but preserves identity, status and creation time", async () => {
    const { useCase } = setup();
    const result = await useCase.revise({ userContext: context, sessionId: SESSION_ID, expectedRevision: 1, changes: { notes: "исправлено" } });
    assert.equal(result.session.notes, "исправлено");
    assert.equal(result.session.id, planned.id);
    assert.equal(result.session.status, planned.status);
    assert.equal(result.session.createdAt, planned.createdAt);
    assert.equal(result.revision, 2);
});
test("rejects missing user context before repository access", async () => {
    const { calls, useCase } = setup();
    await assert.rejects(useCase.start({ sessionId: SESSION_ID, expectedRevision: 1 }), /authenticated user context/);
    assert.equal(calls.length, 0);
});
test("rejects malformed session ID before repository access", async () => {
    const { calls, useCase } = setup();
    await assert.rejects(useCase.start({ userContext: context, sessionId: "not-a-uuid", expectedRevision: 1 }), /sessionId must be a canonical UUID/);
    assert.equal(calls.length, 0);
});
test("rejects sessions not found within the requested user scope", async () => {
    const { calls, useCase } = setup();
    await assert.rejects(useCase.start({ userContext: { userId: "other-user" }, sessionId: SESSION_ID, expectedRevision: 1 }), (error) => error.code === "TRAINING_SESSION_NOT_FOUND");
    assert.equal(calls.some((call) => call.operation === "update"), false);
});
test("rejects stale revisions before attempting an update", async () => {
    const { calls, useCase } = setup({ revision: 2 });
    await assert.rejects(useCase.start({ userContext: context, sessionId: SESSION_ID, expectedRevision: 1 }), (error) => error.code === "TRAINING_SESSION_CONFLICT");
    assert.equal(calls.some((call) => call.operation === "update"), false);
});
test("maps an atomic compare-and-swap miss to a conflict", async () => {
    const { calls, useCase } = setup({ updateResult: null });
    await assert.rejects(useCase.start({ userContext: context, sessionId: SESSION_ID, expectedRevision: 1 }), (error) => error.code === "TRAINING_SESSION_CONFLICT");
    assert.equal(calls.some((call) => call.operation === "update"), true);
});
test("does not persist invalid transitions or invalid revisions", async () => {
    const { calls, useCase } = setup();
    await assert.rejects(useCase.complete({ userContext: context, sessionId: SESSION_ID, expectedRevision: 1 }), /only an in-progress session/);
    await assert.rejects(useCase.revise({ userContext: context, sessionId: SESSION_ID, expectedRevision: 1, changes: { status: "completed" } }), /cannot be edited/);
    await assert.rejects(useCase.start({ userContext: context, sessionId: SESSION_ID, expectedRevision: 0 }), /expectedRevision must be/);
    assert.equal(calls.some((call) => call.operation === "update"), false);
});
test("rejects missing sessions and invalid dependency contracts", async () => {
    const { useCase } = setup();
    await assert.rejects(useCase.start({ userContext: context, sessionId: "", expectedRevision: 1 }), /sessionId must be a canonical UUID/);
    assert.throws(() => createManageTrainingSession({}), /repository.findForUser and repository.updateForUser/);
    assert.throws(() => createManageTrainingSession({ repository: { findForUser() {}, updateForUser() {} } }), /clock dependency/);
});
test("rejects a repository response whose identity does not match the request", async () => {
    const other = createTrainingSession({ ...planned, id: OTHER_SESSION_ID });
    const { useCase } = setup({ stored: other });
    await assert.rejects(useCase.start({ userContext: context, sessionId: SESSION_ID, expectedRevision: 1 }), (error) => error.code === "TRAINING_SESSION_REPOSITORY_CONTRACT_VIOLATION");
});
test("rejects a repository response that skips a revision", async () => {
    const { useCase } = setup({ updateResult: { session: { ...planned, status: "in_progress", updatedAt: 200 }, revision: 3 } });
    await assert.rejects(useCase.start({ userContext: context, sessionId: SESSION_ID, expectedRevision: 1 }), (error) => error.code === "TRAINING_SESSION_REPOSITORY_CONTRACT_VIOLATION");
});
