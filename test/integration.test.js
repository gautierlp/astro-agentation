import { test } from "node:test";
import assert from "node:assert/strict";
import agentation, { ensureServer } from "../src/index.js";

// Runs the astro:config:setup hook with fake helpers and records what it asked for.
function setup(command, options) {
  const calls = { config: [], scripts: [] };
  agentation(options).hooks["astro:config:setup"]({
    command,
    updateConfig: (c) => calls.config.push(c),
    injectScript: (stage, code) => calls.scripts.push({ stage, code }),
    logger: { info() {}, warn() {} },
  });
  return calls;
}

test("build and preview: the integration adds nothing", () => {
  for (const command of ["build", "preview", "sync"]) {
    const calls = setup(command);
    assert.deepEqual(calls, { config: [], scripts: [] }, command);
  }
});

test("dev: the toolbar script goes on every page and talks to the proxy path", () => {
  const { scripts } = setup("dev");
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0].stage, "page");
  assert.match(scripts[0].code, /astro-agentation\/client/);
  assert.match(scripts[0].code, /"\/__agentation"/);
  assert.match(scripts[0].code, /"data-insp-path"/);
});

test("dev: the proxy forwards to the annotation server with a localhost origin", () => {
  const { config } = setup("dev", { port: 5858 });
  const proxy = config[0].vite.server.proxy["/__agentation"];
  assert.equal(proxy.target, "http://localhost:5858");
  assert.equal(proxy.rewrite("/__agentation/sessions"), "/sessions");
  const headers = {};
  proxy.configure({ on: (event, fn) => event === "proxyReq" && fn({ setHeader: (k, v) => (headers[k] = v) }) });
  assert.equal(headers.origin, "http://localhost:5858");
});

test("dev: code-inspector stamps the source, unless source is off", () => {
  const on = setup("dev").config[0].vite.plugins.flat().filter(Boolean);
  assert.ok(on.length > 0);
  const off = setup("dev", { source: false });
  assert.deepEqual(off.config[0].vite.plugins, []);
  assert.doesNotMatch(off.scripts[0].code, /data-insp-path/);
});

test("a custom path is used by both the proxy and the toolbar", () => {
  const { config, scripts } = setup("dev", { path: "/review" });
  assert.ok(config[0].vite.server.proxy["/review"]);
  assert.match(scripts[0].code, /"\/review"/);
});

test("ensureServer: reuses a running annotation server", async () => {
  let spawned = 0;
  const child = await ensureServer(4747, { fetch: async () => ({ ok: true }), spawn: () => spawned++ });
  assert.equal(child, null);
  assert.equal(spawned, 0);
});

test("ensureServer: starts one when none answers", async () => {
  const args = [];
  const child = await ensureServer(4747, {
    fetch: async () => { throw new Error("ECONNREFUSED"); },
    spawn: (cmd, a) => { args.push(...a); return { pid: 1 }; },
  });
  assert.deepEqual(child, { pid: 1 });
  assert.match(args[0], /agentation-mcp.*cli\.js$/);
  assert.deepEqual(args.slice(1), ["server", "--port", "4747"]);
});
