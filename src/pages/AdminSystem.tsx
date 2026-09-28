import { useCallback, useEffect, useState } from "react";
import { Cpu, Database, Server, RefreshCw, AlertTriangle, LogOut, CheckCircle2, Send } from "lucide-react";
import { PageHeader, Btn, Badge } from "@/components/shared";
import { useAuth } from "@/lib/auth";
import { api, type AdminStats, type TableRow, fmtUptime } from "@/lib/api";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";

/* Live self-check: six probes run one after another so the admin sees each
 * result appear — everything below is read from real endpoints, no fakes. */
type CheckLabel = { ru: string; en: string };
const CHECK_LABELS: CheckLabel[] = [
  { ru: "Шлюз Discord", en: "Discord gateway" },
  { ru: "Хранилище данных", en: "Data storage" },
  { ru: "Реестр команд", en: "Command registry" },
  { ru: "Telegram-оповещения", en: "Telegram alerts" },
  { ru: "Защита от атак", en: "Attack protection" },
  { ru: "Админ-сессия", en: "Admin session" },
];

export default function AdminSystem() {
  const { logout } = useAuth();
  const { t, num, loc } = useI18n();
  const [ov, setOv] = useState<AdminStats | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [status, setStatus] = useState<Awaited<ReturnType<typeof api.status>> | null>(null);
  const [tgConfigured, setTgConfigured] = useState<boolean | null>(null);
  const [db, setDb] = useState<{ tables: TableRow[]; totalRows: number } | null>(null);
  const [checks, setChecks] = useState<{ label: CheckLabel; ok: boolean | null; note: string }[] | null>(null);
  const [checking, setChecking] = useState(false);

  const notify = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 3000);
  };

  const j = useCallback(async <T,>(url: string, opts?: RequestInit): Promise<T | null> => {
    try {
      const r = await fetch(url, { credentials: "include", ...opts });
      if (r.status === 401) {
        setAuthed(false);
        return null;
      }
      if (!r.ok) return null;
      setAuthed(true);
      return (await r.json()) as T;
    } catch {
      setAuthed(false);
      return null;
    }
  }, []);

  const load = useCallback(async () => {
    const c = await j<{ ok: boolean }>("/api/admin/check");
    if (!c) return;
    const o = await j<AdminStats>("/api/admin/overview");
    if (o) setOv(o);
    const d = await j<{ tables: TableRow[]; totalRows: number }>("/api/admin/database");
    setDb(d ?? { tables: [], totalRows: 0 });
  }, [j]);

  useEffect(() => {
    void load();
    void api.status().then(setStatus);
    void j<{ configured: boolean }>("/api/admin/telegram").then((r) => setTgConfigured(r?.configured ?? null));
    const t = setInterval(() => void load(), 10000);
    return () => clearInterval(t);
  }, [load, j]);

  const reloadCmds = async () => {
    const r = await j<{ ok: boolean; message: string }>("/api/admin/reload-commands", { method: "POST" });
    notify(r?.ok ? r.message : t("adm.reloadFail"));
  };

  const runChecks = async () => {
    if (checking) return;
    setChecking(true);
    const acc: { label: CheckLabel; ok: boolean | null; note: string }[] = [];
    const step = async (label: CheckLabel, fn: () => Promise<{ ok: boolean; note?: string }>) => {
      try {
        const r = await fn();
        acc.push({ label, ok: r.ok, note: r.note ?? "" });
      } catch {
        acc.push({ label, ok: false, note: "" });
      }
      setChecks([...acc]);
      await new Promise((res) => setTimeout(res, 170));
    };

    /* Session check FIRST — the admin-only probes below need a live session,
     * otherwise they all read 401 and show "no data". */
    await step(CHECK_LABELS[5], async () => {
      const c = await j<{ ok: boolean }>("/api/admin/check");
      return { ok: Boolean(c?.ok), note: c?.ok ? t("adm.connected") : t("adm.loginRequired") };
    });
    await step(CHECK_LABELS[0], async () => {
      const s = await api.status();
      const on = Boolean(s?.bot.online);
      return { ok: on, note: on ? `${s?.bot.ping ?? "—"}ms` : t("common.offline") };
    });
    await step(CHECK_LABELS[1], async () => {
      const d = await j<{ tables: TableRow[]; totalRows: number }>("/api/admin/database");
      const n = d?.tables.length ?? 0;
      const total = num(d?.totalRows ?? 0);
      return { ok: n > 0, note: n ? `${n} ${t("adm.tablesWord").toLowerCase()} · ${total}` : d === null ? t("adm.loginRequired") : t("adm.noData") };
    });
    await step(CHECK_LABELS[2], async () => {
      const cs = await api.commandsStats();
      const n = cs?.total ?? 0;
      return { ok: n > 0, note: n ? num(n) : t("cmd.registryDown") };
    });
    await step(CHECK_LABELS[3], async () => {
      const tg = await j<{ configured: boolean }>("/api/admin/telegram");
      return { ok: tg?.configured === true, note: tg === null ? t("adm.loginRequired") : tg.configured ? t("adm.connected") : t("adm.notConfigured") };
    });
    await step(CHECK_LABELS[4], async () => {
      const d = await j<{ blocked: number; trackedIps: number }>("/api/admin/ddos");
      if (!d) return { ok: false, note: t("adm.loginRequired") };
      return { ok: true, note: `${num(d.blocked)} ${t("adm.ddosBlocked").toLowerCase()} · ${num(d.trackedIps)} ${t("adm.ddosWatched").toLowerCase()}` };
    });

    setChecking(false);
  };

  /* first run happens by itself so the card is never empty */
  useEffect(() => {
    if (checks === null && !checking) void runChecks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checks, checking]);

  const testTelegram = async () => {
    const r = await fetch("/api/admin/telegram/test", { method: "POST", credentials: "include" });
    if (r.ok) notify(t("adm.testSent"));
    else {
      const e = await r.json().catch(() => ({}));
      notify(`Telegram: ${e.error ?? t("adm.notSent")}`);
    }
  };

  const adminLogout = async () => {
    await fetch("/auth/admin-logout", { method: "POST", credentials: "include" });
    notify(t("adm.sessionEnded"));
    void load();
  };

  if (authed === false) {
    return (
      <div>
        <PageHeader title={t("adm.system")} />
        <div className="adm-panel grid place-items-center py-20 text-center">
          <AlertTriangle className="mb-4 h-10 w-10 text-ink-300" />
          <p className="font-display text-lg font-bold">{t("adm.needAdminAuth")}</p>
          <Btn className="mt-6" onClick={() => (window.location.href = "/admin/login")}>{t("adm.goToLogin")}</Btn>
        </div>
      </div>
    );
  }

  return (
    <div>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed right-6 top-6 z-50 flex items-center gap-2 rounded-2xl border border-white/20 bg-white px-5 py-3 font-display text-sm font-bold text-black shadow-2xl"
        >
          <CheckCircle2 className="h-4 w-4" /> {toast}
        </motion.div>
      )}

      <PageHeader
        title={t("adm.system")}
        subtitle={ov ? `${t("adm.liveSub")} · ${t("ov.uptime")} ${fmtUptime(ov.uptimeSec)}` : t("adm.connecting")}
        actions={
          <>
            <Btn variant="outline" onClick={() => void reloadCmds()}>
              <RefreshCw className="h-4 w-4" /> {t("adm.reload")}
            </Btn>
            <Btn variant="ghost" onClick={() => void adminLogout()}>
              <LogOut className="h-4 w-4" /> {t("adm.adminSession")}
            </Btn>
          </>
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04 }}
        className="adm-panel mb-4 p-6"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-display text-lg font-bold">
              <CheckCircle2 className="h-4 w-4" /> {loc("Системная проверка", "System self-check")}
            </h3>
            <p className="text-xs text-ink-300">
              {loc(
                "Шесть живых проверок: шлюз, хранилище, команды, Telegram, защита и сессия",
                "Six live checks: gateway, storage, commands, Telegram, protection and the session"
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {checks && (
              <span
                className={cn(
                  "rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider",
                  checking
                    ? "border-white/15 text-ink-300"
                    : checks.every((c) => c.ok)
                      ? "border-white/30 bg-white/10 text-white"
                      : "border-red-400/40 bg-red-500/10 text-red-200"
                )}
              >
                {checking
                  ? t("adm.checking")
                  : checks.every((c) => c.ok)
                    ? loc("Всё в порядке", "All systems operational")
                    : loc("Есть проблемы", "Issues found")}
              </span>
            )}
            <Btn variant="outline" className="px-3.5 py-2 text-xs" disabled={checking} onClick={() => void runChecks()}>
              <RefreshCw className={cn("h-3.5 w-3.5", checking && "animate-spin")} /> {loc("Проверить сейчас", "Run checks")}
            </Btn>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {(checks ?? CHECK_LABELS.map((label) => ({ label, ok: null as boolean | null, note: "" }))).map((c, i) => (
            <motion.div
              key={c.label.en}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: c.ok == null ? 0.03 * i : 0, duration: 0.28 }}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-ink-850 px-4 py-3"
            >
              <span
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-xl border",
                  c.ok === null && "animate-pulse border-white/10 text-ink-400",
                  c.ok === true && "border-white/30 bg-white/10 text-white",
                  c.ok === false && "border-red-400/40 bg-red-500/10 text-red-300"
                )}
              >
                {c.ok === null ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : c.ok ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{loc(c.label.ru, c.label.en)}</span>
                <span className="block truncate font-mono text-[11px] text-ink-300">
                  {c.ok === null ? t("adm.checking") : c.note || (c.ok ? t("adm.connected") : t("common.error"))}
                </span>
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="adm-panel p-6 xl:col-span-2"
        >
          <h3 className="mb-5 font-display text-lg font-bold">{t("adm.shardsGateway")}</h3>
          <div className="space-y-3">
            {ov && ov.shardStatus.length > 0 ? (
              ov.shardStatus.map((sh) => (
                <div key={sh.id} className="flex items-center gap-4 rounded-2xl border border-white/5 bg-ink-850 px-4 py-3.5">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/15 bg-ink-800 font-mono text-sm font-bold">
                    #{sh.id}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{sh.status}</p>
                    <p className="text-xs text-ink-300">{sh.ping != null ? `${sh.ping}ms` : t("ov.measuring")}</p>
                  </div>
                  <span className={cn("h-2.5 w-2.5 rounded-full", sh.status === "ready" ? "bg-white" : "bg-ink-400")} />
                </div>
              ))
            ) : (
              <p className="py-8 text-center font-mono text-sm text-ink-300">
                {ov ? t("adm.oneShard") : t("adm.waitingBot")}
              </p>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <div className="adm-panel p-6">
            <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold">
              <Cpu className="h-4 w-4" /> {t("adm.envTitle")}
            </h3>
            <div className="space-y-3 text-sm">
              {[
                { k: "Node.js", v: status?.host.nodeVersion ?? "—" },
                { k: t("adm.platform"), v: status?.host.platform ?? "—" },
                { k: "RSS / Heap", v: ov ? `${ov.memoryMb} / ${ov.heapMb} MB` : "—" },
                { k: t("ov.uptime"), v: ov ? fmtUptime(ov.uptimeSec) : "—" },
              ].map((r) => (
                <div key={r.k} className="flex items-center justify-between">
                  <span className="text-ink-200">{r.k}</span>
                  <span className="font-mono font-semibold">{r.v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="adm-panel p-6">
            <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold">
              <Send className="h-4 w-4" /> {t("adm.telegramTitle")}
            </h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between rounded-xl border border-white/5 bg-ink-850 px-3.5 py-2.5">
                <span className="text-ink-200">{t("adm.statusWord")}</span>
                <span className={cn("rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider", tgConfigured ? "border-white/30 bg-white/10" : "border-white/10 text-ink-300")}>
                  {tgConfigured === null ? t("adm.checking") : tgConfigured ? t("adm.connected") : t("adm.notConfigured")}
                </span>
              </div>
              <button
                onClick={() => void testTelegram()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-3.5 py-2.5 font-semibold transition-colors hover:border-white/50 hover:bg-white/5"
              >
                <Send className="h-3.5 w-3.5" /> {t("adm.sendTest")}
              </button>
              {tgConfigured === false && (
                <p className="font-mono text-[11px] leading-relaxed text-ink-300">
                  {t("adm.telegramHint")}
                </p>
              )}
            </div>
          </div>

          <div className="adm-panel p-6">
            <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold">
              <Database className="h-4 w-4" /> {t("adm.storageTitle")}
            </h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between rounded-xl border border-white/5 bg-ink-850 px-3.5 py-2.5">
                <span className="text-ink-200">{t("adm.storageWord")}</span>
                <span className={cn("rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider", db?.tables.length ? "border-white/30 bg-white/10" : "border-white/10 text-ink-300")}>
                  {db === null ? t("adm.checking") : db.tables.length ? t("adm.storageConnected") : t("adm.noData")}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/5 bg-ink-850 px-3.5 py-2.5">
                <span className="text-ink-200">{t("adm.models")}</span>
                <span className="font-mono font-semibold">{db ? db.tables.length : "—"}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/5 bg-ink-850 px-3.5 py-2.5">
                <span className="text-ink-200">{t("adm.rowsInStore")}</span>
                <span className="font-mono font-semibold">{db ? num(db.totalRows) : "—"}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6 rounded-3xl border border-white/25 bg-gradient-to-b from-ink-900 to-ink-950 p-6"
      >
        <h3 className="mb-1 flex items-center gap-2 font-display text-lg font-bold">
          <AlertTriangle className="h-5 w-5" /> {t("adm.dangerZone")}
        </h3>
        <p className="text-sm text-ink-300">{t("adm.dangerSub")}</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <button
            onClick={() => void reloadCmds()}
            className="group rounded-2xl border border-white/15 bg-ink-900 p-5 text-left transition-all hover:border-white hover:bg-white hover:text-black"
          >
            <p className="flex items-center gap-2 font-display font-bold">
              <Server className="h-4 w-4" /> {t("adm.reloadAll")}
            </p>
            <p className="mt-1 text-xs text-ink-300 group-hover:text-black/60">{t("adm.reloadAllSub")}</p>
          </button>
          <button
            onClick={() => void adminLogout()}
            className="group rounded-2xl border border-white/15 bg-ink-900 p-5 text-left transition-all hover:border-white hover:bg-white hover:text-black"
          >
            <p className="flex items-center gap-2 font-display font-bold">
              <LogOut className="h-4 w-4" /> {t("adm.endSession")}
            </p>
            <p className="mt-1 text-xs text-ink-300 group-hover:text-black/60">{t("adm.endSessionSub")}</p>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
