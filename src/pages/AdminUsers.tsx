import { useCallback, useEffect, useState } from "react";
import { Search, Trash2, Ban, KeyRound, UserX } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { PageHeader, Btn, Badge, fadeUp } from "@/components/shared";
import { cn, timeAgo } from "@/lib/utils";
import { useI18n, type TKey } from "@/lib/i18n";

type BlackRow = { id: number; type: string; targetId: string; reason: string | null; createdAt: string };
type NpRow = { userId: string; username: string; grantedByUsername: string; createdAt: string };

const TABS: { key: "blacklist" | "noprefix"; labelKey: TKey; icon: typeof Ban }[] = [
  { key: "blacklist", labelKey: "adm.blacklist", icon: Ban },
  { key: "noprefix", labelKey: "adm.noprefix", icon: KeyRound },
];

export default function AdminUsers() {
  const { t, lang } = useI18n();
  const [tab, setTab] = useState<"blacklist" | "noprefix">("blacklist");
  const [black, setBlack] = useState<BlackRow[]>([]);
  const [np, setNp] = useState<NpRow[]>([]);
  const [query, setQuery] = useState("");
  const [newId, setNewId] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const notify = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 3000);
  };

  const j = useCallback(async <T,>(url: string, opts?: RequestInit): Promise<T | null> => {
    try {
      /* Content-Type is required: express.json() skips body parsing without it,
         so blacklist/noprefix posts arrived empty and always failed. */
      const hasBody = opts?.body != null;
      const r = await fetch(url, {
        credentials: "include",
        ...opts,
        headers: hasBody ? { "Content-Type": "application/json" } : opts?.headers,
      });
      if (!r.ok) return null;
      return (await r.json()) as T;
    } catch {
      return null;
    }
  }, []);

  const load = useCallback(async () => {
    const b = await j<{ blacklist: BlackRow[] }>("/api/admin/blacklist");
    if (b) setBlack(b.blacklist);
    const n = await j<{ noprefix: NpRow[] }>("/api/admin/noprefix");
    if (n) setNp(n.noprefix);
  }, [j]);

  useEffect(() => {
    void load();
  }, [load]);

  const addBlack = async () => {
    if (!newId) return;
    const r = await j<{ ok: boolean }>("/api/admin/blacklist", {
      method: "POST",
      body: JSON.stringify({ type: "user", targetId: newId, reason: t("adm.reasonFromPanel") }),
    });
    notify(r?.ok ? t("adm.userBlocked") : t("common.error"));
    setNewId("");
    void load();
  };
  const delBlack = async (id: number) => {
    await j(`/api/admin/blacklist/${id}`, { method: "DELETE" });
    notify(t("adm.unblocked"));
    void load();
  };
  const addNp = async () => {
    if (!newId) return;
    const r = await j<{ ok: boolean }>("/api/admin/noprefix", { method: "POST", body: JSON.stringify({ userId: newId }) });
    notify(r?.ok ? t("adm.npGranted") : t("common.error"));
    setNewId("");
    void load();
  };
  const delNp = async (userId: string) => {
    await j(`/api/admin/noprefix/${userId}`, { method: "DELETE" });
    notify(t("adm.npRemoved"));
    void load();
  };

  const filteredBlack = black.filter((b) => b.targetId.includes(query));
  const filteredNp = np.filter((n) => n.username.toLowerCase().includes(query.toLowerCase()) || n.userId.includes(query));

  return (
    <div>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed right-6 top-6 z-50 rounded-2xl border border-white/20 bg-white px-5 py-3 font-display text-sm font-bold text-black shadow-2xl"
        >
          {toast}
        </motion.div>
      )}

      <PageHeader
        title={t("adm.users")}
        subtitle={t("adm.usersSub")}
        actions={
          <>
            <input
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              placeholder={t("adm.discordId")}
              className="w-44 rounded-xl border border-white/10 bg-ink-900 px-4 py-2.5 font-mono text-sm outline-none focus:border-white/40"
            />
            <Btn onClick={tab === "blacklist" ? addBlack : addNp}>
              {tab === "blacklist" ? t("adm.blockUser") : t("adm.grantNp")}
            </Btn>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-xl border border-white/10 bg-ink-900 p-1">
          {TABS.map((tabDef) => (
            <button
              key={tabDef.key}
              onClick={() => setTab(tabDef.key)}
              className={cn(
                "relative flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-colors",
                tab === tabDef.key ? "text-black" : "text-ink-200 hover:text-white"
              )}
            >
              {tab === tabDef.key && (
                <motion.span layoutId="usr-tab" className="absolute inset-0 rounded-lg bg-white" transition={{ type: "spring", stiffness: 400, damping: 32 }} />
              )}
              <tabDef.icon className="relative z-10 h-3.5 w-3.5" />
              <span className="relative z-10">{t(tabDef.labelKey)}</span>
            </button>
          ))}
        </div>
        <div className="relative min-w-[200px] flex-1 md:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("common.search")}
            className="w-full rounded-xl border border-white/10 bg-ink-900 py-2.5 pl-10 pr-4 text-sm outline-none placeholder:text-ink-300 focus:border-white/40"
          />
        </div>
      </div>

      {tab === "blacklist" && (
        <div className="space-y-2.5">
          <AnimatePresence mode="popLayout">
            {filteredBlack.map((b, i) => (
              <motion.div
                key={b.id}
                layout
                variants={fadeUp}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0 }}
                custom={i}
                className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-ink-900 px-5 py-4"
              >
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 bg-ink-800">
                  <UserX className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-bold">{b.targetId}</p>
                  <p className="text-xs text-ink-300">{b.reason ?? t("adm.noReason")} · {timeAgo(Date.parse(b.createdAt), lang)}</p>
                </div>
                <Badge>{b.type === "user" ? t("adm.userWord") : b.type === "guild" ? t("adm.guildWord") : b.type}</Badge>
                <button
                  onClick={() => delBlack(b.id)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 text-ink-200 transition-all hover:border-white hover:bg-white hover:text-black"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          {filteredBlack.length === 0 && (
            <div className="grid place-items-center rounded-3xl border border-dashed border-white/15 py-20 text-ink-300">
              {t("adm.blackEmpty")}
            </div>
          )}
        </div>
      )}

      {tab === "noprefix" && (
        <div className="space-y-2.5">
          <AnimatePresence mode="popLayout">
            {filteredNp.map((n, i) => (
              <motion.div
                key={n.userId}
                layout
                variants={fadeUp}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0 }}
                custom={i}
                className="flex items-center gap-4 rounded-2xl border border-white/10 bg-ink-900 px-5 py-4"
              >
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 bg-ink-800 font-display font-bold">
                  {n.username[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{n.username}</p>
                  <p className="font-mono text-[11px] text-ink-300">{n.userId} · {t("adm.grantedBy")} {n.grantedByUsername}</p>
                </div>
                <button
                  onClick={() => delNp(n.userId)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 text-ink-200 transition-all hover:border-white hover:bg-white hover:text-black"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          {filteredNp.length === 0 && (
            <div className="grid place-items-center rounded-3xl border border-dashed border-white/15 py-20 text-ink-300">
              {t("adm.noneGranted")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
