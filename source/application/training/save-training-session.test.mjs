// source/application/training/save-training-session.test.mjs — Version 1.1
import test from "node:test";
import assert from "node:assert/strict";
import { createSaveTrainingSession } from "./save-training-session.js";

const SESSION_ID = "11111111-1111-4111-8111-111111111111";
const session = { date: "2026-10-10", activityType: "strength", status: "completed", intensity: "moderate", exercises: [{ id: "e1", name: "Squat", muscleGroups: ["quadriceps"], sets: [{ reps: 5, completed: true }] }] };
function setup({ result } = {}) {
    const calls = [];
    return {
        calls,
        useCase: createSaveTrainingSession({
            repository: { insertForUser: async (userId, entity) => { calls.push({ userId, entity }); return result || { session: entity, revision: 1 }; } },
            clock: () => 1000,
            createId: () => SESSION_ID
        })
    };
}
test("inserts validated data and returns revision envelope", async () => {
    const { useCase, calls } = setup();
    const saved = await useCase.execute({ userContext: { userId: "user-123" }, session: { ...session, id: "client-chosen-id", createdAt: 1, updatedAt: 2 } });
    assert.equal(calls[0].userId, "user-123");
    assert.equal(saved.session.id, SESSION_ID);
    assert.equal(saved.revision, 1);
    assert.equal(saved.session.createdAt, 1000);
    assert.equal(saved.session.updatedAt, 1000);
    assert.equal(Object.hasOwn(saved.session, "userId"), false);
});
test("rejects missing user context before persistence", async () => {
    const { useCase, calls } = setup();
    await assert.rejects(useCase.execute({ session }), /authenticated user context/);
    assert.equal(calls.length, 0);
});
test("rejects invalid domain data before persistence", async () => {
    const { useCase, calls } = setup();
    await assert.rejects(useCase.execute({ userContext: { userId: "user-123" }, session: { ...session, date: "bad" } }), /valid ISO calendar date/);
    assert.equal(calls.length, 0);
});
test("rejects a repository that returns the wrong revision for a new session", async () => {
    const { useCase } = setup({ result: { session: { ...session, id: SESSION_ID, createdAt: 1000, updatedAt: 1000 }, revision: 2 } });
    await assert.rejects(useCase.execute({ userContext: { userId: "user-123" }, session }), /start a new session at revision 1/);
});
test("requires insert contract and deterministic dependencies", () => {
    assert.throws(() => createSaveTrainingSession({}), /repository.insertForUser/);
    assert.throws(() => createSaveTrainingSession({ repository: { insertForUser() {} } }), /clock and createId/);
});
