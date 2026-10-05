// user.context.test.mjs — Version 1.0

import test from "node:test";
import assert from "node:assert/strict";

import { createUserContext } from "./user.context.js";

test("UserContext requires userId", () => {
    assert.throws(
        () => createUserContext(""),
        /userId is required/
    );
});

test("UserContext exposes only normalized userId", () => {
    const context = createUserContext("  user-1  ");

    assert.deepEqual(context, { userId: "user-1" });
    assert.equal(Object.isFrozen(context), true);
});
