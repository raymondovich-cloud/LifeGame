// LifeGame 3.0 — Supabase Identity Mapper
// Version: 1.2
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

export function mapSupabaseLoginResult(response) {
    const { data, error } = response || {};

    if (error) {
        throw mapSupabaseError(
            error,
            IDENTITY_ERROR_CODE.AUTHENTICATION_FAILED,
            'Login could not be completed.'
        );
    }

    const user = data?.user ?? null;
    const session = data?.session ?? null;

    if (!user || !session) {
        throw new IdentityApplicationError(
            IDENTITY_ERROR_CODE.AUTHENTICATION_FAILED,
            'Login could not be completed.'
        );
    }

    return Object.freeze({
        userId: user.id,
        authenticated: true
    });
}

export function mapSupabaseSessionResult(response) {
    const { data, error } = response || {};

    if (error) {
        throw mapSupabaseError(
            error,
            IDENTITY_ERROR_CODE.SESSION_FAILED,
            'Authentication state could not be verified.'
        );
    }

    return Object.freeze({
        session: data?.session ?? null
    });
}

export function mapSupabaseVerificationResult(response) {
    const { error } = response || {};

    if (error) {
        throw mapSupabaseError(
            error,
            IDENTITY_ERROR_CODE.VERIFICATION_FAILED,
            'Verification email could not be sent.'
        );
    }

    return Object.freeze({
        sent: true
    });
}

export function mapSupabaseError(error, fallbackCode, fallbackMessage) {
    if (error?.status === 429) {
        return new IdentityApplicationError(
            IDENTITY_ERROR_CODE.RATE_LIMITED,
            'Too many requests. Please wait before trying again.'
        );
    }

    if (
        error?.code === 'email_not_confirmed' ||
        error?.message?.toLowerCase().includes('email not confirmed')
    ) {
        return new IdentityApplicationError(
            IDENTITY_ERROR_CODE.EMAIL_NOT_CONFIRMED,
            'Email address is not confirmed yet.'
        );
    }

    return new IdentityApplicationError(
        fallbackCode,
        fallbackMessage
    );
}
