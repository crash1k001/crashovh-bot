import { useEffect, useState } from "react";
import {
  Activity, Ban, CheckCircle2, ChevronRight, Command, Cpu, Database, Download,
  Eye, EyeOff, Gift, KeyRound, LifeBuoy, Lock, Megaphone, ScrollText, Send,
  ShieldCheck, Ticket, Timer, Trash2, Trophy, XCircle, ImagePlus, Server, Users,
  UserPlus, UserCog, Power, ShieldQuestion,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AnimatePresence, motion } from "framer-motion";
import { Badge, Btn, StatCard } from "@/components/shared";
import { FancySelect } from "@/components/ChannelPicker";
import {
  api, fmtUptime,
  type AdminGuildDetail, type BotTicketRow, type GiveawayRow, type TableRow,
  type AdminAccountRow, type AdminPermInfo,
} from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";
import { useI18n, vlogTagLabel, VLOG_TAGS } from "@/lib/i18n";

/* ------------------------------ shared shapes ----------------------------- */

export type Overview = {
  uptimeSec: number; memoryMb: number; heapMb: number; ping: number | null;
  guilds: number; users: number; channels: number; commands: number;
  shards: number; shardStatus: { id: number; status: string; ping: number | null }[];
  voice: number; totalCommandUses: number;
  telemetry: { t: string; memory: number; ping: number; guilds: number; users: number }[];
  commandUsage: { name: string; uses: number; users: number; lastUsed: number }[];
  counts?: {
    tickets: number | null; ticketsOpen: number | null; giveawaysActive: number | null;
    profiles: number | null; blacklist: number | null; noprefix: number | null;
  };
};
export type GuildRow = { id: string; name: string; icon: string | null; members: number; boosts: number; owner: string };
export type BlackRow = { id: number; type: string; targetId: string; reason: string | null; createdAt: string };
export type NpRow = { userId: string; username: string; grantedByUsername: string; createdAt: string };
export type AuditRow = { id: string; action: string; details: string; ts: number };
export type ModLog = { id: number; guildId: string; moderatorTag: string; targetTag: string; action: string; reason: string | null; createdAt: string };
export type VlogRow = { id: string; title: string; body: string; tag: string; author: string; published: boolean; createdAt: number };
export type TicketRow = {
  id: string; userId: string; username: string; avatar: string | null;
  subject: string; status: "open" | "answered" | "closed";
  messages: { from: "user" | "admin"; author: string; text: string; ts: number }[];
  createdAt: number; updatedAt: number;
};
export type BotLogRow = { ts: number; level: string; text: string };

/* ------------------------------- panel shell ------------------------------ */
/* Every admin section shares one visual plate: icon chip, title, hint and an
 * entrance animation. Keeps the redesigned panel consistent everywhere. */
export function Panel({
  title,
  sub,
  icon: Icon,
  children,
  right,
  className,
}: {
  title: string;
  sub?: string;
  icon?: typeof Activity;
  children: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={cn("adm-panel p-5 md:p-6", className)}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/15 bg-ink-800">
              <Icon className="h-4 w-4" strokeWidth={1.9} />
            </span>
          )}
          <div className="min-w-0">
            <h3 className="font-display text-base font-bold">{title}</h3>
            {sub && <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-ink-300">{sub}</p>}
          </div>
        </div>
        {right}
      </div>
      {children}
    </motion.section>
  );
}

/* --------------------------------- overview -------------------------------- */

