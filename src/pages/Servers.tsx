import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Users, Crown, Zap, Settings2, ShieldCheck, Hash, Mic, Plus, RefreshCw, Gift, Sparkles, X, Check, TerminalSquare } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { PageHeader, Btn, Badge, fadeUp } from "@/components/shared";
import { ChannelPicker, FancySelect } from "@/components/ChannelPicker";
import { NikoEmoji } from "@/components/shared";
import { api, type DashboardGuild, type DashboardGuildDetail, type AntinukeView, type AutomodView, type GuildGiveaway } from "@/lib/api";
import { cn, fmt } from "@/lib/utils";
import { useI18n, type TKey } from "@/lib/i18n";

/* Stable filter ids — the labels are translated at render time. */
const FILTERS: { id: "all" | "with" | "without"; labelKey: TKey }[] = [
  { id: "all", labelKey: "common.all" },
  { id: "with", labelKey: "srv.withBot" },
  { id: "without", labelKey: "srv.noBot" },
];

export default function Servers() {
  const { t, num } = useI18n();
  const navigate = useNavigate();
  const [guilds, setGuilds] = useState<DashboardGuild[] | null>(null);
  const [authed, setAuthed] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "with" | "without">("all");

  const load = async () => {
    const g = await api.myGuilds();
    if (g === null) {
      setAuthed(false);
      setGuilds(null);
    } else {
      setAuthed(true);
      setGuilds(g);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const list = useMemo(() => {
    let g = guilds ?? [];
    if (query) g = g.filter((x) => x.name.toLowerCase().includes(query.toLowerCase()));
    if (filter === "with") g = g.filter((x) => x.botPresent);
    if (filter === "without") g = g.filter((x) => !x.botPresent);
    return g;
  }, [guilds, query, filter]);

  return (
    <div>
      <PageHeader
        title={t("srv.title")}
        subtitle={
          guilds
            ? `${guilds.filter((g) => g.botPresent).length} ${t("srv.withBot")} · ${guilds.filter((g) => !g.botPresent).length} ${t("srv.noBot")}`
            : authed
              ? t("common.loading")
              : t("srv.needAuthHint")
        }
        actions={
          <>
            <Badge>
              <ShieldCheck className="h-3 w-3" /> {t("srv.filterHint")}
            </Badge>
            <Btn variant="outline" onClick={() => void load()}>
              <RefreshCw className="h-4 w-4" /> {t("common.refresh")}
            </Btn>
          </>
        }
      />

      {!authed && (
        <div className="mb-6 rounded-3xl border border-white/15 bg-ink-900 p-10 text-center">
          <p className="font-display text-lg font-bold">{t("srv.needAuth")}</p>
          <p className="mt-2 text-sm text-ink-300">{t("srv.needAuthHint")}</p>
          <a
            href="/auth?returnTo=/dashboard/servers"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 font-display font-bold text-black transition-transform hover:scale-[1.03]"
          >
            <Plus className="h-4 w-4" /> {t("nav.login")}
          </a>
        </div>
      )}

      <div className="mb-6 flex max-w-full flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 md:max-w-sm">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("srv.searchHint")}
            className="w-full rounded-xl border border-white/10 bg-ink-900 py-2.5 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-ink-300 focus:border-white/40"
          />
        </div>
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-white/10 bg-ink-900 p-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "relative rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors",
                filter === f.id ? "text-black" : "text-ink-200 hover:text-white"
              )}
            >
              {filter === f.id && (
                <motion.span layoutId="srv-filter" className="absolute inset-0 rounded-lg bg-white" transition={{ type: "spring", stiffness: 400, damping: 32 }} />
              )}
              <span className="relative z-10">{t(f.labelKey)}</span>
            </button>
          ))}
        </div>
      </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {list.map((g, i) => (
            <motion.div
              key={g.id}
              layout
              variants={fadeUp}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, scale: 0.95 }}
              custom={i}
              whileHover={{ y: -4 }}
              onClick={() => g.botPresent && navigate(`/dashboard/servers/${g.id}`)}
              className={cn(
                "lift group rounded-3xl border border-white/10 bg-ink-900 p-5 transition-colors hover:border-white/30",
                g.botPresent ? "cursor-pointer" : "cursor-default"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {g.icon ? (
                    <img src={g.icon} alt="" className="h-12 w-12 rounded-2xl border border-white/15 object-cover" />
                  ) : (
                    <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/15 bg-ink-800 font-display text-lg font-bold">
                      {g.name[0]}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate font-display font-bold">
                      {g.name}
                      {g.role === "owner" && <Crown className="h-3.5 w-3.5" />}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-300">
                      <span className={cn("h-1.5 w-1.5 rounded-full", g.botPresent ? "bg-white" : "bg-ink-400")} />
                      {g.botPresent ? t("srv.botPresent") : t("srv.botMissing")}
                    </p>
                  </div>
                </div>
                {g.botPresent && <Settings2 className="h-4 w-4 shrink-0 text-ink-300 opacity-0 transition-opacity group-hover:opacity-100" />}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-xl border border-white/5 bg-ink-850 px-2 py-2.5">
                  <Users className="mx-auto h-3.5 w-3.5 text-ink-300" />
                  <p className="mt-1 font-mono text-sm font-bold">{fmt(g.members)}</p>
                  <p className="text-[10px] uppercase tracking-wider text-ink-300">{t("srv.members")}</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-ink-850 px-2 py-2.5">
                  <Zap className="mx-auto h-3.5 w-3.5 text-ink-300" />
                  <p className="mt-1 font-mono text-sm font-bold capitalize">{g.role}</p>
                  <p className="text-[10px] uppercase tracking-wider text-ink-300">{t("srv.yourRole")}</p>
                </div>
              </div>

              {!g.botPresent && g.inviteUrl && (
                <a
                  href={g.inviteUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-white/20 px-3 py-2 text-xs font-bold transition-colors hover:border-white/60 hover:bg-white/5"
                >
                  <Plus className="h-3.5 w-3.5" /> {t("srv.invite")}
                </a>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {authed && guilds && list.length === 0 && (
        <div className="grid place-items-center rounded-3xl border border-dashed border-white/15 py-24 text-ink-300">
          <Search className="mb-3 h-8 w-8" />
          {t("srv.notFound")}
        </div>
      )}

    </div>
  );
}

/* ----------------------------- real guild modal ---------------------------- */

export const SWITCHES: { key: string; labelKey: TKey; descKey: TKey }[] = [
  { key: "loggingEnabled", labelKey: "srv.swLogging", descKey: "srv.swLoggingDesc" },
  { key: "welcomeInOn", labelKey: "srv.swWelcome", descKey: "srv.swWelcomeDesc" },
  { key: "welcomeOutOn", labelKey: "srv.swFarewell", descKey: "srv.swFarewellDesc" },
  { key: "autoreactEnabled", labelKey: "srv.swAutoreact", descKey: "srv.swAutoreactDesc" },
];

export function GuildModal({ guild, onClose }: { guild: DashboardGuild; onClose: () => void }) {
  const { t, num, locale } = useI18n();
  const [detail, setDetail] = useState<DashboardGuildDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "modules" | "commands" | "giveaways" | "logging" | "welcome" | "whitelists">("overview");

  useEffect(() => {
    void api.guild(guild.id).then((d) => {
      if (d) setDetail(d);
      else setErr(t("srv.loadFail"));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guild.id]);

  const cfg = (detail?.config ?? {}) as Record<string, boolean>;

  const toggle = async (key: string) => {
    setBusy(key);
    const next = !cfg[key];
    const r = await api.setGuildSettings(guild.id, { [key]: next });
    if (r?.ok) {
      setDetail((d) => (d ? { ...d, config: { ...(d.config ?? {}), [key]: next } } : d));
    } else {
      setErr(t("srv.noRights"));
    }
    setBusy(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 24 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        className="my-8 w-full max-w-2xl rounded-3xl border border-white/15 bg-ink-900 p-6"
      >
        <div className="flex items-center gap-4">
          {guild.icon ? (
            <img src={guild.icon} alt="" className="h-14 w-14 rounded-2xl border border-white/20" />
          ) : (
            <div className="grid h-14 w-14 place-items-center rounded-2xl border border-white/20 bg-ink-800 font-display text-xl font-bold">
              {guild.name[0]}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="truncate font-display text-xl font-bold">{guild.name}</h3>
            <p className="font-mono text-xs text-ink-300">{guild.id}</p>
          </div>
        </div>

        {err && (
          <p className="mt-5 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-center text-xs font-semibold">
            {err}
          </p>
        )}

        {detail ? (
          <>
            {/* tabs — keep the modal scannable on phones */}
            <div className="mt-5 flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-ink-900 p-1">
              {([
                ["overview", "gd.overview"],
                ["modules", "gd.modules"],
                ["commands", "gd.commands"],
                ["giveaways", "gd.giveaways"],
                ["logging", "gd.logging"],
                ["welcome", "gd.welcome"],
                ["whitelists", "gd.whitelists"],
              ] as const).map(([k, labelKey]) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={cn(
                    "relative shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors",
                    tab === k ? "text-black" : "text-ink-200 hover:text-white"
                  )}
                >
                  {tab === k && (
                    <motion.span layoutId="guild-tab" className="absolute inset-0 rounded-lg bg-white" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
                  )}
                  <span className="relative z-10">{t(labelKey)}</span>
                </button>
              ))}
            </div>

            {tab === "overview" && (
              <motion.div key="ov" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { icon: Users, k: t("gd.statMembers"), v: num(detail.members) },
                    { icon: Hash, k: t("gd.statChannels"), v: String(detail.channels?.total ?? "—") },
                    { icon: Mic, k: t("gd.statVoice"), v: String(detail.channels?.voice ?? "—") },
                    { icon: Zap, k: t("gd.statBoosts"), v: String(detail.boosts) },
                  ].map((r) => (
                    <div key={r.k} className="rounded-2xl border border-white/10 bg-ink-850 p-3.5">
                      <r.icon className="h-4 w-4 text-ink-300" />
                      <p className="mt-2 font-display text-lg font-bold">{r.v}</p>
                      <p className="text-[10px] uppercase tracking-wider text-ink-300">{r.k}</p>
                    </div>
                  ))}
                </div>

                {/* Active modules grid (idea from the reference dashboard) —
                    statuses come from REAL DB rows / guild state, not fakes. */}
                {(() => {
                  const modules = [
                    { k: t("srv.antinuke"), on: Boolean(detail.antinuke?.enabled), note: detail.antinuke?.punishment },
                    { k: t("srv.automod"), on: Boolean(detail.automod?.enabled), note: detail.automod?.punishment },
                    { k: t("gd.logs"), on: Boolean(cfg.loggingEnabled) },
                    { k: t("srv.swWelcome"), on: Boolean(cfg.welcomeInOn) },
                    { k: t("srv.swFarewell"), on: Boolean(cfg.welcomeOutOn) },
                    { k: t("srv.swAutoreact"), on: (detail.stats?.autoReact ?? 0) > 0, note: detail.stats ? `${detail.stats.autoReact} ${t("gd.reactions")}` : undefined },
                    { k: t("gd.giveaways"), on: (detail.stats?.giveawaysActive ?? 0) > 0, note: detail.stats ? `${detail.stats.giveawaysActive} ${t("gd.activeWord")}` : undefined },
                    { k: t("gd.tickets"), on: (detail.stats?.ticketsOpen ?? 0) > 0, note: detail.stats ? `${detail.stats.ticketsOpen} ${t("gd.openWord")}` : undefined },
                  ];
                  return (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {modules.map((m) => (
                        <div key={m.k} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-ink-850 px-3 py-2.5">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${m.on ? "bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.7)]" : "bg-ink-500"}`} />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold">{m.k}</p>
                            {m.note && <p className="truncate font-mono text-[10px] text-ink-300">{m.note}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
})()}

                <h4 className="mt-6 mb-1 font-display font-bold">{t("srv.swTitle")}</h4>
                <p className="mb-3 text-xs text-ink-300">{t("srv.swSub")}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {SWITCHES.map((s) => (
                    <SwitchRow
                      key={s.key}
                      label={t(s.labelKey)}
                      desc={t(s.descKey)}
                      on={Boolean(cfg[s.key])}
                      busy={busy === s.key}
                      onToggle={() => void toggle(s.key)}
                    />
                  ))}
                </div>

                {/* Always render both sections: the server API creates the config
                 * row on first save (findOrCreate), so a missing row must never
                 * hide the switches (was the "can't enable automod" bug). */}
                <AntinukeSection
                  guildId={guild.id}
                  initial={detail.antinuke ?? { enabled: false }}
                  onError={() => setErr(t("srv.noRights"))}
                />

                <AutoModSection
                  guildId={guild.id}
                  initial={detail.automod ?? { enabled: false }}
                  onError={() => setErr(t("srv.noRights"))}
                />

                {detail.modActions.length > 0 && (
                  <>
                    <h4 className="mt-6 mb-3 font-display font-bold">{t("srv.modActions")}</h4>
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
                  </>
                )}
              </motion.div>
            )}

            {tab === "modules" && <GuildModulesTab guild={guild} detail={detail} onDetail={setDetail} />}
            {tab === "commands" && <GuildCommandsTab guildId={guild.id} />}
            {tab === "whitelists" && <GuildWhitelistsTab guildId={guild.id} />}
            {tab === "giveaways" && <GuildGiveawaysTab guildId={guild.id} textChannels={detail.textChannelList} />}
            {tab === "logging" && <GuildLoggingTab guildId={guild.id} />}
            {tab === "welcome" && <GuildWelcomeTab guildId={guild.id} />}
          </>
        ) : (
          <div className="mt-8 grid place-items-center py-10">
            <RefreshCw className="h-6 w-6 animate-spin text-ink-300" />
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Btn variant="outline" onClick={onClose}>{t("common.close")}</Btn>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* --------------------- real antinuke / automod control --------------------- */

export function SwitchRow({
  label,
  desc,
  on,
  busy,
  onToggle,
}: {
  label: string;
  desc?: string;
  on: boolean;
  busy?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      disabled={busy}
      onClick={onToggle}
      className={cn(
        "flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-all disabled:opacity-50",
        on ? "border-white bg-white text-black" : "border-white/10 bg-ink-850 text-white hover:border-white/40"
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-bold">{label}</span>
        {desc && <span className={cn("block text-[11px]", on ? "text-black/60" : "text-ink-300")}>{desc}</span>}
      </span>
      <span
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
          on ? "bg-black/20" : "bg-ink-600"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full transition-all duration-200 ease-out",
            on ? "left-[22px] bg-white" : "left-0.5 bg-ink-300"
          )}
        />
      </span>
    </button>
  );
}

export function Segmented({
  options,
  value,
  onPick,
}: {
  options: { v: string; label: string }[];
  value: string;
  onPick: (v: string) => void;
}) {
  return (
    <div className="flex gap-1 rounded-xl border border-white/10 bg-ink-900 p-1">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onPick(o.v)}
          className={cn(
            "relative flex-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold capitalize transition-colors",
            value === o.v ? "text-black" : "text-ink-200 hover:text-white"
          )}
        >
          {value === o.v && (
            <motion.span
              layoutId={`seg-${options.map((x) => x.v).join("-")}`}
              className="absolute inset-0 rounded-lg bg-white"
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
            />
          )}
          <span className="relative z-10">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Stepper({
  label,
  value,
  min,
  max,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onCommit: (v: number) => void;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-ink-850 px-4 py-2.5">
      <span className="text-xs font-semibold text-ink-100">{label}</span>
      <span className="flex items-center gap-2">
        <button
          onClick={() => onCommit(clamp(value - 1))}
          className="grid h-7 w-7 place-items-center rounded-lg border border-white/15 text-ink-200 transition-colors hover:border-white/50 hover:text-white"
        >
          −
        </button>
        <span className="w-10 text-center font-mono text-sm font-bold">{value}</span>
        <button
          onClick={() => onCommit(clamp(value + 1))}
          className="grid h-7 w-7 place-items-center rounded-lg border border-white/15 text-ink-200 transition-colors hover:border-white/50 hover:text-white"
        >
          +
        </button>
      </span>
    </div>
  );
}

export const ANTINUKE_MODULES: { key: keyof AntinukeView; labelKey: TKey }[] = [
  { key: "antiBan", labelKey: "an.antiBan" },
  { key: "antiKick", labelKey: "an.antiKick" },
  { key: "antiChannelCreate", labelKey: "an.antiChannelCreate" },
  { key: "antiChannelDelete", labelKey: "an.antiChannelDelete" },
  { key: "antiChannelEdit", labelKey: "an.antiChannelEdit" },
  { key: "antiRoleCreate", labelKey: "an.antiRoleCreate" },
  { key: "antiRoleDelete", labelKey: "an.antiRoleDelete" },
  { key: "antiRoleUpdate", labelKey: "an.antiRoleUpdate" },
  { key: "antiWebhook", labelKey: "an.antiWebhook" },
  { key: "antiBot", labelKey: "an.antiBot" },
  { key: "antiGuildUpdate", labelKey: "an.antiGuildUpdate" },
  { key: "antiEmoji", labelKey: "an.antiEmoji" },
];

export const AUTOMOD_MODULES: { key: keyof AutomodView; labelKey: TKey }[] = [
  { key: "antiSpam", labelKey: "am.antiSpam" },
  { key: "antiLink", labelKey: "am.antiLink" },
  { key: "antiInvite", labelKey: "am.antiInvite" },
  { key: "antiBadWords", labelKey: "am.antiBadWords" },
  { key: "antiMassMention", labelKey: "am.antiMassMention" },
  { key: "antiCaps", labelKey: "am.antiCaps" },
  { key: "antiPing", labelKey: "am.antiPing" },
];

export function AntinukeSection({
  guildId,
  initial,
  onError,
}: {
  guildId: string;
  initial: AntinukeView;
  onError: () => void;
}) {
  const [cfg, setCfg] = useState<AntinukeView>(initial);
  const [busy, setBusy] = useState(false);

  const { t } = useI18n();

  const patch = async (p: Record<string, boolean | number | string>) => {
    setBusy(true);
    const r = await api.setAntinuke(guildId, p);
    if (r?.ok && r.antinuke) setCfg(r.antinuke);
    else onError();
    setBusy(false);
  };

  return (
    <div className="mt-6">
      <h4 className="mb-1 font-display font-bold">{t("srv.antinuke")}</h4>
      <p className="mb-3 text-xs text-ink-300">{t("srv.antinukeSub")}</p>

      <div className="grid gap-2">
        <SwitchRow
          label={t("srv.antinukeOn")}
          desc={t("srv.antinukeOnDesc")}
          on={cfg.enabled}
          busy={busy}
          onToggle={() => void patch({ enabled: !cfg.enabled })}
        />

        {cfg.enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-2 pt-1">
              <div className="rounded-2xl border border-white/10 bg-ink-850 px-4 py-3">
                <p className="mb-2 text-xs font-semibold text-ink-100">{t("srv.punishment")}</p>
                <Segmented
                  options={[
                    { v: "stripall", label: t("pun.stripall") },
                    { v: "kick", label: t("pun.kick") },
                    { v: "ban", label: t("pun.ban") },
                  ]}
                  value={cfg.punishment ?? "stripall"}
                  onPick={(v) => void patch({ punishment: v })}
                />
              </div>
              <Stepper label={t("srv.threshold")} value={cfg.threshold ?? 3} min={1} max={20} onCommit={(v) => void patch({ threshold: v })} />
              <Stepper label={t("srv.timeframe")} value={cfg.timeframe ?? 60} min={5} max={600} onCommit={(v) => void patch({ timeframe: v })} />
              <div className="grid gap-2 sm:grid-cols-2">
                {ANTINUKE_MODULES.map((m) => (
                  <SwitchRow
                    key={m.key}
                    label={t(m.labelKey)}
                    on={Boolean(cfg[m.key])}
                    busy={busy}
                    onToggle={() => void patch({ [m.key]: !cfg[m.key] })}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export function AutoModSection({
  guildId,
  initial,
  onError,
}: {
  guildId: string;
  initial: AutomodView;
  onError: () => void;
}) {
  const [cfg, setCfg] = useState<AutomodView>(initial);
  const [busy, setBusy] = useState(false);

  const { t } = useI18n();

  const patch = async (p: Record<string, boolean | number | string>) => {
    setBusy(true);
    const r = await api.setAutomod(guildId, p);
    if (r?.ok && r.automod) setCfg(r.automod);
    else onError();
    setBusy(false);
  };

  return (
    <div className="mt-6">
      <h4 className="mb-1 font-display font-bold">{t("srv.automod")}</h4>
      <p className="mb-3 text-xs text-ink-300">{t("srv.automodSub")}</p>

      <div className="grid gap-2">
        <SwitchRow
          label={t("srv.automodOn")}
          desc={t("srv.automodOnDesc")}
          on={cfg.enabled}
          busy={busy}
          onToggle={() => void patch({ enabled: !cfg.enabled })}
        />

        {cfg.enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-2 pt-1">
              <div className="rounded-2xl border border-white/10 bg-ink-850 px-4 py-3">
                <p className="mb-2 text-xs font-semibold text-ink-100">{t("srv.defaultPunishment")}</p>
                <Segmented
                  options={[
                    { v: "delete", label: t("pun.delete") },
                    { v: "warn", label: t("pun.warn") },
                    { v: "mute", label: t("pun.mute") },
                    { v: "kick", label: t("pun.kick") },
                    { v: "ban", label: t("pun.ban") },
                  ]}
                  value={cfg.punishment ?? "delete"}
                  onPick={(v) => void patch({ punishment: v })}
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {AUTOMOD_MODULES.map((m) => (
                  <SwitchRow
                    key={m.key}
                    label={t(m.labelKey)}
                    on={Boolean(cfg[m.key])}
                    busy={busy}
                    onToggle={() => void patch({ [m.key]: !cfg[m.key] })}
                  />
                ))}
              </div>
              <Stepper label={t("am.spamMessages")} value={cfg.spamThreshold ?? 5} min={2} max={20} onCommit={(v) => void patch({ spamThreshold: v })} />
              <Stepper label={t("am.spamWindow")} value={cfg.spamInterval ?? 5} min={2} max={60} onCommit={(v) => void patch({ spamInterval: v })} />
              <Stepper label={t("am.mentionLimit")} value={cfg.mentionLimit ?? 5} min={1} max={30} onCommit={(v) => void patch({ mentionLimit: v })} />
              <Stepper label={t("am.capsPercent")} value={cfg.capsPercentage ?? 70} min={30} max={100} onCommit={(v) => void patch({ capsPercentage: v })} />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

/* --------------------------- guild giveaways tab --------------------------- */

export function GuildGiveawaysTab({
  guildId,
  textChannels,
}: {
  guildId: string;
  textChannels: { id: string; name: string }[] | undefined;
}) {
  const [list, setList] = useState<GuildGiveaway[] | null>(null);
  const [prize, setPrize] = useState("");
  const [winners, setWinners] = useState(1);
  const [duration, setDuration] = useState(60);
  const [channelId, setChannelId] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { t, locale } = useI18n();

  const load = async () => {
    const r = await api.guildGiveaways(guildId);
    setList(r?.giveaways ?? []);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guildId]);

  const create = async () => {
    if (!prize.trim()) { setErr(t("gw.needPrize")); return; }
    if (!channelId) { setErr(t("gw.needChannel")); return; }
    setBusy(true);
    setErr(null);
    const r = await api.createGiveaway(guildId, { prize: prize.trim(), winners, durationMinutes: duration, channelId });
    if (r?.ok) {
      setPrize("");
      setWinners(1);
      setDuration(60);
      void load();
    } else {
      setErr(t("gw.createFail"));
    }
    setBusy(false);
  };

  const remove = async (gid: number) => {
    if (!confirm(t("gw.deleteConfirm"))) return;
    const r = await api.deleteGiveaway(guildId, gid);
    if (r?.ok) void load();
  };

  return (
    <motion.div key="gw" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="mt-4">
      <h4 className="flex items-center gap-2 font-display font-bold">
        <NikoEmoji name="gift" fallback="🎁" />
        {t("gw.title")}
      </h4>
      <p className="mb-3 text-xs text-ink-300">{t("gw.subtitle")}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          value={prize}
          onChange={(e) => setPrize(e.target.value)}
          maxLength={200}
          placeholder={t("gw.prize")}
          className="rounded-xl border border-white/10 bg-ink-850 px-4 py-2.5 text-sm outline-none focus:border-white/40 sm:col-span-2"
        />
        <div className="rounded-xl border border-white/10 bg-ink-850 px-4 py-2.5">
          <p className="mb-2 text-xs font-semibold text-ink-200">{t("gw.channel")}</p>
          <ChannelPicker
            channels={textChannels}
            value={channelId}
            onChange={setChannelId}
            placeholder={t("srv.selectChannel")}
          />
        </div>
        <label className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-ink-850 px-4 py-2.5">
          <span className="text-xs font-semibold text-ink-200">{t("gw.winners")}</span>
          <input
            type="number"
            min={1}
            max={20}
            value={winners}
            onChange={(e) => setWinners(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
            className="w-16 bg-transparent text-right font-mono text-sm outline-none"
          />
        </label>
        <div className="rounded-xl border border-white/10 bg-ink-850 px-4 py-2.5">
          <p className="mb-2 text-xs font-semibold text-ink-200">{t("gw.duration")}</p>
          <FancySelect
            value={String(duration)}
            onChange={(v) => setDuration(Number(v))}
            options={[
              { value: "10", label: `10 ${t("gw.min")}` },
              { value: "30", label: `30 ${t("gw.min")}` },
              { value: "60", label: `1 ${t("gw.hour")}` },
              { value: "180", label: `3 ${t("gw.hours")}` },
              { value: "720", label: `12 ${t("gw.hours")}` },
              { value: "1440", label: `1 ${t("gw.day")}` },
              { value: "2880", label: `2 ${t("gw.days")}` },
              { value: "10080", label: `7 ${t("gw.days")}` },
            ]}
          />
        </div>
      </div>
      {err && <p className="mt-2 text-xs font-semibold text-red-300">{err}</p>}
      <Btn className="mt-3" disabled={busy} onClick={() => void create()}>
        <Gift className="h-4 w-4" /> {busy ? t("gw.publishing") : t("gw.launch")}
      </Btn>

      <h4 className="mt-6 mb-2 flex items-center gap-2 font-display font-bold">
        <NikoEmoji name="trophy" fallback="🏆" />
        {t("gw.list")}
      </h4>
      {!list && <p className="text-xs text-ink-300">{t("common.loading")}</p>}
      {list && list.length === 0 && <p className="text-xs text-ink-300">{t("gw.empty")}</p>}
      <div className="space-y-2">
        {list?.map((g) => (
          <div key={g.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-ink-850 px-4 py-3">
            <Gift className={cn("h-4 w-4 shrink-0", g.ended ? "text-ink-400" : "text-white")} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{g.prize}</p>
              <p className="font-mono text-[11px] text-ink-300">
                {g.entries} {t("common.participants")} · {g.winners} {t("common.winner")} ·{" "}
                {g.ended ? t("common.ended") : g.endTime > Date.now() ? `${t("common.until")} ${new Date(g.endTime).toLocaleString(locale)}` : t("common.endingSoon")}
              </p>
            </div>
            <button
              onClick={() => void remove(g.id)}
              title={t("common.delete")}
              className="shrink-0 rounded-lg border border-white/10 px-2 py-1 text-[10px] font-bold uppercase text-ink-300 transition-colors hover:border-red-400/50 hover:text-red-300"
            >
              {t("common.delete")}
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ---------------------------- guild logging tab ---------------------------- */

const LOG_TARGETS: { field: string; labelKey: TKey; descKey: TKey }[] = [
  { field: "messageLogsChannelId", labelKey: "lc.messageLogsChannelId", descKey: "lc.messageLogsChannelIdDesc" },
  { field: "memberLogsChannelId", labelKey: "lc.memberLogsChannelId", descKey: "lc.memberLogsChannelIdDesc" },
  { field: "moderationLogsChannelId", labelKey: "lc.moderationLogsChannelId", descKey: "lc.moderationLogsChannelIdDesc" },
  { field: "serverLogsChannelId", labelKey: "lc.serverLogsChannelId", descKey: "lc.serverLogsChannelIdDesc" },
  { field: "voiceLogsChannelId", labelKey: "lc.voiceLogsChannelId", descKey: "lc.voiceLogsChannelIdDesc" },
];

export function GuildLoggingTab({ guildId }: { guildId: string }) {
  const [logging, setLogging] = useState<Record<string, unknown> | null>(null);
  const [textChannels, setTextChannels] = useState<{ id: string; name: string }[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    void (async () => {
      const ext = await api.guildExtends(guildId);
      if (ext) setLogging(ext.logging);
    })();
  }, [guildId]);

  const save = async (field: string, value: string) => {
    setBusy(true);
    setErr(null);
    const r = await api.setLogging(guildId, { [field]: value });
    if (r?.ok && r.config) setLogging(r.config);
    else setErr(t("srv.saveChannelFail"));
    setBusy(false);
  };

  return (
    <motion.div key="lg" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="mt-4">
      <h4 className="font-display font-bold">{t("gw.logChannels")}</h4>
      <p className="mb-3 text-xs text-ink-300">{t("gw.logSub")}</p>
      {err && <p className="mb-2 text-xs font-semibold text-red-300">{err}</p>}
      {!logging && <p className="text-xs text-ink-300">{t("common.loading")}</p>}
      <div className="space-y-2">
        {logging &&
          LOG_TARGETS.map((target) => {
            const current = (logging[target.field] as string | null) ?? "";
            return (
              <div key={target.field} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-ink-850 px-4 py-2.5">
                <span className="min-w-0">
                  <span className="block text-sm font-bold">{t(target.labelKey)}</span>
                  <span className="block text-[11px] text-ink-300">{t(target.descKey)}</span>
                </span>
                <ChannelPicker
                  channels={textChannels}
                  value={current}
                  disabled={busy}
                  onChange={(v) => void save(target.field, v)}
                  placeholder={t("common.none")}
                  className="max-w-[45%] shrink-0"
                />
              </div>
            );
          })}
      </div>
    </motion.div>
  );
}

/* ---------------------------- guild welcome tab ---------------------------- */
/* Full editor for the bot's greetings: channel, style (plain text or a
 * container card), body copy, accent colour and images, with a live preview.
 * It writes the same WelcomeConfig / FarewellConfig rows the gateway events
 * read, so nothing here needs Discord commands anymore. */

type GreetRow = {
  channelId?: string | null;
  type?: string | null;
  message?: string | null;
  title?: string | null;
  description?: string | null;
  color?: number | null;
  thumbnailUrl?: string | null;
  imageUrl?: string | null;
};

type GreetDraft = {
  channelId: string;
  type: "simple" | "container";
  message: string;
  title: string;
  description: string;
  color: string;
  thumbnailUrl: string;
  imageUrl: string;
};

const EMPTY_DRAFT: GreetDraft = {
  channelId: "",
  type: "simple",
  message: "",
  title: "",
  description: "",
  color: "",
  thumbnailUrl: "",
  imageUrl: "",
};

/* Tokens the bot replaces when the message is sent (welcomeEvent /
 * farewellEvent). They are shown as chips and inserted into the text. */
const PLACEHOLDERS = [
  "{mention}", "{user}", "{user_nick}", "{server}",
  "{count}", "{joindate}", "{user_createdate}", "{avatar}",
];

const SAMPLE: Record<string, string> = {
  "{mention}": "@NikoFan",
  "{user}": "NikoFan",
  "{user_nick}": "Niko",
  "{server}": "Niko Community",
  "{count}": "12 480",
  "{joindate}": "24 сентября 2026, среда",
  "{user_createdate}": "12 марта 2021, пятница",
  "{avatar}": "https://cdn.discordapp.com/avatars/sample.png",
};

const sample = (s: string) =>
  Object.entries(SAMPLE).reduce((acc, [k, v]) => acc.split(k).join(v), s);

function rowToDraft(row: GreetRow | null): GreetDraft {
  if (!row) return { ...EMPTY_DRAFT };
  const c = typeof row.color === "number" ? row.color : null;
  return {
    channelId: row.channelId ?? "",
    type: row.type === "container" ? "container" : "simple",
    message: row.message ?? "",
    title: row.title ?? "",
    description: row.description ?? "",
    color: c == null ? "" : `#${c.toString(16).padStart(6, "0").toUpperCase()}`,
    thumbnailUrl: row.thumbnailUrl ?? "",
    imageUrl: row.imageUrl ?? "",
  };
}

export function GuildWelcomeTab({ guildId }: { guildId: string }) {
  const { t } = useI18n();
  const [kind, setKind] = useState<"welcome" | "farewell">("welcome");
  const [rows, setRows] = useState<{ welcome: GreetRow | null; farewell: GreetRow | null } | null>(null);
  const [channels, setChannels] = useState<{ id: string; name: string }[] | null>(null);
  const [drafts, setDrafts] = useState<{ welcome: GreetDraft; farewell: GreetDraft }>({
    welcome: { ...EMPTY_DRAFT },
    farewell: { ...EMPTY_DRAFT },
  });
  const [dirty, setDirty] = useState({ welcome: false, farewell: false });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [ext, detail] = await Promise.all([api.guildExtends(guildId), api.guild(guildId)]);
      if (ext) {
        setRows({ welcome: ext.welcome as GreetRow | null, farewell: ext.farewell as GreetRow | null });
        setDrafts({ welcome: rowToDraft(ext.welcome as GreetRow | null), farewell: rowToDraft(ext.farewell as GreetRow | null) });
      }
      setChannels(detail?.textChannelList ?? []);
    })();
  }, [guildId]);

  const d = drafts[kind];
  const patch = (p: Partial<GreetDraft>) => {
    setDrafts((prev) => ({ ...prev, [kind]: { ...prev[kind], ...p } }));
    setDirty((prev) => ({ ...prev, [kind]: true }));
  };

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  };

  const save = async () => {
    setBusy(true);
    setErr(null);
    const r = await api.setGreeting(guildId, {
      kind,
      channelId: d.channelId,
      type: d.type,
      message: d.type === "simple" ? d.message : null,
      title: d.type === "container" ? d.title : null,
      description: d.type === "container" ? d.description : null,
      color: d.color || null,
      thumbnailUrl: d.thumbnailUrl || null,
      imageUrl: d.imageUrl || null,
    });
    if (r.ok && r.config) {
      setRows((prev) => ({ ...(prev ?? { welcome: null, farewell: null }), [kind]: r.config as GreetRow }));
      setDirty((prev) => ({ ...prev, [kind]: false }));
      flash(t("gw.saved"));
    } else {
      setErr(r.error || t("gw.saveFail"));
    }
    setBusy(false);
  };

  const insertToken = (token: string) => {
    const glue = (s: string) => (s && !s.endsWith(" ") && !s.endsWith("\n") ? `${s} ` : s);
    if (d.type === "simple") patch({ message: `${glue(d.message)}${token}` });
    else patch({ description: `${glue(d.description)}${token}` });
  };

  const accent = d.color || "#2B2D31";
  const channelName = channels?.find((c) => c.id === d.channelId)?.name;

  return (
    <motion.div key="wc" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="mt-4">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="fixed right-6 top-6 z-[60] flex items-center gap-2 rounded-2xl border border-white/20 bg-white px-5 py-3 font-display text-sm font-bold text-black shadow-2xl"
          >
            <Check className="h-4 w-4" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="font-display font-bold">{t("gw.editTitle")}</h4>
          <p className="mt-1 text-xs text-ink-300">{t("gw.editSub")}</p>
        </div>
        {/* entry / exit switch */}
        <div className="flex gap-1 rounded-xl border border-white/10 bg-ink-900 p-1">
          {(["welcome", "farewell"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={cn(
                "relative rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors",
                kind === k ? "text-black" : "text-ink-200 hover:text-white"
              )}
            >
              {kind === k && (
                <motion.span layoutId="greet-kind" className="absolute inset-0 rounded-lg bg-white" transition={{ type: "spring", stiffness: 420, damping: 32 }} />
              )}
              <span className="relative z-10">{k === "welcome" ? t("gw.entry") : t("gw.exit")}</span>
            </button>
          ))}
        </div>
      </div>

      {err && (
        <motion.p
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200"
        >
          {err}
        </motion.p>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        {/* ------------------------------- form ------------------------------ */}
        <div className="space-y-3 rounded-2xl border border-white/10 bg-ink-850 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-ink-300">{t("gw.channel")}</span>
              <ChannelPicker
                channels={channels}
                value={d.channelId}
                disabled={busy}
                onChange={(v) => patch({ channelId: v })}
                placeholder={t("gw.channelOff")}
              />
            </label>
            <div>
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-ink-300">{t("gw.style")}</span>
              <div className="flex gap-1 rounded-xl border border-white/10 bg-ink-900 p-1">
                {(["simple", "container"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => patch({ type: s })}
                    className={cn(
                      "relative flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                      d.type === s ? "text-black" : "text-ink-200 hover:text-white"
                    )}
                  >
                    {d.type === s && (
                      <motion.span layoutId={`greet-style-${kind}`} className="absolute inset-0 rounded-lg bg-white" transition={{ type: "spring", stiffness: 420, damping: 32 }} />
                    )}
                    <span className="relative z-10">{s === "simple" ? t("gw.styleSimple") : t("gw.styleContainer")}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {d.type === "simple" ? (
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-ink-300">{t("gw.messageLabel")}</span>
              <textarea
                value={d.message}
                onChange={(e) => patch({ message: e.target.value })}
                maxLength={1500}
                rows={4}
                placeholder={t("gw.messagePlaceholder")}
                className="w-full resize-y rounded-xl border border-white/10 bg-ink-950/70 px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-ink-400 focus:border-white/40"
              />
            </label>
          ) : (
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-ink-300">{t("gw.titleLabel")}</span>
                <input
                  value={d.title}
                  onChange={(e) => patch({ title: e.target.value })}
                  maxLength={256}
                  placeholder={t("gw.titlePlaceholder")}
                  className="w-full rounded-xl border border-white/10 bg-ink-950/70 px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-ink-400 focus:border-white/40"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-ink-300">{t("gw.descLabel")}</span>
                <textarea
                  value={d.description}
                  onChange={(e) => patch({ description: e.target.value })}
                  maxLength={2000}
                  rows={4}
                  placeholder={t("gw.descPlaceholder")}
                  className="w-full resize-y rounded-xl border border-white/10 bg-ink-950/70 px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-ink-400 focus:border-white/40"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-ink-300">{t("gw.colorLabel")}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={accent}
                      onChange={(e) => patch({ color: e.target.value.toUpperCase() })}
                      className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-white/15 bg-transparent p-0"
                      aria-label={t("gw.colorLabel")}
                    />
                    <input
                      value={d.color}
                      onChange={(e) => patch({ color: e.target.value })}
                      placeholder="#2B2D31"
                      maxLength={7}
                      className="w-full rounded-xl border border-white/10 bg-ink-950/70 px-3 py-2.5 font-mono text-xs uppercase outline-none transition-colors placeholder:text-ink-400 focus:border-white/40"
                    />
                  </div>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-ink-300">{t("gw.thumbLabel")}</span>
                  <input
                    value={d.thumbnailUrl}
                    onChange={(e) => patch({ thumbnailUrl: e.target.value })}
                    placeholder="https://…"
                    className="w-full rounded-xl border border-white/10 bg-ink-950/70 px-3 py-2.5 text-xs outline-none transition-colors placeholder:text-ink-400 focus:border-white/40"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-ink-300">{t("gw.imageLabel")}</span>
                  <input
                    value={d.imageUrl}
                    onChange={(e) => patch({ imageUrl: e.target.value })}
                    placeholder="https://…"
                    className="w-full rounded-xl border border-white/10 bg-ink-950/70 px-3 py-2.5 text-xs outline-none transition-colors placeholder:text-ink-400 focus:border-white/40"
                  />
                </label>
              </div>
            </div>
          )}

          {/* placeholder chips */}
          <div>
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-ink-300">{t("gw.placeholders")}</span>
            <div className="flex flex-wrap gap-1.5">
              {PLACEHOLDERS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => insertToken(p)}
                  className="rounded-lg border border-white/10 bg-ink-900 px-2 py-1 font-mono text-[11px] text-ink-200 transition-colors hover:border-white/40 hover:text-white"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
            <Btn onClick={() => void save()} disabled={busy}>
              <Check className="h-4 w-4" /> {busy ? t("common.loading") : t("common.save")}
            </Btn>
            {dirty[kind] && (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-full border border-amber-300/30 bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-200"
              >
                {t("gw.unsaved")}
              </motion.span>
            )}
            <span className="text-[11px] text-ink-400">{t("gw.appliesMinute")}</span>
          </div>
        </div>

        {/* ------------------------------ preview ---------------------------- */}
        <div className="rounded-2xl border border-white/10 bg-ink-850 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-300">{t("gw.preview")}</span>
            <span className="font-mono text-[10px] text-ink-400">
              {channelName ? `#${channelName}` : t("gw.channelOff")}
            </span>
          </div>

          {!d.channelId ? (
            <div className="grid place-items-center rounded-xl border border-dashed border-white/15 py-10 text-center text-xs text-ink-400">
              {t("gw.channelOff")}
            </div>
          ) : (
            <motion.div
              key={`${kind}-${d.type}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-xl bg-ink-950/80 p-3.5"
            >
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-white/10 font-display text-[11px] font-bold">N</div>
                <div>
                  <p className="text-xs font-bold">Niko</p>
                  <p className="font-mono text-[10px] text-ink-400">bot</p>
                </div>
              </div>

              {d.type === "simple" ? (
                <p className="mt-2 whitespace-pre-wrap break-words rounded-lg border-l-2 pl-2.5 text-sm leading-relaxed text-ink-100" style={{ borderColor: accent }}>
                  {d.message ? sample(d.message) : <span className="text-ink-400">{t("gw.messagePlaceholder")}</span>}
                </p>
              ) : (
                <div className="mt-2 overflow-hidden rounded-lg border border-white/10 bg-ink-900" style={{ boxShadow: `inset 3px 0 0 ${accent}` }}>
                  {(d.thumbnailUrl || d.imageUrl) && (
                    <div className="h-24 w-full overflow-hidden border-b border-white/10 bg-ink-800">
                      {d.imageUrl ? (
                        <img src={d.imageUrl} alt="" className="h-full w-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
                      ) : (
                        <img src={d.thumbnailUrl} alt="" className="mx-auto mt-2 h-20 w-20 rounded-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
                      )}
                    </div>
                  )}
                  <div className="p-3">
                    <p className="font-display text-sm font-bold" style={{ color: accent === "#2B2D31" ? undefined : accent }}>
                      {d.title ? sample(d.title) : t("gw.styleContainer")}
                    </p>
                    <p className="mt-1.5 whitespace-pre-wrap break-words text-xs leading-relaxed text-ink-200">
                      {d.description ? sample(d.description) : <span className="text-ink-400">{t("gw.descPlaceholder")}</span>}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          <p className="mt-3 text-[11px] leading-relaxed text-ink-400">{t("gw.previewNote")}</p>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-400">
            {t("gw.entry")} / {t("gw.exit")}: {t("gw.andSwitches")}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------ modules tab ------------------------------- */
/* Real, DB-backed per-guild modules: AI-chat channels and the custom prefix.
 * Everything here writes the same rows the live bot reads — no fakes. */

export function GuildModulesTab({
  guild,
  detail,
  onDetail,
}: {
  guild: DashboardGuild;
  detail: DashboardGuildDetail | null;
  onDetail: (d: DashboardGuildDetail | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [newChannel, setNewChannel] = useState("");
  const [prefixDraft, setPrefixDraft] = useState<string>(detail?.prefix ?? "");
  const { t } = useI18n();

  useEffect(() => {
    setPrefixDraft(detail?.prefix ?? "");
  }, [detail?.prefix]);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  };

  const aiChannels = detail?.aiChannels ?? [];
  const nameOf = (id: string) => detail?.textChannelList?.find((c) => c.id === id)?.name ?? id;
  const addable = (detail?.textChannelList ?? []).filter((c) => !aiChannels.includes(c.id));

  const toggleAi = async (channelId: string, action: "add" | "remove") => {
    setBusy(true);
    setErr(null);
    const r = await api.setAiChannel(guild.id, channelId, action);
    if (r?.ok && detail) {
      onDetail({ ...detail, aiChannels: r.channels });
      flash(action === "add" ? t("srv.aiOn") : t("srv.aiOff"));
      setNewChannel("");
    } else setErr(t("srv.changeFail"));
    setBusy(false);
  };

  const savePrefix = async () => {
    setBusy(true);
    setErr(null);
    const r = await api.setPrefix(guild.id, prefixDraft.trim());
    if (r?.ok && detail) {
      onDetail({ ...detail, prefix: r.prefix });
      flash(`${t("srv.prefixSaved")}: ${r.prefix}`);
    } else setErr(t("srv.savePrefixFail"));
    setBusy(false);
  };

  return (
    <motion.div key="mods" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="mt-4 space-y-5">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="fixed right-6 top-6 z-[60] flex items-center gap-2 rounded-2xl border border-white/20 bg-white px-5 py-3 font-display text-sm font-bold text-black shadow-2xl"
          >
            <Check className="h-4 w-4" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- AI chat channels ---- */}
      <div className="rounded-2xl border border-white/10 bg-ink-850 p-4">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/15 bg-ink-800">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold">{t("gd.aiChat")}</p>
            <p className="text-[11px] text-ink-300">{t("srv.aiChannelsDesc")}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <AnimatePresence mode="popLayout">
            {aiChannels.map((id) => (
              <motion.span
                key={id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 500, damping: 32 }}
                className="group inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 py-1 pl-3 pr-1.5 text-xs font-semibold"
              >
                #{nameOf(id)}
                <button
                  disabled={busy}
                  onClick={() => void toggleAi(id, "remove")}
                  title={t("srv.removeChannel")}
                  className="grid h-5 w-5 place-items-center rounded-full text-ink-200 transition-colors hover:bg-white hover:text-black"
                >
                  <X className="h-3 w-3" />
                </button>
              </motion.span>
            ))}
          </AnimatePresence>
          {aiChannels.length === 0 && (
            <p className="text-xs text-ink-300">{t("srv.aiNone")}</p>
          )}
        </div>

        {addable.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <ChannelPicker
              channels={addable}
              value={newChannel}
              onChange={setNewChannel}
              placeholder={t("srv.selectChannel")}
              className="max-w-xs flex-1"
            />
            <Btn variant="outline" disabled={busy || !newChannel} onClick={() => void toggleAi(newChannel, "add")}>
              <Plus className="h-4 w-4" /> {t("common.add")}
            </Btn>
          </div>
        )}
      </div>

      {/* ---- prefix ---- */}
      <div className="rounded-2xl border border-white/10 bg-ink-850 p-4">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/15 bg-ink-800">
            <TerminalSquare className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold">{t("srv.prefix")}</p>
            <p className="text-[11px] text-ink-300">
              {t("srv.currentWord")}: <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-white">{detail?.prefix ?? "—"}</code> · {t("srv.appliesSeconds")}
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <input
            value={prefixDraft}
            onChange={(e) => setPrefixDraft(e.target.value.slice(0, 8))}
            maxLength={8}
            placeholder={t("srv.prefixPlaceholder")}
            className="w-32 rounded-xl border border-white/10 bg-ink-900 px-3.5 py-2.5 font-mono text-sm outline-none focus:border-white/40"
          />
          <Btn disabled={busy || !prefixDraft.trim() || prefixDraft === (detail?.prefix ?? "")} onClick={() => void savePrefix()}>
            {t("common.save")}
          </Btn>
        </div>
      </div>

      {err && <p className="text-xs font-semibold text-red-300">{err}</p>}
    </motion.div>
  );
}

/* ------------------------------ commands tab ------------------------------ */
/* Per-guild slash-command toggles (disabled_commands). Owner-level control:
 * turn any bot command off for THIS server only. The bot enforces it live
 * (30s cache) in both slash and prefix flows. */

export function GuildCommandsTab({ guildId }: { guildId: string }) {
  const [data, setData] = useState<{ commands: { name: string; desc: string }[]; overrides: Record<string, boolean> } | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    void api.guildCommands(guildId).then(setData);
  }, [guildId]);

  const toggle = async (name: string, next: boolean) => {
    setBusy(name);
    setErr(null);
    const r = await api.setGuildCommand(guildId, name, next);
    if (r?.ok) {
      setData((d) => (d ? { ...d, overrides: { ...d.overrides, [name]: next } } : d));
    } else {
      setErr(t("srv.changeFail"));
    }
    setBusy(null);
  };

  const list = (data?.commands ?? []).filter((c) => !q.trim() || c.name.includes(q.toLowerCase()) || c.desc.toLowerCase().includes(q.toLowerCase()));
  const offCount = Object.values(data?.overrides ?? {}).filter((v) => v === false).length;

  return (
    <motion.div key="cmds" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="mt-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="flex items-center gap-2 font-display font-bold">
            <Zap className="h-4 w-4" />
            {t("srv.slashCommands")}
          </h4>
          <p className="text-xs text-ink-300">
            {t("srv.slashHint")} {t("srv.disabledCount")}: {offCount}
          </p>
        </div>
        <div className="relative w-44">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-300" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("srv.searchCommands")}
            className="w-full rounded-xl border border-white/10 bg-ink-900 py-2 pl-9 pr-3 text-xs outline-none focus:border-white/40"
          />
        </div>
      </div>

      {err && <p className="mb-2 text-xs font-semibold text-red-300">{err}</p>}

      {!data ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl border border-white/5 bg-ink-850" style={{ animationDelay: `${i * 90}ms` }} />
          ))}
        </div>
      ) : list.length === 0 ? (
        <p className="py-8 text-center text-xs text-ink-300">{data.commands.length === 0 ? t("srv.botUnavailable") : t("common.notFound")}</p>
      ) : (
        <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {list.map((c) => {
              const on = data.overrides[c.name] !== false;
              return (
                <motion.div
                  key={c.name}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-colors",
                    on ? "border-white/10 bg-ink-850" : "border-white/5 bg-ink-900 opacity-70"
                  )}
                >
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", on ? "bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.7)]" : "bg-ink-500")} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs font-bold">/{c.name}</p>
                    {c.desc && <p className="truncate text-[11px] text-ink-300">{c.desc}</p>}
                  </div>
                  {/* iOS-style animated toggle */}
                  <button
                    role="switch"
                    aria-checked={on}
                    disabled={busy === c.name}
                    onClick={() => void toggle(c.name, !on)}
                    className={cn(
                      "relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-200 disabled:opacity-50",
                      on ? "border-white/30 bg-white" : "border-white/10 bg-ink-700"
                    )}
                  >
                    <motion.span
                      layout
                      transition={{ type: "spring", stiffness: 700, damping: 35 }}
                      className={cn("absolute top-0.5 rounded-full", on ? "right-0.5 bg-black" : "left-0.5 bg-ink-300")}
                      style={{ height: 18, width: 18 }}
                    />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

/* --------------------------- whitelist editors ----------------------------- */
/* Antinuke + automod whitelists — the exact tables the bot's enforcement
 * handlers read live (AntinukeWhitelist / AutomodWhitelist). */

function IdListEditor({
  title,
  desc,
  icon: Icon,
  entries,
  idToLabel,
  placeholder,
  onAdd,
  onRemove,
}: {
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  entries: { id: string; note?: string | null }[];
  idToLabel?: (id: string) => string | undefined;
  placeholder: string;
  onAdd: (id: string) => Promise<boolean>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [val, setVal] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const { t } = useI18n();

  const add = async () => {
    if (!/^\d{5,25}$/.test(val.trim())) { setErr(t("srv.needNumericId")); return; }
    setBusy(true);
    setErr(null);
    const ok = await onAdd(val.trim());
    if (ok) setVal("");
    else setErr(t("srv.addFail"));
    setBusy(false);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-ink-850 p-4">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/15 bg-ink-800">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold">{title}</p>
          <p className="text-[11px] text-ink-300">{desc}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <AnimatePresence mode="popLayout">
          {entries.map((e) => (
            <motion.span
              key={e.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 500, damping: 32 }}
              className="group inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 py-1 pl-3 pr-1.5 font-mono text-xs font-semibold"
            >
              {idToLabel?.(e.id) ?? e.id}
              {e.note && <span className="font-sans text-[10px] text-ink-300">{e.note}</span>}
              <button
                disabled={removing === e.id}
                onClick={async () => {
                  setRemoving(e.id);
                  await onRemove(e.id);
                  setRemoving(null);
                }}
                className="grid h-5 w-5 place-items-center rounded-full text-ink-200 transition-colors hover:bg-white hover:text-black"
              >
                <X className="h-3 w-3" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        {entries.length === 0 && <p className="text-xs text-ink-300">{t("srv.listEmpty")}</p>}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void add()}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-ink-900 px-3.5 py-2.5 font-mono text-sm outline-none focus:border-white/40"
        />
        <Btn variant="outline" disabled={busy} onClick={() => void add()}>
          <Plus className="h-4 w-4" /> {t("common.add")}
        </Btn>
      </div>
      {err && <p className="mt-2 text-xs font-semibold text-red-300">{err}</p>}
    </div>
  );
}

export function GuildWhitelistsTab({ guildId }: { guildId: string }) {
  const { t } = useI18n();
  const [an, setAn] = useState<{ id: string; note?: string | null }[] | null>(null);
  const [am, setAm] = useState<{ id: string; note?: string | null }[] | null>(null);
  const [amTypes, setAmTypes] = useState<Record<string, string>>({});

  useEffect(() => {
    void api.antinukeWhitelist(guildId).then((e) => setAn((e ?? []).map((x) => ({ id: x.userId, note: x.events ? null : t("srv.allEvents") }))));
    void api.automodWhitelist(guildId).then((e) => {
      setAm((e ?? []).map((x) => ({ id: x.targetId, note: x.targetType })));
      setAmTypes(Object.fromEntries((e ?? []).map((x) => [x.targetId, x.targetType])));
    });
  }, [guildId]);

  return (
    <motion.div key="wl" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="mt-4 space-y-4">
      <IdListEditor
        title={t("srv.wlAntinuke")}
        desc={t("srv.wlAntinukeDesc")}
        icon={ShieldCheck}
        entries={an ?? []}
        placeholder={t("srv.wlUserPlaceholder")}
        onAdd={async (id) => {
          const ok = await api.antinukeWhitelistAdd(guildId, id);
          if (ok) setAn((p) => [...(p ?? []), { id, note: t("srv.allEvents") }]);
          return Boolean(ok);
        }}
        onRemove={async (id) => {
          await api.antinukeWhitelistRemove(guildId, id);
          setAn((p) => (p ?? []).filter((x) => x.id !== id));
        }}
      />
      <IdListEditor
        title={t("srv.wlAutomod")}
        desc={t("srv.wlAutomodDesc")}
        icon={Settings2}
        entries={am ?? []}
        placeholder={t("srv.wlIdPlaceholder")}
        onAdd={async (id) => {
          const type = amTypes[id] ?? "user";
          const ok = await api.automodWhitelistAdd(guildId, id, type);
          if (ok) setAm((p) => [...(p ?? []), { id, note: type }]);
          return Boolean(ok);
        }}
        onRemove={async (id) => {
          await api.automodWhitelistRemove(guildId, id);
          setAm((p) => (p ?? []).filter((x) => x.id !== id));
        }}
      />
    </motion.div>
  );
}
