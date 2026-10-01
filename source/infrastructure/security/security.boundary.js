// LifeGame 3.0 — Security Boundary
// Version: 1.0
// Responsibility: define provider-independent security data classification.
//
// No keys, secrets, tokens, or cryptographic algorithms belong in this file.
// Concrete encryption/key-management implementations will live behind
// Infrastructure ports in later security work.

export const SECURITY_DATA_CLASS = Object.freeze({
    IDENTITY: 'A',
    AUTHENTICATION_SECRET: 'B',
    PRIVATE_USER_DATA: 'C',
    SECURITY_SYSTEM_DATA: 'D'
});
