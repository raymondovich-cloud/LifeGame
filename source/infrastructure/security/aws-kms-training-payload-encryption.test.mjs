// source/infrastructure/security/aws-kms-training-payload-encryption.test.mjs — Version 1.0
import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { createAwsKmsTrainingPayloadEncryption } from "./aws-kms-training-payload-encryption.js";

const KEY_VERSION = "aws-kms-training-v1";
const KEY_ARN = "arn:aws:kms:eu-central-1:123456789012:key/test-key";
const context = {
    userId: "33333333-3333-4333-8333-333333333333",
    sessionId: "11111111-1111-4111-8111-111111111111",
    sessionDate: "2026-10-10",
    status: "planned",
    revision: 1
};

function hex(bytes) {
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function createFakeKms() {
    const keys = new Map();
    return {
        async generateDataKey({ keyId, keySpec, encryptionContext }) {
            assert.equal(keyId, KEY_ARN);
            assert.equal(keySpec, "AES_256");
            const plaintextKey = webcrypto.getRandomValues(new Uint8Array(32));
            const encryptedDataKey = webcrypto.getRandomValues(new Uint8Array(32));
            keys.set(hex(encryptedDataKey), {
                plaintextKey: new Uint8Array(plaintextKey),
                keyId,
                context: JSON.stringify(encryptionContext)
            });
            return { plaintextKey, encryptedDataKey };
        },
        async decryptDataKey({ keyId, encryptedDataKey, encryptionContext }) {
            const record = keys.get(hex(encryptedDataKey));
            if (!record || record.keyId !== keyId || record.context !== JSON.stringify(encryptionContext)) {
                throw new Error("KMS authentication failed");
            }
            return { plaintextKey: new Uint8Array(record.plaintextKey) };
        }
    };
}

function setup() {
    return createAwsKmsTrainingPayloadEncryption({
        kms: createFakeKms(),
        keys: { [KEY_VERSION]: KEY_ARN },
        activeKeyVersion: KEY_VERSION,
        cryptoApi: webcrypto
    });
}

test("encrypts and decrypts private training payload with authenticated metadata", async () => {
    const encryption = setup();
    const payload = {
        activityType: "strength",
        intensity: "moderate",
        durationMinutes: 42,
        notes: "private note",
        exercises: [{ id: "barbell_bench_press", name: "Жим лёжа", muscleGroups: ["chest"], sets: [] }]
    };
    const envelope = await encryption.encryptPayload(payload, context);
    assert.equal(envelope.nonce.byteLength, 12);
    assert.equal(envelope.tag.byteLength, 16);
    assert.equal(envelope.keyVersion, KEY_VERSION);
    assert.deepEqual(await encryption.decryptPayload(envelope, context), payload);
});

test("rejects modified ciphertext through the GCM authentication tag", async () => {
    const encryption = setup();
    const envelope = await encryption.encryptPayload({ notes: "private" }, context);
    const modified = { ...envelope, tag: new Uint8Array(envelope.tag) };
    modified.tag[0] ^= 0xff;
    await assert.rejects(
        encryption.decryptPayload(modified, context),
        (error) => error.code === "TRAINING_PAYLOAD_DECRYPTION_FAILED"
    );
});

test("rejects a changed authenticated context", async () => {
    const encryption = setup();
    const envelope = await encryption.encryptPayload({ notes: "private" }, context);
    await assert.rejects(
        encryption.decryptPayload(envelope, { ...context, status: "completed" }),
        /KMS authentication failed/
    );
});

test("rejects unknown stored key versions without falling back to another key", async () => {
    const encryption = setup();
    const envelope = await encryption.encryptPayload({ notes: "private" }, context);
    await assert.rejects(
        encryption.decryptPayload({ ...envelope, keyVersion: "unconfigured-key" }, context),
        (error) => error.code === "TRAINING_PAYLOAD_KEY_VERSION_UNAVAILABLE"
    );
});

test("requires a valid KMS port and configured active key version", () => {
    assert.throws(() => createAwsKmsTrainingPayloadEncryption({}), /KMS port must implement/);
    assert.throws(() => createAwsKmsTrainingPayloadEncryption({
        kms: { generateDataKey() {}, decryptDataKey() {} },
        keys: { old: KEY_ARN },
        activeKeyVersion: "missing",
        cryptoApi: webcrypto
    }), /active key version must resolve/);
});
