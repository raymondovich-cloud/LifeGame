// root.js — Version 2.0
// LifeGame 3.0 — Web Composition Root
// Responsibility: compose concrete Infrastructure with Application and Presentation.

import { createIdentityApplication } from "../../../source/application/identity/identity.js";
import { createSupabaseIdentityAdapter } from "../../../source/infrastructure/identity/supabase.identity.adapter.js";
import { createLifeGameSupabaseClient } from "../../../source/infrastructure/supabase/supabase.client.js";
import { createAuthController } from "../../../source/presentation/auth/auth.controller.js";
import { createUserContext } from "../../../source/application/user/user.context.js";
import { createSupabaseFinanceMemory } from "../../../source/infrastructure/supabase/finance.memory.supabase.js";
import { createFinanceMemoryPort } from "../../../source/application/finance/finance.memory.port.js";
import { createFinanceApplication } from "../../../source/application/finance/finance.js";
import { createProfileApplication } from "../../../source/application/profile/profile.js";
import { createSupabaseProfileAdapter } from "../../../source/infrastructure/supabase/profile.adapter.js";
import { createSupabaseHealthMemory } from "../../../source/infrastructure/supabase/health.memory.supabase.js";
import { createHealthMemoryPort } from "../../../source/application/health/health.memory.port.js";
import { createHealthApplication } from "../../../source/application/health/health.js";
import { createSupabaseDevelopmentMemory } from "../../../source/infrastructure/supabase/development.memory.supabase.js";
import { createDevelopmentMemoryPort } from "../../../source/application/development/development.memory.port.js";
import { createDevelopmentApplication } from "../../../source/application/development/development.js";
import { createLifeSystemApplication } from "../../../source/application/life-system/life-system.js";

function getAuthenticationRedirectUrl() {
    const { origin, pathname } = window.location;
    return origin + pathname;
}

export function createWebApplication() {
    const supabaseClient = createLifeGameSupabaseClient();

    const identityPort = createSupabaseIdentityAdapter(
        supabaseClient.auth,
        { emailRedirectTo: getAuthenticationRedirectUrl() }
    );

    const identityApplication = createIdentityApplication(identityPort);
    const authController = createAuthController(identityApplication);
    const profileAdapter = createSupabaseProfileAdapter(supabaseClient);
    const profileApplication = createProfileApplication(profileAdapter);
    const financeApplicationByUser = new Map();
    const healthApplicationByUser = new Map();
    const developmentApplicationByUser = new Map();

    async function createFinanceApplicationForUser(userId) {
        const normalizedUserId = String(userId ?? "").trim();
        if (!normalizedUserId) {
            throw new Error("LifeGame Web: authenticated user id is required.");
        }

        if (!financeApplicationByUser.has(normalizedUserId)) {
            const userContext = createUserContext(normalizedUserId);
            const memory = createSupabaseFinanceMemory({
                client: supabaseClient,
                userContext
            });
            await memory.hydrate();
            const financeMemory = createFinanceMemoryPort(memory);
            financeApplicationByUser.set(
                normalizedUserId,
                createFinanceApplication({ memory: financeMemory })
            );
        }

        return financeApplicationByUser.get(normalizedUserId);
    }

    async function createHealthApplicationForUser(userId) {
        const normalizedUserId = String(userId ?? "").trim();
        if (!normalizedUserId) {
            throw new Error("LifeGame Web: authenticated user id is required.");
        }

        if (!healthApplicationByUser.has(normalizedUserId)) {
            const userContext = createUserContext(normalizedUserId);
            const memory = createSupabaseHealthMemory({
                client: supabaseClient,
                userContext
            });
            await memory.hydrate();
            const healthMemory = createHealthMemoryPort(memory);

            healthApplicationByUser.set(
                normalizedUserId,
                createHealthApplication({ memory: healthMemory })
            );
        }

        return healthApplicationByUser.get(normalizedUserId);
    }

    async function createDevelopmentApplicationForUser(userId) {
        const normalizedUserId = String(userId ?? "").trim();
        if (!normalizedUserId) throw new Error("LifeGame Web: authenticated user id is required.");

        if (!developmentApplicationByUser.has(normalizedUserId)) {
            const userContext = createUserContext(normalizedUserId);
            const memory = createSupabaseDevelopmentMemory({ client: supabaseClient, userContext });
            await memory.hydrate();
            const developmentMemory = createDevelopmentMemoryPort(memory);
            developmentApplicationByUser.set(
                normalizedUserId,
                createDevelopmentApplication({ memory: developmentMemory })
            );
        }

        return developmentApplicationByUser.get(normalizedUserId);
    }

    return Object.freeze({
        auth: authController,
        profile: profileApplication,
        finance: Object.freeze({
            createApplicationForUser: createFinanceApplicationForUser,
            clearForUser(userId) {
                financeApplicationByUser.delete(String(userId ?? "").trim());
            }
        }),
        health: Object.freeze({
            createApplicationForUser: createHealthApplicationForUser,
            clearForUser(userId) {
                healthApplicationByUser.delete(String(userId ?? "").trim());
            }
        }),
        development: Object.freeze({
            createApplicationForUser: createDevelopmentApplicationForUser,
            clearForUser(userId) {
                developmentApplicationByUser.delete(String(userId ?? "").trim());
            }
        }),
        lifeSystem: Object.freeze({
            async createApplicationForUser(userId) {
                const [finance, health, development] = await Promise.all([
                    createFinanceApplicationForUser(userId),
                    createHealthApplicationForUser(userId),
                    createDevelopmentApplicationForUser(userId)
                ]);
                return createLifeSystemApplication({ finance, health, development });
            }
        })
    });
}
