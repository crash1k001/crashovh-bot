import { Suspense, lazy, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Landing, AppShell } from "@/components/shared";
import ErrorBoundary from "@/components/ErrorBoundary";
import PrivacyConsent from "@/components/PrivacyConsent";
import { AuthProvider, useAuth } from "@/lib/auth";

/* Code-splitting: every route is a separate chunk */
const Overview = lazy(() => import("@/pages/DashboardOverview"));
const Servers = lazy(() => import("@/pages/Servers"));
const Commands = lazy(() => import("@/pages/Commands"));
const Moderation = lazy(() => import("@/pages/Moderation"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const Support = lazy(() => import("@/pages/Support"));
const AdminOverview = lazy(() => import("@/pages/AdminOverview"));
const AdminUsers = lazy(() => import("@/pages/AdminUsers"));
const AdminSystem = lazy(() => import("@/pages/AdminSystem"));
const AdminControl = lazy(() => import("@/pages/AdminControl"));
const DiscordLogin = lazy(() => import("@/pages/DiscordLogin"));
const GuildDetail = lazy(() => import("@/pages/GuildDetail"));
const AdminLogin = lazy(() => import("@/pages/AdminLogin"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const VlogsPage = lazy(() => import("@/pages/VlogsPage"));
const Terms = lazy(() => import("@/pages/Terms"));

function PageFallback() {
  return (
    <div className="grid min-h-[50vh] place-items-center">
      <motion.div
        animate={{ opacity: [0.35, 1, 0.35] }}
        transition={{ duration: 1.4, repeat: Infinity }}
        className="font-mono text-sm text-ink-300"
      >
        loading…
      </motion.div>
    </div>
  );
}

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>;
}

/* Redirects signed-out users to /auth?returnTo=<path>, keeps deep links */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading, live } = useAuth();
  const location = useLocation();

  if (loading) return <PageFallback />;
  // Backend live but no Discord user -> must log in
  if (live && !session?.user) {
    return <Navigate to={`/auth?returnTo=${encodeURIComponent(location.pathname)}`} replace />;
  }
  // Backend unreachable -> pages render their own offline state (no fake data)
  return <>{children}</>;
}

function ShellRoutes() {
  const location = useLocation();
  return (
    <AppShell>
      {/* No AnimatePresence here: it unmounted lazy routes and made the page blink */}
      <Routes location={location}>
        <Route path="/dashboard" element={<RequireAuth><Lazy><Overview /></Lazy></RequireAuth>} />
        <Route path="/dashboard/servers" element={<RequireAuth><Lazy><Servers /></Lazy></RequireAuth>} />
        <Route path="/dashboard/servers/:id" element={<RequireAuth><Lazy><GuildDetail /></Lazy></RequireAuth>} />
        <Route path="/dashboard/commands" element={<RequireAuth><Lazy><Commands /></Lazy></RequireAuth>} />
        <Route path="/dashboard/moderation" element={<RequireAuth><Lazy><Moderation /></Lazy></RequireAuth>} />
        <Route path="/dashboard/analytics" element={<RequireAuth><Lazy><Analytics /></Lazy></RequireAuth>} />
        <Route path="/dashboard/support" element={<RequireAuth><Lazy><Support /></Lazy></RequireAuth>} />
        <Route path="/admin" element={<RequireAuth><Lazy><AdminOverview /></Lazy></RequireAuth>} />
        <Route path="/admin/users" element={<RequireAuth><Lazy><AdminUsers /></Lazy></RequireAuth>} />
        <Route path="/admin/control" element={<RequireAuth><Lazy><AdminControl /></Lazy></RequireAuth>} />
        <Route path="/admin/system" element={<RequireAuth><Lazy><AdminSystem /></Lazy></RequireAuth>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppShell>
  );
}

function LoginRoute() {
  return (
    <Lazy>
      <DiscordLogin />
    </Lazy>
  );
}

function AdminLoginRoute() {
  return (
    <Lazy>
      <AdminLogin />
    </Lazy>
  );
}

export default function App() {
  /* Favicon follows the REAL bot avatar from /api/status (falls back to the
   * bundled Niko mark when the bot is offline). */
  useEffect(() => {
    let last = "";
    const apply = (url: string | null) => {
      if (url === last) return;
      last = url ?? "";
      const link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      const apple = document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']");
      if (link && url) link.href = url;
      if (apple && url) apple.href = url;
    };
    apply(null);
    const tick = async () => {
      try {
        const r = await fetch("/api/status", { credentials: "include" });
        const ct = r.headers.get("content-type") || "";
        if (!ct.includes("application/json")) return;
        const d = (await r.json()) as { bot?: { avatar?: string | null } };
        apply(d?.bot?.avatar ?? null);
      } catch {
        /* offline — keep current favicon */
      }
    };
    void tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          {/* Real URLs instead of /#hash fragments — same landing, auto-scroll to the section. */}
          <Route path="/features" element={<Landing scrollTo="features" />} />
          <Route path="/stats" element={<Landing scrollTo="stats" />} />
          <Route path="/auth" element={<LoginRoute />} />
          <Route path="/admin/login" element={<AdminLoginRoute />} />
          <Route path="/privacy" element={<Lazy><Privacy /></Lazy>} />
          <Route path="/vlogs" element={<Lazy><VlogsPage /></Lazy>} />
          <Route path="/terms" element={<Lazy><Terms /></Lazy>} />
          <Route path="/*" element={<ShellRoutes />} />
        </Routes>
        <PrivacyConsent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
