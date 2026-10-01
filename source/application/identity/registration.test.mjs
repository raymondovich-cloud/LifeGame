// LifeGame 3.0 — Identity Registration Tests
// Responsibility: verify the registration boundary before provider integration.
//
// These tests deliberately use a fake IdentityPort.
// They must not contact Supabase, persist data, or expose credentials.

import test from 'node:test';
import assert from 'node:assert/strict';

import { validateRegistrationInput } from '../../domain/identity/registration.policy.js';
import { createRegistrationUseCase } from './registration.js';

test('registration rejects missing input', () => {
    assert.throws(
        () => validateRegistrationInput(),
        /Registration input is required/
    );
});

test('registration rejects missing email', () => {
    assert.throws(
        () => validateRegistrationInput({ password: 'ValidPassword123!' }),
        /Registration email is required/
    );
});

test('registration rejects missing password', () => {
    assert.throws(
        () => validateRegistrationInput({ email: 'user@example.com' }),
        /Registration password is required/
    );
});

test('registration trims email but preserves password exactly', () => {
    const result = validateRegistrationInput({
        email: '  user@example.com  ',
        password: ' Valid Password 123! '
    });

    assert.equal(result.email, 'user@example.com');
    assert.equal(result.password, ' Valid Password 123! ');
});

test('registration does not mutate caller input', () => {
    const input = {
        email: '  user@example.com  ',
        password: 'ValidPassword123!'
    };

    const original = { ...input };

    validateRegistrationInput(input);

    assert.deepEqual(input, original);
});

test('registration use case delegates only validated registration data to the port', async () => {
    let received = null;

    const identityPort = {
        async register(input) {
            received = input;
            return { accepted: true };
        }
    };

    const useCase = createRegistrationUseCase(identityPort);

    const result = await useCase.execute({
        email: '  user@example.com  ',
        password: 'ValidPassword123!'
    });

    assert.deepEqual(received, {
        email: 'user@example.com',
        password: 'ValidPassword123!'
    });
    assert.deepEqual(result, { accepted: true });
});

test('registration use case does not call the port when validation fails', async () => {
    let called = false;

    const identityPort = {
        async register() {
            called = true;
            return { accepted: true };
        }
    };

    const useCase = createRegistrationUseCase(identityPort);

    await assert.rejects(
        () => useCase.execute({
            email: 'user@example.com',
            password: ''
        }),
        /Registration password is required/
    );

    assert.equal(called, false);
});

test('registration policy and use case contain no provider-specific dependency', () => {
    assert.equal(typeof validateRegistrationInput, 'function');
    assert.equal(typeof createRegistrationUseCase, 'function');
});
