// LifeGame 3.0 — Supabase Identity Adapter
// Version: 1.3
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
    mapSupabaseRegistrationResult
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
            return supabaseAuthClient.signOut();
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
                email,
                ...(emailRedirectTo
                    ? { options: { emailRedirectTo } }
                    : {})
            });
        }
    });
}
