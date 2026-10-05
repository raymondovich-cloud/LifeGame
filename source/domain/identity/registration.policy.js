// LifeGame 3.0 — Identity Registration Policy
// Version: 1.1
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

    if (
        typeof input.displayName !== 'string' ||
        input.displayName.trim().length === 0
    ) {
        throw new Error('Registration name is required.');
    }

    if (
        typeof input.birthDate !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(input.birthDate.trim())
    ) {
        throw new Error('Registration birth date is required.');
    }

    const [year, month, day] = input.birthDate.trim().split('-').map(Number);
    const birthDate = new Date(Date.UTC(year, month - 1, day));

    if (
        birthDate.getUTCFullYear() !== year ||
        birthDate.getUTCMonth() !== month - 1 ||
        birthDate.getUTCDate() !== day
    ) {
        throw new Error('Registration birth date is invalid.');
    }

    const now = new Date();
    const today = new Date(
        Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate()
        )
    );

    if (birthDate > today) {
        throw new Error('Registration birth date cannot be in the future.');
    }

    return Object.freeze({
        email: input.email.trim(),
        password: input.password,
        displayName: input.displayName.trim(),
        birthDate: input.birthDate.trim()
    });
}
