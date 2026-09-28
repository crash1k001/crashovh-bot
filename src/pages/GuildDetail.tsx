import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft, Users, Hash, Mic, Zap, Crown, ShieldCheck, Settings2, Terminal,
  Gift, ScrollText, LifeBuoy, ListChecks, Sparkles, RefreshCw, HeartPulse,
  ClipboardCheck, SlidersHorizontal, Activity,
} from "lucide-react";
import { PageHeader, Badge, Btn, NikoEmoji } from "@/components/shared";
import {
  api, type DashboardGuild, type DashboardGuildDetail, type AntinukeView, type AutomodView,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { useI18n, type TKey } from "@/lib/i18n";
import {
  GuildModulesTab, GuildCommandsTab, GuildWhitelistsTab, GuildGiveawaysTab,
  GuildLoggingTab, GuildWelcomeTab, AntinukeSection, AutoModSection, SwitchRow,
} from "./Servers";

/* ------------------------------ health score ------------------------------- */
/* Unique feature: a 0-100 "server setup score" computed from REAL module
 * state — shows owners what is worth enabling, not vanity numbers. */
type HealthItem = { labelKey: TKey; ok: boolean; weight: number };

const HEALTH_KEYS: { labelKey: TKey; ok: (d: DashboardGuildDetail, cfg: Record<string, boolean>) => boolean; weight: number }[] = [
  { labelKey: "gd.hAntinuke", ok: (d) => Boolean(d.antinuke?.enabled), weight: 25 },
  { labelKey: "gd.hAutomod", ok: (d) => Boolean(d.automod?.enabled), weight: 20 },
  { labelKey: "gd.hLogging", ok: (_d, cfg) => Boolean(cfg.loggingEnabled), weight: 15 },
  { labelKey: "gd.hWelcome", ok: (_d, cfg) => Boolean(cfg.welcomeInOn), weight: 10 },
  { labelKey: "gd.hAi", ok: (d) => (d.aiChannels?.length ?? 0) > 0, weight: 10 },
  { labelKey: "gd.hGiveaways", ok: (d) => (d.stats?.giveawaysTotal ?? 0) > 0, weight: 5 },
  { labelKey: "gd.hTickets", ok: (d) => (d.stats?.ticketsTotal ?? 0) > 0, weight: 10 },
  { labelKey: "gd.hModeration", ok: (d) => d.modActions.length > 0, weight: 5 },
];

function computeHealth(detail: DashboardGuildDetail): { score: number; items: HealthItem[] } {
  const cfg = (detail.config ?? {}) as Record<string, boolean>;
  const items: HealthItem[] = HEALTH_KEYS.map((h) => ({
    labelKey: h.labelKey,
    ok: h.ok(detail, cfg),
    weight: h.weight,
  }));
  const score = items.reduce((a, it) => a + (it.ok ? it.weight : 0), 0);
  return { score, items };
}

function HealthRing({ score }: { score: number }) {
  const { t } = useI18n();
  const R = 52;
  const C = 2 * Math.PI * R;
  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
        <motion.circle
          cx="60" cy="60" r={R} fill="none"
          stroke={score >= 75 ? "#6ee7b7" : score >= 40 ? "#fff" : "#f87171"}
          strokeWidth="10" strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C - (C * score) / 100 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <p className="font-display text-3xl font-bold">{score}</p>
          <p className="text-[10px] uppercase tracking-wider text-ink-300">{t("common.of100")}</p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- sections nav ------------------------------ */

const SECTIONS = [
  { key: "overview", labelKey: "gd.overview", icon: Activity, descKey: "gd.overviewDesc" },
  { key: "modules", labelKey: "gd.modules", icon: Sparkles, descKey: "gd.modulesDesc" },
  { key: "commands", labelKey: "gd.commands", icon: Terminal, descKey: "gd.commandsDesc" },
  { key: "moderation", labelKey: "gd.moderation", icon: ShieldCheck, descKey: "gd.moderationDesc" },
  { key: "giveaways", labelKey: "gd.giveaways", icon: Gift, descKey: "gd.giveawaysDesc" },
  { key: "logging", labelKey: "gd.logging", icon: ScrollText, descKey: "gd.loggingDesc" },
  { key: "welcome", labelKey: "gd.welcome", icon: Users, descKey: "gd.welcomeDesc" },
  { key: "whitelists", labelKey: "gd.whitelists", icon: ListChecks, descKey: "gd.whitelistsDesc" },
] as const satisfies readonly { key: string; labelKey: TKey; icon: typeof Activity; descKey: TKey }[];

type SectionKey = (typeof SECTIONS)[number]["key"];

export default function GuildDetail() {
  const { t } = useI18n();
  const { id = "" } = useParams();
  const [guild, setGuild] = useState<DashboardGuild | null>(null);
  const [detail, setDetail] = useState<DashboardGuildDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [section, setSection] = useState<SectionKey>("overview");

  useEffect(() => {
    void api.myGuilds().then((gs) => {
      setGuild(gs?.find((g) => g.id === id) ?? null);
    });
    void api.guild(id).then((d) => {
      if (d) setDetail(d);
      else setErr(t("gd.unavailableHint"));
    });
    // `t` intentionally omitted: the id is the only real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const cfg = (detail?.config ?? {}) as Record<string, boolean>;

  const toggle = async (key: string) => {
    setBusy(key);
    const next = !cfg[key];
    const r = await api.setGuildSettings(id, { [key]: next });
    if (r?.ok) {
      setDetail((d) => (d ? { ...d, config: { ...(d.config ?? {}), [key]: next } } : d));
    } else {
      setErr(t("srv.noRights"));
    }
    setBusy(null);
  };

  const health = useMemo(() => (detail ? computeHealth(detail) : null), [detail]);

  if (err && !detail) {
    return (
      <div>
        <Link to="/dashboard/servers" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-ink-200 transition-colors hover:text-white">
          <ArrowLeft className="h-4 w-4" /> {t("gd.allServers")}
        </Link>
        <div className="grid place-items-center rounded-3xl border border-white/15 bg-ink-900 py-20 text-center">
          <ShieldCheck className="mb-4 h-10 w-10 text-ink-300" />
          <p className="font-display text-lg font-bold">{t("gd.unavailable")}</p>
          <p className="mt-2 max-w-md text-sm text-ink-300">{err}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          {guild?.icon ? (
            <img src={guild.icon} alt="" className="h-14 w-14 rounded-2xl border border-white/20 object-cover" />
          ) : (
            <div className="grid h-14 w-14 place-items-center rounded-2xl border border-white/20 bg-ink-800 font-display text-xl font-bold">
              {guild?.name?.[0] ?? "?"}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 truncate font-display text-2xl font-bold md:text-3xl">
              {guild?.name ?? t("gd.loading")}
              {guild?.role === "owner" && <Crown className="h-5 w-5" />}
            </h1>
            <p className="font-mono text-xs text-ink-300">{id}</p>
          </div>
        </div>
        <Link
          to="/dashboard/servers"
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-ink-200 transition-colors hover:border-white/50 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> {t("gd.allServers")}
        </Link>
      </div>

      <AnimatePresence mode="wait">
        {!detail ? (
          <motion.div key="load" exit={{ opacity: 0 }} className="space-y-4">
            <div className="h-40 animate-pulse rounded-3xl border border-white/10 bg-ink-900" />
            <div className="h-64 animate-pulse rounded-3xl border border-white/10 bg-ink-900" />
          </motion.div>
        ) : (
          <motion.div key="ready" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="flex flex-col gap-6 lg:flex-row">
            {/* ------------- left sidebar: all bot functions ------------- */}
            <aside className="w-full shrink-0 lg:sticky lg:top-8 lg:w-64">
              <nav className="flex gap-1.5 overflow-x-auto rounded-2xl border border-white/10 bg-ink-900 p-1.5 lg:flex-col lg:overflow-visible">
                {SECTIONS.map((s) => {
                  const active = section === s.key;
                  return (
                    <button
                      key={s.key}
                      onClick={() => setSection(s.key)}
                      className={cn(
                        "group relative flex shrink-0 items-center gap-3 rounded-xl px-3.5 py-2.5 text-left transition-colors lg:w-full",
                        active ? "text-black" : "text-ink-200 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      {/* shared layout id: the active pill glides between sections */}
                      {active && (
                        <motion.span
                          layoutId="gd-section-active"
                          className="absolute inset-0 rounded-xl bg-white"
                          transition={{ type: "spring", stiffness: 420, damping: 34 }}
                        />
                      )}
                      <s.icon className="relative z-10 h-4 w-4 shrink-0" />
                      <span className="relative z-10 min-w-0">
                        <span className="block truncate text-sm font-bold">{t(s.labelKey)}</span>
                        <span className={cn("hidden truncate text-[10px] lg:block", active ? "text-black/60" : "text-ink-300")}>{t(s.descKey)}</span>
                      </span>
                    </button>
                  );
                })}
              </nav>

              {/* quick health mini-widget in the sidebar */}
              {health && (
                <div className="mt-4 hidden rounded-2xl border border-white/10 bg-ink-900 p-4 lg:block">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-300">
                    <HeartPulse className="h-3.5 w-3.5" /> {t("gd.health")}
                  </p>
                  <p className="mt-2 font-display text-2xl font-bold">{health.score}/100</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-700">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${health.score}%` }}
                      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                      className={cn("h-full rounded-full", health.score >= 75 ? "bg-emerald-300" : health.score >= 40 ? "bg-white" : "bg-red-300")}
                    />
                  </div>
                </div>
              )}
            </aside>

            {/* ------------- right: active section ------------- */}
            <div className="min-w-0 flex-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={section}
                  initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  {err && <p className="mb-4 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-center text-xs font-semibold">{err}</p>}

                  {section === "overview" && (
                    <OverviewSection detail={detail} health={health} onGo={setSection} />
                  )}

                  {section === "modules" && <GuildModulesTab guild={guild!} detail={detail} onDetail={setDetail} />}

                  {section === "commands" && <GuildCommandsTab guildId={id} />}

                  {section === "moderation" && (
                    <div className="space-y-2">
                      <AntinukeSection guildId={id} initial={(detail.antinuke ?? { enabled: false }) as AntinukeView} onError={() => setErr(t("srv.noRights"))} />
                      <AutoModSection guildId={id} initial={(detail.automod ?? { enabled: false }) as AutomodView} onError={() => setErr(t("srv.noRights"))} />
                    </div>
                  )}

                  {section === "giveaways" && <GuildGiveawaysTab guildId={id} textChannels={detail.textChannelList} />}
                  {section === "logging" && <GuildLoggingTab guildId={id} />}
                  {section === "welcome" && <GuildWelcomeTab guildId={id} />}
                  {section === "whitelists" && <GuildWhitelistsTab guildId={id} />}

                  {/* main switches live on overview too (bottom) */}
                  {section === "overview" && (
                    <div className="mt-6">
                      <h4 className="mb-1 font-display font-bold">{t("srv.swTitle")}</h4>
                      <p className="mb-3 text-xs text-ink-300">{t("srv.swSub")}</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {[
                          { key: "loggingEnabled", label: t("srv.swLogging"), desc: t("srv.swLoggingDesc") },
                          { key: "welcomeInOn", label: t("srv.swWelcome"), desc: t("srv.swWelcomeDesc") },
                          { key: "welcomeOutOn", label: t("srv.swFarewell"), desc: t("srv.swFarewellDesc") },
                          { key: "autoreactEnabled", label: t("srv.swAutoreact"), desc: t("srv.swAutoreactDesc") },
                        ].map((s) => (
                          <SwitchRow
                            key={s.key}
                            label={s.label}
                            desc={s.desc}
                            on={Boolean(cfg[s.key])}
                            busy={busy === s.key}
                            onToggle={() => void toggle(s.key)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------ overview section --------------------------- */

function OverviewSection({
  detail,
  health,
  onGo,
}: {
  detail: DashboardGuildDetail;
  health: { score: number; items: HealthItem[] } | null;
  onGo: (s: SectionKey) => void;
}) {
  const { t, num } = useI18n();
  const cfg = (detail.config ?? {}) as Record<string, boolean>;
  return (
    <div className="space-y-6">
      {/* stat tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: Users, k: t("gd.statMembers"), v: num(detail.members) },
          { icon: Hash, k: t("gd.statChannels"), v: String(detail.channels?.total ?? "—") },
          { icon: Mic, k: t("gd.statVoice"), v: String(detail.channels?.voice ?? "—") },
          { icon: Zap, k: t("gd.statBoosts"), v: String(detail.boosts) },
        ].map((r, i) => (
          <motion.div
            key={r.k}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className="rounded-2xl border border-white/10 bg-ink-850 p-3.5"
          >
            <r.icon className="h-4 w-4 text-ink-300" />
            <p className="mt-2 font-display text-lg font-bold">{r.v}</p>
            <p className="text-[10px] uppercase tracking-wider text-ink-300">{r.k}</p>
          </motion.div>
        ))}
      </div>

      {/* health card: unique — real checklist of what to enable */}
      {health && (
        <div className="rounded-3xl border border-white/10 bg-ink-900 p-6">
          <div className="flex flex-wrap items-center gap-6">
            <HealthRing score={health.score} />
            <div className="min-w-0 flex-1">
              <h3 className="flex items-center gap-2 font-display text-lg font-bold">
                <ClipboardCheck className="h-5 w-5" />
                {t("gd.healthTitle")}
              </h3>
              <p className="mt-1 text-xs text-ink-300">{t("gd.healthSub")}</p>
              <div className="mt-4 grid gap-1.5 sm:grid-cols-2">
                {health.items.map((it, i) => (
                  <motion.div
                    key={it.labelKey}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.05, duration: 0.3 }}
                    className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-ink-850 px-3 py-2"
                  >
                    <span className={cn(
                      "grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] font-black",
                      it.ok ? "bg-emerald-300 text-black" : "border border-white/20 text-ink-400"
                    )}>
                      {it.ok ? "✓" : ""}
                    </span>
                    <span className={cn("truncate text-xs", it.ok ? "font-semibold text-white" : "text-ink-300")}>
                      {t(it.labelKey)}
                    </span>
                    <span className="ml-auto font-mono text-[10px] text-ink-300">+{it.weight}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* active modules grid */}
      <div>
        <h4 className="mb-3 flex items-center gap-2 font-display font-bold">
          <SlidersHorizontal className="h-4 w-4" /> {t("gd.activeModules")}
        </h4>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { k: t("srv.antinuke"), on: Boolean(detail.antinuke?.enabled), go: "moderation" as SectionKey },
            { k: t("srv.automod"), on: Boolean(detail.automod?.enabled), go: "moderation" as SectionKey },
            { k: t("gd.logs"), on: Boolean(cfg.loggingEnabled), go: "logging" as SectionKey },
            { k: t("srv.swWelcome"), on: Boolean(cfg.welcomeInOn), go: "welcome" as SectionKey },
            { k: t("srv.swAutoreact"), on: (detail.stats?.autoReact ?? 0) > 0, go: "overview" as SectionKey },
            { k: t("gd.giveaways"), on: (detail.stats?.giveawaysActive ?? 0) > 0, go: "giveaways" as SectionKey },
            { k: t("gd.tickets"), on: (detail.stats?.ticketsOpen ?? 0) > 0, go: "overview" as SectionKey },
            { k: t("gd.aiChat"), on: (detail.aiChannels?.length ?? 0) > 0, go: "modules" as SectionKey },
          ].map((m, i) => (
            <motion.button
              key={m.k}
              onClick={() => onGo(m.go)}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04, type: "spring", stiffness: 400, damping: 30 }}
              whileHover={{ y: -2 }}
              className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-ink-850 px-3 py-2.5 text-left transition-colors hover:border-white/30"
            >
              <span className={cn("h-2 w-2 shrink-0 rounded-full", m.on ? "bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.7)]" : "bg-ink-500")} />
              <span className="truncate text-xs font-bold">{m.k}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* recent mod actions */}
      {detail.modActions.length > 0 && (
        <div>
          <h4 className="mb-3 flex items-center gap-2 font-display font-bold">
            <NikoEmoji name="clipboard" fallback="📋" /> {t("srv.modActions")}
          </h4>
          <div className="max-h-40 space-y-2 overflow-y-auto">
            {detail.modActions.slice(0, 6).map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-ink-850 px-3.5 py-2.5">
                <span className="rounded-md border border-white/15 bg-ink-800 px-2 py-0.5 font-mono text-[10px] font-bold uppercase">
                  {m.action}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs">{m.targetTag}</span>
                <span className="font-mono text-[10px] text-ink-300">{m.moderatorTag}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
