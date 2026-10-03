// LifeGame 3.0 — Identity Login Tests
// Version: 1.0
// Responsibility: verify Login validation and application boundary.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
    createLoginUseCase,
    validateLoginInput
} from './login.js';

test('login rejects missing input', () => {
    assert.throws(
        () => validateLoginInput(),
        /Login input is required/
    );
});

test('login rejects missing email', () => {
    assert.throws(
        () => validateLoginInput({ password: 'ValidPassword123!' }),
        /Login email is required/
    );
});

test('login rejects missing password', () => {
    assert.throws(
        () => validateLoginInput({ email: 'user@example.com' }),
        /Login password is required/
    );
});

test('login trims email but preserves password exactly', () => {
    const result = validateLoginInput({
        email: '  user@example.com  ',
        password: ' Valid Password 123! '
    });

    assert.equal(result.email, 'user@example.com');
    assert.equal(result.password, ' Valid Password 123! ');
});

test('login use case delegates only validated data to the port', async () => {
    let received = null;

    const identityPort = {
        async login(input) {
            received = input;
            return { userId: 'user-1', authenticated: true };
        }
    };

    const useCase = createLoginUseCase(identityPort);

    const result = await useCase.execute({
        email: '  user@example.com  ',
        password: 'ValidPassword123!'
    });

    assert.deepEqual(received, {
        email: 'user@example.com',
        password: 'ValidPassword123!'
    });
    assert.deepEqual(result, {
        userId: 'user-1',
        authenticated: true
    });
});

test('login use case does not call the port when validation fails', async () => {
    let called = false;

    const identityPort = {
        async login() {
            called = true;
            return { authenticated: true };
        }
    };

    const useCase = createLoginUseCase(identityPort);

    await assert.rejects(
        () => useCase.execute({
            email: 'user@example.com',
            password: ''
        }),
        /Login password is required/
    );

    assert.equal(called, false);
});
