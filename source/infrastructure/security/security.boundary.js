// LifeGame 3.0 — Security Boundary
// Version: 1.0
// Responsibility: define the infrastructure entry point for security
// services without implementing cryptography here.
//
// No keys, secrets, tokens, or cryptographic algorithms belong in this file.

export const SECURITY_DATA_CLASS = Object.freeze({
    IDENTITY: 'A',
    AUTHENTICATION_SECRET: 'B',
    PRIVATE_USER_DATA: 'C',
    SECURITY_SYSTEM_DATA: 'D'
});

export function assertSensitiveDataNotLoggable(value) {
    if (value === undefined || value === null) {
        return;
    }

    throw new Error(
        'Sensitive security data must not be passed to generic logging.'
    );
}
