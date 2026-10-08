// Astro integration for Agentation (https://github.com/benjitaylor/agentation).
// On the dev server only: the toolbar on every page, a proxy to the annotation
// server, and code-inspector to stamp each element with its source file and line.
// `astro build` gets nothing.
import { spawn as nodeSpawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { codeInspectorPlugin } from "code-inspector-plugin";

const require = createRequire(import.meta.url);

/**
 * @param {object} [options]
 * @param {number} [options.port] Port of the annotation server. Default 4747.
 * @param {string} [options.path] Dev server path that forwards to it. Default "/__agentation".
 * @param {boolean} [options.source] Stamp elements with data-insp-path="file:line:col". Default true.
 * @param {boolean} [options.server] Start the annotation server with the dev server. Default true.
 */
export default function agentation({ port = 4747, path = "/__agentation", source = true, server = true } = {}) {
  const target = `http://localhost:${port}`;
  let child = null;
  return {
    name: "astro-agentation",
    hooks: {
      "astro:config:setup": ({ command, updateConfig, injectScript }) => {
        if (command !== "dev") return;
        updateConfig({
          vite: {
            plugins: source ? [codeInspectorPlugin({ bundler: "vite", hotKeys: false, hideConsole: true })] : [],
            server: {
              proxy: {
                // The annotation server only accepts localhost origins. Going through
                // the dev server keeps the browser on one origin, so the toolbar also
                // works from another machine (a laptop on the same Tailscale, say).
                [path]: {
                  target,
                  changeOrigin: true,
                  rewrite: (p) => p.slice(path.length) || "/",
                  configure: (proxy) => proxy.on("proxyReq", (req) => req.setHeader("origin", target)),
                },
              },
            },
          },
        });
        const options = { path, attributes: source ? ["data-insp-path"] : undefined };
        injectScript("page", `import { start } from "astro-agentation/client"; start(${JSON.stringify(options)});`);
      },
      "astro:server:setup": async ({ logger }) => {
        if (!server) return;
        child = await ensureServer(port);
        logger.info(child ? `annotation server started on ${target}` : `using the annotation server on ${target}`);
      },
      "astro:server:done": () => {
        child?.kill();
        child = null;
      },
    },
  };
}

/**
 * Start Agentation's annotation server unless one already answers on `port`.
 * Returns the child process it started, or null when it reused one.
 */
export async function ensureServer(port, { fetch = globalThis.fetch, spawn = nodeSpawn } = {}) {
  try {
    const res = await fetch(`http://localhost:${port}/health`, { signal: AbortSignal.timeout(1000) });
    if (res.ok) return null;
  } catch {
    // Nothing answers: start one below.
  }
  const cli = join(dirname(require.resolve("agentation-mcp")), "cli.js");
  return spawn(process.execPath, [cli, "server", "--port", String(port)], { stdio: "ignore" });
}
