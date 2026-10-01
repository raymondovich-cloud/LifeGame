// LifeGame 3.0 — Supabase Client
// Version: 1.0
// Responsibility: construct the single browser Supabase client.
//
// This is Infrastructure.
// No Domain or Application module may import this file.
//
// The SDK version is pinned intentionally. Dependency upgrades must be
// reviewed and tested rather than following a floating major-version URL.

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.1/+esm";
import { SUPABASE_CONFIG } from "../config/supabase.config.js";

export function createLifeGameSupabaseClient() {
    const { url, publishableKey } = SUPABASE_CONFIG;

    if (!url || !publishableKey) {
        throw new Error("LifeGame Supabase configuration is incomplete.");
    }

    return createClient(url, publishableKey, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
        }
    });
}
