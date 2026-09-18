// Vanilla TanStack Start + Vite config. Official plugins only:
//   - TanStack Start (SSR/framework), @vitejs/plugin-react, @tailwindcss/vite,
//     vite-tsconfig-paths, nitro (build), TanStack devtools (dev-only).
import {
  defineConfig,
  loadEnv,
  isRunnableDevEnvironment,
  type Plugin,
  type PluginOption,
  type UserConfig,
} from "vite";
import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { devtools } from "@tanstack/devtools-vite";
import { nitro } from "nitro/vite";
import tailwindcss from "@tailwindcss/vite";

const SERVER_ENTRY_ID = "virtual:tanstack-start-server-entry";

/**
 * Complete list of bare imports pre-bundled for the browser in dev.
 *
 * Mirrors what the dep-optimizer discovered on a real cold start
 * (node_modules/.vite/deps/_metadata.json), plus the jsx runtime subpaths
 * that Vite's JSX transform injects into every component.
 *
 * Together with `environments.client.optimizeDeps.noDiscovery: true` below,
 * this skips the ~45s cold-start dependency *scan* (which crawls every route
 * into recharts' d3 graph and lucide-react's ~1500 icon modules) while still
 * pre-bundling everything the app imports.
 *
 * ⚠️ When you add a package with a bare import in client code, add it here.
 *    If you forget, the dev overlay will say `Failed to resolve import
 *    "<pkg>"` — just add the name to this list and restart.
 *    To regenerate the list from scratch: remove `noDiscovery`, delete
 *    `node_modules/.vite`, start dev, and read _metadata.json.
 */
const optimizeDepsInclude = [
  // React
  "react",
  "react/jsx-runtime",
  "react/jsx-dev-runtime",
  "react-dom",
  "react-dom/client",
  // TanStack (client graph)
  "@tanstack/react-router",
  "@tanstack/react-router > @tanstack/react-store",
  "@tanstack/react-query",
  // Radix primitives actually imported by the UI components in use
  "@radix-ui/react-slot",
  "@radix-ui/react-progress",
  "@radix-ui/react-select",
  "@radix-ui/react-slider",
  "@radix-ui/react-tooltip",
  // shadcn utilities
  "class-variance-authority",
  "clsx",
  "tailwind-merge",
  // Heavyweights: recharts + D3 modules + lucide-react prebundled to eliminate cold waterfall
  "recharts",
  "lucide-react",
  "date-fns",
  "d3-array",
  "d3-color",
  "d3-format",
  "d3-interpolate",
  "d3-path",
  "d3-scale",
  "d3-shape",
  "d3-time",
];

const ssrOptimizeDepsInclude = [
  "react",
  "react/jsx-runtime",
  "react/jsx-dev-runtime",
  "react-dom",
  "react-dom/server",
  "@tanstack/react-router",
  "@tanstack/react-query",
  "@radix-ui/react-slot",
  "@radix-ui/react-progress",
  "@radix-ui/react-select",
  "@radix-ui/react-slider",
  "@radix-ui/react-tooltip",
  "class-variance-authority",
  "clsx",
  "tailwind-merge",
  "recharts",
  "lucide-react",
  "date-fns",
  "d3-array",
  "d3-color",
  "d3-format",
  "d3-interpolate",
  "d3-path",
  "d3-scale",
  "d3-shape",
  "d3-time",
];

/**
 * Warm the SSR server entry as soon as the dev server boots.
 *
 * On the first page load, TanStack's dev middleware does
 * `serverRunner.import("virtual:tanstack-start-server-entry")`, and that first
 * import transforms the entire SSR module graph. Vite's module-runner wraps the
 * underlying `fetchModule` RPC in a hardcoded 60s timeout that is not
 * configurable, so a slow machine (or a cold start racing client dep
 * optimization) can blow past it with:
 *   "transport invoke timed out after 60000ms ... fetchModule ...
 *    virtual:tanstack-start-server-entry"
 *
 * Importing the same entry eagerly at startup (with retries that reset the
 * runner cache on failure) moves that cold transform outside the request path.
 * If a browser request does race the warmup, the module runner dedupes the
 * in-flight import, so the request waits on the warmup's attempt instead of
 * starting its own 60s clock.
 */
