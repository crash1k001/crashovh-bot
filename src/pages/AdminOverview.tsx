import { useCallback, useEffect, useRef, useState } from "react";
import {
  Users, Server, ShieldAlert, Cpu, RefreshCw, Megaphone, Ban,
  Command, ScrollText, KeyRound, LogOut, Activity, CheckCircle2, Play,
  LifeBuoy, Terminal, ShieldCheck, Gift, Database, Ticket, Search, Gauge, Wifi,
  LayoutGrid, ArrowRight, Lock,
} from "lucide-react";
import { PageHeader, Badge, Btn, StatCard, BotAvatar } from "@/components/shared";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { fmtUptime, api, type GiveawayRow, type TableRow, type BotTicketRow, type AdminAccountRow } from "@/lib/api";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useI18n, type TKey } from "@/lib/i18n";
import {
  OverviewTab, GuildsTab, CommandsTab, ModLogsTab, TicketsTab, GiveawaysTab, DatabaseTab,
  BlacklistTab, NoprefixTab, BroadcastTab, VlogsTab, SupportTab, AuditTab, LogsTab, SecurityTab,
  AccountsTab,
  type Overview, type GuildRow, type BlackRow, type NpRow, type AuditRow, type ModLog,
  type VlogRow, type TicketRow, type BotLogRow,
} from "./AdminTabs";
import ControlTab from "./AdminControl";

/* The panel is a hub of modules: every section is a tile on the right rail with
 * a live counter, and the opened module renders in the main column. Tiles map
 * 1:1 to permission bits — an admin without the bit sees a lock, not a 403. */
const MODULES: {
  key: string; tab: TabKey2; labelKey: TKey; subKey: TKey; icon: typeof Activity;
  perm?: string; counter?: (ov: Overview | null, extra: HubExtra) => string | null;
}[] = [
  { key: "giveaways", tab: "giveaways", labelKey: "adm.modGiveaways", subKey: "adm.modGiveawaysSub", icon: Gift, perm: "giveaways", counter: (ov) => (ov?.counts?.giveawaysActive != null ? String(ov.counts.giveawaysActive) : null) },
  { key: "blacklist", tab: "blacklist", labelKey: "adm.modBlacklist", subKey: "adm.modBlacklistSub", icon: Ban, perm: "moderation", counter: (ov) => (ov?.counts?.blacklist != null ? String(ov.counts.blacklist) : null) },
  { key: "tickets", tab: "support", labelKey: "adm.modTickets", subKey: "adm.modTicketsSub", icon: LifeBuoy, perm: "community", counter: (ov) => (ov?.counts?.ticketsOpen != null ? String(ov.counts.ticketsOpen) : null) },
  { key: "vlogs", tab: "vlogs", labelKey: "adm.modVlogs", subKey: "adm.modVlogsSub", icon: Play, perm: "content" },
  { key: "broadcast", tab: "broadcast", labelKey: "adm.modBroadcast", subKey: "adm.modBroadcastSub", icon: Megaphone, perm: "broadcast" },
  { key: "security", tab: "security", labelKey: "adm.modSecurity", subKey: "adm.modSecuritySub", icon: ShieldCheck, perm: "security" },
  { key: "commands", tab: "commands", labelKey: "adm.modCommands", subKey: "adm.modCommandsSub", icon: Command, perm: "overview", counter: (ov) => (ov?.commands != null ? String(ov.commands) : null) },
  { key: "guilds", tab: "guilds", labelKey: "adm.modGuilds", subKey: "adm.modGuildsSub", icon: Server, perm: "overview", counter: (ov) => (ov?.guilds != null ? String(ov.guilds) : null) },
  { key: "modlogs", tab: "modlogs", labelKey: "adm.modlogs", subKey: "adm.modlogs", icon: ScrollText, perm: "moderation" },
  { key: "botlog", tab: "logs", labelKey: "adm.modLogs", subKey: "adm.modLogsSub", icon: Terminal, perm: "security" },
  { key: "database", tab: "database", labelKey: "adm.modDatabase", subKey: "adm.modDatabaseSub", icon: Database, perm: "system", counter: (ov, e) => (e?.tableCount != null ? String(e.tableCount) : null) },
  { key: "control", tab: "control", labelKey: "adm.modControl", subKey: "adm.modControlSub", icon: Gauge, perm: "control" },
  { key: "accounts", tab: "accounts", labelKey: "adm.modAccounts", subKey: "adm.modAccountsSub", icon: Users, perm: "accounts", counter: (_ov, e) => (e?.accountCount != null ? String(e.accountCount) : null) },
];

