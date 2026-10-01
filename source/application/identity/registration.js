// LifeGame 3.0 — Identity Registration Use Case
// Version: 1.0
// Responsibility: execute registration through the provider-independent port.
//
// The use case does not know Supabase, PostgreSQL, browser APIs,
// sessions, JWTs, or persistence details.

import { validateRegistrationInput } from '../../domain/identity/registration.policy.js';

export function createRegistrationUseCase(identityPort) {
    if (!identityPort) {
        throw new Error('Identity port is required.');
    }

    return Object.freeze({
        async execute(input) {
            const registration = validateRegistrationInput(input);

            return identityPort.register(registration);
        }
    });
}
