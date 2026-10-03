// LifeGame 3.0 — Supabase Identity Mapper Tests
// Version: 1.1
// Responsibility: verify provider-specific mapping without contacting Supabase.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
    mapSupabaseLoginResult,
    mapSupabaseRegistrationResult,
    mapSupabaseError
} from './supabase.identity.mapper.js';

import {
    IDENTITY_REGISTRATION_STATUS
} from '../../application/identity/identity.result.js';

import {
    IdentityApplicationError,
    IDENTITY_ERROR_CODE
} from '../../application/identity/identity.error.js';

test('maps verified registration with active session', () => {
    const result = mapSupabaseRegistrationResult({
        data: {
            user: { id: 'user-1' },
            session: { access_token: 'provider-secret' }
        },
        error: null
    });

    assert.deepEqual(result, {
        userId: 'user-1',
        status: IDENTITY_REGISTRATION_STATUS.ACTIVE,
        sessionEstablished: true
    });
});

test('maps registration requiring email verification', () => {
    const result = mapSupabaseRegistrationResult({
        data: {
            user: { id: 'user-2' },
            session: null
        },
        error: null
    });

    assert.deepEqual(result, {
        userId: 'user-2',
        status: IDENTITY_REGISTRATION_STATUS.PENDING_EMAIL_VERIFICATION,
        sessionEstablished: false
    });
});

test('maps successful login without exposing session tokens', () => {
    const result = mapSupabaseLoginResult({
        data: {
            user: { id: 'user-login' },
            session: { access_token: 'must-not-cross-boundary' }
        },
        error: null
    });

    assert.deepEqual(result, {
        userId: 'user-login',
        authenticated: true
    });

    assert.equal('access_token' in result, false);
});

test('maps failed login to a provider-independent authentication error', () => {
    assert.throws(
        () => mapSupabaseLoginResult({
            data: null,
            error: {
                message: 'invalid credentials provider detail',
                code: 'provider-specific-code'
            }
        }),
        error => {
            assert.ok(error instanceof IdentityApplicationError);
            assert.equal(error.code, IDENTITY_ERROR_CODE.AUTHENTICATION_FAILED);
            assert.equal(error.message, 'Login could not be completed.');
            assert.equal(error.message.includes('provider-specific'), false);
            return true;
        }
    );
});

test('rejects a login response without an authenticated session', () => {
    assert.throws(
        () => mapSupabaseLoginResult({
            data: {
                user: { id: 'user-login' },
                session: null
            },
            error: null
        }),
        error => {
            assert.ok(error instanceof IdentityApplicationError);
            assert.equal(error.code, IDENTITY_ERROR_CODE.AUTHENTICATION_FAILED);
            return true;
        }
    );
});

test('does not expose provider error objects', () => {
    const providerError = { message: 'private provider detail' };

    const result = mapSupabaseError(
        providerError,
        IDENTITY_ERROR_CODE.REGISTRATION_FAILED,
        'Registration could not be completed.'
    );

    assert.notEqual(result, providerError);
    assert.equal(result instanceof IdentityApplicationError, true);
    assert.equal(result.message, 'Registration could not be completed.');
});
