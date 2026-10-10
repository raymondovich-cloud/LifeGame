// source/infrastructure/supabase/training-session.repository.js — Version 1.0
// Responsibility: persist encrypted training sessions through Supabase under the authenticated user's RLS context.
// SERVER-ONLY: requires a trusted user-scoped Supabase client and a server-side encryption port. Never import into client bundles.

import { createTrainingSession, isTrainingSessionId } from "../../domain/training/training-session.js";
import { createTrainingSessionPersistenceResult } from "../../application/training/training-session-persistence-result.js";

const TABLE = "training_sessions";
const COLUMNS = "id,user_id,session_date,status,revision,payload_ciphertext,payload_nonce,payload_tag,payload_wrapped_key,payload_key_version,created_at,updated_at";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function bytea(value, field) {
    if (!(value instanceof Uint8Array) && !(value instanceof ArrayBuffer)) {
        throw new TypeError("Training session repository: " + field + " must be bytes.");
    }
    const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
    if (!bytes.length) throw new TypeError("Training session repository: " + field + " cannot be empty.");
    return "\\x" + Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function parseBytea(value, field) {
    if (typeof value !== "string" || !/^\\x(?:[0-9a-f]{2})+$/i.test(value)) {
        throw new TypeError("Training session repository: " + field + " is not PostgreSQL bytea hex.");
    }
    const hex = value.slice(2);
    const bytes = new Uint8Array(hex.length / 2);
    for (let index = 0; index < hex.length; index += 2) bytes[index / 2] = Number.parseInt(hex.slice(index, index + 2), 16);
    return bytes;
}

function safeRevision(value) {
    const revision = typeof value === "string" ? Number(value) : value;
    if (!Number.isSafeInteger(revision) || revision < 1) throw new TypeError("Training session repository: revision is outside the safe integer range.");
    return revision;
}

function dateTimestamp(value, field) {
    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) throw new TypeError("Training session repository: invalid " + field + ".");
    return timestamp;
}

