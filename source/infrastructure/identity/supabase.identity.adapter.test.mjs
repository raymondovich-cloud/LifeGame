// LifeGame 3.0 — Supabase Identity Adapter Tests
// Version: 1.4
// Responsibility: verify the Supabase adapter boundary without contacting Supabase.

import test from 'node:test';
import assert from 'node:assert/strict';

import { createSupabaseIdentityAdapter } from './supabase.identity.adapter.js';
import {
    IDENTITY_REGISTRATION_STATUS
} from '../../application/identity/identity.result.js';
import {
    IdentityApplicationError,
    IDENTITY_ERROR_CODE
} from '../../application/identity/identity.error.js';

test('registration calls Supabase signUp with credentials and redirect URL', async () => {
    let received = null;

    const supabaseAuthClient = {
        async signUp(input) {
            received = input;

            return {
                data: {
                    user: { id: 'user-1' },
                    session: null
                },
                error: null
            };
        }
    };

    const adapter = createSupabaseIdentityAdapter(supabaseAuthClient, {
        emailRedirectTo: 'https://raymondovich-cloud.github.io/LifeGame/'
    });

    const result = await adapter.register({
        email: 'user@example.com',
        password: 'ValidPassword123!',
        displayName: 'Test User',
        birthDate: '1990-01-15'
    });

    assert.deepEqual(received, {
        email: 'user@example.com',
        password: 'ValidPassword123!',
        options: {
            emailRedirectTo: 'https://raymondovich-cloud.github.io/LifeGame/',
            data: {
                display_name: 'Test User',
                birth_date: '1990-01-15'
            }
        }
    });

    assert.deepEqual(result, {
        userId: 'user-1',
        status: IDENTITY_REGISTRATION_STATUS.PENDING_EMAIL_VERIFICATION,
        sessionEstablished: false
    });
});

test('registration works without an optional redirect URL', async () => {
    let received = null;

    const supabaseAuthClient = {
        async signUp(input) {
            received = input;

            return {
                data: {
                    user: { id: 'user-redirect-optional' },
                    session: null
                },
                error: null
            };
        }
    };

    const adapter = createSupabaseIdentityAdapter(supabaseAuthClient);

    await adapter.register({
        email: 'user@example.com',
        password: 'ValidPassword123!',
        displayName: undefined,
        birthDate: undefined
    });

    assert.deepEqual(received, {
        email: 'user@example.com',
        password: 'ValidPassword123!',
        options: {
            data: {
                display_name: undefined,
                birth_date: undefined
            }
        }
    });
});

test('registration normalizes a Supabase registration error', async () => {
    const supabaseAuthClient = {
        async signUp() {
            return {
                data: null,
                error: {
                    message: 'provider-specific secret',
                    code: 'provider-specific-code'
                }
            };
        }
    };

    const adapter = createSupabaseIdentityAdapter(supabaseAuthClient);

    await assert.rejects(
        () => adapter.register({
            email: 'user@example.com',
            password: 'ValidPassword123!'
        }),
        error => {
            assert.ok(error instanceof IdentityApplicationError);
            assert.equal(error.code, IDENTITY_ERROR_CODE.REGISTRATION_FAILED);
            assert.equal(error.message, 'Registration could not be completed.');
            return true;
        }
    );
});

test('registration maps an established session without exposing provider session data', async () => {
    const supabaseAuthClient = {
        async signUp() {
            return {
                data: {
                    user: { id: 'user-3' },
                    session: {
                        access_token: 'must-not-cross-boundary'
                    }
                },
                error: null
            };
        }
    };

    const adapter = createSupabaseIdentityAdapter(supabaseAuthClient);

    const result = await adapter.register({
        email: 'user@example.com',
        password: 'ValidPassword123!'
    });

    assert.deepEqual(result, {
        userId: 'user-3',
        status: IDENTITY_REGISTRATION_STATUS.ACTIVE,
        sessionEstablished: true
    });

    assert.equal('access_token' in result, false);
});

test('login calls Supabase signInWithPassword with the supplied credentials', async () => {
    let received = null;

    const supabaseAuthClient = {
        async signInWithPassword(input) {
            received = input;

            return {
                data: {
                    user: { id: 'user-login' },
                    session: { access_token: 'provider-secret' }
                },
                error: null
            };
        }
    };

    const adapter = createSupabaseIdentityAdapter(supabaseAuthClient);

    const result = await adapter.login({
        email: 'user@example.com',
        password: 'ValidPassword123!'
    });

    assert.deepEqual(received, {
        email: 'user@example.com',
        password: 'ValidPassword123!'
    });

    assert.deepEqual(result, {
        userId: 'user-login',
        authenticated: true
    });
});

test('login normalizes a Supabase authentication error', async () => {
    const supabaseAuthClient = {
        async signInWithPassword() {
            return {
                data: null,
                error: {
                    message: 'provider-specific secret',
                    code: 'provider-specific-code'
                }
            };
        }
    };

    const adapter = createSupabaseIdentityAdapter(supabaseAuthClient);

    await assert.rejects(
        () => adapter.login({
            email: 'user@example.com',
            password: 'ValidPassword123!'
        }),
        error => {
            assert.ok(error instanceof IdentityApplicationError);
            assert.equal(error.code, IDENTITY_ERROR_CODE.AUTHENTICATION_FAILED);
            assert.equal(error.message, 'Login could not be completed.');
            return true;
        }
    );
});

test('adapter requires a Supabase Auth client', () => {
    assert.throws(
        () => createSupabaseIdentityAdapter(),
        /Supabase Auth client is required/
    );
});
test('logout calls Supabase signOut and returns an unauthenticated result', async () => {
    let called = 0;

    const supabaseAuthClient = {
        async signOut() {
            called += 1;
            return { error: null };
        }
    };

    const adapter = createSupabaseIdentityAdapter(supabaseAuthClient);

    const result = await adapter.logout();

    assert.equal(called, 1);
    assert.deepEqual(result, {
        authenticated: false
    });
});

test('logout normalizes a Supabase signOut error', async () => {
    const supabaseAuthClient = {
        async signOut() {
            return {
                error: {
                    message: 'provider-specific secret',
                    code: 'provider-specific-code'
                }
            };
        }
    };

    const adapter = createSupabaseIdentityAdapter(supabaseAuthClient);

    await assert.rejects(
        () => adapter.logout(),
        error => {
            assert.ok(error instanceof IdentityApplicationError);
            assert.equal(error.code, IDENTITY_ERROR_CODE.SESSION_FAILED);
            assert.equal(error.message, 'Logout could not be completed.');
            return true;
        }
    );
});

