// LifeGame 3.0 — Supabase Identity Adapter Tests
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

test('registration calls Supabase signUp with the supplied credentials', async () => {
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

    const adapter = createSupabaseIdentityAdapter(supabaseAuthClient);

    const result = await adapter.register({
        email: 'user@example.com',
        password: 'ValidPassword123!'
    });

    assert.deepEqual(received, {
        email: 'user@example.com',
        password: 'ValidPassword123!'
    });

    assert.deepEqual(result, {
        userId: 'user-1',
        status: IDENTITY_REGISTRATION_STATUS.PENDING_EMAIL_VERIFICATION,
        sessionEstablished: false
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

test('adapter requires a Supabase Auth client', () => {
    assert.throws(
        () => createSupabaseIdentityAdapter(),
        /Supabase Auth client is required/
    );
});
