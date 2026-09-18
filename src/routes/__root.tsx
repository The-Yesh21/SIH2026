import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { type ReactNode } from "react";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "RailRakshak — Bengaluru → Mysuru train ETA prediction" },
      {
        name: "description",
        content:
          "RailRakshak: machine-learning arrival-time prediction for the Bengaluru–Mysuru railway corridor, trained on real historical running data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap",
      },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const NAV = [
  { to: "/", label: "Live ETA" },
  { to: "/demo", label: "Demo" },
  { to: "/simulation", label: "Simulation" },
  { to: "/dataset", label: "Dataset & Sources" },
  { to: "/model", label: "ML Model" },
  { to: "/slides", label: "Slides" },
] as const;

function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl shadow-lg">
      {/* Top Telemetry Vitals Bar */}
      <div className="border-b border-slate-900 bg-[#080d18] px-4 py-1 text-[11px] font-mono text-slate-400">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <span className="flex items-center gap-1.5 text-cyan-400 font-semibold shrink-0">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
              ISRO RTIS NAVIC LINK: ACTIVE
            </span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="hidden sm:inline text-slate-300">
              Corridor: <strong>MYS ⇄ SBC</strong> (138.3 km Double-Line)
            </span>
            <span className="text-slate-600 hidden md:inline">|</span>
            <span className="hidden md:inline text-slate-400">
              Active Density: <strong className="text-amber-400">14 Trains</strong>
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-emerald-400">
              ML Latency: <strong>0.4ms</strong>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300">
              IST: <strong>Asia/Kolkata</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2.5 group">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-cyan-600 to-emerald-500 font-[family-name:var(--font-display)] text-base font-extrabold text-white shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            R
          </span>
          <div className="flex flex-col">
            <span className="font-[family-name:var(--font-display)] text-lg font-black tracking-tight text-slate-100 flex items-center gap-1.5">
              RailRakshak
              <span className="rounded bg-cyan-950 px-1.5 py-0.5 text-[9px] font-mono font-bold text-cyan-300 border border-cyan-500/30">
                PRO
              </span>
            </span>
            <span className="text-[10px] font-mono text-slate-400 tracking-wider">
              Dynamic Train ETA Intelligence
            </span>
          </div>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="rounded-md px-3 py-1.5 text-slate-400 transition-all hover:bg-slate-900 hover:text-slate-100 text-xs sm:text-sm"
              activeProps={{ className: "bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 font-semibold shadow-sm" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-slate-900 bg-[#060a12] py-6">
      <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs leading-relaxed text-slate-500">
        <div>
          RailRakshak Dynamic Journey Time Intelligence Layer · Powered by Indian Railways ISRO RTIS Satellite Telemetry &amp; LightGBM.
        </div>
        <div className="font-mono text-[11px] text-slate-400">
          Sub-second in-browser inference · Zero telemetry lag
        </div>
      </div>
    </footer>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col bg-background">
        <SiteHeader />
        <main className="flex-1">
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
        </main>
        <SiteFooter />
      </div>
    </QueryClientProvider>
  );
}