export function OverviewTab({ ov }: { ov: Overview | null }) {
  const { t, num } = useI18n();
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard index={0} label={t("ov.guilds")} value={String(ov?.guilds ?? "—")} icon={Server} />
        <StatCard index={1} label={t("ov.users")} value={ov ? num(ov.users) : "—"} icon={Users} />
        <StatCard
          index={2}
          label={t("adm.memory")}
          value={ov ? `${ov.memoryMb} MB` : "—"}
          sub={ov ? `${t("adm.heap")} ${ov.heapMb} MB` : ""}
          icon={Cpu}
        />
        <StatCard
          index={3}
          label={t("adm.commandsUsed")}
          value={num(ov?.totalCommandUses ?? 0)}
          sub={t("adm.sinceStart")}
          icon={Command}
        />
      </div>

      {/* real counters straight from the bot's own tables */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          index={0}
          label={t("adm.botTickets")}
          value={ov?.counts?.tickets != null ? String(ov.counts.tickets) : "—"}
          sub={ov?.counts?.ticketsOpen != null ? `${t("adm.openWord")} ${ov.counts.ticketsOpen}` : ""}
          icon={Ticket}
        />
        <StatCard
          index={1}
          label={t("adm.activeGiveaways")}
          value={ov?.counts?.giveawaysActive != null ? String(ov.counts.giveawaysActive) : "—"}
          sub={t("adm.totalWord")}
          icon={Gift}
        />
        <StatCard
          index={2}
          label={t("adm.profiles")}
          value={ov?.counts?.profiles != null ? String(ov.counts.profiles) : "—"}
          sub={t("adm.totalWord")}
          icon={Trophy}
        />
        <StatCard
          index={3}
          label={t("adm.blacklist")}
          value={ov?.counts?.blacklist != null ? String(ov.counts.blacklist) : "—"}
          sub={ov?.counts?.noprefix != null ? `NoPrefix: ${ov.counts.noprefix}` : ""}
          icon={Ban}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title={t("adm.telemetry")} icon={Activity} className="lg:col-span-2">
          <div className="h-52">
            {ov && ov.telemetry.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ov.telemetry}>
                  <defs>
                    <linearGradient id="gTm" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fff" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#fff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="t" stroke="#555" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#555" fontSize={11} tickLine={false} axisLine={false} width={44} />
                  <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, fontSize: 12 }} />
                  <Area type="monotone" dataKey="memory" stroke="#fff" strokeWidth={2} fill="url(#gTm)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center font-mono text-sm text-ink-300">
                {t("adm.telemetryWait")}
              </div>
            )}
          </div>
        </Panel>

        <Panel title={t("adm.system")} icon={Cpu}>
          <div className="space-y-3 text-sm">
            {[
              { k: t("ov.uptime"), v: ov ? fmtUptime(ov.uptimeSec) : "—" },
              { k: t("adm.gatewayPing"), v: ov?.ping != null ? `${Math.round(ov.ping)}ms` : "—" },
              { k: t("ov.shards"), v: ov ? ov.shardStatus.map((s) => `#${s.id} ${s.status}`).join(", ") || `${ov.shards}` : "—" },
              { k: t("adm.voiceWord"), v: String(ov?.voice ?? "—") },
              { k: t("ov.channels"), v: String(ov?.channels ?? "—") },
            ].map((r) => (
              <motion.div
                key={r.k}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between"
              >
                <span className="text-ink-200">{r.k}</span>
                <span className="font-mono font-semibold">{r.v}</span>
              </motion.div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------------------------- guilds -------------------------------- */

export function GuildsTab({ guilds, onLeave }: { guilds: GuildRow[] | null; onLeave: (id: string, name: string) => void }) {
  const { t, num } = useI18n();
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <Panel
      title={`${t("adm.guildsOfBot")} (${guilds?.length ?? 0})`}
      sub={t("adm.guildsHint")}
      icon={Server}
      right={<Badge>{num(guilds?.length ?? 0)}</Badge>}
    >
      <div className="space-y-2.5">
        {(guilds ?? []).map((g, gi) => (
          <motion.div
            key={g.id}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(gi * 0.04, 0.5), duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <div
              onClick={() => setOpenId(openId === g.id ? null : g.id)}
              className="group flex cursor-pointer items-center gap-4 rounded-2xl border border-white/5 bg-ink-850 px-4 py-3 transition-all hover:border-white/25 hover:bg-ink-800"
            >
              {g.icon ? (
                <img src={g.icon} alt="" className="h-9 w-9 rounded-xl border border-white/15 object-cover" />
              ) : (
                <div className="grid h-9 w-9 place-items-center rounded-xl border border-white/15 bg-ink-800 font-display text-sm font-bold">{g.name[0]}</div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{g.name}</p>
                <p className="truncate font-mono text-[11px] text-ink-300">{g.id}</p>
              </div>
              <span className="hidden shrink-0 font-mono text-sm sm:block">{num(g.members)}</span>
              <span className="hidden w-14 shrink-0 text-right font-mono text-xs text-ink-300 md:block">{g.boosts} boost</span>
              <button
                onClick={(e) => { e.stopPropagation(); onLeave(g.id, g.name); }}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-bold text-ink-200 transition-all hover:border-white hover:bg-white hover:text-black"
              >
                {t("adm.leave")}
              </button>
            </div>
            {openId === g.id && <GuildInspector id={g.id} onClose={() => setOpenId(null)} />}
          </motion.div>
        ))}
        {guilds?.length === 0 && <p className="py-8 text-center text-sm text-ink-300">{t("adm.noGuilds")}</p>}
      </div>
    </Panel>
  );
}

/* --------------------------------- commands ------------------------------- */

export function CommandsTab({ ov }: { ov: Overview | null }) {
  const { t } = useI18n();
  const max = ov?.commandUsage[0]?.uses ?? 1;
  return (
    <Panel title={t("adm.commandUsage")} sub={t("adm.commandUsageSub")} icon={Command}>
      {ov && ov.commandUsage.length > 0 ? (
        <div className="space-y-3.5">
          {ov.commandUsage.map((c, i) => (
            <div key={c.name}>
              <div className="mb-1.5 flex justify-between text-sm">
                <span className="font-mono font-semibold">/{c.name}</span>
                <span className="flex items-center gap-4">
                  <span className="font-mono text-xs text-ink-300">{c.users} {t("cmd.users")}</span>
                  <span className="font-mono text-xs">{c.uses}</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-ink-700">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(c.uses / max) * 100}%` }}
                  transition={{ delay: i * 0.06, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full rounded-full bg-white"
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-12 text-center font-mono text-sm text-ink-300">{t("adm.noCommandUses")}</p>
      )}
    </Panel>
  );
}

/* --------------------------------- mod logs ------------------------------- */

export function ModLogsTab({ logs }: { logs: ModLog[] }) {
  const { t, lang } = useI18n();
  return (
    <Panel title={t("adm.modLogsTitle")} icon={ScrollText}>
      <div className="space-y-2.5">
        {logs.slice(0, 40).map((l, li) => (
          <motion.div
            key={l.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(li * 0.03, 0.4), duration: 0.3 }}
            className="flex items-center gap-3 rounded-2xl border border-white/5 bg-ink-850 px-4 py-3"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/15 bg-ink-800 font-mono text-[10px] font-bold uppercase">{l.action}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm"><span className="font-semibold">{l.targetTag}</span> {l.reason ? `— ${l.reason}` : ""}</p>
              <p className="font-mono text-[11px] text-ink-300">{l.moderatorTag} · {timeAgo(Date.parse(l.createdAt), lang)}</p>
            </div>
          </motion.div>
        ))}
        {logs.length === 0 && <p className="py-12 text-center font-mono text-sm text-ink-300">{t("adm.noRecords")}</p>}
      </div>
    </Panel>
  );
}

/* -------------------------------- blacklist ------------------------------- */

export function BlacklistTab({
  rows,
  onAdd,
  onDel,
}: {
  rows: BlackRow[];
  onAdd: (t: string, id: string, r: string) => void;
  onDel: (id: number) => void;
}) {
  const { t } = useI18n();
  const [type, setType] = useState("user");
  const [id, setId] = useState("");
  const [reason, setReason] = useState("");
  return (
    <div className="space-y-4">
      <Panel title={t("adm.addToBlacklist")} icon={Ban}>
        <div className="flex flex-wrap gap-2">
          <FancySelect
            className="w-44"
            value={type}
            onChange={setType}
            options={[
              { value: "user", label: t("adm.userWord") },
              { value: "guild", label: t("adm.guildWord") },
            ]}
          />
          <input
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder={t("adm.discordId")}
            className="min-w-[180px] flex-1 rounded-xl border border-white/10 bg-ink-850 px-4 py-2.5 font-mono text-sm outline-none focus:border-white/40"
          />
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("adm.reasonOptional")}
            className="min-w-[200px] flex-[2] rounded-xl border border-white/10 bg-ink-850 px-4 py-2.5 text-sm outline-none focus:border-white/40"
          />
          <Btn onClick={() => { if (id) { onAdd(type, id, reason); setId(""); setReason(""); } }}>{t("common.add")}</Btn>
        </div>
      </Panel>

      <Panel title={`${t("adm.blocked")} (${rows.length})`} icon={ShieldCheck}>
        <div className="space-y-2.5">
          <AnimatePresence initial={false}>
            {rows.map((b, i) => (
              <motion.div
                key={b.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                className="flex items-center gap-3 rounded-2xl border border-white/5 bg-ink-850 px-4 py-3"
              >
                <Badge>{b.type}</Badge>
                <span className="min-w-0 flex-1 truncate font-mono text-sm">{b.targetId}</span>
                <span className="hidden min-w-0 flex-1 truncate text-xs text-ink-300 md:block">{b.reason ?? "—"}</span>
                <button
                  onClick={() => onDel(b.id)}
                  title={t("common.delete")}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 text-ink-200 transition-all hover:border-white hover:bg-white hover:text-black"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          {rows.length === 0 && <p className="py-8 text-center text-sm text-ink-300">{t("adm.blackEmpty")}</p>}
        </div>
      </Panel>
    </div>
  );
}

/* -------------------------------- no prefix ------------------------------- */

export function NoprefixTab({
  rows,
  onAdd,
  onDel,
}: {
  rows: NpRow[];
  onAdd: (id: string) => void;
  onDel: (id: string) => void;
}) {
  const { t, lang } = useI18n();
  const [id, setId] = useState("");
  return (
    <div className="space-y-4">
      <Panel title={t("adm.grantNp")} icon={KeyRound}>
        <div className="flex flex-wrap gap-2">
          <input
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder={t("adm.userIdPlaceholder")}
            className="min-w-[200px] flex-1 rounded-xl border border-white/10 bg-ink-850 px-4 py-2.5 font-mono text-sm outline-none focus:border-white/40"
          />
          <Btn onClick={() => { if (id) { onAdd(id); setId(""); } }}>{t("adm.grant")}</Btn>
        </div>
      </Panel>

      <Panel title={`${t("adm.withNp")} (${rows.length})`} icon={KeyRound}>
        <div className="space-y-2.5">
          <AnimatePresence initial={false}>
            {rows.map((n, i) => (
              <motion.div
                key={n.userId}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                className="flex items-center gap-3 rounded-2xl border border-white/5 bg-ink-850 px-4 py-3"
              >
                <div className="grid h-9 w-9 place-items-center rounded-xl border border-white/15 bg-ink-800 font-display text-sm font-bold">
                  {n.username[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{n.username}</p>
                  <p className="font-mono text-[11px] text-ink-300">{n.userId} · {timeAgo(Date.parse(n.createdAt), lang)}</p>
                </div>
                <span className="hidden text-xs text-ink-300 md:block">{n.grantedByUsername}</span>
                <button
                  onClick={() => onDel(n.userId)}
                  title={t("common.delete")}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 text-ink-200 transition-all hover:border-white hover:bg-white hover:text-black"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          {rows.length === 0 && <p className="py-8 text-center text-sm text-ink-300">{t("adm.noneGranted")}</p>}
        </div>
      </Panel>
    </div>
  );
}

/* -------------------------------- broadcast ------------------------------- */

export function BroadcastTab({ onSend }: { onSend: (m: string) => void }) {
  const { t } = useI18n();
  const [msg, setMsg] = useState("");
  const [confirming, setConfirming] = useState(false);
  return (
    <Panel title={t("adm.broadcastTitle")} sub={t("adm.broadcastSub")} icon={Megaphone}>
      <textarea
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        rows={5}
        maxLength={1800}
        placeholder={t("adm.broadcastPlaceholder")}
        className="w-full resize-none rounded-2xl border border-white/10 bg-ink-850 px-4 py-3 text-sm outline-none focus:border-white/40"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <span className="font-mono text-xs text-ink-300">{msg.length}/1800</span>
        {!confirming ? (
          <Btn onClick={() => msg.trim() && setConfirming(true)} disabled={!msg.trim()}>
            <Megaphone className="h-4 w-4" /> {t("sup.send")}
          </Btn>
        ) : (
          <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2">
            <span className="text-xs font-semibold text-ink-200">{t("adm.confirmBroadcast")}</span>
            <Btn variant="outline" onClick={() => setConfirming(false)}>{t("common.cancel")}</Btn>
            <Btn onClick={() => { onSend(msg.trim()); setMsg(""); setConfirming(false); }}>
              <Megaphone className="h-4 w-4" /> {t("adm.yesSend")}
            </Btn>
          </motion.div>
        )}
      </div>
    </Panel>
  );
}

/* ---------------------------------- vlogs --------------------------------- */

export function VlogsTab({
  rows,
  onCreate,
  onToggle,
  onDelete,
}: {
  rows: VlogRow[];
  onCreate: (title: string, body: string, tag: string, published: boolean, images?: string[]) => void;
  onToggle: (id: string, published: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const { t, lang } = useI18n();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tag, setTag] = useState<string>(VLOG_TAGS[0]);
  const [images, setImages] = useState<string[]>([]);
  const [imgUrl, setImgUrl] = useState("");

  const submit = (published: boolean) => {
    if (!title.trim() || !body.trim()) return;
    onCreate(title.trim(), body.trim(), tag, published, images.filter((u) => u.startsWith("https://")));
    setTitle("");
    setBody("");
    setImages([]);
    setImgUrl("");
  };

  const addImage = () => {
    const u = imgUrl.trim();
    if (!/^https:\/\//i.test(u) || images.length >= 6 || images.includes(u)) return;
    setImages((prev) => [...prev, u]);
    setImgUrl("");
  };

  return (
    <div className="space-y-4">
      <Panel title={t("adm.newVlog")} sub={t("adm.newVlogSub")} icon={ImagePlus}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={160}
          placeholder={t("adm.vlogTitlePlaceholder")}
          className="w-full rounded-xl border border-white/10 bg-ink-850 px-4 py-2.5 text-sm outline-none focus:border-white/40"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          maxLength={8000}
          placeholder={t("adm.vlogBodyPlaceholder")}
          className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-ink-850 px-4 py-3 text-sm outline-none focus:border-white/40"
        />

        <div className="mt-3">
          <p className="mb-2 text-xs font-semibold text-ink-200">{t("adm.images")}</p>
          <div className="flex gap-2">
            <input
              value={imgUrl}
              onChange={(e) => setImgUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addImage(); } }}
              maxLength={500}
              placeholder="https://i.imgur.com/abc.png"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-ink-850 px-4 py-2.5 text-sm outline-none focus:border-white/40"
            />
            <Btn variant="outline" onClick={addImage} disabled={!imgUrl.trim().startsWith("https://") || images.length >= 6}>
              <ImagePlus className="h-4 w-4" /> {t("adm.attach")}
            </Btn>
          </div>
          {images.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <AnimatePresence initial={false}>
                {images.map((u) => (
                  <motion.div
                    key={u}
                    layout
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ type: "spring", stiffness: 480, damping: 30 }}
                    className="group relative"
                  >
                    <img src={u} alt="" className="h-16 w-24 rounded-xl border border-white/15 object-cover" />
                    <button
                      onClick={() => setImages((prev) => prev.filter((x) => x !== u))}
                      className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full border border-white/25 bg-ink-950 text-[10px] font-bold opacity-0 transition-opacity group-hover:opacity-100"
                      title={t("adm.remove")}
                    >
                      ×
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FancySelect
              className="w-44"
              value={tag}
              onChange={setTag}
              options={VLOG_TAGS.map((v) => ({ value: v, label: vlogTagLabel(v, lang) }))}
            />
            <span className="font-mono text-xs text-ink-300">{body.length}/8000</span>
          </div>
          <div className="flex gap-2">
            <Btn variant="outline" onClick={() => submit(false)} disabled={!title.trim() || !body.trim()}>
              <EyeOff className="h-4 w-4" /> {t("adm.draft")}
            </Btn>
            <Btn onClick={() => submit(true)} disabled={!title.trim() || !body.trim()}>
              <Megaphone className="h-4 w-4" /> {t("adm.publish")}
            </Btn>
          </div>
        </div>
      </Panel>

      <Panel title={`${t("adm.allVlogs")} (${rows.length})`} icon={ScrollText}>
        <div className="space-y-2.5">
          <AnimatePresence initial={false}>
            {rows.map((v) => (
              <motion.div
                key={v.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/5 bg-ink-850 px-4 py-3"
              >
                <span className={cn("shrink-0 rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold uppercase", v.published ? "border-white/40 bg-white/10" : "border-white/10 text-ink-300")}>
                  {v.published ? t("adm.publishedState") : t("adm.draftState")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{v.title}</p>
                  <p className="font-mono text-[11px] text-ink-300">
                    {vlogTagLabel(v.tag, lang)} · {v.author} · {timeAgo(v.createdAt, lang)}
                  </p>
                </div>
                <button
                  onClick={() => onToggle(v.id, !v.published)}
                  title={v.published ? t("adm.hideFromSite") : t("adm.publish")}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 text-ink-200 transition-all hover:border-white hover:bg-white hover:text-black"
                >
                  {v.published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => onDelete(v.id)}
                  title={t("common.delete")}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 text-ink-200 transition-all hover:border-white hover:bg-white hover:text-black"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          {rows.length === 0 && <p className="py-8 text-center text-sm text-ink-300">{t("adm.noVlogs")}</p>}
        </div>
      </Panel>
    </div>
  );
}

/* ---------------------------------- audit --------------------------------- */

export function AuditTab({ rows }: { rows: AuditRow[] }) {
  const { t, lang } = useI18n();
  return (
    <Panel title={t("adm.auditTitle")} icon={ShieldCheck}>
      <div className="space-y-2">
        {rows.map((a) => (
          <div key={a.id} className="flex items-center gap-3 rounded-xl px-4 py-2.5 font-mono text-sm transition-colors hover:bg-white/5">
            {a.action.includes("failed")
              ? <XCircle className="h-4 w-4 shrink-0 text-ink-200" />
              : <CheckCircle2 className="h-4 w-4 shrink-0 text-ink-300" />}
            <span className="shrink-0 font-bold uppercase">{a.action}</span>
            <span className="min-w-0 flex-1 truncate text-ink-300">{a.details}</span>
            <span className="flex shrink-0 items-center gap-1 text-[11px] text-ink-400"><Timer className="h-3 w-3" /> {timeAgo(a.ts, lang)}</span>
          </div>
        ))}
        {rows.length === 0 && <p className="py-8 text-center text-sm text-ink-300">{t("adm.noActions")}</p>}
      </div>
    </Panel>
  );
}

/* ------------------------------- live bot log ----------------------------- */

export function LogsTab({ rows }: { rows: BotLogRow[] }) {
  const { t, locale } = useI18n();
  return (
    <Panel title={t("adm.botLogTitle")} sub={t("adm.botLogSub")} icon={ScrollText}>
      <div className="space-y-1.5 font-mono text-xs">
        {rows.map((l) => (
          <div key={l.ts + l.text} className="flex items-start gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-white/5">
            <span
              className={cn(
                "mt-0.5 shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase",
                l.level === "error" && "border-red-400/40 text-red-300",
                l.level === "warn" && "border-yellow-300/40 text-yellow-200",
                l.level === "success" && "border-white/50 text-white",
                l.level === "cmd" && "border-white/40 bg-white/10",
                l.level === "admin" && "border-white/25",
                l.level === "info" && "border-white/10 text-ink-300"
              )}
            >
              {l.level}
            </span>
            <span className="min-w-0 flex-1 break-all">{l.text}</span>
            <span className="shrink-0 text-[10px] text-ink-400">{new Date(l.ts).toLocaleTimeString(locale)}</span>
          </div>
        ))}
        {rows.length === 0 && <p className="py-12 text-center text-ink-300">{t("adm.noEvents")}</p>}
      </div>
    </Panel>
  );
}

/* --------------------------------- support -------------------------------- */

export function SupportTab({
  tickets,
  openCount,
  onReply,
  onStatus,
  onDelete,
}: {
  tickets: TicketRow[];
  openCount: number;
  onReply: (id: string, text: string) => void;
  onStatus: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}) {
  const { t, lang, dt } = useI18n();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [text, setText] = useState("");

  const current = tickets.find((x) => x.id === activeId) ?? null;

  const send = () => {
    if (!current || !text.trim()) return;
    onReply(current.id, text.trim());
    setText("");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Badge className="gap-1.5">
          <LifeBuoy className="h-3 w-3" /> {t("adm.ticketsCount")}: {tickets.length}
        </Badge>
        <Badge className="gap-1.5 border-white bg-white text-black">
          {t("adm.awaitingReply")}: {openCount}
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(280px,340px)_1fr]">
        <div className="space-y-2">
          {tickets.map((x) => (
            <button
              key={x.id}
              onClick={() => setActiveId(x.id)}
              className={cn(
                "w-full rounded-2xl border p-3.5 text-left transition-all",
                activeId === x.id ? "border-white/40 bg-ink-800" : "border-white/10 bg-ink-900 hover:border-white/25"
              )}
            >
              <div className="flex items-center gap-2.5">
                {x.avatar ? (
                  <img src={x.avatar} alt="" className="h-8 w-8 shrink-0 rounded-lg border border-white/15" />
                ) : (
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/15 bg-ink-800 text-xs font-bold">
                    {x.username[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">
                    {x.messages?.[x.messages.length - 1]?.from === "user" && x.status !== "closed" && (
                      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-white align-middle" />
                    )}
                    {x.subject}
                  </p>
                  <p className="truncate text-[11px] text-ink-300">{x.username} · {timeAgo(x.updatedAt, lang)}</p>
                </div>
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    x.status === "open" ? "bg-white" : x.status === "answered" ? "bg-ink-400" : "bg-ink-600"
                  )}
                />
              </div>
            </button>
          ))}
          {tickets.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/15 px-4 py-12 text-center">
              <LifeBuoy className="mx-auto mb-3 h-8 w-8 text-ink-300" />
              <p className="text-sm text-ink-300">{t("sup.empty")}</p>
            </div>
          )}
        </div>

        <div className="adm-panel flex min-h-[420px] flex-col overflow-hidden">
          {!current ? (
            <div className="grid flex-1 place-items-center p-10 text-center">
              <Lock className="h-10 w-10 text-ink-300" />
              <p className="mt-3 text-sm text-ink-300">{t("adm.pickTicketLeft")}</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-6 py-4">
                <div className="min-w-0">
                  <p className="truncate font-display font-bold">{current.subject}</p>
                  <p className="font-mono text-[10px] text-ink-300">
                    {current.username} · {current.userId} · {t("sup.ticket")} {current.id.slice(0, 8)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {current.status !== "answered" && (
                    <Btn variant="outline" onClick={() => onStatus(current.id, "answered")}>{t("adm.hasAnswer")}</Btn>
                  )}
                  {current.status !== "closed" && (
                    <Btn variant="outline" onClick={() => onStatus(current.id, "closed")}>{t("adm.closeWord")}</Btn>
                  )}
                  <button
                    onClick={() => onDelete(current.id)}
                    title={t("common.delete")}
                    className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-ink-200 transition-all hover:border-white hover:bg-white hover:text-black"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                <AnimatePresence initial={false}>
                  {current.messages.map((m, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn("flex", m.from === "admin" ? "justify-end" : "justify-start")}
                    >
                      <div className={cn("max-w-[80%] rounded-2xl px-4 py-3", m.from === "admin" ? "bg-white text-black" : "border border-white/15 bg-ink-850 text-white")}>
                        <p className={cn("text-[10px] font-bold uppercase tracking-wider", m.from === "admin" ? "text-black/50" : "text-ink-300")}>
                          {m.author}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{m.text}</p>
                        <p className={cn("mt-1.5 font-mono text-[10px]", m.from === "admin" ? "text-black/40" : "text-ink-400")}>
                          {dt(m.ts)}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {current.messages.length === 0 && (
                  <p className="py-8 text-center text-sm text-ink-300">{t("adm.noMessages")}</p>
                )}
              </div>

              {current.status !== "closed" && (
                <div className="flex gap-2 border-t border-white/10 p-4">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && send()}
                    placeholder={`${t("adm.replyTo")} ${current.username}…`}
                    maxLength={2000}
                    className="flex-1 rounded-xl border border-white/10 bg-ink-850 px-4 py-2.5 text-sm outline-none focus:border-white/40"
                  />
                  <Btn onClick={send}>
                    <Send className="h-4 w-4" />
                  </Btn>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- ddos monitor ----------------------------- */

type DdosInfo = {
  blocked: number; flagged: number; cooldowns: number;
  limits: { burst: number; sustainedPerMin: number; cooldownMinutes: number };
  activeCooldowns: { ip: string; minutesLeft: number }[];
  topIps: { ip: string; rpm: number }[];
  trackedIps: number;
  telegramAlerts: boolean;
};

/* Live flood-protection monitor: real counters from the bot's guard, top
 * offending IPs and a cooldown release button. Polls every 5s. */
export function DdosMonitor() {
  const { t } = useI18n();
  const [info, setInfo] = useState<DdosInfo | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const r = await fetch("/api/admin/ddos", { credentials: "include" });
        if (!r.ok) return;
        const d = (await r.json()) as DdosInfo;
        if (!stop) setInfo(d);
      } catch { /* offline */ }
    };
    void load();
    const timer = setInterval(load, 5000);
    return () => { stop = true; clearInterval(timer); };
  }, []);

  const unblock = async (ip: string) => {
    setBusy(ip);
    await fetch("/api/admin/ddos/unblock", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip }),
    });
    setBusy(null);
  };

  if (!info) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="adm-panel p-6"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex flex-wrap items-center gap-2 font-display text-lg font-bold">
            <Activity className="h-5 w-5" /> {t("adm.ddos")}
            <span className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
              info.telegramAlerts ? "border-white/30 text-white" : "border-white/15 text-ink-300"
            )}>
              <span className={cn("h-1.5 w-1.5 rounded-full", info.telegramAlerts ? "bg-white" : "bg-ink-400")} />
              telegram {info.telegramAlerts ? t("adm.ddosTelegram") : t("adm.ddosTelegramOff")}
            </span>
          </h3>
          <p className="mt-1 text-xs text-ink-300">
            {t("adm.ddosLimits")} {info.limits.burst} · {info.limits.sustainedPerMin} {t("adm.ddosPerMin")} {info.limits.cooldownMinutes} {t("common.min")}
          </p>
        </div>
        <Badge>{info.trackedIps} {t("adm.ddosWatched")}</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { k: t("adm.ddosBlocked"), v: info.blocked, c: "text-red-300" },
          { k: t("adm.ddosFlagged"), v: info.flagged, c: "text-amber-300" },
          { k: t("adm.ddosCooldownNow"), v: info.activeCooldowns.length, c: "text-white" },
        ].map((s, i) => (
          <motion.div
            key={s.k}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-2xl border border-white/10 bg-ink-850 p-4"
          >
            <p className={cn("font-display text-2xl font-bold", s.c)}>{s.v}</p>
            <p className="mt-1 text-[11px] uppercase tracking-wider text-ink-300">{s.k}</p>
          </motion.div>
        ))}
      </div>

      {(info.activeCooldowns.length > 0 || info.topIps.length > 0) && (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {info.activeCooldowns.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-300">{t("adm.inCooldown")}</p>
              <div className="space-y-1.5">
                {info.activeCooldowns.map((c) => (
                  <div key={c.ip} className="flex items-center gap-3 rounded-xl border border-white/10 bg-ink-850 px-3.5 py-2">
                    <span className="min-w-0 flex-1 truncate font-mono text-xs">{c.ip}</span>
                    <span className="font-mono text-[10px] text-ink-300">{c.minutesLeft} {t("common.min")}</span>
                    <button
                      onClick={() => void unblock(c.ip)}
                      disabled={busy === c.ip}
                      className="rounded-lg border border-white/15 px-2.5 py-1 text-[10px] font-bold text-ink-200 transition-colors hover:border-white hover:bg-white hover:text-black disabled:opacity-50"
                    >
                      {t("adm.unblock")}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {info.topIps.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-300">{t("adm.topIps")}</p>
              <div className="space-y-1.5">
                {info.topIps.slice(0, 5).map((x) => (
                  <div key={x.ip} className="flex items-center gap-3 rounded-xl border border-white/5 bg-ink-850 px-3.5 py-2">
                    <span className="min-w-0 flex-1 truncate font-mono text-xs">{x.ip}</span>
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-ink-700">
                      <div
                        className={cn("h-full rounded-full", x.rpm > info.limits.sustainedPerMin * 0.8 ? "bg-red-300" : "bg-white")}
                        style={{ width: `${Math.min(100, (x.rpm / info.limits.sustainedPerMin) * 100)}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] text-ink-300">{x.rpm}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

/* -------------------------------- security -------------------------------- */

export function SecurityTab({ notify }: { notify: (m: string) => void }) {
  const { t } = useI18n();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);

  const change = async () => {
    if (next.length < 12 || next.length > 128 || !/[A-Za-zА-Яа-я]/.test(next) || !/\d/.test(next)) {
      notify(t("adm.passwordPolicy"));
      return;
    }
    if (next !== repeat) { notify(t("adm.passwordMismatch")); return; }
    setBusy(true);
    const r = await fetch("/api/admin/password", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current, next }),
    });
    setBusy(false);
    if (r.ok) {
      notify(t("adm.passwordChanged"));
      setCurrent(""); setNext(""); setRepeat("");
    } else {
      const res = (await r.json().catch(() => null)) as { error?: string } | null;
      notify(res?.error ?? t("adm.passwordFail"));
    }
  };

  return (
    <div className="space-y-4">
      <DdosMonitor />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t("adm.changePassword")} sub={t("adm.changePasswordSub")} icon={ShieldCheck}>
          <div className="space-y-3">
            <input
              type="password" value={current} onChange={(e) => setCurrent(e.target.value)}
              placeholder={t("adm.currentPassword")} autoComplete="current-password"
              className="w-full rounded-xl border border-white/10 bg-ink-850 px-4 py-2.5 text-sm outline-none focus:border-white/40"
            />
            <input
              type="password" value={next} onChange={(e) => setNext(e.target.value)}
              placeholder={t("adm.newPassword")} autoComplete="new-password" minLength={12} maxLength={128}
              className="w-full rounded-xl border border-white/10 bg-ink-850 px-4 py-2.5 text-sm outline-none focus:border-white/40"
            />
            <input
              type="password" value={repeat} onChange={(e) => setRepeat(e.target.value)}
              placeholder={t("adm.repeatPassword")} autoComplete="new-password"
              className="w-full rounded-xl border border-white/10 bg-ink-850 px-4 py-2.5 text-sm outline-none focus:border-white/40"
            />
            <Btn onClick={() => void change()} disabled={busy || !current || !next || !repeat}>
              <ShieldCheck className="h-4 w-4" /> {t("adm.changePasswordBtn")}
            </Btn>
          </div>
        </Panel>

        <Panel title={t("adm.exportTitle")} sub={t("adm.exportSub")} icon={Download}>
          <a
            href="/api/admin/audit/export"
            download
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-display text-sm font-bold text-black transition-transform hover:scale-[1.03] active:scale-95"
          >
            <Download className="h-4 w-4" /> {t("adm.exportBtn")}
          </a>
          <div className="mt-6 space-y-2 rounded-2xl border border-white/10 bg-ink-850 p-4 text-xs text-ink-300">
            {[t("adm.secTimingSafe"), t("adm.secBruteforce"), t("adm.secCsrf"), t("adm.secHeaders"), t("adm.secDdos")].map((line) => (
              <p key={line} className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 shrink-0" /> {line}</p>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* --------------------------- real bot tickets ----------------------------- */

export function TicketsTab({
  rows,
  counts,
}: {
  rows: BotTicketRow[];
  counts?: { tickets: number | null; ticketsOpen: number | null };
}) {
  const { t, lang } = useI18n();
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard index={0} label={t("adm.totalTickets")} value={counts?.tickets != null ? String(counts.tickets) : "—"} icon={Ticket} />
        <StatCard index={1} label={t("adm.openTicketsShort")} value={counts?.ticketsOpen != null ? String(counts.ticketsOpen) : "—"} icon={Activity} />
        <StatCard index={2} label={t("adm.inListBelow")} value={String(rows.length)} sub={t("adm.last30")} icon={ScrollText} />
      </div>

      <Panel title={t("adm.botTicketsTitle")} sub={t("adm.botTicketsSub")} icon={Ticket}>
        <div className="space-y-2.5">
          <AnimatePresence initial={false}>
            {rows.map((x) => (
              <motion.div
                key={x.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/5 bg-ink-850 px-4 py-3"
              >
                <span className={cn(
                  "rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold uppercase",
                  x.status === "open" ? "border-white/40 text-white" : "border-white/10 text-ink-300"
                )}>
                  {x.status}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{x.guildName ?? x.guildId}</p>
                  <p className="font-mono text-[11px] text-ink-300">
                    {x.categoryName} · {t("adm.authorWord")} {x.userId}{x.claimedBy ? ` · ${t("adm.claimedBy")} ${x.claimedBy}` : ""}
                  </p>
                </div>
                <span className="font-mono text-[11px] text-ink-300">{timeAgo(Date.parse(String(x.createdAt)), lang)}</span>
              </motion.div>
            ))}
          </AnimatePresence>
          {rows.length === 0 && <p className="py-12 text-center font-mono text-sm text-ink-300">{t("adm.noTickets")}</p>}
        </div>
      </Panel>
    </div>
  );
}

/* ------------------------------- giveaways -------------------------------- */

export function GiveawaysTab({
  rows,
  onEnd,
  onDelete,
}: {
  rows: GiveawayRow[];
  onEnd: (id: number, prize: string) => void;
  onDelete: (id: number) => void;
}) {
  const { t } = useI18n();
  const active = rows.filter((g) => !g.ended && g.timeLeftMs > 0).length;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard index={0} label={t("adm.totalGiveaways")} value={String(rows.length)} icon={Gift} />
        <StatCard index={1} label={t("adm.activeWord")} value={String(active)} icon={Timer} />
        <StatCard index={2} label={t("adm.finishedWord")} value={String(rows.length - active)} icon={CheckCircle2} />
      </div>

      <Panel title={t("adm.giveawaysTitle")} sub={t("adm.giveawaysSub")} icon={Gift}>
        <div className="space-y-2.5">
          <AnimatePresence initial={false}>
            {rows.map((g) => {
              const isActive = !g.ended && g.timeLeftMs > 0;
              return (
                <motion.div
                  key={g.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/5 bg-ink-850 px-4 py-3"
                >
                  <span className={cn(
                    "grid h-9 w-9 shrink-0 place-items-center rounded-xl border",
                    isActive ? "border-white/40 text-white" : "border-white/10 text-ink-300"
                  )}>
                    <Gift className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{g.prize}</p>
                    <p className="font-mono text-[11px] text-ink-300">
                      {g.guildName ?? g.guildId} · {g.entries ?? "—"} {t("adm.entriesWord")} · {g.winners} {t("adm.winnersWord")}
                    </p>
                  </div>
                  <span className="font-mono text-[11px] text-ink-300">
                    {isActive ? `${t("adm.leftTime")} ${fmtLeft(g.timeLeftMs, t)}` : t("common.ended")}
                  </span>
                  {isActive && (
                    <Btn variant="outline" onClick={() => onEnd(g.id, g.prize)}>
                      <Timer className="h-3.5 w-3.5" /> {t("adm.finish")}
                    </Btn>
                  )}
                  <button
                    onClick={() => onDelete(g.id)}
                    title={t("common.delete")}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 text-ink-200 transition-all hover:border-white hover:bg-white hover:text-black"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {rows.length === 0 && <p className="py-12 text-center font-mono text-sm text-ink-300">{t("adm.noGiveaways")}</p>}
        </div>
      </Panel>
    </div>
  );
}

function fmtLeft(ms: number, t: (k: "common.min" | "common.hoursShort" | "common.daysShort") => string): string {
  if (ms <= 0) return "—";
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m} ${t("common.min")}`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ${t("common.hoursShort")} ${m % 60} ${t("common.min")}`;
  return `${Math.floor(h / 24)} ${t("common.daysShort")} ${h % 24} ${t("common.hoursShort")}`;
}

/* -------------------------------- database -------------------------------- */

export function DatabaseTab({ tables }: { tables: TableRow[] }) {
  const { t, num } = useI18n();
  const max = Math.max(1, ...tables.map((x) => x.rows ?? 0));
  const total = tables.reduce((a, x) => a + (x.rows ?? 0), 0);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard index={0} label={t("adm.tablesWord")} value={String(tables.length)} icon={Database} />
        <StatCard index={1} label={t("adm.totalRows")} value={num(total)} icon={Activity} />
        <StatCard index={2} label={t("adm.storage")} value={t("adm.storageOnline")} sub={t("adm.storageOk")} icon={Cpu} />
      </div>

      <Panel title={t("adm.rowsPerTable")} sub={t("adm.rowsPerTableSub")} icon={Database}>
        <div className="space-y-3">
          {tables.map((x, i) => (
            <div key={x.model}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="truncate font-mono text-xs">{x.table}</span>
                <span className="font-mono text-xs">{x.rows == null ? (x.error ?? "—") : num(x.rows)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-ink-700">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${((x.rows ?? 0) / max) * 100}%` }}
                  transition={{ delay: Math.min(i * 0.02, 0.4), duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full rounded-full bg-white"
                />
              </div>
            </div>
          ))}
          {tables.length === 0 && <p className="py-12 text-center font-mono text-sm text-ink-300">{t("adm.dbUnavailable")}</p>}
        </div>
      </Panel>
    </div>
  );
}

/* ------------------------- guild inspector (live data) -------------------- */

export function GuildInspector({ id, onClose }: { id: string; onClose: () => void }) {
  const { t, num } = useI18n();
  const [detail, setDetail] = useState<AdminGuildDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void api.adminGuildDetail(id).then((d) => {
      if (d) setDetail(d);
      else setErr(t("adm.guildFetchFail"));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="mt-3 overflow-hidden rounded-2xl border border-white/15 bg-ink-900"
    >
      <div className="p-5">
        {err && <p className="font-mono text-xs text-ink-300">{err}</p>}
        {detail && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              {detail.icon && <img src={detail.icon} alt="" className="h-10 w-10 rounded-xl border border-white/15" />}
              <div className="min-w-0 flex-1">
                <p className="truncate font-display font-bold">{detail.name}</p>
                <p className="font-mono text-[11px] text-ink-300">{t("adm.ownerWord")} {detail.owner}</p>
              </div>
              <Badge>{num(detail.members)} {t("adm.membersWord")}</Badge>
              <Badge>{detail.boosts} boost</Badge>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { k: t("gd.statChannels"), v: detail.channels?.total ?? "—" },
                { k: t("adm.voiceWord"), v: detail.channels?.voice ?? "—" },
                { k: t("adm.rolesWord"), v: detail.roles ?? "—" },
                { k: t("srv.swAutoreact"), v: detail.autoReact },
              ].map((r, i) => (
                <motion.div
                  key={r.k}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-xl border border-white/10 bg-ink-850 px-3 py-2.5 text-center"
                >
                  <p className="font-mono text-lg font-bold">{String(r.v)}</p>
                  <p className="text-[10px] uppercase tracking-wider text-ink-300">{r.k}</p>
                </motion.div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge>{detail.antinuke?.enabled ? t("adm.antinukeOn") : t("adm.antinukeOff")}</Badge>
              <Badge>{detail.config?.loggingEnabled ? t("adm.loggingOn") : t("adm.loggingOff")}</Badge>
              <Badge>{detail.config?.welcomeInOn ? t("adm.welcomeOn") : t("adm.welcomeOff")}</Badge>
              <Badge>{detail.config?.autoreactEnabled ? t("adm.autoreactOn") : t("adm.autoreactOff")}</Badge>
            </div>
          </>
        )}
        <button
          onClick={onClose}
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-ink-300 transition-colors hover:text-white"
        >
          <ChevronRight className="h-3.5 w-3.5 rotate-90" /> {t("adm.closeGuildCard")}
        </button>
      </div>
    </motion.div>
  );
}


/* ----------------------------- accounts tab ------------------------------- */

function PermBits({ perms, onChange }: { perms: number; onChange: (n: number) => void }) {
  const { t } = useI18n();
  const [info, setInfo] = useState<AdminPermInfo[]>([]);
  useEffect(() => {
    void api.adminAccounts().then((a) => {
      if (a) setInfo(a.perms);
    });
  }, []);
  return (
    <div className="grid gap-1.5 sm:grid-cols-2">
      {info.map((p) => {
        const on = (perms & p.bit) !== 0;
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => onChange(on ? perms & ~p.bit : perms | p.bit)}
            className={cn(
              "flex items-start gap-2 rounded-xl border px-3 py-2 text-left transition-all",
              on ? "border-white/70 bg-white text-black" : "border-white/10 bg-black/30 hover:border-white/30"
            )}
          >
            {on ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <ShieldQuestion className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-300" />}
            <span className="min-w-0">
              <span className="block text-xs font-bold">{p.label}</span>
              <span className={cn("block text-[10px] leading-snug", on ? "text-black/60" : "text-ink-400")}>{p.desc}</span>
            </span>
            <span className="sr-only">{t("adm.accPerms")}</span>
          </button>
        );
      })}
    </div>
  );
}

export function AccountsTab({ notify }: { notify: (m: string) => void }) {
  const { t, num, lang } = useI18n();
  const [accounts, setAccounts] = useState<AdminAccountRow[] | null>(null);
  const [denied, setDenied] = useState(false);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [perms, setPerms] = useState(0);
  const [creating, setCreating] = useState(false);
  const [pwTarget, setPwTarget] = useState<string | null>(null);
  const [pwValue, setPwValue] = useState("");
  const [ownerPw, setOwnerPw] = useState("");

  const load = async () => {
    const a = await api.adminAccounts();
    if (!a) { setDenied(true); return; }
    setDenied(false);
    setAccounts(a.accounts);
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async () => {
    if (creating) return;
    setCreating(true);
    const r = await api.createAdminAccount(login, password, perms);
    setCreating(false);
    if (r?.ok) {
      notify(t("adm.accCreated"));
      setLogin(""); setPassword(""); setPerms(0);
      void load();
    } else {
      notify(t("common.error"));
    }
  };

  const remove = async (l: string) => {
    if (!confirm(`${t("adm.accDeleteConfirm")}: ${l}?`)) return;
    const r = await api.deleteAdminAccount(l);
    notify(r?.ok ? t("adm.accDeleted") : t("common.error"));
    void load();
  };

  const toggle = async (a: AdminAccountRow) => {
    const r = await api.updateAdminAccount(a.login, { disabled: !a.disabled });
    notify(r?.ok ? t("adm.accUpdated") : t("common.error"));
    void load();
  };

  const changePerms = async (a: AdminAccountRow, next: number) => {
    const r = await api.updateAdminAccount(a.login, { perms: next });
    if (r?.ok) notify(t("adm.accUpdated"));
    else notify(t("common.error"));
    void load();
  };

  const setOwnPassword = async (target: string) => {
    const r = await api.updateAdminAccount(target, { password: pwValue });
    notify(r?.ok ? t("adm.accUpdated") : t("common.error"));
    if (r?.ok) { setPwTarget(null); setPwValue(""); }
  };

  const setOwnerPassword = async () => {
    const r = await api.setOwnerPassword(ownerPw);
    if (r?.ok) {
      notify(t("adm.accUpdated"));
      setOwnerPw("");
    } else {
      notify(t("common.error"));
    }
  };

  if (denied) {
    return (
      <div className="adm-panel grid place-items-center py-16 text-center">
        <Lock className="mb-3 h-8 w-8 text-ink-300" />
        <p className="font-display font-bold">{t("adm.accPermDenied")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* create form */}
      <div className="adm-panel p-5">
        <div className="mb-4 flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          <h3 className="font-display text-lg font-bold">{t("adm.accCreate")}</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-ink-300">{t("adm.accLogin")}</span>
            <input
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder={t("adm.accLoginPh")}
              maxLength={32}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 font-mono text-sm outline-none placeholder:text-white/25 focus:border-white/40"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-ink-300">{t("adm.accPassword")}</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("adm.accPasswordPh")}
              maxLength={128}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 font-mono text-sm outline-none placeholder:text-white/25 focus:border-white/40"
            />
          </label>
        </div>
        <p className="mb-2 mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-ink-300">{t("adm.accPerms")}</p>
        <PermBits perms={perms} onChange={setPerms} />
        <Btn className="mt-4" disabled={!login || !password || creating} onClick={() => void create()}>
          <UserPlus className="h-3.5 w-3.5" /> {t("adm.accCreate")}
        </Btn>
      </div>

      {/* owner password */}
      <div className="adm-panel p-5">
        <div className="mb-2 flex items-center gap-2">
          <KeyRound className="h-4 w-4" />
          <h3 className="font-display text-lg font-bold">{t("adm.accSetOwnerPassword")}</h3>
        </div>
        <p className="mb-3 text-xs text-ink-300">{t("adm.accOwnerPasswordHint")}</p>
        <div className="flex flex-wrap gap-2">
          <input
            value={ownerPw}
            onChange={(e) => setOwnerPw(e.target.value)}
            placeholder={t("adm.accPasswordPh")}
            type="password"
            maxLength={128}
            className="w-64 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 font-mono text-sm outline-none placeholder:text-white/25 focus:border-white/40"
          />
          <Btn variant="outline" disabled={ownerPw.length < 8} onClick={() => void setOwnerPassword()}>
            <KeyRound className="h-3.5 w-3.5" /> {t("adm.accSetPassword")}
          </Btn>
        </div>
      </div>

      {/* list */}
      <div className="space-y-2.5">
        {(accounts ?? []).map((a) => (
          <div key={a.login} className={cn("rounded-2xl border p-4", a.disabled ? "border-white/5 bg-ink-900/60 opacity-60" : "border-white/10 bg-ink-900")}>
            <div className="flex flex-wrap items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 bg-ink-800">
                {a.isOwner ? <ShieldCheck className="h-4 w-4" /> : <UserCog className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-mono text-sm font-bold">
                  {a.login}
                  {a.isOwner && <Badge>{t("adm.accOwner")}</Badge>}
                  {a.disabled && <Badge>{t("adm.accDisabled")}</Badge>}
                </p>
                <p className="text-[11px] text-ink-300">
                  {t("adm.accLastLogin")}: {a.lastLogin ? new Date(a.lastLogin).toLocaleString() : t("adm.accNever")}
                </p>
              </div>
              {!a.isOwner && (
                <div className="flex items-center gap-2">
                  <Btn variant="outline" className="px-3 py-2 text-xs" onClick={() => void toggle(a)}>
                    <Power className="h-3.5 w-3.5" /> {a.disabled ? t("adm.accToggleOn") : t("adm.accToggleOff")}
                  </Btn>
                  <Btn variant="outline" className="px-3 py-2 text-xs" onClick={() => { setPwTarget(a.login); setPwValue(""); }}>
                    <KeyRound className="h-3.5 w-3.5" /> {t("adm.accSetPassword")}
                  </Btn>
                  <button
                    onClick={() => void remove(a.login)}
                    className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-ink-200 transition-all hover:border-white hover:bg-white hover:text-black"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            {!a.isOwner && (
              <div className="mt-3 border-t border-white/5 pt-3">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">{t("adm.accPerms")}</p>
                <PermBits perms={a.perms} onChange={(n) => void changePerms(a, n)} />
              </div>
            )}
            {pwTarget === a.login && (
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-3">
                <input
                  value={pwValue}
                  onChange={(e) => setPwValue(e.target.value)}
                  type="password"
                  placeholder={t("adm.accNewPassword")}
                  maxLength={128}
                  className="w-56 rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs outline-none placeholder:text-white/25 focus:border-white/40"
                />
                <Btn variant="solid" className="px-3 py-2 text-xs" disabled={pwValue.length < 8} onClick={() => void setOwnPassword(a.login)}>
                  {t("adm.accSetPassword")}
                </Btn>
              </div>
            )}
          </div>
        ))}
        {accounts != null && accounts.length === 0 && (
          <div className="grid place-items-center rounded-3xl border border-dashed border-white/15 py-16 text-ink-300">
            {t("adm.accCreate")}
          </div>
        )}
      </div>
    </div>
  );
}
