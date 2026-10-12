// source/application/training/load-training-overview.js — Version 1.0
// Responsibility: orchestrate private program/history reads and derive the Training Overview read model.
function createLoadTrainingOverview({ api, readModel } = {}) {
    if (!api || typeof api.getProgram !== "function" || typeof api.listSessions !== "function") {
        throw new TypeError("Load Training Overview: program and session read ports are required.");
    }
    if (!readModel || typeof readModel.execute !== "function") {
        throw new TypeError("Load Training Overview: readModel.execute is required.");
    }

    async function execute({ userContext } = {}) {
        if (typeof userContext?.userId !== "string" || !userContext.userId.trim()) {
            throw new TypeError("Load Training Overview: authenticated user context is required.");
        }
        const [programResult, sessionResults] = await Promise.all([
            api.getProgram(),
            api.listSessions()
        ]);
        if (!Array.isArray(sessionResults)) {
            throw new TypeError("Load Training Overview: session read port must return an array.");
        }
        return readModel.execute({
            program: programResult?.program ?? null,
            sessions: sessionResults.map((result) => result.session)
        });
    }

    return Object.freeze({ execute });
}

export { createLoadTrainingOverview };
