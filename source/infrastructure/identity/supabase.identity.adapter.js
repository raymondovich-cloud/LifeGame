// LifeGame 3.0 — Supabase Identity Adapter
// Version: 1.2
// Responsibility: translate Supabase Auth operations into IdentityPort.
//
// This file is the ONLY Identity infrastructure boundary that may know
// about the Supabase Auth client. Domain code must never import it.
//
// Provider-specific responses and errors are normalized before leaving
// Infrastructure.

import {
    mapSupabaseError,
    mapSupabaseLoginResult,
    mapSupabaseRegistrationResult
} from './supabase.identity.mapper.js';

export function createSupabaseIdentityAdapter(supabaseAuthClient) {
    if (!supabaseAuthClient) {
        throw new Error('Supabase Auth client is required.');
    }

    return Object.freeze({
        async register({ email, password }) {
            const response = await supabaseAuthClient.signUp({
                email,
                password
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
                    'IDENTITY_AUTHENTICATION_FAILED',
                    'Logout could not be completed.'
                );
            }

            return Object.freeze({ success: true });
        },

        async getCurrentSession() {
            return supabaseAuthClient.getSession();
        },

        async requestPasswordReset({ email, redirectTo }) {
            return supabaseAuthClient.resetPasswordForEmail(email, {
                redirectTo
            });
        },

        async updatePassword({ password }) {
            return supabaseAuthClient.updateUser({ password });
        },

        async resendVerification({ email }) {
            return supabaseAuthClient.resend({
                type: 'signup',
                email
            });
        }
    });
}
