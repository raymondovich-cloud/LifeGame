// source/infrastructure/supabase/training-overview.api.test.mjs — Version 1.0
import test from "node:test";
import assert from "node:assert/strict";
import { createTrainingOverviewApi } from "./training-overview.api.js";

test("uses authenticated Edge Function actions and unwraps server envelopes", async () => {
    const calls = [];
    const api = createTrainingOverviewApi({
        client: { functions: { async invoke(name, options) {
            calls.push({ name, options });
            return name === "training-programs"
                ? { data: { data: { program: { id: "p-1" }, revision: 2 } }, error: null }
                : { data: { data: [{ session: { id: "s-1" }, revision: 1 }] }, error: null };
        } } }
    });
    assert.deepEqual(await api.getProgram(), { program: { id: "p-1" }, revision: 2 });
    assert.deepEqual(await api.listSessions(), [{ session: { id: "s-1" }, revision: 1 }]);
    assert.deepEqual(calls.map((call) => [call.name, call.options.body]), [
        ["training-programs", { action: "get" }],
        ["training-sessions", { action: "list" }]
    ]);
});

test("keeps transport errors generic and does not expose provider messages", async () => {
    const api = createTrainingOverviewApi({
        client: { functions: { async invoke() {
            return { data: null, error: new Error("sensitive internal provider details") };
        } } }
    });
    await assert.rejects(api.getProgram(), (error) =>
        error.code === "TRAINING_OVERVIEW_API_UNAVAILABLE" &&
        !error.message.includes("sensitive internal provider details"));
});

test("rejects malformed server responses", async () => {
    const api = createTrainingOverviewApi({
        client: { functions: { async invoke() { return { data: { data: "unexpected" }, error: null }; } } }
    });
    await assert.rejects(api.getProgram(), (error) => error.code === "TRAINING_OVERVIEW_API_INVALID_RESPONSE");
});
