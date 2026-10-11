// root.js — Version 3.2
// LifeGame 3.0 — Web Composition Root
// Responsibility: compose concrete Infrastructure with Application and Presentation.
// Module-specific application dependencies are loaded lazily so one broken optional
// module cannot prevent authentication or the rest of the web application from booting.

import { createLifeGameSupabaseClient } from "../../../source/infrastructure/supabase/supabase.client.js";
import { createIdentityApplication } from "../../../source/application/identity/identity.js";
import { createSupabaseIdentityAdapter } from "../../../source/infrastructure/identity/supabase.identity.adapter.js";
import { createAuthController } from "../../../source/presentation/auth/auth.controller.js";
import { createUserContext } from "../../../source/application/user/user.context.js";
import { createProfileApplication } from "../../../source/application/profile/profile.js";
import { createTrainingOverviewApi } from "../../../source/infrastructure/supabase/training-overview.api.js";
import { createTrainingSessionApi } from "../../../source/infrastructure/supabase/training-session.api.js";
import { createTrainingSessionWorkflow } from "../../../source/application/training/training-session-workflow.js";
import { createSupabaseProfileAdapter } from "../../../source/infrastructure/supabase/profile.adapter.js";

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
    const lifeSystemApplicationByUser = new Map();
    const trainingOverviewApplicationByUser = new Map();
    const trainingOverviewApi = createTrainingOverviewApi({ client: supabaseClient });
    const trainingSessionApi = createTrainingSessionApi({ client: supabaseClient });
    const trainingSessionApplicationByUser = new Map();
    let trainingOverviewModulePromise = null;

    let financeModulePromise = null;
    let healthModulePromise = null;
    let developmentModulePromise = null;
    let lifeSystemModulePromise = null;

    async function loadFinanceModule() {
        financeModulePromise ??= Promise.all([
            import("../../../source/infrastructure/supabase/finance.memory.supabase.js"),
            import("../../../source/application/finance/finance.memory.port.js"),
            import("../../../source/application/finance/finance.js")
        ]).then(([memoryModule, portModule, applicationModule]) => ({
            createSupabaseFinanceMemory: memoryModule.createSupabaseFinanceMemory,
            createFinanceMemoryPort: portModule.createFinanceMemoryPort,
            createFinanceApplication: applicationModule.createFinanceApplication
        }));
        return financeModulePromise;
    }

    async function loadHealthModule() {
        healthModulePromise ??= Promise.all([
            import("../../../source/infrastructure/supabase/health.memory.supabase.js"),
            import("../../../source/application/health/health.memory.port.js"),
            import("../../../source/application/health/health.js")
        ]).then(([memoryModule, portModule, applicationModule]) => ({
            createSupabaseHealthMemory: memoryModule.createSupabaseHealthMemory,
            createHealthMemoryPort: portModule.createHealthMemoryPort,
            createHealthApplication: applicationModule.createHealthApplication
        }));
        return healthModulePromise;
    }

    async function loadDevelopmentModule() {
        developmentModulePromise ??= Promise.all([
            import("../../../source/infrastructure/supabase/development.memory.supabase.js"),
            import("../../../source/application/development/development.memory.port.js"),
            import("../../../source/application/development/development.js")
        ]).then(([memoryModule, portModule, applicationModule]) => ({
            createSupabaseDevelopmentMemory: memoryModule.createSupabaseDevelopmentMemory,
            createDevelopmentMemoryPort: portModule.createDevelopmentMemoryPort,
            createDevelopmentApplication: applicationModule.createDevelopmentApplication
        }));
        return developmentModulePromise;
    }

    async function loadTrainingOverviewModule() {
        trainingOverviewModulePromise ??= Promise.all([
            import("../../../source/application/training/load-training-overview.js"),
            import("../../../source/application/training/training-overview.read-model.js")
        ]).then(([applicationModule, readModelModule]) => ({
            createLoadTrainingOverview: applicationModule.createLoadTrainingOverview,
            createTrainingOverviewReadModel: readModelModule.createTrainingOverviewReadModel
        }));
        return trainingOverviewModulePromise;
    }

    async function createTrainingSessionApplicationForUser(userId) {
        const normalizedUserId = String(userId ?? "").trim();
        if (!normalizedUserId) throw new Error("LifeGame Web: authenticated user id is required.");
        if (!trainingSessionApplicationByUser.has(normalizedUserId)) {
            const userContext = createUserContext(normalizedUserId);
            const workflow = createTrainingSessionWorkflow({ api: trainingSessionApi });
            trainingSessionApplicationByUser.set(normalizedUserId, Object.freeze({
                startWorkout: ({ workout } = {}) => workflow.startWorkout({ userContext, workout }),
                recordSet: (input = {}) => workflow.recordSet({ ...input, userContext }),
                completeWorkout: (input = {}) => workflow.completeWorkout({ ...input, userContext })
            }));
        }
        return trainingSessionApplicationByUser.get(normalizedUserId);
    }

    async function createTrainingOverviewApplicationForUser(userId) {
        const normalizedUserId = String(userId ?? "").trim();
        if (!normalizedUserId) throw new Error("LifeGame Web: authenticated user id is required.");
        if (!trainingOverviewApplicationByUser.has(normalizedUserId)) {
            const { createLoadTrainingOverview, createTrainingOverviewReadModel } = await loadTrainingOverviewModule();
            const userContext = createUserContext(normalizedUserId);
            const loader = createLoadTrainingOverview({
                api: trainingOverviewApi,
                readModel: createTrainingOverviewReadModel()
            });
            trainingOverviewApplicationByUser.set(normalizedUserId, Object.freeze({
                execute: () => loader.execute({ userContext })
            }));
        }
        return trainingOverviewApplicationByUser.get(normalizedUserId);
    }

    async function loadLifeSystemModule() {
        lifeSystemModulePromise ??= import("../../../source/application/life-system/life-system.js");
        return lifeSystemModulePromise;
    }

    async function createFinanceApplicationForUser(userId) {
        const normalizedUserId = String(userId ?? "").trim();
        if (!normalizedUserId) {
            throw new Error("LifeGame Web: authenticated user id is required.");
        }

        if (!financeApplicationByUser.has(normalizedUserId)) {
            const {
                createSupabaseFinanceMemory,
                createFinanceMemoryPort,
                createFinanceApplication
            } = await loadFinanceModule();

            const userContext = createUserContext(normalizedUserId);
            const memory = createSupabaseFinanceMemory({
                client: supabaseClient,
                userContext
            });

            await memory.hydrate();

            financeApplicationByUser.set(
                normalizedUserId,
                createFinanceApplication({
                    memory: createFinanceMemoryPort(memory)
                })
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
            const {
                createSupabaseHealthMemory,
                createHealthMemoryPort,
                createHealthApplication
            } = await loadHealthModule();

            const userContext = createUserContext(normalizedUserId);
            const memory = createSupabaseHealthMemory({
                client: supabaseClient,
                userContext
            });

            await memory.hydrate();

            healthApplicationByUser.set(
                normalizedUserId,
                createHealthApplication({
                    memory: createHealthMemoryPort(memory)
                })
            );
        }

        return healthApplicationByUser.get(normalizedUserId);
    }

    async function createDevelopmentApplicationForUser(userId) {
        const normalizedUserId = String(userId ?? "").trim();
        if (!normalizedUserId) {
            throw new Error("LifeGame Web: authenticated user id is required.");
        }

        if (!developmentApplicationByUser.has(normalizedUserId)) {
            const {
                createSupabaseDevelopmentMemory,
                createDevelopmentMemoryPort,
                createDevelopmentApplication
            } = await loadDevelopmentModule();

            const userContext = createUserContext(normalizedUserId);
            const memory = createSupabaseDevelopmentMemory({
                client: supabaseClient,
                userContext
            });

            await memory.hydrate();

            developmentApplicationByUser.set(
                normalizedUserId,
                createDevelopmentApplication({
                    memory: createDevelopmentMemoryPort(memory)
                })
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
                const normalizedUserId = String(userId ?? "").trim();
                financeApplicationByUser.delete(normalizedUserId);
            }
        }),
        health: Object.freeze({
            createApplicationForUser: createHealthApplicationForUser,
            clearForUser(userId) {
                const normalizedUserId = String(userId ?? "").trim();
                healthApplicationByUser.delete(normalizedUserId);
            }
        }),
        development: Object.freeze({
            createApplicationForUser: createDevelopmentApplicationForUser,
            clearForUser(userId) {
                const normalizedUserId = String(userId ?? "").trim();
                developmentApplicationByUser.delete(normalizedUserId);
            }
        }),
        trainingSessions: Object.freeze({
            createApplicationForUser: createTrainingSessionApplicationForUser,
            clearForUser(userId) {
                trainingSessionApplicationByUser.delete(String(userId ?? "").trim());
            }
        }),
        trainingOverview: Object.freeze({
            createApplicationForUser: createTrainingOverviewApplicationForUser,
            clearForUser(userId) {
                trainingOverviewApplicationByUser.delete(String(userId ?? "").trim());
            }
        }),
        lifeSystem: Object.freeze({
            async createApplicationForUser(userId) {
                const normalizedUserId = String(userId ?? "").trim();
                if (!normalizedUserId) {
                    throw new Error("LifeGame Web: authenticated user id is required.");
                }

                if (!lifeSystemApplicationByUser.has(normalizedUserId)) {
                    const [
                        finance,
                        health,
                        development,
                        lifeSystemModule
                    ] = await Promise.all([
                        createFinanceApplicationForUser(normalizedUserId),
                        createHealthApplicationForUser(normalizedUserId),
                        createDevelopmentApplicationForUser(normalizedUserId),
                        loadLifeSystemModule()
                    ]);

                    lifeSystemApplicationByUser.set(
                        normalizedUserId,
                        lifeSystemModule.createLifeSystemApplication({
                            finance,
                            health,
                            development
                        })
                    );
                }

                return lifeSystemApplicationByUser.get(normalizedUserId);
            }
        })
    });
}
