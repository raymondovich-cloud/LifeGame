// LifeGame 3.0 — Identity Registration Policy
// Version: 1.0
// Responsibility: provider-independent registration input rules.
//
// Forbidden:
// - Supabase
// - PostgreSQL
// - browser APIs
// - Memory
// - token handling
// - encryption implementations
//
// Password content is validated only as input. It is never logged,
// persisted, or transformed into another application-level secret.

export function validateRegistrationInput(input) {
    if (!input || typeof input !== 'object') {
        throw new Error('Registration input is required.');
    }

    if (typeof input.email !== 'string' || input.email.trim().length === 0) {
        throw new Error('Registration email is required.');
    }

    if (typeof input.password !== 'string' || input.password.length === 0) {
        throw new Error('Registration password is required.');
    }

    return Object.freeze({
        email: input.email.trim(),
        password: input.password
    });
}
