// source/infrastructure/security/aws-kms-training-payload-encryption.js — Version 1.3
// Responsibility: AES-256-GCM payload encryption with a KMS-backed envelope-encryption port.
// SERVER-ONLY: never import this module into Web, Telegram WebApp, or iOS client bundles.

const NONCE_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;
const SCHEMA_VERSION = "1";

function asBytes(value, field) {
    if (value instanceof Uint8Array) return new Uint8Array(value);
    if (value instanceof ArrayBuffer) return new Uint8Array(value.slice(0));
    throw new TypeError("Training payload encryption: " + field + " must be bytes.");
}

function validateContext(context) {
    if (!context || typeof context !== "object") throw new TypeError("Training payload encryption: context is required.");
    const { userId, sessionId, sessionDate, status, revision } = context;
    if (typeof userId !== "string" || !userId.trim()) throw new TypeError("Training payload encryption: userId is required.");
    if (typeof sessionId !== "string" || !sessionId.trim()) throw new TypeError("Training payload encryption: sessionId is required.");
    if (typeof sessionDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) throw new TypeError("Training payload encryption: sessionDate must be ISO YYYY-MM-DD.");
    if (!["planned", "in_progress", "completed"].includes(status)) throw new TypeError("Training payload encryption: status is invalid.");
    if (!Number.isSafeInteger(revision) || revision < 1) throw new TypeError("Training payload encryption: revision must be a positive safe integer.");
    return Object.freeze({ userId: userId.trim().toLowerCase(), sessionId: sessionId.trim().toLowerCase(), sessionDate, status, revision });
}

function contextParts(context) {
    const normalized = validateContext(context);
    const aad = {
        app: "LifeGame",
        purpose: "training-session",
        schemaVersion: SCHEMA_VERSION,
        userId: normalized.userId,
        sessionId: normalized.sessionId,
        sessionDate: normalized.sessionDate,
        status: normalized.status,
        revision: normalized.revision
    };
    return {
        additionalData: new TextEncoder().encode(JSON.stringify(aad)),
        kmsEncryptionContext: Object.freeze({
            app: "LifeGame",
            purpose: "training-session",
            schema_version: SCHEMA_VERSION,
            user_id: normalized.userId,
            session_id: normalized.sessionId,
            session_date: normalized.sessionDate,
            status: normalized.status,
            revision: String(normalized.revision)
        })
    };
}

