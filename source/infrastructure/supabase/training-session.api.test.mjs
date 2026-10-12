// training-session.api.test.mjs — Version 1.1
import test from "node:test";
import assert from "node:assert/strict";
import { createTrainingSessionApi } from "./training-session.api.js";

const SESSION_ID = "11111111-1111-4111-8111-111111111111";
function fakeClient(handler) {
    const calls = [];
    return {
        calls,
        functions: { async invoke(name, options) { calls.push({ name, body: options.body }); return handler(name, options.body); } }
    };
}
function envelope(status, revision = 1) {
    return { data: { data: { session: { id: SESSION_ID, status }, revision } }, error: null };
}

test("sends lifecycle commands only through the authenticated Edge Function", async () => {
    const client = fakeClient((name, body) => {
        assert.equal(name, "training-sessions");
        if (body.action === "create") return envelope("planned", 1);
        if (body.action === "start") return envelope("in_progress", 2);
        if (body.action === "revise") return envelope("in_progress", 3);
        if (body.action === "list") return { data: { data: [{ session: { id: SESSION_ID, status: "completed" }, revision: 4 }] }, error: null };
        return envelope("completed", 4);
    });
    const api = createTrainingSessionApi({ client });
    const created = await api.createSession({ session: { status: "planned" } });
    const started = await api.startSession({ sessionId: SESSION_ID, expectedRevision: created.revision });
    const revised = await api.reviseSession({ sessionId: SESSION_ID, expectedRevision: started.revision, changes: { notes: "set saved" } });
    const completed = await api.completeSession({ sessionId: SESSION_ID, expectedRevision: revised.revision });
    assert.deepEqual(client.calls.map(call => call.body.action), ["create", "start", "revise", "complete"]);
    assert.equal(completed.session.status, "completed");
    const page = await api.listSessions({ offset: 100, limit: 100 });
    assert.equal(page.length, 1);
    assert.deepEqual(client.calls.at(-1).body, { action: "list", offset: 100, limit: 100 });
});

test("maps optimistic concurrency conflicts without leaking transport details", async () => {
    const client = fakeClient(() => ({ data: null, error: { context: { status: 409 }, message: "private transport detail" } }));
    const api = createTrainingSessionApi({ client });
    await assert.rejects(api.startSession({ sessionId: SESSION_ID, expectedRevision: 1 }), (error) =>
        error.code === "TRAINING_SESSION_CONFLICT" && !error.message.includes("private transport detail"));
});

test("rejects malformed API envelopes", async () => {
    const api = createTrainingSessionApi({ client: fakeClient(() => ({ data: { data: { session: {} , revision: 0 } }, error: null })) });
    await assert.rejects(api.createSession({ session: {} }), (error) => error.code === "TRAINING_SESSION_API_INVALID_RESPONSE");
});

test("requires a Supabase Functions client", () => {
    assert.throws(() => createTrainingSessionApi({}), /Supabase Functions client/);
});
