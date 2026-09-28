import { useEffect, useMemo, useState } from "react";
import { Search, Zap } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { PageHeader, Badge } from "@/components/shared";
import { api } from "@/lib/api";
import { cn, fmt, timeAgo } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

type CmdUsage = { name: string; uses: number; users: number; lastUsed: number };

export default function Commands() {
  const { t, lang } = useI18n();
  const [registry, setRegistry] = useState<{ total: number; names: string[]; byCategory: Record<string, number> } | null>(null);
  const [usage, setUsage] = useState<CmdUsage[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    void api.commandsStats().then(setRegistry);
  }, []);

  /* Usage comes from /api/metrics: any signed-in user gets real counters.
   * (It used to hit the admin-only overview, so normal users always saw 0.) */
  useEffect(() => {
    const poll = async () => {
      const m = await api.metrics();
      if (m) setUsage(m.commandUsage ?? []);
    };
    void poll();
    const t = setInterval(poll, 10000);
    return () => clearInterval(t);
  }, []);

  const names = useMemo(
    () => (registry?.names ?? []).filter((n) => n.toLowerCase().includes(query.toLowerCase())).sort(),
    [registry, query]
  );
  const maxUses = usage[0]?.uses ?? 1;
  const usageMap = useMemo(() => new Map(usage.map((u) => [u.name, u])), [usage]);

  return (
    <div>
      <PageHeader
        title={t("cmd.title")}
        subtitle={registry ? `${registry.total} ${t("cmd.loaded")}` : t("cmd.registryDown")}
        actions={<Badge><Zap className="h-3 w-3" /> {usage.reduce((a, u) => a + u.uses, 0)} {t("cmd.sessionUses")}</Badge>}
      />

      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("cmd.searchHint")}
          className="w-full rounded-xl border border-white/10 bg-ink-900 py-2.5 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-ink-300 focus:border-white/40"
        />
      </div>

      {registry ? (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {names.map((name, i) => {
              const u = usageMap.get(name);
              return (
                <motion.div
                  key={name}
                  layout
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ delay: Math.min(i * 0.01, 0.3) }}
                  className="rounded-2xl border border-white/5 bg-ink-850 px-4 py-3 transition-colors hover:border-white/20"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono text-sm font-bold">/{name}</p>
                    <span className="font-mono text-[11px] text-ink-300">{u ? `${u.uses} ${t("cmd.used")}` : ""}</span>
                  </div>
                  {u && (
                    <>
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-ink-700">
                        <div className="h-full rounded-full bg-white" style={{ width: `${(u.uses / maxUses) * 100}%` }} />
                      </div>
                      <p className="mt-1.5 font-mono text-[10px] text-ink-300">
                        {u.users} {t("cmd.users")} · {timeAgo(u.lastUsed, lang)}
                      </p>
                    </>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="grid place-items-center rounded-3xl border border-dashed border-white/15 py-24 text-center text-ink-300">
          <div>
            <Search className="mx-auto mb-3 h-8 w-8" />
            <p>{t("cmd.registryOnly")}</p>
            <p className="mt-1 font-mono text-xs">node bot/src/client.js</p>
          </div>
        </div>
      )}

      {registry && names.length === 0 && query && (
        <div className={cn("grid place-items-center rounded-3xl border border-dashed border-white/15 py-20 text-ink-300")}>
          {t("cmd.notFound")} · {fmt(registry.total)} {t("cmd.inRegistry")}
        </div>
      )}
    </div>
  );
}
