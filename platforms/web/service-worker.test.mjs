// platforms/web/service-worker.test.mjs — Version 1.0
// Responsibility: verify Service Worker cache failure isolation and request policy without external dependencies.

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("./service-worker.js", import.meta.url), "utf8");

function response(body, headers = {}, options = {}) {
  return {
    body,
    ok: options.ok ?? true,
    type: options.type ?? "basic",
    headers: { get: name => headers[name.toLowerCase()] ?? null },
    clone() { return response(body, headers, options); },
  };
}

function harness(options = {}) {
  const listeners = new Map();
  const entries = new Map();
  let network = options.fetch ?? (async () => response("network"));
  let networkCalls = 0;
  let openCalls = 0;
  const cache = {
    async put(request, value) {
      if (options.putFails) throw new Error("Cache write failed");
      entries.set(request.url, value);
    },
    async match(request) {
      if (options.matchFails) throw new Error("Cache read failed");
      return entries.get(request.url);
    },
  };
  const self = {
    location: { origin: "https://lifegame.example" },
    clients: { claim: async () => {} },
    skipWaiting: async () => {},
    addEventListener: (name, listener) => listeners.set(name, listener),
  };
  vm.runInNewContext(source, {
    self, URL, Set, Promise,
    caches: {
      async open() {
        openCalls += 1;
        if (options.openFails) throw new Error("Cache open failed");
        return cache;
      },
      async keys() { return options.keys ?? ["lifegame-static-old", "lifegame-static-v1", "other-cache"]; },
      async delete() {},
    },
    fetch: async req => { networkCalls += 1; return network(req); },
  }, { filename: "service-worker.js" });

  const request = (path = "/assets/app.js", overrides = {}) => ({
    url: new URL(path, self.location.origin).href, method: "GET", destination: "script", ...overrides,
  });
  async function dispatch(req) {
    let promise;
    listeners.get("fetch")({ request: req, respondWith(value) { promise = value; } });
    return promise ? { intercepted: true, response: await promise } : { intercepted: false };
  }
  return {
    entries, request, dispatch, listeners, self,
    setNetwork(fn) { network = fn; },
    get networkCalls() { return networkCalls; },
    get openCalls() { return openCalls; },
  };
}

test("network-first request caches an eligible static asset", async () => {
  const h = harness();
  const result = await h.dispatch(h.request());
  assert.equal(result.response.body, "network");
  assert.equal(h.entries.size, 1);
});

test("a later successful network response refreshes the cache", async () => {
  const h = harness();
  await h.dispatch(h.request());
  h.setNetwork(async () => response("updated"));
  const result = await h.dispatch(h.request());
  assert.equal(result.response.body, "updated");
  assert.equal(h.entries.get(h.request().url).body, "updated");
});

test("Cache Storage open failure does not block network access", async () => {
  const h = harness({ openFails: true });
  const result = await h.dispatch(h.request());
  assert.equal(result.response.body, "network");
  assert.equal(h.networkCalls, 1);
});

test("cache write failure does not replace a successful network response", async () => {
  const h = harness({ putFails: true });
  const result = await h.dispatch(h.request());
  assert.equal(result.response.body, "network");
});

test("cached asset is used only when the network fails", async () => {
  const h = harness();
  const req = h.request();
  h.entries.set(req.url, response("cached"));
  h.setNetwork(async () => { throw new Error("Offline"); });
  const result = await h.dispatch(req);
  assert.equal(result.response.body, "cached");
});

test("offline without a cache preserves the original network error", async () => {
  const h = harness();
  const failure = new Error("Offline");
  h.setNetwork(async () => { throw failure; });
  await assert.rejects(h.dispatch(h.request()), error => error === failure);
});

test("private and non-storable cache directives are not cached", async t => {
  for (const directive of ["private", "no-store", "no-cache", "public, no-store", "max-age=0, PRIVATE"]) {
    await t.test(directive, async () => {
      const h = harness({ fetch: async () => response("network", { "cache-control": directive }) });
      await h.dispatch(h.request());
      assert.equal(h.entries.size, 0);
    });
  }
});

test("Vary wildcard, opaque, and unsuccessful responses are not cached", async () => {
  for (const value of [
    response("vary", { vary: "*" }),
    response("opaque", {}, { type: "opaque" }),
    response("missing", {}, { ok: false }),
  ]) {
    const h = harness({ fetch: async () => value });
    await h.dispatch(h.request());
    assert.equal(h.entries.size, 0);
  }
});

test("HTML, API, auth, non-GET, and cross-origin requests are not intercepted", async () => {
  const h = harness();
  const requests = [
    h.request("/", { destination: "document" }),
    h.request("/api/profile.js"),
    h.request("/auth/session.js"),
    h.request("/assets/app.js", { method: "POST" }),
    h.request("https://cdn.example/app.js"),
  ];
  for (const req of requests) assert.equal((await h.dispatch(req)).intercepted, false, req.url);
  assert.equal(h.openCalls, 0);
  assert.equal(h.networkCalls, 0);
});

test("cache lookup failure never hides the original network error", async () => {
  const h = harness({ matchFails: true });
  const failure = new Error("Offline");
  h.setNetwork(async () => { throw failure; });
  await assert.rejects(h.dispatch(h.request()), error => error === failure);
});
