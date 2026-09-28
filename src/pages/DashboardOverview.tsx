import { useEffect, useMemo, useRef, useState } from "react";
import { Zap, Users, Server, Timer, Wifi, Terminal, Activity, LifeBuoy, Shield } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { PageHeader, StatCard, Badge, NikoEmoji, BotAvatar, useBotStatus } from "@/components/shared";
import { api, type BotStatus, type AdminStats, type DashboardGuild, fmtUptime } from "@/lib/api";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

type Point = { t: string; v: number };

export default function Overview() {
  const { session } = useAuth();
  const { t, num, locale } = useI18n();
  const hello = session?.user ? `${t("ov.hello")}, ${session.user.username}` : t("nav.dashboard");
  /* Live console = bot internals (dashboard boot, shards, gateway errors).
   * That's owner information — regular members get stats without it. */
  const isAdmin = session?.isAdmin === true;
  /* Status comes from the shared app-wide store — this page no longer runs
   * its own /api/status poller. */
  const status = useBotStatus() as BotStatus | null;
  const live = status != null;
  /* "Booted" = the shared store answered at least once (live OR explicitly
   * null after a failed fetch) — until then we show skeletons. */
  const [statusSeen, setStatusSeen] = useState(false);
  const booted = live || statusSeen;
  const [history, setHistory] = useState<Point[]>([]);
  const [usage, setUsage] = useState<AdminStats["commandUsage"]>([]);
  const [guilds, setGuilds] = useState<DashboardGuild[]>([]);
  const [feed, setFeed] = useState<{ ts: number; level: string; text: string }[]>([]);
  /* Real command categories from the bot's registry (non-admin view). */
  const [cats, setCats] = useState<{ name: string; count: number }[]>([]);
  const [catsOk, setCatsOk] = useState<boolean | null>(null);
  const lastSample = useRef(0);

  /* Chart history: one point per minute — stable and cheap. Fed from the
   * shared status store instead of a private poller. */
  useEffect(() => {
    if (!status) {
      /* The shared store broadcasts null both before the first fetch and when
       * the bot is unreachable; a short grace period avoids flashing the
       * offline state during the very first seconds after page load. */
      const t = window.setTimeout(() => setStatusSeen(true), 3500);
      return () => window.clearTimeout(t);
    }
    setStatusSeen(true);
    const now = Date.now();
    if (now - lastSample.current > 55_000) {
      lastSample.current = now;
      setHistory((h) =>
        [...h, { t: new Date(now).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }), v: status.bot.guilds }].slice(-30)
      );
    }
  }, [status, locale]);

  useEffect(() => {
    let stop = false;

    /* Real command counters, the user's own servers and (for admins only)
     * the live event console — straight from the bot process. */
    const side = async () => {
      const m = await api.metrics();
      if (!stop && m) setUsage(m.commandUsage ?? []);
      const g = await api.myGuilds();
      if (!stop && g) setGuilds(g);
      const cs = await api.commandsStats();
      if (!stop && cs) {
        setCats(
          Object.entries(cs.byCategory)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
        );
        setCatsOk(true);
      } else if (!stop) {
        setCatsOk(false);
      }
      if (!stop && isAdmin) {
        const a = await api.activity();
        if (a) setFeed(a);
      } else if (!stop) {
        setFeed([]); // non-admin: never show bot logs
      }
    };    void side();
    const sideTimer = setInterval(() => void side(), 8_000);

    return () => {
      stop = true;
      clearInterval(sideTimer);
    };
  }, [isAdmin]);

  const b = status?.bot;
  const host = status?.host;
  const shards = host?.shards ?? [];

  /* Command counts by registry type (slash / prefix), derived from the
   * shared status payload — pure derivation, no extra requests. */
  const cmdTypes = [
    { name: "slash", count: b?.commandsSlash ?? 0 },
    { name: "prefix", count: b?.commandsPrefix ?? 0 },
  ].filter((x) => x.count > 0);
  const cmdTypeMax = Math.max(1, ...cmdTypes.map((x) => x.count));

  const chartData = useMemo<Point[]>(
    () => (history.length > 1 ? history : [{ t: "—", v: b?.guilds ?? 0 }]),
    [history, b?.guilds]
  );

  /* ------------------------------ loading state --------------------------- */
  // До первого ответа API показываем скелетоны — экран никогда не мигает.
  if (!booted) {
    return (
      <div>
        <PageHeader title={hello} subtitle={t("ov.connecting")} />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[120px] animate-pulse rounded-2xl border border-white/10 bg-ink-900" style={{ animationDelay: `${i * 120}ms` }} />
          ))}
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="h-[320px] animate-pulse rounded-3xl border border-white/10 bg-ink-900 lg:col-span-2" />
          <div className="h-[320px] animate-pulse rounded-3xl border border-white/10 bg-ink-900" />
        </div>
      </div>
    );
  }

  /* ------------------------------- offline state -------------------------- */
  if (!live) {
    return (
      <div>
        <PageHeader title={hello} subtitle={t("ov.waiting")} />
        <div className="grid place-items-center rounded-3xl border border-white/15 bg-ink-900 py-20 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl border border-white/15 bg-ink-800">
            <Wifi className="h-6 w-6 text-ink-300" />
          </div>
          <p className="mt-5 font-display text-xl font-bold">{t("ov.notRunning")}</p>
          <p className="mt-2 max-w-md text-sm text-ink-300">{t("ov.notRunningHint")}</p>
          <code className="mt-5 rounded-xl border border-white/10 bg-ink-850 px-4 py-2.5 font-mono text-xs text-ink-200">
            cd bot && node src/client.js
          </code>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={hello}
        subtitle={t("ov.subtitle")}
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
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card-in" style={{ animationDelay: "0s" }}><StatCard index={0} label={t("ov.guilds")} value={String(b?.guilds ?? "—")} sub={t("ov.guildsSub")} icon={Server} /></div>
        <div className="card-in" style={{ animationDelay: "0.06s" }}><StatCard index={1} label={t("ov.users")} value={b ? num(b.users) : "—"} sub={t("ov.usersSub")} icon={Users} /></div>
        <div className="card-in" style={{ animationDelay: "0.12s" }}><StatCard index={2} label={t("ov.commands")} value={String(b?.commands ?? "—")} sub={t("ov.commandsSub")} icon={Zap} /></div>
        <div className="card-in" style={{ animationDelay: "0.18s" }}><StatCard index={3} label={t("ov.ping")} value={b?.ping != null ? `${b.ping}ms` : "—"} sub={t("ov.pingSub")} icon={Wifi} /></div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-white/10 bg-ink-900 p-6 lg:col-span-2"
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-bold">{t("ov.chartTitle")}</h3>
              <p className="text-xs text-ink-300">{t("ov.chartSub")}</p>
            </div>
            <Badge>{num(b?.guilds ?? 0)} {t("ov.now")}</Badge>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gServers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="t" stroke="#555" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#555" fontSize={11} tickLine={false} axisLine={false} width={44} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, fontSize: 12 }}
                />
                <Area type="monotone" dataKey="v" stroke="#fff" strokeWidth={2} fill="url(#gServers)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="space-y-4"
        >
          <div className="rounded-3xl border border-white/10 bg-ink-900 p-6">
            <h3 className="mb-4 font-display text-lg font-bold">{t("ov.bot")}</h3>
            <div className="flex items-center gap-3">
              {/* BotAvatar already handles: real avatar → default Discord face → Niko mark */}
              <BotAvatar className="h-12 w-12 rounded-2xl" />
              <div className="min-w-0">
                <p className="truncate font-display font-bold">{b?.tag ?? b?.name ?? "—"}</p>
                <p className="truncate font-mono text-xs text-ink-300">{b?.id ?? "—"}</p>
              </div>
            </div>
            <div className="mt-5 space-y-3 text-sm">
              {[
                { icon: Timer, k: t("ov.uptime"), v: b ? fmtUptime(b.uptimeSec) : "—" },
                { icon: Server, k: t("ov.channels"), v: String(b?.channels ?? "—") },
              ].map((r) => (
                <div key={r.k} className="flex items-center justify-between">
                  <span className="flex items-center gap-2.5 text-ink-200">
                    <r.icon className="h-4 w-4" /> {r.k}
                  </span>
                  <span className="font-mono font-semibold">{r.v}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Shards are process internals — they only make sense to the bot
         * owner. Regular members get the real command categories instead. */}
        {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="rounded-3xl border border-white/10 bg-ink-900 p-6"
        >
          <h3 className="mb-1 font-display text-lg font-bold">{t("ov.shards")}</h3>
          <p className="mb-4 text-xs text-ink-300">{t("ov.shardsSub")}</p>
          <div className="space-y-3">
            {shards.length > 0 ? (
              shards.map((sh) => (
                <div key={sh.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-ink-850 px-4 py-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/15 bg-ink-800 font-mono text-xs font-bold">
                    #{sh.id}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{sh.status}</p>
                    <p className="font-mono text-[11px] text-ink-300">{sh.ping != null ? `${sh.ping}ms` : t("ov.measuring")}</p>
                  </div>
                  <span className={`h-2 w-2 rounded-full ${sh.status === "ready" ? "bg-white" : "bg-ink-400"}`} />
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-white/5 bg-ink-850 px-4 py-4 text-center font-mono text-xs text-ink-300">
                {t("ov.noShards")}
              </div>
            )}
          </div>
        </motion.div>
        )}

        {!isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="rounded-3xl border border-white/10 bg-ink-900 p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="flex items-center gap-2 font-display text-lg font-bold">
                <NikoEmoji name="target" fallback="✨" /> {t("ov.modules")}
              </h3>
              <p className="text-xs text-ink-300">{t("ov.modulesSub")}</p>
            </div>
            <Link to="/dashboard/commands" className="text-xs font-bold text-white/70 transition-colors hover:text-white">
              {t("ov.all")}
            </Link>
          </div>
          {cats.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {cats.map((c, i) => (
                <motion.span
                  key={c.name}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * i, duration: 0.3 }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-ink-850 px-3 py-2 text-xs font-semibold transition-colors hover:border-white/30"
                >
                  {c.name}
                  <span className="font-mono text-[10px] text-ink-300">{num(c.count)}</span>
                </motion.span>
              ))}
            </div>
          ) : catsOk === false ? (
            <p className="py-10 text-center font-mono text-xs text-ink-300">{t("cmd.registryDown")}</p>
          ) : (
            <p className="py-10 text-center font-mono text-xs text-ink-300">{t("common.loading")}</p>
          )}
        </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="flex flex-col rounded-3xl border border-white/10 bg-ink-900 p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="flex items-center gap-2 font-display text-lg font-bold">
                <NikoEmoji name="chart" fallback="💻" />
                {t("ov.console")}
              </h3>
              <p className="text-xs text-ink-300">{t("ov.consoleSub")}</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-200">
              <Terminal className="h-3 w-3" />
              {t("ov.consoleStream")}
            </div>
          </div>
          <div className="max-h-[280px] min-h-[180px] flex-1 space-y-1.5 overflow-y-auto rounded-2xl border border-white/5 bg-ink-950 p-3 font-mono text-[11px] leading-relaxed">
            {!isAdmin ? (
              <p className="grid h-full place-items-center text-ink-400">{t("ov.consoleAdminOnly")}</p>
            ) : feed.length > 0 ? (
              feed.map((e, i) => (
                <motion.div
                  key={`${e.ts}-${i}`}
                  initial={i === 0 ? { opacity: 0, x: -6 } : false}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex gap-2"
                >
                  <span className="shrink-0 text-ink-500">
                    {new Date(e.ts).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 font-bold",
                      e.level === "error" && "text-red-400",
                      e.level === "warn" && "text-amber-300",
                      e.level === "success" && "text-emerald-300",
                      e.level === "cmd" && "text-white",
                      e.level !== "error" && e.level !== "warn" && e.level !== "success" && e.level !== "cmd" && "text-ink-300"
                    )}
                  >
                    {e.level}
                  </span>
                  <span className="break-all text-ink-200">{e.text}</span>
                </motion.div>
              ))
            ) : (
              <p className="grid h-full place-items-center text-ink-400">{t("ov.consoleEmpty")}</p>
            )}
          </div>
        </motion.div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-3xl border border-white/10 bg-ink-900 p-6"
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-bold">{t("ov.topCommands")}</h3>
              <p className="text-xs text-ink-300">{t("ov.topCommandsSub")}</p>
            </div>
            <Badge>{num(usage.reduce((a, u) => a + u.uses, 0))} {t("ov.calls")}</Badge>
          </div>
          {usage.length > 0 ? (
            <div className="space-y-3">
              {usage.slice(0, 5).map((u, i) => (
                <div key={u.name}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="font-mono font-semibold">/{u.name}</span>
                    <span className="font-mono text-xs text-ink-300">{u.uses} {t("cmd.used")} · {u.users} {t("cmd.users")}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-ink-700">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(u.uses / (usage[0]?.uses || 1)) * 100}%` }}
                      transition={{ delay: i * 0.05, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      className="h-full rounded-full bg-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-10 text-center font-mono text-xs text-ink-300">{t("ov.noCmdUses")}</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className="rounded-3xl border border-white/10 bg-ink-900 p-6"
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-bold">{t("ov.yourGuilds")}</h3>
              <p className="text-xs text-ink-300">{t("ov.yourGuildsSub")}</p>
            </div>
            <Link to="/dashboard/servers" className="text-xs font-bold text-white/70 transition-colors hover:text-white">
              {t("ov.all")}
            </Link>
          </div>
          {guilds.length > 0 ? (
            <div className="space-y-2.5">
              {guilds.slice(0, 5).map((g) => (
                <Link
                  key={g.id}
                  to="/dashboard/servers"
                  className="flex items-center gap-3 rounded-2xl border border-white/5 bg-ink-850 px-4 py-3 transition-colors hover:border-white/25"
                >
                  {g.icon ? (
                    <img src={g.icon} alt="" className="h-9 w-9 rounded-xl border border-white/15 object-cover" />
                  ) : (
                    <div className="grid h-9 w-9 place-items-center rounded-xl border border-white/15 bg-ink-800 font-display text-sm font-bold">
                      {g.name[0]}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{g.name}</p>
                    <p className="font-mono text-[11px] text-ink-300">
                      {num(g.members)} {t("common.members")} · {g.botPresent ? t("common.onServer") : t("common.botMissing")}
                    </p>
                  </div>
                  <span className={`h-2 w-2 shrink-0 rounded-full ${g.botPresent ? "bg-white" : "bg-ink-400"}`} />
                </Link>
              ))}
            </div>
          ) : (
            <p className="py-10 text-center font-mono text-xs text-ink-300">{t("ov.noGuilds")}</p>
          )}
        </motion.div>
      </div>

      {/* NEW: command types + quick actions — extra instrumentation that
       * reuses already-fetched status data (no extra polling). The host
       * (RAM/CPU) card is admin-only: process internals are not for members. */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="rounded-3xl border border-white/10 bg-ink-900 p-6"
        >
          <h3 className="mb-1 font-display text-lg font-bold">{t("ov.host")}</h3>
          <p className="mb-4 text-xs text-ink-300">{t("ov.hostSub")}</p>
          <div className="space-y-3 text-sm">
            {[
              { icon: Activity, k: t("ov.ram"), v: host?.memoryMb != null ? `${host.memoryMb} MB` : "—" },
              { icon: Terminal, k: t("ov.node"), v: host?.nodeVersion ?? "—" },
              { icon: Server, k: t("ov.platform"), v: host?.platform ?? "—" },
              { icon: Timer, k: t("ov.uptimeHost"), v: b ? fmtUptime(b.uptimeSec) : "—" },
            ].map((r) => (
              <div key={r.k} className="flex items-center justify-between">
                <span className="flex items-center gap-2.5 text-ink-200">
                  <r.icon className="h-4 w-4" /> {r.k}
                </span>
                <span className="font-mono font-semibold">{r.v}</span>
              </div>
            ))}
          </div>
        </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 }}
          className="rounded-3xl border border-white/10 bg-ink-900 p-6"
        >
          <h3 className="mb-1 font-display text-lg font-bold">{t("ov.cmdTypes")}</h3>
          <p className="mb-4 text-xs text-ink-300">{t("ov.cmdTypesSub")}</p>
          {cmdTypes.length > 0 ? (
            <div className="space-y-3">
              {cmdTypes.map((ct) => (
                <div key={ct.name}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="font-semibold">{ct.name}</span>
                    <span className="font-mono text-xs text-ink-300">{num(ct.count)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-ink-700">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(ct.count / cmdTypeMax) * 100}%` }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      className="h-full rounded-full bg-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-10 text-center font-mono text-xs text-ink-300">—</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.36 }}
          className="rounded-3xl border border-white/10 bg-ink-900 p-6"
        >
          <h3 className="mb-1 font-display text-lg font-bold">{t("ov.quick")}</h3>
          <p className="mb-4 text-xs text-ink-300">{t("ov.quickSub")}</p>
          <div className="space-y-2.5">
            <a
              href={`https://discord.com/oauth2/authorize?client_id=${b?.id ?? ""}&permissions=8&scope=bot%20applications.commands`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-2xl border border-white/5 bg-ink-850 px-4 py-3 transition-colors hover:border-white/25"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/15 bg-ink-800">
                <Zap className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{t("ov.invite")}</span>
                <span className="block truncate text-[11px] text-ink-300">{t("ov.inviteSub")}</span>
              </span>
            </a>
            <a
              href="/dashboard/support"
              className="flex items-center gap-3 rounded-2xl border border-white/5 bg-ink-850 px-4 py-3 transition-colors hover:border-white/25"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/15 bg-ink-800">
                <LifeBuoy className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{t("ov.support")}</span>
                <span className="block truncate text-[11px] text-ink-300">{t("ov.supportSub")}</span>
              </span>
            </a>
            {isAdmin && (
              <Link
                to="/admin"
                className="flex items-center gap-3 rounded-2xl border border-white/5 bg-ink-850 px-4 py-3 transition-colors hover:border-white/25"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/15 bg-ink-800">
                  <Shield className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{t("ov.adminPanel")}</span>
                  <span className="block truncate text-[11px] text-ink-300">{t("ov.adminPanelSub")}</span>
                </span>
              </Link>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
