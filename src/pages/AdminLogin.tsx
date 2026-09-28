import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, User, ShieldCheck, KeyRound, ArrowRight } from "lucide-react";
import { NikoMark } from "@/components/shared";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

/* Owner login screen. The form is shown only when the backend actually has
 * admin credentials configured — otherwise we explain exactly which env vars
 * to set, instead of letting the owner type a password into a dead form. */
export default function AdminLogin() {
  const { t } = useI18n();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const { refresh } = useAuth();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/auth/admin-login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });
      if (r.ok) {
        await refresh();
        nav("/admin", { replace: true });
      } else {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        setError(j.error || t("auth.loginError"));
      }
    } catch {
      setError(t("auth.loginDown"));
    }
    setBusy(false);
  };

  const unconfigured = error === t("auth.loginUnconfigured");

  return (
    <div className="admin-login relative grid min-h-screen place-items-center overflow-hidden bg-ink-950 px-4 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute left-1/2 top-[-18%] h-[520px] w-[760px] -translate-x-1/2 rounded-full bg-white/[0.05] blur-[140px]" />
        <div className="absolute bottom-[-240px] right-[-120px] h-[520px] w-[520px] rounded-full bg-white/[0.04] blur-[130px]" />
        <div className="absolute left-[8%] top-[18%] hidden h-24 w-px bg-gradient-to-b from-transparent via-white/25 to-transparent lg:block" />
        <div className="absolute right-[8%] bottom-[18%] hidden h-24 w-px bg-gradient-to-b from-transparent via-white/25 to-transparent lg:block" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 26, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="admin-login-card relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/15 bg-ink-900/95 p-8 shadow-[0_40px_120px_rgba(0,0,0,.75)] backdrop-blur-2xl"
      >
        {/* header */}
        <div className="flex flex-col items-center text-center">
          <span className="relative grid h-16 w-16 place-items-center rounded-2xl border border-white/25 bg-white/[0.06] text-white">
            <NikoMark className="h-10 w-10" />
            <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-md bg-white text-black">
              <ShieldCheck className="h-3 w-3" />
            </span>
          </span>
          <h1 className="mt-4 font-display text-xl font-bold tracking-tight">{t("auth.adminTitle")}</h1>
          <p className="mt-1.5 text-xs text-ink-300">{t("auth.adminSub")}</p>
        </div>

        {/* divider */}
        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-white/10" />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">admin</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>

        {unconfigured ? (
          <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-200">
              <KeyRound className="h-3.5 w-3.5" /> {t("auth.adminUnconfiguredTitle")}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-ink-200">{t("auth.adminUnconfiguredBody")}</p>
            <div className="mt-3 space-y-1.5 rounded-xl border border-white/10 bg-ink-950/80 p-3 font-mono text-[11px]">
              <p><span className="text-ink-500">1.</span> DASHBOARD_ADMIN_LOGIN=…</p>
              <p><span className="text-ink-500">2.</span> DASHBOARD_ADMIN_PASSWORD=…</p>
            </div>
            <p className="mt-2.5 text-[11px] leading-relaxed text-ink-400">{t("auth.adminUnconfiguredHint")}</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-200">
                <User className="h-3.5 w-3.5" /> {t("auth.login")}
              </span>
              <input
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                autoComplete="username"
                className="w-full rounded-xl border border-white/[0.08] bg-black/25 px-4 py-3 text-sm outline-none transition-all placeholder:text-white/20 focus:border-white/40 focus:bg-white/[0.035] focus:ring-2 focus:ring-white/10"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-200">
                <Lock className="h-3.5 w-3.5" /> {t("auth.password")}
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded-xl border border-white/[0.08] bg-black/25 px-4 py-3 text-sm outline-none transition-all placeholder:text-white/20 focus:border-white/40 focus:bg-white/[0.035] focus:ring-2 focus:ring-white/10"
              />
            </label>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-2.5 text-center text-xs font-semibold text-red-200"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3 font-display text-sm font-black text-black shadow-[0_14px_40px_rgba(0,0,0,.45)] transition-all hover:-translate-y-0.5 hover:bg-ink-100 disabled:translate-y-0 disabled:opacity-50"
            >
              {busy ? t("auth.checking") : t("auth.signIn")}
              {!busy && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        )}

        <a href="/dashboard" className="mt-5 block text-center font-mono text-[11px] text-ink-300 hover:text-white">
          {t("auth.backToDashboard")}
        </a>
      </motion.div>
    </div>
  );
}
