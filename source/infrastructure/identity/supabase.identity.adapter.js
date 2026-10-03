// LifeGame 3.0 — Supabase Identity Adapter
// Version: 1.4
// Responsibility: translate Supabase Auth operations into IdentityPort.
//
// This file is the ONLY Identity infrastructure boundary that may know
// about the Supabase Auth client. Domain code must never import it.
//
// Provider-specific responses and errors are normalized before leaving
// Infrastructure.
//
// redirectTo is supplied by the platform composition root. The adapter
// never decides which public URL a platform should use.

import {
    mapSupabaseError,
    mapSupabaseLoginResult,
    mapSupabaseRegistrationResult,
    mapSupabaseSessionResult,
    mapSupabaseVerificationResult
} from './supabase.identity.mapper.js';

export function createSupabaseIdentityAdapter(supabaseAuthClient, options = {}) {
    if (!supabaseAuthClient) {
        throw new Error('Supabase Auth client is required.');
    }

    const { emailRedirectTo } = options;

    return Object.freeze({
        async register({ email, password }) {
            const response = await supabaseAuthClient.signUp({
                email,
                password,
                ...(emailRedirectTo
                    ? { options: { emailRedirectTo } }
                    : {})
            });

            return mapSupabaseRegistrationResult(response);
        },

        async login({ email, password }) {
            const response = await supabaseAuthClient.signInWithPassword({
                email,
                password
            });

            return mapSupabaseLoginResult(response);
        },

        async logout() {
            const response = await supabaseAuthClient.signOut();

            if (response?.error) {
                throw mapSupabaseError(
                    response.error,
                    'IDENTITY_SESSION_FAILED',
                    'Logout could not be completed.'
                );
            }

            return Object.freeze({ authenticated: false });
        },

        async getCurrentSession() {
            return mapSupabaseSessionResult(
                await supabaseAuthClient.getSession()
            );
        },

        async requestPasswordReset({ email, redirectTo }) {
            const response = await supabaseAuthClient.resetPasswordForEmail(
                email,
                { redirectTo }
            );

            if (response?.error) {
                throw mapSupabaseError(
                    response.error,
                    'IDENTITY_PASSWORD_RESET_FAILED',
                    'Password reset could not be requested.'
                );
            }

            return Object.freeze({ sent: true });
        },

        async updatePassword({ password }) {
            const response = await supabaseAuthClient.updateUser({ password });

            if (response?.error) {
                throw mapSupabaseError(
                    response.error,
                    'IDENTITY_PASSWORD_UPDATE_FAILED',
                    'Password could not be updated.'
                );
            }

            return Object.freeze({ updated: true });
        },

        async resendVerification({ email }) {
            return mapSupabaseVerificationResult(
                await supabaseAuthClient.resend({
                    type: 'signup',
                    email,
                    ...(emailRedirectTo
                        ? { options: { emailRedirectTo } }
                        : {})
                })
            );
        }
    });
}