function createSupabaseTrainingSessionRepository({ client, userContext, encryption } = {}) {
    if (!client || typeof client.from !== "function") throw new TypeError("Training session repository: a user-scoped Supabase client is required.");
    if (typeof userContext?.userId !== "string" || !UUID.test(userContext.userId)) throw new TypeError("Training session repository: verified user context with UUID userId is required.");
    if (!encryption || typeof encryption.encryptPayload !== "function" || typeof encryption.decryptPayload !== "function") {
        throw new TypeError("Training session repository: server-side encryption port is required.");
    }

    const authenticatedUserId = userContext.userId.toLowerCase();

    function assertUserScope(userId) {
        if (typeof userId !== "string" || userId.toLowerCase() !== authenticatedUserId) {
            const error = new Error("Training session repository: requested user does not match authenticated context.");
            error.code = "TRAINING_SESSION_SCOPE_MISMATCH";
            throw error;
        }
    }

    function contextFor(row, revision) {
        return {
            userId: row.user_id,
            sessionId: row.id,
            sessionDate: row.session_date,
            status: row.status,
            revision
        };
    }

    async function encryptFields(session, revision, userId) {
        const context = { userId, sessionId: session.id, sessionDate: session.date, status: session.status, revision };
        const payload = {
            activityType: session.activityType,
            intensity: session.intensity,
            durationMinutes: session.durationMinutes,
            notes: session.notes,
            exercises: session.exercises
        };
        const envelope = await encryption.encryptPayload(payload, context);
        if (!envelope || typeof envelope.keyVersion !== "string" || !envelope.keyVersion.trim()) {
            throw new TypeError("Training session repository: encryption port returned no key version.");
        }
        return {
            payload_ciphertext: bytea(envelope.ciphertext, "ciphertext"),
            payload_nonce: bytea(envelope.nonce, "nonce"),
            payload_tag: bytea(envelope.tag, "authentication tag"),
            payload_wrapped_key: bytea(envelope.wrappedKey, "wrapped key"),
            payload_key_version: envelope.keyVersion
        };
    }

    async function mapRow(row, expectedId, userId) {
        if (!row || typeof row !== "object") throw new TypeError("Training session repository: database row is required.");
        if (row.id !== expectedId || row.user_id !== userId) {
            const error = new Error("Training session repository: returned row is outside the requested identity scope.");
            error.code = "TRAINING_SESSION_REPOSITORY_CONTRACT_VIOLATION";
            throw error;
        }
        const revision = safeRevision(row.revision);
        const payload = await encryption.decryptPayload({
            ciphertext: parseBytea(row.payload_ciphertext, "ciphertext"),
            nonce: parseBytea(row.payload_nonce, "nonce"),
            tag: parseBytea(row.payload_tag, "authentication tag"),
            wrappedKey: parseBytea(row.payload_wrapped_key, "wrapped key"),
            keyVersion: row.payload_key_version
        }, contextFor(row, revision));
        const session = createTrainingSession({
            id: row.id,
            date: row.session_date,
            activityType: payload.activityType,
            status: row.status,
            intensity: payload.intensity,
            durationMinutes: payload.durationMinutes,
            notes: payload.notes,
            exercises: payload.exercises,
            createdAt: dateTimestamp(row.created_at, "created_at"),
            updatedAt: dateTimestamp(row.updated_at, "updated_at")
        });
        return createTrainingSessionPersistenceResult({ session, revision }, expectedId);
    }

    async function findForUser(userId, sessionId) {
        assertUserScope(userId);
        if (!isTrainingSessionId(sessionId)) throw new TypeError("Training session repository: sessionId must be a canonical UUID.");
        const id = sessionId.toLowerCase();
        const { data, error } = await client.from(TABLE).select(COLUMNS).eq("user_id", authenticatedUserId).eq("id", id).maybeSingle();
        if (error) throw error;
        if (!data) return null;
        return mapRow(data, id, authenticatedUserId);
    }

    async function insertForUser(userId, sessionInput) {
        assertUserScope(userId);
        const session = createTrainingSession(sessionInput);
        const row = {
            id: session.id,
            user_id: authenticatedUserId,
            session_date: session.date,
            status: session.status,
            revision: 1,
            ...await encryptFields(session, 1, authenticatedUserId)
        };
        const { data, error } = await client.from(TABLE).insert(row).select(COLUMNS).maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("Training session repository: insert returned no persisted row.");
        return mapRow(data, session.id, authenticatedUserId);
    }

    async function updateForUser(userId, sessionInput, expectedRevision) {
        assertUserScope(userId);
        const session = createTrainingSession(sessionInput);
        if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) {
            throw new TypeError("Training session repository: expectedRevision must be a positive safe integer.");
        }
        const nextRevision = expectedRevision + 1;
        if (!Number.isSafeInteger(nextRevision)) throw new TypeError("Training session repository: next revision exceeds safe integer range.");
        const updates = {
            session_date: session.date,
            status: session.status,
            revision: nextRevision,
            ...await encryptFields(session, nextRevision, authenticatedUserId)
        };
        const { data, error } = await client.from(TABLE).update(updates)
            .eq("user_id", authenticatedUserId)
            .eq("id", session.id)
            .eq("revision", expectedRevision)
            .select(COLUMNS)
            .maybeSingle();
        if (error) throw error;
        if (!data) return null;
        const saved = await mapRow(data, session.id, authenticatedUserId);
        if (saved.revision !== nextRevision) {
            const error = new Error("Training session repository: database did not increment revision exactly once.");
            error.code = "TRAINING_SESSION_REPOSITORY_CONTRACT_VIOLATION";
            throw error;
        }
        return saved;
    }

    return Object.freeze({ findForUser, insertForUser, updateForUser });
}

export { createSupabaseTrainingSessionRepository };
