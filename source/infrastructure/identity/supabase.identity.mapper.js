// LifeGame 3.0 — Supabase Identity Mapper
// Version: 1.0
// Responsibility: translate Supabase-specific results/errors into
// provider-independent Identity application contracts.
//
// This file may know Supabase error fields. Nothing above Infrastructure may.

import {
    createRegistrationResult,
    IDENTITY_REGISTRATION_STATUS
} from '../../application/identity/identity.result.js';

import {
    IdentityApplicationError,
    IDENTITY_ERROR_CODE
} from '../../application/identity/identity.error.js';

function mapRegistrationStatus(user, session) {
    if (session) {
        return IDENTITY_REGISTRATION_STATUS.ACTIVE;
    }

    if (user) {
        return IDENTITY_REGISTRATION_STATUS.PENDING_EMAIL_VERIFICATION;
    }

    throw new IdentityApplicationError(
        IDENTITY_ERROR_CODE.REGISTRATION_FAILED,
        'Registration could not be completed.'
    );
}

export function mapSupabaseRegistrationResult(response) {
    const { data, error } = response || {};

    if (error) {
        throw mapSupabaseError(
            error,
            IDENTITY_ERROR_CODE.REGISTRATION_FAILED,
            'Registration could not be completed.'
        );
    }

    const user = data?.user ?? null;
    const session = data?.session ?? null;

    return createRegistrationResult({
        userId: user?.id ?? null,
        status: mapRegistrationStatus(user, session),
        sessionEstablished: Boolean(session)
    });
}

export function mapSupabaseError(error, fallbackCode, fallbackMessage) {
    if (error?.status === 429) {
        return new IdentityApplicationError(
            IDENTITY_ERROR_CODE.RATE_LIMITED,
            'Too many requests. Please try again later.'
        );
    }

    return new IdentityApplicationError(
        fallbackCode,
        fallbackMessage
    );
}
