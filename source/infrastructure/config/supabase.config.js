// LifeGame 3.0 — Supabase Client Configuration
// Version: 1.0
// Responsibility: define public browser configuration for the Supabase client.
//
// This file may contain:
// - Supabase Project URL
// - Supabase Publishable Key
//
// This file must NEVER contain:
// - Supabase Secret Key
// - service_role key
// - passwords
// - encryption keys
// - access tokens
//
// Publishable keys are intentionally public client configuration.
// Authorization and data isolation are enforced by Supabase Auth + RLS.

export const SUPABASE_CONFIG = Object.freeze({
    url: "https://ewwpnahjhqcbtfszthhc.supabase.co",
    publishableKey: "sb_publishable_x6dcpZ70rZ5FsOcShf3Fxg_pbXHFzYm"
});