function createAwsKmsTrainingPayloadEncryption({ kms, keys, activeKeyVersion, cryptoApi = globalThis.crypto } = {}) {
    if (!kms || typeof kms.generateDataKey !== "function" || typeof kms.decryptDataKey !== "function") {
        throw new TypeError("Training payload encryption: KMS port must implement generateDataKey and decryptDataKey.");
    }
    if (!keys || typeof keys !== "object" || Array.isArray(keys) || !Object.keys(keys).length) {
        throw new TypeError("Training payload encryption: a key-version map is required.");
    }
    if (typeof activeKeyVersion !== "string" || !Object.hasOwn(keys, activeKeyVersion) || typeof keys[activeKeyVersion] !== "string" || !keys[activeKeyVersion].trim()) {
        throw new TypeError("Training payload encryption: active key version must resolve to a KMS key ARN.");
    }
    if (!cryptoApi?.subtle || typeof cryptoApi.getRandomValues !== "function") {
        throw new TypeError("Training payload encryption: Web Crypto API is required.");
    }

    async function encryptPayload(payload, context) {
        const { additionalData, kmsEncryptionContext } = contextParts(context);
        if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
            throw new TypeError("Training payload encryption: payload must be an object.");
        }
        const keyVersion = activeKeyVersion;
        const keyArn = keys[keyVersion];
        const generated = await kms.generateDataKey({ keyId: keyArn, keySpec: "AES_256", encryptionContext: kmsEncryptionContext });
        const originalPlaintextKey = generated?.plaintextKey;
        const plaintextKey = asBytes(originalPlaintextKey, "generated plaintext key");
        const wrappedKey = asBytes(generated?.encryptedDataKey, "wrapped data key");
        if (plaintextKey.byteLength !== KEY_BYTES || wrappedKey.byteLength === 0) {
            plaintextKey.fill(0);
            if (originalPlaintextKey instanceof Uint8Array) originalPlaintextKey.fill(0);
            throw new Error("Training payload encryption: KMS returned an invalid data key envelope.");
        }

        let plaintext;
        let sealed;
        try {
            const nonce = cryptoApi.getRandomValues(new Uint8Array(NONCE_BYTES));
            const cryptoKey = await cryptoApi.subtle.importKey("raw", plaintextKey, { name: "AES-GCM" }, false, ["encrypt"]);
            plaintext = new TextEncoder().encode(JSON.stringify(payload));
            sealed = new Uint8Array(await cryptoApi.subtle.encrypt(
                { name: "AES-GCM", iv: nonce, additionalData, tagLength: TAG_BYTES * 8 },
                cryptoKey,
                plaintext
            ));
            const ciphertext = sealed.slice(0, -TAG_BYTES);
            const tag = sealed.slice(-TAG_BYTES);
            return Object.freeze({ ciphertext, nonce, tag, keyEnvelope: wrappedKey, keyVersion });
        } finally {
            plaintext?.fill(0);
            sealed?.fill(0);
            plaintextKey.fill(0);
            if (originalPlaintextKey instanceof Uint8Array) originalPlaintextKey.fill(0);
        }
    }

    async function decryptPayload(envelope, context) {
        const { additionalData, kmsEncryptionContext } = contextParts(context);
        if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) {
            throw new TypeError("Training payload encryption: envelope is required.");
        }
        const keyVersion = envelope.keyVersion;
        const keyArn = keys[keyVersion];
        if (typeof keyArn !== "string" || !keyArn) {
            const error = new Error("Training payload encryption: stored key version is not configured.");
            error.code = "TRAINING_PAYLOAD_KEY_VERSION_UNAVAILABLE";
            throw error;
        }
        const nonce = asBytes(envelope.nonce, "nonce");
        const tag = asBytes(envelope.tag, "authentication tag");
        const ciphertext = asBytes(envelope.ciphertext, "ciphertext");
        const keyEnvelope = asBytes(envelope.keyEnvelope, "key envelope");
        if (nonce.byteLength !== NONCE_BYTES || tag.byteLength !== TAG_BYTES || ciphertext.byteLength === 0 || keyEnvelope.byteLength === 0) {
            throw new TypeError("Training payload encryption: encrypted envelope is malformed.");
        }

        const decrypted = await kms.decryptDataKey({ keyId: keyArn, encryptedDataKey: keyEnvelope, encryptionContext: kmsEncryptionContext });
        const originalPlaintextKey = decrypted?.plaintextKey;
        const plaintextKey = asBytes(originalPlaintextKey, "decrypted plaintext key");
        if (plaintextKey.byteLength !== KEY_BYTES) {
            plaintextKey.fill(0);
            if (originalPlaintextKey instanceof Uint8Array) originalPlaintextKey.fill(0);
            throw new Error("Training payload encryption: KMS returned an invalid plaintext key.");
        }
        try {
            const cryptoKey = await cryptoApi.subtle.importKey("raw", plaintextKey, { name: "AES-GCM" }, false, ["decrypt"]);
            const sealed = new Uint8Array(ciphertext.byteLength + tag.byteLength);
            sealed.set(ciphertext);
            sealed.set(tag, ciphertext.byteLength);
            let plaintext;
            try {
                plaintext = new Uint8Array(await cryptoApi.subtle.decrypt(
                    { name: "AES-GCM", iv: nonce, additionalData, tagLength: TAG_BYTES * 8 },
                    cryptoKey,
                    sealed
                ));
                const parsed = JSON.parse(new TextDecoder().decode(plaintext));
                if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid payload shape");
                return parsed;
            } catch {
                const error = new Error("Training payload encryption: payload authentication or decoding failed.");
                error.code = "TRAINING_PAYLOAD_DECRYPTION_FAILED";
                throw error;
            } finally {
                sealed.fill(0);
                plaintext?.fill(0);
            }
        } finally {
            plaintextKey.fill(0);
            if (originalPlaintextKey instanceof Uint8Array) originalPlaintextKey.fill(0);
        }
    }

    return Object.freeze({ encryptPayload, decryptPayload });
}

export { createAwsKmsTrainingPayloadEncryption };
