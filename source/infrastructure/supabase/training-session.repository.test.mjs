// source/infrastructure/supabase/training-session.repository.test.mjs — Version 1.4
import test from "node:test";
import assert from "node:assert/strict";
import { createTrainingSession } from "../../domain/training/training-session.js";
import { createSupabaseTrainingSessionRepository } from "./training-session.repository.js";

const USER_ID = "33333333-3333-4333-8333-333333333333";
const SESSION_ID = "11111111-1111-4111-8111-111111111111";

function fromBytea(value) {
    const hex = value.slice(2);
    const result = new Uint8Array(hex.length / 2);
    for (let index = 0; index < hex.length; index += 2) result[index / 2] = Number.parseInt(hex.slice(index, index + 2), 16);
    return result;
}

function createFakeClient() {
    const rows = new Map();
    const calls = [];
    return {
        rows,
        calls,
        from(table) {
            assert.equal(table, "training_sessions");
            const query = { action: "select", payload: null, filters: [] };
            const builder = {
                select() { if (query.action === "select") query.action = "select"; return builder; },
                insert(payload) { query.action = "insert"; query.payload = payload; return builder; },
                update(payload) { query.action = "update"; query.payload = payload; return builder; },
                eq(field, value) { query.filters.push([field, value]); return builder; },
                async maybeSingle() {
                    calls.push({ action: query.action, filters: [...query.filters] });
                    const matches = (row) => query.filters.every(([field, value]) => String(row[field]) === String(value));
                    if (query.action === "insert") {
                        if (rows.has(query.payload.id)) return { data: null, error: { code: "23505", message: "duplicate key" } };
                        const row = {
                            ...query.payload,
                            created_at: "2026-10-10T10:00:00.000Z",
                            updated_at: "2026-10-10T10:00:00.000Z",
                            revision: 1
                        };
                        rows.set(row.id, row);
                        return { data: { ...row }, error: null };
                    }
                    if (query.action === "update") {
                        const current = [...rows.values()].find(matches);
                        if (!current) return { data: null, error: null };
                        const next = {
                            ...current,
                            ...query.payload,
                            id: current.id,
                            user_id: current.user_id,
                            created_at: current.created_at,
                            revision: Number(current.revision) + 1,
                            updated_at: "2026-10-10T10:01:00.000Z"
                        };
                        rows.set(next.id, next);
                        return { data: { ...next }, error: null };
                    }
                    const row = [...rows.values()].find(matches);
                    return { data: row ? { ...row } : null, error: null };
                }
            };
            return builder;
        }
    };
}

const encryption = {
    async encryptPayload(payload, context) {
        const ciphertext = new TextEncoder().encode(JSON.stringify(payload));
        return {
            ciphertext,
            nonce: new Uint8Array(12).fill(1),
            tag: new Uint8Array(16).fill(2),
            keyEnvelope: new Uint8Array(32).fill(7),
            keyVersion: "test-key-v1",
            context
        };
    },
    async decryptPayload(envelope) {
        return JSON.parse(new TextDecoder().decode(envelope.ciphertext));
    }
};

function makeSession(overrides = {}) {
    return createTrainingSession({
        id: SESSION_ID,
        date: "2026-10-10",
        activityType: "strength",
        status: "planned",
        intensity: "unknown",
        durationMinutes: 35,
        notes: "first note",
        exercises: [{ id: "bench", name: "Bench press", muscleGroups: ["chest"], sets: [] }],
        createdAt: 1000,
        updatedAt: 1000,
        ...overrides
    });
}

function setup() {
    const client = createFakeClient();
    const repository = createSupabaseTrainingSessionRepository({
        client,
        userContext: { userId: USER_ID },
        encryption
    });
    return { client, repository };
}

test("inserts encrypted fields and reads back a validated domain session", async () => {
    const { client, repository } = setup();
    const inserted = await repository.insertForUser(USER_ID, makeSession());
    assert.equal(inserted.revision, 1);
    assert.equal(inserted.session.id, SESSION_ID);
    assert.equal(inserted.session.notes, "first note");
    assert.equal(inserted.session.createdAt, Date.parse("2026-10-10T10:00:00.000Z"));
    const row = client.rows.get(SESSION_ID);
    assert.equal(typeof row.payload_ciphertext, "string");
    assert.match(row.payload_ciphertext, /^\\x[0-9a-f]+$/i);
    assert.equal(row.payload_nonce.length, 26);
    assert.equal(row.payload_tag.length, 34);
    assert.equal(row.payload_key_version, "test-key-v1");
    assert.equal(row.user_id, USER_ID, "insert must bind ownership to verified context");

    const found = await repository.findForUser(USER_ID, SESSION_ID);
    assert.deepEqual(found, inserted);
});

test("uses an atomic expected-revision filter and returns the next revision", async () => {
    const { client, repository } = setup();
    await repository.insertForUser(USER_ID, makeSession());
    const updatedSession = makeSession({ status: "in_progress", notes: "updated note", updatedAt: 2000 });
    const updated = await repository.updateForUser(USER_ID, updatedSession, 1);
    assert.equal(updated.revision, 2);
    assert.equal(updated.session.status, "in_progress");
    assert.equal(updated.session.notes, "updated note");
    assert.ok(client.calls.some((call) => call.action === "update" && call.filters.some(([key, value]) => key === "revision" && value === 1)));
    assert.ok(client.calls.some((call) => call.action === "update" && call.filters.some(([key, value]) => key === "user_id" && value === USER_ID)), "privileged updates must always be owner-scoped");
});

test("returns null when the expected revision is stale", async () => {
    const { repository } = setup();
    await repository.insertForUser(USER_ID, makeSession());
    await repository.updateForUser(USER_ID, makeSession({ status: "in_progress" }), 1);
    const stale = await repository.updateForUser(USER_ID, makeSession({ status: "in_progress", notes: "stale" }), 1);
    assert.equal(stale, null);
});

test("rejects a requested user that differs from the verified context before querying", async () => {
    const { client, repository } = setup();
    await assert.rejects(repository.findForUser("44444444-4444-4444-8444-444444444444", SESSION_ID), (error) => error.code === "TRAINING_SESSION_SCOPE_MISMATCH");
    assert.equal(client.calls.length, 0);
});

test("returns null for a missing user-scoped session", async () => {
    const { repository } = setup();
    assert.equal(await repository.findForUser(USER_ID, SESSION_ID), null);
});

test("propagates persistence errors instead of returning an unsaved entity", async () => {
    const client = {
        from() {
            return {
                insert() { return this; },
                select() { return this; },
                async maybeSingle() { return { data: null, error: new Error("database unavailable") }; }
            };
        }
    };
    const repository = createSupabaseTrainingSessionRepository({ client, userContext: { userId: USER_ID }, encryption });
    await assert.rejects(repository.insertForUser(USER_ID, makeSession()), /database unavailable/);
});
