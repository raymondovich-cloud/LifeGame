// source/application/training/load-training-overview.test.mjs — Version 1.0
import test from "node:test";
import assert from "node:assert/strict";
import { createLoadTrainingOverview } from "./load-training-overview.js";

test("loads program and history concurrently and derives the read model", async () => {
    let programCalled = false;
    let sessionsCalled = false;
    const program = { id: "program-1" };
    const session = { id: "session-1", status: "completed" };
    const api = {
        async getProgram() { programCalled = true; return { program, revision: 2 }; },
        async listSessions() { sessionsCalled = true; return [{ session, revision: 1 }]; }
    };
    const readModel = {
        execute(input) {
            assert.equal(input.program, program);
            assert.deepEqual(input.sessions, [session]);
            return { program: { currentWeek: 2 }, previousWorkout: null };
        }
    };
    const loader = createLoadTrainingOverview({ api, readModel });
    const result = await loader.execute({ userContext: { userId: "user-1" } });
    assert.equal(programCalled, true);
    assert.equal(sessionsCalled, true);
    assert.equal(result.program.currentWeek, 2);
});

test("preserves a truthful empty state when no program exists", async () => {
    const loader = createLoadTrainingOverview({
        api: { async getProgram() { return null; }, async listSessions() { return []; } },
        readModel: { execute(input) { return input; } }
    });
    assert.deepEqual(await loader.execute({ userContext: { userId: "user-1" } }), {
        program: null, sessions: []
    });
});

test("requires authenticated context and valid session results", async () => {
    const loader = createLoadTrainingOverview({
        api: { async getProgram() { return null; }, async listSessions() { return null; } },
        readModel: { execute() { return null; } }
    });
    await assert.rejects(loader.execute(), /authenticated user context/);
    await assert.rejects(loader.execute({ userContext: { userId: "user-1" } }), /session read port/);
});