function warmSsrEntryPlugin(): Plugin {
  return {
    name: "railrakshak:warm-ssr-entry",
    apply: "serve",
    configureServer(server) {
      // Post hook: runs after internal middlewares are installed.
      return () => {
        const serverEnv = server.environments.ssr;
        if (!serverEnv || !isRunnableDevEnvironment(serverEnv)) return;
        const runner = serverEnv.runner;

        void (async () => {
          const maxAttempts = 3;
          for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
              await runner.import(SERVER_ENTRY_ID);
              console.log(
                "[ssr-warmup] server entry ready — first page load won't wait on module transforms",
              );
              return;
            } catch (error) {
              console.warn(
                `[ssr-warmup] attempt ${attempt}/${maxAttempts} failed:`,
                error instanceof Error ? error.message : error,
              );
              // A failed import leaves a rejected promise cached in the
              // runner; reset both module graphs so the next attempt
              // re-fetches everything fresh.
              try {
                serverEnv.moduleGraph.invalidateAll();
              } catch {}
              try {
                runner.clearCache();
              } catch {}
              if (attempt < maxAttempts) {
                await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
              }
            }
          }
          console.warn(
            "[ssr-warmup] could not warm the SSR entry; the first page load may still time out once",
          );
        })();
      };
    },
  };
}

export default defineConfig(({ command, mode }) => {
  const isDevBuild = command === "build" && mode === "development";

  const plugins: PluginOption[] = [
    // Dev-only TanStack devtools
    ...(command === "serve"
      ? [
          devtools({
            logging: false,
            eventBusConfig: { enabled: false },
            enhancedLogs: { enabled: false },
            consolePiping: { enabled: false },
            removeDevtoolsOnBuild: false,
            injectSource: { enabled: true },
          }),
        ]
      : []),
    tailwindcss(),
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR
    // error wrapper). nitro/vite builds from this.
    tanstackStart({
      importProtection: {
        behavior: "error",
        client: {
          files: ["**/server/**"],
          specifiers: ["server-only"],
        },
      },
      server: { entry: "server" },
    }),
    react(),
    // nitro only matters for production builds (cloudflare-module default).
    ...(command === "build" ? [nitro({ defaultPreset: "cloudflare-module" })] : []),
    warmSsrEntryPlugin(),
  ];

  // Inject static VITE_* env vars into the client bundle at build time.
  const envDefine: Record<string, string> = {};
  for (const [key, value] of Object.entries(loadEnv(mode, process.cwd(), "VITE_"))) {
    envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  const config: UserConfig = {
    plugins,
    define: envDefine,
    json: {
      stringify: true, // 2x-3x faster JSON parsing & AST evaluation for dataset payloads
    },
    css: { transformer: "lightningcss" },
    resolve: {
      tsconfigPaths: true, // Vite native tsconfig paths resolution (replaces vite-tsconfig-paths plugin)
      alias: { "@": `${process.cwd()}/src` },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    optimizeDeps: { ignoreOutdatedRequests: true },
    environments: {
      client: {
        optimizeDeps: {
          include: optimizeDepsInclude,
          noDiscovery: true,
          // All imports are pre-bundled at startup; don't hold the first page
          // hostage to a crawl that no longer runs.
          holdUntilCrawlEnd: false,
        },
      },
      ssr: {
        optimizeDeps: {
          include: ssrOptimizeDepsInclude,
        },
      },
    },
    server: {
      host: "::",
      port: 8080,
      fs: {
        cachedChecks: true, // Speeds up Windows filesystem stat resolution
      },
      watch: {
        awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 100 },
      },
    },
  };

  if (isDevBuild) {
    // Same marker the previous tooling used for dev-mode library builds.
    config.environments = {
      ...config.environments,
      client: {
        ...config.environments?.["client"],
        define: { "process.env.NODE_ENV": JSON.stringify("development") },
      },
    };
  }

  return config;
});
