// LifeGame 3.0 — Identity Application Results
// Version: 1.0
// Responsibility: define provider-independent Identity result shapes.
//
// Forbidden:
// - Supabase
// - PostgreSQL
// - browser APIs
// - JWT libraries
// - Memory
// - encryption implementations

export const IDENTITY_REGISTRATION_STATUS = Object.freeze({
    PENDING_EMAIL_VERIFICATION: 'PENDING_EMAIL_VERIFICATION',
    ACTIVE: 'ACTIVE'
});

export function createRegistrationResult({
    userId = null,
    status,
    sessionEstablished = false
}) {
    if (!Object.values(IDENTITY_REGISTRATION_STATUS).includes(status)) {
        throw new Error('Invalid identity registration status.');
    }

    return Object.freeze({
        userId,
        status,
        sessionEstablished: Boolean(sessionEstablished)
    });
}
