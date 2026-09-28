import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const CONSENT_KEY = "niko-privacy-consent-v1";

/**
 * One-time privacy notice, bottom sheet on phones / corner card on desktop.
 * Pure UI: the site runs no trackers — we only remember the answer in
 * localStorage so the notice is not shown again.
 */
export default function PrivacyConsent() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(CONSENT_KEY);
    } catch {
      /* private mode — show the notice each visit */
    }
    if (!stored) {
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  const accept = () => {
    try {
      window.localStorage.setItem(CONSENT_KEY, new Date().toISOString());
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-x-3 bottom-20 z-[70] sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[380px]"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          role="dialog"
          aria-label={t("legal.consentAria")}
        >
          <div className="rounded-3xl border border-white/15 bg-ink-900/95 p-5 shadow-2xl backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/15 bg-ink-800">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="font-display text-sm font-bold">{t("legal.consentTitle")}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-300">{t("legal.consentBody")}</p>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                  <Link to="/privacy" className="text-xs font-semibold text-white underline-offset-4 hover:underline">
                    {t("legal.policy")}
                  </Link>
                  <Link to="/terms" className="text-xs font-semibold text-white underline-offset-4 hover:underline">
                    {t("legal.offer")}
                  </Link>
                </div>
              </div>
            </div>
            <button
              onClick={accept}
              className="mt-4 w-full rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-black transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {t("legal.accept")}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
