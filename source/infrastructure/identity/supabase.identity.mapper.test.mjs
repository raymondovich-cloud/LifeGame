// LifeGame 3.0 — Supabase Identity Mapper Tests
// Responsibility: verify provider-specific mapping without contacting Supabase.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
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

test('does not expose provider error details', () => {
    assert.throws(
        () => mapSupabaseRegistrationResult({
            data: null,
            error: {
                message: 'sensitive provider detail',
                code: 'provider_internal_code'
            }
        }),
        error => {
            assert.ok(error instanceof IdentityApplicationError);
            assert.equal(error.code, IDENTITY_ERROR_CODE.REGISTRATION_FAILED);
            assert.equal(error.message, 'Registration could not be completed.');
            assert.equal(error.message.includes('sensitive provider detail'), false);
            assert.equal(error.message.includes('provider_internal_code'), false);
            return true;
        }
    );
});

test('maps provider rate limiting to a stable application error', () => {
    const result = mapSupabaseError(
        { status: 429, message: 'provider detail' },
        IDENTITY_ERROR_CODE.REGISTRATION_FAILED,
        'Registration could not be completed.'
    );

    assert.ok(result instanceof IdentityApplicationError);
    assert.equal(result.code, IDENTITY_ERROR_CODE.RATE_LIMITED);
    assert.equal(result.message, 'Too many requests. Please try again later.');
});

test('does not leak provider error objects', () => {
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
