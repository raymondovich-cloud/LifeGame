// LifeGame 3.0 — Identity Application Errors
// Version: 1.1
// Responsibility: define provider-independent Identity errors.
// 
// Provider-specific error objects must never cross the Infrastructure boundary.

export const IDENTITY_ERROR_CODE = Object.freeze({
    REGISTRATION_FAILED: 'IDENTITY_REGISTRATION_FAILED',
    AUTHENTICATION_FAILED: 'IDENTITY_AUTHENTICATION_FAILED',
    SESSION_FAILED: 'IDENTITY_SESSION_FAILED',
    PASSWORD_RESET_FAILED: 'IDENTITY_PASSWORD_RESET_FAILED',
    PASSWORD_UPDATE_FAILED: 'IDENTITY_PASSWORD_UPDATE_FAILED',
    VERIFICATION_FAILED: 'IDENTITY_VERIFICATION_FAILED',
    RATE_LIMITED: 'IDENTITY_RATE_LIMITED',
    EMAIL_NOT_CONFIRMED: 'IDENTITY_EMAIL_NOT_CONFIRMED'
});

export class IdentityApplicationError extends Error {
    constructor(code, message) {
        super(message);
        this.name = 'IdentityApplicationError';
        this.code = code;
    }
}
