import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { PageHeader, Badge, fadeUp } from "@/components/shared";
import { api, type ModLogRow } from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

const TABS = ["Все", "ban", "kick", "mute", "warn", "delete"] as const;

export default function Moderation() {
  const { t, lang } = useI18n();
  const [logs, setLogs] = useState<ModLogRow[] | null>(null);
  const [needAdmin, setNeedAdmin] = useState(false);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Все");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const poll = async () => {
      const l = await api.adminModLogs();
      if (l) {
        setLogs(l);
        setNeedAdmin(false);
      } else {
        // 401 from the admin-protected endpoint -> ask for admin login
        try {
          const chk = await fetch("/api/admin/check", { credentials: "include" });
          setNeedAdmin(chk.status === 401);
        } catch {
          setNeedAdmin(false);
        }
      }
    };
    void poll();
    const t = setInterval(poll, 15000);
    return () => clearInterval(t);
  }, []);

  const filtered = useMemo(
    () =>
      (logs ?? []).filter(
        (l) =>
          (tab === "Все" || l.action === tab) &&
          (!query ||
            l.targetTag.toLowerCase().includes(query.toLowerCase()) ||
            (l.reason ?? "").toLowerCase().includes(query.toLowerCase()))
      ),
    [logs, tab, query]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const l of logs ?? []) c[l.action] = (c[l.action] ?? 0) + 1;
    return c;
  }, [logs]);

  return (
    <div>
      <PageHeader
        title={t("mod.title")}
        subtitle={logs ? `${logs.length} ${t("mod.recent")}` : t("mod.offline")}
      />

      {/* counts */}
      {logs && logs.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {Object.entries(counts).map(([a, n]) => (
            <Badge key={a}>
              {a}: {n}
            </Badge>
          ))}
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1 md:max-w-sm">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("mod.searchHint")}
            className="w-full rounded-xl border border-white/10 bg-ink-900 py-2.5 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-ink-300 focus:border-white/40"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-ink-900 p-1">
          {TABS.map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              className={cn(
                "relative shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors",
                tab === tabKey ? "text-black" : "text-ink-200 hover:text-white"
              )}
            >
              {tab === tabKey && (
                <motion.span layoutId="mod-tab" className="absolute inset-0 rounded-lg bg-white" transition={{ type: "spring", stiffness: 400, damping: 32 }} />
              )}
              <span className="relative z-10">{tabKey === "Все" ? t("mod.tabAll") : tabKey}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        <AnimatePresence mode="popLayout">
          {filtered.map((l) => (
            <motion.div
              key={l.id}
              layout
              variants={fadeUp}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, x: -24 }}
              className="flex items-center gap-4 rounded-2xl border border-white/10 bg-ink-900 px-5 py-4 transition-colors hover:border-white/25"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/15 bg-ink-800 font-mono text-[10px] font-bold uppercase">
                {l.action}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-display font-bold">{l.targetTag}</span>
                  {l.reason && <span className="text-ink-300"> — {l.reason}</span>}
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-ink-300">
                  {t("mod.by")} {l.moderatorTag} · {l.source} · {timeAgo(Date.parse(l.createdAt), lang)}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {logs && filtered.length === 0 && (
          <div className="grid place-items-center rounded-3xl border border-dashed border-white/15 py-24 text-ink-300">
            <Search className="mb-3 h-8 w-8" />
            {t("common.notFound")}
          </div>
        )}
        {!logs && (
          <div className="grid place-items-center rounded-3xl border border-dashed border-white/15 py-24 text-center text-ink-300">
            <div>
              <Search className="mx-auto mb-3 h-8 w-8" />
              {needAdmin ? (
                <>
                  <p className="text-white">{t("mod.logUnavailable")}</p>
                  <p className="mt-2 text-sm">{t("mod.logUnavailableHint")}</p>
                  <a
                    href="/dashboard/support"
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-black transition-transform hover:scale-[1.03]"
                  >
                    {t("mod.contactSupport")}
                  </a>
                </>
              ) : (
                <p>{t("mod.logsNeedBot")}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
