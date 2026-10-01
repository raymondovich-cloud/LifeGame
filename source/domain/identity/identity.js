// LifeGame 3.0 — Identity Domain
// Version: 1.0
// Responsibility: define provider-independent identity state.
//
// Forbidden imports:
// - Supabase
// - PostgreSQL
// - browser APIs
// - JWT libraries
// - Memory
// - encryption implementations

export const ACCOUNT_STATUS = Object.freeze({
    PENDING_EMAIL_VERIFICATION: 'PENDING_EMAIL_VERIFICATION',
    ACTIVE: 'ACTIVE',
    SUSPENDED: 'SUSPENDED',
    DELETED: 'DELETED'
});

export function createIdentity({ id, status = ACCOUNT_STATUS.PENDING_EMAIL_VERIFICATION }) {
    if (!id) {
        throw new Error('Identity id is required.');
    }

    if (!Object.values(ACCOUNT_STATUS).includes(status)) {
        throw new Error('Invalid identity account status.');
    }

    return Object.freeze({
        id,
        status
    });
}

export function isActiveIdentity(identity) {
    return Boolean(identity) && identity.status === ACCOUNT_STATUS.ACTIVE;
}
