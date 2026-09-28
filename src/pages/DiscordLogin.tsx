import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Copy, Check, ArrowLeft } from "lucide-react";
import { NikoMark } from "@/components/shared";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

type OauthInfo = { configured: boolean; redirectUri: string; envExample: string };

export default function DiscordLogin() {
  const { t } = useI18n();
  const { session, live, loading } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const returnTo = new URLSearchParams(location.search).get("returnTo") || "/dashboard";
  const [info, setInfo] = useState<OauthInfo | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && session?.user) nav(returnTo, { replace: true });
  }, [loading, session, nav, returnTo]);

  useEffect(() => {
    let alive = true;
    fetch("/api/oauth-info")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: OauthInfo | null) => {
        if (alive && j) setInfo(j);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const copy = () => {
    if (!info) return;
    navigator.clipboard?.writeText(info.redirectUri).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-ink-950 px-4 py-10 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-grid mask-fade-b opacity-60" />
        <div className="absolute left-1/2 top-[-10%] h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-white/[0.05] blur-[130px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 26, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md rounded-3xl border border-white/10 bg-ink-900/90 p-8 backdrop-blur-xl"
      >
        <div className="flex flex-col items-center text-center">
          <NikoMark className="h-14 w-14 rounded-2xl" />
          <h1 className="mt-5 font-display text-2xl font-bold tracking-tight">{t("auth.title")}</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-300">{t("auth.subtitle")}</p>

          {live && !loading ? (
            <a
              href="/auth/login"
              className="mt-7 inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-6 py-3.5 font-display text-base font-bold text-black transition-transform hover:scale-[1.03]"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-black" aria-hidden>
                <path d="M20.3 4.4A19.8 19.8 0 0 0 15.9 3l-.2.4c1.6.4 2.9 1 4.2 1.9a15.5 15.5 0 0 0-14 0A10 10 0 0 1 8.3 3.4L8.1 3a19.8 19.8 0 0 0-4.4 1.4C1.3 9.6.7 14.6 1 19.2a20 20 0 0 0 5.9 3l1.3-2.1a11.9 11.9 0 0 1-2-1l.5-.4a14.2 14.2 0 0 0-10.6 0l.5.4a12 12 0 0 1-2 1l1.3 2.1a20 20 0 0 0 5.9-3c.4-5.3-.7-10.3-2.7-14.8ZM8.7 15.3c-1.2 0-2.1-1.1-2.1-2.4s.9-2.4 2.1-2.4 2.2 1.1 2.1 2.4c0 1.3-.9 2.4-2.1 2.4Zm6.6 0c-1.2 0-2.1-1.1-2.1-2.4s.9-2.4 2.1-2.4 2.2 1.1 2.1 2.4c0 1.3-.9 2.4-2.1 2.4Z" />
              </svg>
              {t("nav.login")}
            </a>
          ) : (
            <div className="mt-7 w-full rounded-2xl border border-white/10 bg-ink-850 px-6 py-3.5 text-center font-mono text-sm text-ink-300">
              {loading ? t("auth.connecting") : t("auth.botDown")}
            </div>
          )}

          {/* OAuth setup helper — shown ONLY while the app is unconfigured
              (i.e. to the owner doing first-time setup). Regular users of a
              configured bot never see redirect URIs or env instructions. */}
          {info && !info.configured && (
            <div className="mt-6 w-full rounded-2xl border border-white/10 bg-ink-850 p-4 text-left">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-300">
                {t("auth.setup")}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg bg-black/40 px-3 py-2 font-mono text-xs text-white">
                  {info.redirectUri}
                </code>
                <button
                  onClick={copy}
                  title={t("common.copy")}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/15 text-ink-200 transition-colors hover:border-white/40 hover:text-white"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-ink-300">
                {t("auth.setupHint")} <code className="rounded bg-black/40 px-1 font-mono">DISCORD_CLIENT_ID</code>,{" "}
                <code className="rounded bg-black/40 px-1 font-mono">DISCORD_CLIENT_SECRET</code>,{" "}
                <code className="rounded bg-black/40 px-1 font-mono">DASHBOARD_REDIRECT_URI</code> {t("auth.andLoginWorks")}
              </p>
            </div>
          )}

          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-300 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> {t("common.backHome")}
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