type TabKey2 =
  | "overview" | "guilds" | "commands" | "logs" | "modlogs" | "tickets" | "support"
  | "giveaways" | "vlogs" | "broadcast" | "blacklist" | "noprefix" | "security"
  | "audit" | "database" | "accounts" | "control";

type HubExtra = { tableCount?: number | null; accountCount?: number | null };

export default function AdminOverview() {
  const { refresh } = useAuth();
  const { t, num } = useI18n();
  /* Tab lives in ?tab= — a refresh, a shared link or the back button keeps
   * the admin where they were instead of always jumping back to Overview. */
  const [tab, setTabState] = useState<TabKey2>(() => {
    const q = new URLSearchParams(window.location.search).get("tab");
    return VALID_TABS.includes(q as TabKey2) ? (q as TabKey2) : "overview";
  });
  const setTab = useCallback((k: TabKey2) => {
    setTabState(k);
    const url = new URL(window.location.href);
    if (k === "overview") url.searchParams.delete("tab");
    else url.searchParams.set("tab", k);
    window.history.replaceState(null, "", url);
  }, []);

  const [ok, setOk] = useState<boolean | null>(null);
  const [errCode, setErrCode] = useState<string | null>(null);
  const [ov, setOv] = useState<Overview | null>(null);
  const [hub, setHub] = useState<HubExtra>({});
  const [guilds, setGuilds] = useState<GuildRow[] | null>(null);
  const [black, setBlack] = useState<BlackRow[]>([]);
  const [np, setNp] = useState<NpRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [modlogs, setModlogs] = useState<ModLog[]>([]);
  const [vlogs, setVlogs] = useState<VlogRow[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [botLogs, setBotLogs] = useState<BotLogRow[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [giveaways, setGiveaways] = useState<GiveawayRow[]>([]);
  const [dbTables, setDbTables] = useState<TableRow[]>([]);
  const [botTickets, setBotTickets] = useState<BotTicketRow[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<number | null>(null);

  const notify = useCallback((m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const j = useCallback(async <T,>(url: string, opts?: RequestInit): Promise<T | null> => {
    try {
      /* Content-Type must be set explicitly: without it express.json() skips
         parsing, the server sees an empty body, and every mutation silently fails. */
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const hasBody = opts?.body != null;
      const r = await fetch(url, { credentials: "include", ...opts, headers: hasBody ? headers : opts?.headers });
      if (r.status === 401 || r.status === 403 || r.status === 503) {
        const body = await r.json().catch(() => null) as { code?: string } | null;
        if (r.status !== 403) { setOk(false); setErrCode(body?.code ?? null); return null; }
        return null;
      }
      if (!r.ok) return null;
      setOk(true);
      return (await r.json()) as T;
    } catch { setOk(false); return null; }
  }, []);

  /* Lightweight poll: only the KPI strip (1 request / 10s). The heavy lists
   * below refresh on their own slower timer. */
  const loadCore = useCallback(async () => {
    const o = await j<Overview>("/api/admin/overview");
    if (o) {
      setOv(o);
      setLastSync(Date.now());
    }
  }, [j]);

  const loadAll = useCallback(async () => {
    const o = await j<Overview>("/api/admin/overview");
    if (o) { setOv(o); setLastSync(Date.now()); }
    const g = await j<{ guilds: GuildRow[] }>("/api/admin/guilds");
    if (g) setGuilds(g.guilds);
    const b = await j<{ blacklist: BlackRow[] }>("/api/admin/blacklist");
    if (b) setBlack(b.blacklist);
    const n = await j<{ noprefix: NpRow[] }>("/api/admin/noprefix");
    if (n) setNp(n.noprefix);
    const a = await j<{ audit: AuditRow[] }>("/api/admin/audit");
    if (a) setAudit(a.audit);
    const m = await j<{ logs: ModLog[] }>("/api/admin/modlogs");
    if (m) setModlogs(m.logs);
    const v = await j<{ vlogs: VlogRow[] }>("/api/admin/vlogs");
    if (v) setVlogs(v.vlogs);
    const s = await j<{ tickets: TicketRow[]; open: number }>("/api/admin/support");
    if (s) { setTickets(s.tickets); setOpenCount(s.open); }
    const l = await j<{ logs: BotLogRow[] }>("/api/admin/logs");
    if (l) setBotLogs(l.logs);
    const gw = await j<{ giveaways: GiveawayRow[] }>("/api/admin/giveaways");
    if (gw) setGiveaways(gw.giveaways);
    const db = await j<{ tables: TableRow[] }>("/api/admin/database");
    if (db) { setDbTables(db.tables); setHub((h) => ({ ...h, tableCount: db.tables?.length ?? null })); }
    const bt = await j<{ recent: BotTicketRow[] }>("/api/admin/tickets");
    if (bt) setBotTickets(bt.recent ?? []);
  }, [j]);

  const loadAccounts = useCallback(async () => {
    const a = await j<{ accounts: AdminAccountRow[] }>("/api/admin/accounts");
    if (a) setHub((h) => ({ ...h, accountCount: a.accounts?.length ?? null }));
  }, [j]);

  useEffect(() => {
    void (async () => {
      const c = await j<{ ok: boolean }>("/api/admin/check");
      if (!c) {
        await refresh();
      } else {
        void loadAll();
      }
    })();
  }, [j, loadAll, refresh]);

  useEffect(() => {
    if (ok === false) return;
    const core = setInterval(() => void loadCore(), 10_000);
    const lists = setInterval(() => void loadAll(), 30_000);
    return () => {
      clearInterval(core);
      clearInterval(lists);
    };
  }, [ok, loadAll, loadCore]);

  /* ------------------------------- actions -------------------------------- */

  const leaveGuild = async (id: string, name: string) => {
    if (!confirm(`${t("adm.leaveConfirm")} «${name}»?`)) return;
    const r = await j<{ ok: boolean }>(`/api/admin/guilds/${id}/leave`, { method: "POST" });
    notify(r?.ok ? `${t("adm.leftGuild")} ${name}` : t("common.error"));
    void loadAll();
  };

  const addBlack = async (type: string, targetId: string, reason: string) => {
    const r = await j<{ ok: boolean }>("/api/admin/blacklist", { method: "POST", body: JSON.stringify({ type, targetId, reason }) });
    notify(r?.ok ? t("adm.blackAdded") : t("common.error"));
    void loadAll();
  };
  const delBlack = async (id: number) => {
    const r = await j<{ ok: boolean }>(`/api/admin/blacklist/${id}`, { method: "DELETE" });
    notify(r?.ok ? t("adm.removed") : t("common.error"));
    void loadAll();
  };
  const addNp = async (userId: string) => {
    const r = await j<{ ok: boolean }>("/api/admin/noprefix", { method: "POST", body: JSON.stringify({ userId }) });
    notify(r?.ok ? t("adm.npGranted") : t("common.error"));
    void loadAll();
  };
  const delNp = async (userId: string) => {
    const r = await j<{ ok: boolean }>(`/api/admin/noprefix/${userId}`, { method: "DELETE" });
    notify(r?.ok ? t("adm.npRemoved") : t("common.error"));
    void loadAll();
  };
  const broadcast = async (message: string) => {
    const r = await j<{ ok: boolean; sent: number; failed: number }>("/api/admin/broadcast", { method: "POST", body: JSON.stringify({ message }) });
    notify(r?.ok ? `${t("adm.sent")} ${r.sent} ${t("adm.serversWord")} (${t("adm.failedWord")}: ${r.failed})` : t("common.error"));
  };
  const reloadCmds = async () => {
    const r = await j<{ ok: boolean; message: string }>("/api/admin/reload-commands", { method: "POST" });
    notify(r?.ok ? r.message : t("adm.reloadFail"));
    void loadAll();
  };
  const createVlog = async (title: string, body: string, tag: string, published: boolean, images: string[] = []) => {
    const r = await j<{ ok: boolean }>("/api/admin/vlogs", { method: "POST", body: JSON.stringify({ title, body, tag, published, images }) });
    notify(r?.ok ? (published ? t("adm.vlogPublished") : t("adm.vlogDraft")) : t("adm.checkFields"));
    void loadAll();
  };
  const toggleVlog = async (id: string, published: boolean) => {
    const r = await j<{ ok: boolean }>(`/api/admin/vlogs/${id}`, { method: "PATCH", body: JSON.stringify({ published }) });
    notify(r?.ok ? (published ? t("adm.published") : t("adm.hidden")) : t("common.error"));
    void loadAll();
  };
  const deleteVlog = async (id: string) => {
    if (!confirm(t("adm.vlogDeleteConfirm"))) return;
    const r = await j<{ ok: boolean }>(`/api/admin/vlogs/${id}`, { method: "DELETE" });
    notify(r?.ok ? t("adm.vlogDeleted") : t("common.error"));
    void loadAll();
  };
  const supportReply = async (id: string, text: string) => {
    const r = await j<{ ok: boolean }>(`/api/admin/support/${id}/reply`, { method: "POST", body: JSON.stringify({ text }) });
    notify(r?.ok ? t("adm.replySent") : t("common.error"));
    void loadAll();
  };
  const supportStatus = async (id: string, status: string) => {
    const r = await j<{ ok: boolean }>(`/api/admin/support/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    notify(r?.ok ? t("adm.statusUpdated") : t("common.error"));
    void loadAll();
  };
  const supportDelete = async (id: string) => {
    if (!confirm(t("adm.ticketDeleteConfirm"))) return;
    const r = await j<{ ok: boolean }>(`/api/admin/support/${id}`, { method: "DELETE" });
    notify(r?.ok ? t("adm.ticketDeleted") : t("common.error"));
    void loadAll();
  };
  const endGiveaway = async (id: number, prize: string) => {
    const r = await j<{ ok: boolean }>(`/api/admin/giveaways/${id}/end`, { method: "POST" });
    notify(r?.ok ? `${t("adm.gwEnded")} «${prize}»` : t("common.error"));
    void loadAll();
  };
  const deleteGiveaway = async (id: number) => {
    if (!confirm(t("adm.gwDeleteConfirm"))) return;
    const r = await j<{ ok: boolean }>(`/api/admin/giveaways/${id}`, { method: "DELETE" });
    notify(r?.ok ? t("adm.gwDeleted") : t("common.error"));
    void loadAll();
  };
  const adminLogout = async () => {
    await fetch("/auth/admin-logout", { method: "POST", credentials: "include" });
    await refresh();
    window.location.href = "/admin";
  };

  /* ------------------------------ login gate ------------------------------ */

  if (ok === false) {
    const notConfigured = errCode === "admin_not_configured";
    return (
      <div>
        <PageHeader title={t("adm.title")} subtitle={t("adm.loginRequired")} />
        <div className="adm-panel grid place-items-center py-20 text-center">
          <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-white/15 bg-ink-800">
            <ShieldAlert className="h-6 w-6 text-ink-200" />
          </span>
          <p className="font-display text-lg font-bold">{notConfigured ? t("adm.needAdminAuth") : t("adm.needAdminAuth")}</p>
          <p className="mt-2 max-w-md text-sm text-ink-300">
            {notConfigured
              ? t("adm.enterCredentials")
              : t("adm.goToLogin")}
          </p>
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
          className="fixed right-4 top-20 z-50 flex items-center gap-2 rounded-xl border border-white/25 bg-white px-4 py-3 font-display text-sm font-bold text-black shadow-[0_20px_60px_rgba(0,0,0,.55)] md:right-6 md:top-6"
        >
          <CheckCircle2 className="h-4 w-4" /> {toast}
        </motion.div>
      )}

      {/* ── header: the same visual language as /dashboard ──────────────── */}
      <PageHeader
        title={t("adm.title")}
        subtitle={ov ? `${t("adm.liveSub")} · ${t("ov.uptime")} ${fmtUptime(ov.uptimeSec)}` : t("adm.connecting")}
        actions={
          <>
            <BotAvatar className="h-11 w-11 rounded-2xl" />
            <Badge className="border-white/40">
              <span className="relative flex h-2 w-2">
                <span className="absolute h-full w-full animate-ping rounded-full bg-white opacity-60" />
                <span className="relative h-2 w-2 rounded-full bg-white" />
              </span>
              {t("common.live")}
            </Badge>
            <Btn variant="outline" className="px-3.5 py-2 text-xs" onClick={() => void reloadCmds()}>
              <RefreshCw className="h-3.5 w-3.5" /> {t("adm.reload")}
            </Btn>
            <Btn variant="ghost" className="px-3.5 py-2 text-xs" onClick={() => void adminLogout()}>
              <LogOut className="h-3.5 w-3.5" /> {t("nav.logout")}
            </Btn>
          </>
        }
      />

      {/* live KPI row — the same StatCard language as the user dashboard */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card-in" style={{ animationDelay: "0s" }}>
          <StatCard index={0} label={t("ov.guilds")} value={ov ? String(ov.guilds) : "—"} sub={t("ov.guildsSub")} icon={Server} />
        </div>
        <div className="card-in" style={{ animationDelay: "0.06s" }}>
          <StatCard index={1} label={t("ov.users")} value={ov ? num(ov.users) : "—"} sub={t("ov.usersSub")} icon={Users} />
        </div>
        <div className="card-in" style={{ animationDelay: "0.12s" }}>
          <StatCard index={2} label={t("adm.openTickets")} value={ov ? String(ov.counts?.ticketsOpen ?? 0) : "—"} sub={t("adm.openTickets")} icon={Ticket} />
        </div>
        <div className="card-in" style={{ animationDelay: "0.18s" }}>
          <StatCard index={3} label={t("ov.ping")} value={ov?.ping != null ? `${Math.round(ov.ping)}ms` : "—"} sub={t("ov.pingSub")} icon={Wifi} />
        </div>
      </div>

      {/* ── module hub: main column + tiles rail ───────────────────────── */}
      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* main column: overview or the opened module */}
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="min-w-0"
        >
          {tab === "overview" && <OverviewTab ov={ov} />}
          {tab === "guilds" && <GuildsTab guilds={guilds} onLeave={leaveGuild} />}
          {tab === "commands" && <CommandsTab ov={ov} />}
          {tab === "modlogs" && <ModLogsTab logs={modlogs} />}
          {tab === "tickets" && <TicketsTab rows={botTickets} counts={ov?.counts} />}
          {tab === "giveaways" && <GiveawaysTab rows={giveaways} onEnd={endGiveaway} onDelete={deleteGiveaway} />}
          {tab === "database" && <DatabaseTab tables={dbTables} />}
          {tab === "blacklist" && <BlacklistTab rows={black} onAdd={addBlack} onDel={delBlack} />}
          {tab === "noprefix" && <NoprefixTab rows={np} onAdd={addNp} onDel={delNp} />}
          {tab === "broadcast" && <BroadcastTab onSend={broadcast} />}
          {tab === "vlogs" && <VlogsTab rows={vlogs} onCreate={createVlog} onToggle={toggleVlog} onDelete={deleteVlog} />}
          {tab === "support" && <SupportTab tickets={tickets} openCount={openCount} onReply={supportReply} onStatus={supportStatus} onDelete={supportDelete} />}
          {tab === "audit" && <AuditTab rows={audit} />}
          {tab === "logs" && <LogsTab rows={botLogs} />}
          {tab === "security" && <SecurityTab notify={notify} />}
          {tab === "accounts" && <AccountsTab notify={notify} />}
          {tab === "control" && <ControlTab notify={notify} />}
        </motion.div>

        {/* right rail: module tiles with live counters */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="adm-panel p-3">
            <div className="flex items-center gap-2 px-1 pb-2 pt-1">
              <LayoutGrid className="h-4 w-4 text-ink-200" />
              <p className="font-display text-sm font-bold">{t("adm.hubTitle")}</p>
            </div>
            <div className="max-h-[70vh] space-y-1.5 overflow-y-auto pr-0.5">
              {MODULES.map((m, i) => {
                const active = tab === m.tab;
                const count = m.counter?.(ov, hub) ?? null;
                return (
                  <button
                    key={m.key}
                    onClick={() => setTab(m.tab)}
                    aria-current={active ? "page" : undefined}
                    style={{ animationDelay: `${i * 0.03}s` }}
                    className={cn(
                      "card-in group flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all",
                      active
                        ? "border-white/70 bg-white text-black"
                        : "border-white/10 bg-ink-800/60 hover:-translate-y-0.5 hover:border-white/35 hover:bg-ink-800"
                    )}
                  >
                    <span className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-xl border",
                      active ? "border-black/15 bg-black/5" : "border-white/15 bg-ink-900"
                    )}>
                      <m.icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-sm font-bold">{t(m.labelKey)}</span>
                      <span className={cn("block truncate text-[11px]", active ? "text-black/60" : "text-ink-300")}>
                        {t(m.subKey)}
                      </span>
                    </span>
                    {count != null ? (
                      <span className={cn(
                        "shrink-0 rounded-lg border px-2 py-1 font-mono text-[11px] font-bold",
                        active ? "border-black/20 bg-black/5" : "border-white/15 bg-black/30"
                      )}>
                        {count}
                      </span>
                    ) : (
                      <ArrowRight className={cn("h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5", active ? "text-black/50" : "text-ink-400")} />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="px-1 pt-2 text-[10px] text-ink-400">{t("adm.hubSub")}</p>
          </div>
        </aside>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-400">
        <span className="flex items-center gap-2">
          <Badge className="gap-1">
            <ShieldCheck className="h-3 w-3" /> {t("adm.adminBadge")}
          </Badge>
          Niko Control Center
        </span>
        <span className="font-mono">{lastSync ? `${t("adm.lastSync")} ${new Date(lastSync).toLocaleTimeString()}` : t("adm.liveSub")}</span>
      </div>
    </div>
  );
}

const VALID_TABS: TabKey2[] = [
  "overview", "guilds", "commands", "logs", "modlogs", "tickets", "support",
  "giveaways", "vlogs", "broadcast", "blacklist", "noprefix", "security",
  "audit", "database", "accounts", "control",
];
