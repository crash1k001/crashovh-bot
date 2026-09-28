import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Cpu,
  Server,
  Shield,
  Users,
  MessageSquare,
  Terminal,
  Activity,
  Zap,
  Globe,
  Database,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  Ticket,
  Gift,
  LifeBuoy,
  ShieldCheck,
  SlidersHorizontal,
  Play as PlayIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import gsap from "gsap";
import { useAuth } from "@/lib/auth";
import { cn, fmt } from "@/lib/utils";
import { useI18n, useLocalized, LangSwitch, type TKey } from "@/lib/i18n";
import { nikoEmojiUrl, type NikoEmojiName } from "@/lib/emojis";

/* ------------------------- bot's white custom emojis ---------------------- */

/** The bot's own white drawn emoji, rendered from Discord's CDN. Falls back to
 * a plain unicode glyph if the image fails (bot offline, CDN hiccup). */
export function NikoEmoji({
  name,
  fallback,
  className,
}: {
  name: NikoEmojiName;
  fallback: string;
  className?: string;
}) {
  const [err, setErr] = useState(false);
  if (err) return <span className={className}>{fallback}</span>;
  return (
    <img
      src={nikoEmojiUrl(name)}
      alt=""
      loading="lazy"
      onError={() => setErr(true)}
      className={cn("inline-block h-[1.15em] w-[1.15em] align-[-0.2em]", className)}
    />
  );
}

/* ------------------------------ shared motion ----------------------------- */

export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

/* --------------------------------- logo mark ------------------------------ */

/*
 * App-wide bot status store — ONE poll for the WHOLE app.
 * /api/status used to be polled independently by the avatar hook (20s), the
 * dashboard sidebar "vitals" (10s), the landing hero console (10s) and the
 * dashboard page (10s) — 4 identical requests racing each other. Now a single
 * shared poller fetches once every 10s and broadcasts to every subscriber;
 * the poll only runs while at least one component is mounted.
 */
export type BotStatusData = {
  bot: {
    guilds?: number;
    users?: number;
    commands?: number;
    channels?: number;
    ping?: number | null;
    online?: boolean;
    uptimeSec?: number;
    name?: string | null;
    tag?: string | null;
    id?: string | null;
    avatar?: string | null;
  };
  host?: { memoryMb?: number; shards?: { id: number; status: string; ping: number | null }[] };
  timestamp?: string;
};

let botStatusCache: BotStatusData | null = null;
const botStatusListeners = new Set<(s: BotStatusData | null) => void>();
let botStatusTimer: ReturnType<typeof setInterval> | null = null;
let botStatusInFlight = false;

async function botStatusFetch() {
  if (botStatusInFlight) return;
  botStatusInFlight = true;
  try {
    const r = await fetch("/api/status", { credentials: "include" });
    const ct = r.headers.get("content-type") || "";
    const next = ct.includes("application/json") ? ((await r.json()) as BotStatusData) : null;
    if (JSON.stringify(next) !== JSON.stringify(botStatusCache)) {
      botStatusCache = next;
      botStatusListeners.forEach((fn) => fn(next));
    }
  } catch {
    /* bot offline — keep last known status */
  } finally {
    botStatusInFlight = false;
  }
}

function subscribeBotStatus(fn: (s: BotStatusData | null) => void): () => void {
  botStatusListeners.add(fn);
  fn(botStatusCache);
  if (!botStatusTimer) {
    botStatusTimer = setInterval(() => void botStatusFetch(), 10_000);
    void botStatusFetch();
  }
  return () => {
    botStatusListeners.delete(fn);
    if (botStatusListeners.size === 0 && botStatusTimer) {
      clearInterval(botStatusTimer);
      botStatusTimer = null;
    }
  };
}

/* Subscribe a component to the shared status poll. */
export function useBotStatus(): BotStatusData | null {
  const [status, setStatus] = useState<BotStatusData | null>(botStatusCache);
  useEffect(() => subscribeBotStatus(setStatus), []);
  return status;
}

/* Bot avatar from the shared store, or null while unknown. */
function useBotAvatar(): string | null {
  const status = useBotStatus();
  return status?.bot?.avatar ?? null;
}

/* Real bot avatar when online, drawn Niko mark otherwise.
 * The <img> lives inside a fixed square container (overflow-hidden) so the
 * avatar can never stretch its surroundings, and an onError handler swaps in
 * the drawn mark if Discord's CDN fails — no more broken-image icons. */
export function BotAvatar({ className }: { className?: string }) {
  const url = useBotAvatar();
  const [failed, setFailed] = useState(false);
  /* A fresh URL (bot restarted, avatar changed) retries the real image. */
  useEffect(() => setFailed(false), [url]);
  /* Discord's default "embed" avatars mean the owner never uploaded a custom
   * avatar — show the branded Niko mark instead of the generic face. A real
   * avatar takes over automatically once it is set in the Developer Portal. */
  const isDefaultDiscordAvatar = !!url && /\/embed\/avatars\/\d+\.png/.test(url);
  if (url && !failed && !isDefaultDiscordAvatar) {
    return (
      <span
        className={cn(
          "block h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-white/20 bg-ink-800",
          className
        )}
      >
        <img
          src={url}
          alt="Niko"
          onError={() => setFailed(true)}
          className="block h-full w-full object-cover"
        />
      </span>
    );
  }
  return <NikoMarkStatic className={className} />;
}

/* Brand logo = the bot's REAL Discord avatar wherever it appears (sidebar,
 * landing header, footer, login). Falls back to the drawn Niko mark only
 * while no custom avatar is set. */
export function NikoMark({ className }: { className?: string }) {
  return <BotAvatar className={cn("h-9 w-9", className)} />;
}

/* Drawn Niko brand mark — the same imp-girl silhouette as the site favicon.
 * Shown instead of the generic lucide "robot" icon while the bot has no
 * custom avatar (or while it is offline). */
function NikoMarkStatic({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/20 bg-ink-950",
        className
      )}
      aria-hidden
    >
      <svg viewBox="0 0 64 64" className="h-full w-full" fill="none">
        <g stroke="#ffffff" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
          {/* horns */}
          <path d="M20 22 C15 17 13 11 15 6 C20 9 23 13 24 18" />
          <path d="M44 22 C49 17 51 11 49 6 C44 9 41 13 40 18" />
          {/* head */}
          <path d="M22 20 C22 14 27 11 32 11 C37 11 42 14 42 20 C42 26 38 30 32 30 C26 30 22 26 22 20 Z" />
          {/* eyes */}
          <path d="M26 21 L29 21" strokeWidth={4} />
          <path d="M35 21 L38 21" strokeWidth={4} />
          {/* little smile */}
          <path d="M30 25.5 Q32 27 34 25.5" strokeWidth={2.4} />
          {/* bat wings */}
          <path d="M21 44 C13 42 8 36 9 30 C13 33 16 34 19 34 C17 38 18 42 21 44 Z" fill="rgba(255,255,255,0.14)" />
          <path d="M43 44 C51 42 56 36 55 30 C51 33 48 34 45 34 C47 38 46 42 43 44 Z" fill="rgba(255,255,255,0.14)" />
          {/* body hint */}
          <path d="M24 44 C24 37 27 34 32 34 C37 34 40 37 40 44" />
        </g>
        {/* tail flame */}
        <path d="M46 50 C49 48 50 45 49 42 C52 44 53 47 51 50 C49 52 47 52 46 50 Z" fill="#ffffff" opacity={0.85} />
      </svg>
    </span>
  );
}

/* -------------------------------- stat card ------------------------------- */

/* Animates numeric strings ("1 234", "42MB") toward the new value whenever
 * data refreshes — pure client-side, falls back to static text otherwise. */
function useAnimatedNumber(value: string): string {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = parseFloat(prev.current.replace(/\s|,/g, "") || "0");
    const to = parseFloat(value.replace(/\s|,/g, "") || "0");
    if (!Number.isFinite(from) || !Number.isFinite(to) || from === to || !/[0-9]/.test(value)) {
      prev.current = value;
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const dur = 600;
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const cur = Math.round(from + (to - from) * eased);
      setDisplay(value.replace(/\d[\d\s,]*/, cur.toLocaleString("ru-RU")));
      if (p < 1) raf = requestAnimationFrame(step);
      else prev.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return display;
}

export function StatCard({
  label,
  value,
  sub,
  trend,
  icon: Icon,
  index = 0,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: number;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  index?: number;
}) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="show"
      custom={index}
      whileHover={{ y: -4 }}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-ink-900 p-5 transition-colors hover:border-white/25"
    >
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/5 blur-2xl transition-all duration-500 group-hover:bg-white/10" />
      {/* sweeping sheen on hover */}
      <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.07] to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-300">{label}</p>
          <StatValue value={value} />
          <div className="mt-1 flex items-center gap-2">
            {typeof trend === "number" && (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-bold">
                {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
              </span>
            )}
            {sub && <p className="text-xs text-ink-300">{sub}</p>}
          </div>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-ink-800 text-white/70 transition-colors group-hover:border-white/30 group-hover:text-white">
          <Icon className="h-5 w-5" strokeWidth={1.8} />
        </div>
      </div>
    </motion.div>
  );
}

function StatValue({ value }: { value: string }) {
  const shown = useAnimatedNumber(value);
  return <p className="mt-2 font-display text-3xl font-bold tracking-tight text-white">{shown}</p>;
}

/* --------------------------------- sidebar -------------------------------- */

/* Internal bot logs/shards/process pages are NOT exposed to regular members —
 * they only make sense to the bot owner (visible in the admin panel). */
const NAV: { to: string; label: TKey; icon: React.ComponentType<{ className?: string; strokeWidth?: number }> }[] = [
  { to: "/dashboard", label: "nav.dashboard", icon: Terminal },
  { to: "/dashboard/servers", label: "nav.servers", icon: Server },
  { to: "/dashboard/commands", label: "nav.commands", icon: Bot },
  { to: "/dashboard/moderation", label: "nav.moderation", icon: Shield },
  { to: "/dashboard/analytics", label: "nav.analytics", icon: Activity },
  { to: "/dashboard/support", label: "nav.support", icon: LifeBuoy },
];

const ADMIN_NAV: { to: string; label: TKey; icon: React.ComponentType<{ className?: string; strokeWidth?: number }> }[] = [
  { to: "/admin", label: "adm.overview", icon: Globe },
  { to: "/admin/control", label: "adm.gControl", icon: SlidersHorizontal },
  { to: "/admin/users", label: "adm.users", icon: Users },
  { to: "/admin/system", label: "adm.system", icon: Cpu },
];


export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { session, logout } = useAuth();
  const { t } = useI18n();
  /* Vitals come from the shared status store — one poll for the whole app. */
  const status = useBotStatus();
  const mem = status?.host?.memoryMb ?? null;
  const [unreadSupport, setUnreadSupport] = useState(0);

  /* Badge: support tickets answered by admin but not yet read by the user */
  useEffect(() => {
    if (!session?.user) {
      setUnreadSupport(0);
      return;
    }
    let stop = false;
    const poll = async () => {
      try {
        const r = await fetch("/api/support/tickets", { credentials: "include" });
        if (!r.ok) return;
        const d = (await r.json()) as {
          tickets?: { status: string; messages: { from: string }[] }[];
        };
        if (stop || !d?.tickets) return;
        const unread = d.tickets.filter(
          (t) => t.status === "answered" && t.messages?.[t.messages.length - 1]?.from === "admin"
        ).length;
        setUnreadSupport((prev) => (prev === unread ? prev : unread));
      } catch {
        /* backend offline — badge stays as is */
      }
    };
    void poll();
    const t = setInterval(poll, 15000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [session?.user?.id]);

  return (
    <div className="flex h-screen overflow-hidden bg-ink-950 text-white">
      {/* sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden h-screen w-64 flex-col border-r border-white/10 bg-ink-900/80 backdrop-blur-xl lg:flex">
        <Link to="/" className="flex items-center gap-3 px-5 py-6">
          <NikoMark />
          <div>
            <p className="font-display text-lg font-bold leading-none tracking-tight">Niko</p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.22em] text-ink-300">{t("nav.controlCenter")}</p>
          </div>
        </Link>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV.map((item) => (
            <SideLink
              key={item.to}
              to={item.to}
              label={t(item.label)}
              icon={item.icon}
              active={location.pathname === item.to}
              badge={item.to === "/dashboard/support" ? unreadSupport : undefined}
            />
          ))}
          {session?.isAdmin && (
            <div className="my-4 border-t border-white/10 pt-4">
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">{t("nav.adminPanel")}</p>
              {ADMIN_NAV.map((item) => (
                <SideLink
                  key={item.to}
                  to={item.to}
                  label={t(item.label)}
                  icon={item.icon}
                  active={location.pathname === item.to}
                />
              ))}
            </div>
          )}
        </nav>

        {/* Compact online indicator: full metrics live on the dashboard KPI
        * cards — no duplicated numbers in the sidebar. */}
        <div className="mx-3 mb-3 flex items-center justify-between rounded-2xl border border-white/10 bg-ink-900/70 px-3 py-2.5">
          <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-ink-400">{t("ov.vitals")}</span>
          <span className="flex items-center gap-1.5 font-mono text-[10px] text-ink-300">
            {mem != null && <span>{mem}MB</span>}
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-50" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
            </span>
          </span>
        </div>

        <div className="space-y-2 border-t border-white/10 p-4">
          {session?.user ? (
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-ink-800 px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                {session.user.avatar ? (
                  <img src={session.user.avatar} alt="" className="h-7 w-7 rounded-lg border border-white/15" />
                ) : (
                  <div className="grid h-7 w-7 place-items-center rounded-lg border border-white/15 bg-ink-700 font-display text-xs font-bold">
                    {session.user.username[0]}
                  </div>
                )}
                <span className="truncate text-xs font-semibold">{session.user.username}</span>
              </div>
              <button
                onClick={() => void logout()}
                title={t("nav.logout")}
                className="shrink-0 rounded-lg border border-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-200 transition-colors hover:border-white/40 hover:text-white"
              >
                {t("nav.logout")}
              </button>
            </div>
          ) : (
            <a
              href="/auth"
              className="flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs font-bold text-black transition-transform hover:scale-[1.02]"
            >
              {t("nav.login")}
            </a>
          )}
        </div>
      </aside>

      {/* mobile topbar */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-white/10 bg-ink-950/90 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Link to="/" className="flex items-center gap-2">
          <NikoMark className="h-8 w-8" />
          <span className="font-display font-bold">Niko</span>
        </Link>
        <div className="flex items-center gap-2">
          <LangSwitch />
        </div>
      </div>

      {/* Content container: capped width on huge screens (2xl) so the admin
       * panel doesn't stretch edge-to-edge; min-w-0 lets flex children shrink
       * instead of pushing the page wider (horizontal scroll fix). */}
      <main
        key={location.pathname}
        className="route-fade h-screen w-full min-w-0 max-w-[1400px] flex-1 overflow-y-auto overflow-x-hidden px-4 pb-28 pt-20 lg:pb-16 lg:pl-72 lg:pr-8 lg:pt-8"
      >
        <div className="min-w-0">{children}</div>
      </main>

      {/* mobile navigation lives at the bottom so the top bar never crowds or
          pushes the page sideways on narrow screens */}
      <div className="lg:hidden" />

      {/* thumb-friendly mobile navigation */}
      <BottomNav />
    </div>
  );
}

function SideLink({
  to,
  label,
  icon: Icon,
  active,
  badge,
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
        active ? "text-black" : "text-ink-200 hover:bg-white/5 hover:text-white"
      )}
    >
      {active && (
        <motion.span
          layoutId="side-active"
          className="absolute inset-0 rounded-xl bg-white"
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        />
      )}
      <Icon className="relative z-10 h-[18px] w-[18px]" strokeWidth={1.8} />
      <span className="relative z-10">{label}</span>
      {badge != null && badge > 0 && (
        <motion.span
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
          className="relative z-10 ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-white px-1.5 font-mono text-[10px] font-bold text-black"
        >
          {badge}
        </motion.span>
      )}
    </Link>
  );
}

function MobileNav() {
  const { t } = useI18n();
  const items = [...NAV, ...ADMIN_NAV];
  return (
    <div className="flex gap-1 overflow-x-auto">
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-200 hover:bg-white/10 hover:text-white"
        >
          {t(item.label as TKey)}
        </Link>
      ))}
    </div>
  );
}

/* Thumb-friendly bottom navigation for phones — the primary mobile nav.
 * 44px+ touch targets, safe-area padding for iPhones, active dot indicator. */
function BottomNav() {
  const location = useLocation();
  const { session } = useAuth();
  const { t } = useI18n();
  const items = [...NAV.slice(0, 4), ...(session?.isAdmin ? ADMIN_NAV.slice(0, 1) : [])];
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink-950/95 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-5">
        {items.map((item) => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 py-2 transition-colors active:bg-white/10",
                active ? "text-white" : "text-ink-300"
              )}
            >
              <item.icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />
              <span className="text-[10px] font-semibold">{t(item.label)}</span>
              {active && <span className="absolute" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/* ------------------------------- page header ------------------------------ */

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="mb-8 flex flex-wrap items-end justify-between gap-4"
    >
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-xl text-sm text-ink-300">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </motion.div>
  );
}

/* --------------------------------- buttons -------------------------------- */
/* Emil design engineering: springy interruptible interactions (no hard resets) */
const springPress = { type: "spring" as const, stiffness: 500, damping: 30 };

export function Btn({
  children,
  onClick,
  variant = "solid",
  className,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "solid" | "ghost" | "outline";
  className?: string;
  disabled?: boolean;
}) {
  return (
    <motion.button
      whileHover={disabled ? undefined : { scale: 1.03, y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      transition={springPress}
      onClick={disabled ? undefined : onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        variant === "solid" && "bg-white text-black hover:bg-ink-100",
        variant === "outline" && "border border-white/20 text-white hover:border-white/50 hover:bg-white/5",
        variant === "ghost" && "text-ink-200 hover:bg-white/5 hover:text-white",
        className
      )}
    >
      {children}
    </motion.button>
  );
}

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink-100",
        className
      )}
    >
      {children}
    </span>
  );
}

/* ---------------------------------- vlogs --------------------------------- */

export type Vlog = {
  id: string;
  title: string;
  body: string;
  tag: string;
  images?: string[];
  author: string;
  authorAvatar: string | null;
  published: boolean;
  createdAt: number;
  updatedAt: number;
};

/** Public vlog feed on the landing page. */
function VlogsSection() {
  const { t } = useI18n();
  const ago = useTimeAgoShort();
  const [vlogs, setVlogs] = useState<Vlog[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    const poll = async () => {
      try {
        const r = await fetch("/api/vlogs");
        if (!r.ok) return;
        const j = (await r.json()) as { vlogs: Vlog[] };
        setVlogs(j.vlogs ?? []);
      } catch {
        /* bot offline — keep last known list */
      }
    };
    void poll();
    const t = setInterval(poll, 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <section id="vlogs" className="relative z-10 mx-auto max-w-7xl px-6 py-20">
      <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-ink-300">
            <PlayIcon className="h-3.5 w-3.5" /> {t("ln.vlogs")}
          </div>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-5xl">{t("vlog.title")}</h2>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <Link
            to="/vlogs"
            className="group inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold transition-colors hover:border-white/50 hover:bg-white/5"
          >
            {t("vlog.allLink")}
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
          <p className="max-w-sm text-sm text-ink-300">{t("vlog.landingTeaser")}</p>
        </div>
      </div>

      {vlogs && vlogs.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {vlogs.map((v, i) => (
            <article
              key={v.id}
              className="reveal group flex flex-col rounded-3xl border border-white/10 bg-ink-900 p-6 transition-all hover:-translate-y-1.5 hover:border-white/30"
              style={{ animationDelay: `${i * 0.07}s` }}
            >
              <div className="flex items-center justify-between">
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
                  {v.tag}
                </span>
                <span className="font-mono text-[11px] text-ink-300">{ago(v.createdAt)}</span>
              </div>
              <h3 className="mt-4 font-display text-lg font-bold leading-snug">{v.title}</h3>
              <p className={cn("mt-3 flex-1 text-sm leading-relaxed text-ink-300", open === v.id ? "" : "line-clamp-4")}>
                {v.body}
              </p>
              {v.body.length > 180 && (
                <button
                  onClick={() => setOpen(open === v.id ? null : v.id)}
                  className="mt-3 self-start text-xs font-bold text-white/70 transition-colors hover:text-white"
                >
                  {open === v.id ? t("vlog.collapse") : t("vlog.readMore")}
                </button>
              )}
              <div className="mt-5 flex items-center gap-2.5 border-t border-white/10 pt-4">
                {v.authorAvatar ? (
                  <img src={v.authorAvatar} alt="" className="h-7 w-7 rounded-lg border border-white/15" />
                ) : (
                  <div className="grid h-7 w-7 place-items-center rounded-lg border border-white/15 bg-ink-800 font-display text-[11px] font-bold">
                    {v.author[0]?.toUpperCase() ?? "N"}
                  </div>
                )}
                <span className="text-xs font-semibold">{v.author}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="grid place-items-center rounded-3xl border border-dashed border-white/15 px-6 py-20 text-center">
          <PlayIcon className="mb-4 h-8 w-8 text-ink-300" />
          <p className="font-display text-lg font-bold">{t("vlog.none")}</p>
          <p className="mt-2 max-w-sm text-sm text-ink-300">{t("vlog.follow")}</p>
        </div>
      )}
    </section>
  );
}

/* Compact, locale-aware "2 min ago" label used by the vlog cards. */
function useTimeAgoShort() {
  const { loc, locale } = useI18n();
  return (ts: number): string => {
    const diff = Math.max(1, Math.floor((Date.now() - ts) / 1000));
    if (diff < 3600) return `${Math.floor(diff / 60)} ${loc("мин", "min")}`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ${loc("ч", "h")}`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} ${loc("дн", "d")}`;
    return new Date(ts).toLocaleDateString(locale);
  };
}

/* ------------------------------ landing bits ------------------------------ */

/* Реальный функционал бота — категории из bot/src/commands, без выдумок.
 * Иконки отделены от текста: копирайт лендинга лежит в LANDING_RU/LANDING_EN
 * и выбирается через useLocalized, поэтому переключатель языка переводит
 * страницу целиком, а не только меню. */
const FEATURE_ICONS = [
  Shield, MessageSquare, Sparkles, Ticket, Gift, Users,
  Terminal, Database, Zap, Activity, Globe, MessageSquare,
] as const;

const LANDING_RU = {
  badge: "Мультифункциональный Discord-бот",
  h1a: "Один бот.",
  h1b: "Полный контроль",
  h1c: " над сервером.",
  sub: "Модерация, антинуке, автомод, AI, тикеты и 357 команд-модулей — всё в одном месте. Управляйте всеми серверами из элегантного дашборда с живой статистикой.",
  ctaPrimary: "Войти в дашборд",
  consoleOk: "Все системы работают",
  consoleDown: "Бот сейчас офлайн",
  consoleServers: "Серверов",
  consoleMembers: "Участников",
  consoleCommands: "Команд",
  featuresTitle: "Всё для вашего сервера",
  setupTitle: "Запуск за три шага",
  ctaTitle: "Готовы управлять вселенной Niko?",
  ctaBody: "Откройте дашборд: живая статистика, управление серверами, модерация и поддержка.",
  ctaBtn: "Перейти в дашборд",
  footerAbout: "Мультифункциональный Discord-бот и панель управления: модерация, антинуке, тикеты, розыгрыши и живая статистика — в одном месте.",
  ownerName: "Богданов Артем Владимирович",
  statServers: "серверов",
  statUsers: "пользователей",
  statCommands: "команд",
  statPing: "ping, мс",
  serverWord: "серверов",
  features: [
    { title: "Antinuke", desc: "Защита от рейдов, банов и захвата сервера" },
    { title: "AutoMod", desc: "Фильтры ссылок, спама и капса без вашего участия" },
    { title: "AI-чат", desc: "Умные ответы прямо в вашем канале (Groq)" },
    { title: "Тикеты", desc: "Обращения с категориями и настройками" },
    { title: "Розыгрыши", desc: "Giveaway с автоматическим подведением итогов" },
    { title: "Профили и ранги", desc: "Карточки, опыт и статистика участников" },
    { title: "357 команд-модулей", desc: "Slash, prefix и гибридные команды с подкомандами — модерация, fun, животные, конвертеры, Wikipedia" },
    { title: "Логирование", desc: "Журнал событий сервера в реальном времени" },
    { title: "J2C и временные каналы", desc: "Каналы по кнопке с автосозданием" },
    { title: "Напоминания и AFK", desc: "Reminders, AFK-статус, автоответы" },
    { title: "Автопостинг и автобамп", desc: "RSS-новости и бампы по расписанию" },
    { title: "Реакционные роли", desc: "Роли по нажатию на эмодзи" },
  ],
  setup: [
    { n: "01", title: "Пригласите Niko", desc: "Добавьте бота на сервер одной ссылкой — права выдаются при подключении." },
    { n: "02", title: "Войдите через Discord", desc: "Дашборд увидит только серверы, где у вас есть право управления." },
    { n: "03", title: "Настройте всё", desc: "Модерация, антинуке, автомод, приветствия и тикеты — в пару кликов." },
  ],
};

const LANDING_EN: typeof LANDING_RU = {
  badge: "All-in-one Discord bot",
  h1a: "One bot.",
  h1b: "Full control",
  h1c: " over your server.",
  sub: "Moderation, antinuke, automod, AI, tickets and 357 command modules — all in one place. Manage every server from an elegant dashboard with live statistics.",
  ctaPrimary: "Enter the dashboard",
  consoleOk: "All systems operational",
  consoleDown: "The bot is offline right now",
  consoleServers: "Servers",
  consoleMembers: "Members",
  consoleCommands: "Commands",
  featuresTitle: "Everything your server needs",
  setupTitle: "Live in three steps",
  ctaTitle: "Ready to run the Niko universe?",
  ctaBody: "Open the dashboard: live statistics, server management, moderation and support.",
  ctaBtn: "Go to the dashboard",
  footerAbout: "An all-in-one Discord bot and control panel: moderation, antinuke, tickets, giveaways and live statistics — in one place.",
  ownerName: "Artem Bogdanov",
  statServers: "servers",
  statUsers: "users",
  statCommands: "commands",
  statPing: "ping, ms",
  serverWord: "servers",
  features: [
    { title: "Antinuke", desc: "Protection from raids, bans and server takeovers" },
    { title: "AutoMod", desc: "Link, spam and caps filters that run on their own" },
    { title: "AI chat", desc: "Smart answers right in your channel (Groq)" },
    { title: "Tickets", desc: "Support requests with categories and settings" },
    { title: "Giveaways", desc: "Giveaways with automatic winner picking" },
    { title: "Profiles & ranks", desc: "Profile cards, XP and member statistics" },
    { title: "357 command modules", desc: "Slash, prefix and hybrid commands with subcommands — moderation, fun, animals, converters, Wikipedia" },
    { title: "Logging", desc: "Real-time server event journal" },
    { title: "J2C & temp channels", desc: "Join-to-create voice channels on demand" },
    { title: "Reminders & AFK", desc: "Reminders, AFK status, autoresponders" },
    { title: "Autoposting & autobump", desc: "Scheduled RSS news and bumps" },
    { title: "Reaction roles", desc: "Roles handed out by clicking an emoji" },
  ],
  setup: [
    { n: "01", title: "Invite Niko", desc: "Add the bot to your server with one link — permissions are granted during the flow." },
    { n: "02", title: "Sign in with Discord", desc: "The dashboard only shows servers where you have manage permissions." },
    { n: "03", title: "Tune everything", desc: "Moderation, antinuke, automod, greetings and tickets — in a couple of clicks." },
  ],
};

/*
 * Magnetic CTA only.
 * IMPORTANT: the hero entrance used to be a GSAP timeline, but GSAP and Framer
 * Motion both drive opacity/transform on the same nodes — they fought each other
 * and content got stuck at opacity:0. Entrances are now Framer-only; GSAP is
 * limited to this transform-only pointer effect on a plain <a> element.
 */
function useLandingMotion() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const cta = el.querySelector<HTMLElement>("[data-hero-cta-main]");
    if (!cta) return;

    const xTo = gsap.quickTo(cta, "x", { duration: 0.4, ease: "power3" });
    const yTo = gsap.quickTo(cta, "y", { duration: 0.4, ease: "power3" });
    const onMove = (e: PointerEvent) => {
      const r = cta.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * 0.15);
      yTo((e.clientY - (r.top + r.height / 2)) * 0.25);
    };
    const onLeave = () => {
      xTo(0);
      yTo(0);
    };
    cta.addEventListener("pointermove", onMove);
    cta.addEventListener("pointerleave", onLeave);
    return () => {
      cta.removeEventListener("pointermove", onMove);
      cta.removeEventListener("pointerleave", onLeave);
      gsap.killTweensOf(cta);
      cta.style.transform = "";
    };
  }, []);

  return root;
}

export function Landing({ scrollTo }: { scrollTo?: string }) {
  /* Every string on this page comes from the ru/en content blocks above, so the
   * language switch in the header re-renders the whole landing page. */
  const { t } = useI18n();
  const C = useLocalized(LANDING_RU, LANDING_EN);
  const features = useMemo(() => C.features.map((f, i) => ({ ...f, icon: FEATURE_ICONS[i] })), [C]);
  /* Real stats from the running bot via the SHARED status store (one poll for
   * the whole app); "—" while bot is offline. No fake numbers. */
  const botStatus = useBotStatus();
  const b = botStatus?.bot;
  const stats = useMemo(() => {
    if (!botStatus) return null;
    return {
      servers: fmt(b?.guilds ?? 0),
      users: fmt(b?.users ?? 0),
      commands: fmt(b?.commands ?? 0),
      ping: b?.ping != null && b.ping >= 0 ? `${Math.round(b.ping)}ms` : "—",
      online: Boolean(b?.online),
    };
  }, [botStatus]);

  const display = stats ?? { servers: "—", users: "—", commands: "—", ping: "—", online: false };
  const statsGrid = [
    { value: display.servers, label: C.statServers },
    { value: display.users, label: C.statUsers },
    { value: display.commands, label: C.statCommands },
    { value: display.ping, label: C.statPing },
  ];
  const root = useLandingMotion();

  /* /features and /stats render this same landing and smooth-scroll to the
   * section — real URLs instead of /#anchor fragments. */
  useEffect(() => {
    if (!scrollTo) return;
    const t = window.setTimeout(() => {
      document.getElementById(scrollTo)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 90);
    return () => window.clearTimeout(t);
  }, [scrollTo]);

  return (
    <div ref={root} className="relative min-h-screen overflow-x-clip bg-ink-950 text-white">
      {/* background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-grid mask-fade-b opacity-70" />
        <div className="absolute left-1/2 top-[-20%] h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-white/[0.06] blur-[140px]" />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="absolute right-[-140px] top-1/3 h-[420px] w-[420px] rounded-full border border-white/5"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          className="absolute left-[-120px] bottom-[-80px] h-[360px] w-[360px] rounded-full border border-white/5"
        />
      </div>

      {/* nav */}
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <NikoMark />
          <span className="font-display text-xl font-bold tracking-tight">Niko</span>
        </div>
        <nav className="hidden items-center gap-7 text-sm text-ink-200 lg:flex">
          <Link to="/features" className="transition-colors hover:text-white">{t("ln.features")}</Link>
          <Link to="/stats" className="transition-colors hover:text-white">{t("ln.stats")}</Link>
          <Link
            to="/vlogs"
            className="group inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-3.5 py-1.5 font-semibold text-white transition-colors hover:border-white/50 hover:bg-white/5"
          >
            <PlayIcon className="h-3.5 w-3.5" />
            {t("ln.vlogs")}
          </Link>
          <Link to="/dashboard" className="transition-colors hover:text-white">{t("ln.dashboard")}</Link>
        </nav>
        <div className="flex items-center gap-2">
          {/* Language switch lives in the main menu so visitors can flip the
           * whole site before signing in. */}
          <LangSwitch className="hidden bg-ink-900/80 backdrop-blur sm:flex" />
          <Link
            to="/dashboard"
            className="group inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-black transition-transform hover:scale-[1.04]"
          >
            {t("ln.openDashboard")}
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </header>

      {/* compact nav for narrow screens — links must never disappear */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:hidden">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <LangSwitch compact className="shrink-0 sm:hidden" />
          {[
            { to: "/features", label: t("ln.features") },
            { to: "/stats", label: t("ln.stats") },
            { to: "/vlogs", label: t("ln.vlogs") },
          ].map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="shrink-0 rounded-xl border border-white/15 px-3.5 py-1.5 text-xs font-semibold text-ink-100 transition-colors hover:border-white/50 hover:text-white"
            >
              {l.label}
            </Link>
          ))}
          <Link
            to="/dashboard"
            className="shrink-0 rounded-xl border border-white/15 px-3.5 py-1.5 text-xs font-semibold text-ink-100 transition-colors hover:border-white/50 hover:text-white"
          >
            {t("ln.dashboard")}
          </Link>
        </div>
      </div>

      {/* hero — entrances are pure CSS (reveal classes): they cannot get stuck
          at opacity:0 like JS-driven animations did before */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24 pt-16 text-center md:pt-24">
        <div className="reveal reveal-1">
          <Badge className="mx-auto">
            <Sparkles className="h-3 w-3" /> {C.badge}
          </Badge>
        </div>

        <h1 className="reveal reveal-2 mx-auto mt-6 max-w-4xl font-display text-5xl font-black leading-[1.05] tracking-tight md:text-7xl">
          {C.h1a}
          <br />
          <span className="shimmer-text">{C.h1b}</span>{C.h1c}
        </h1>

        <p className="reveal reveal-3 mx-auto mt-6 max-w-2xl text-base leading-relaxed text-ink-200 md:text-lg">
          {C.sub}
        </p>

        <div className="reveal reveal-4 mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/dashboard"
            data-hero-cta-main
            className="group inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-3.5 font-display text-base font-bold text-black transition-transform hover:scale-[1.04]"
          >
            {C.ctaPrimary}
            <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            to="/features"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-7 py-3.5 font-display text-base font-bold text-white transition-colors hover:border-white/50 hover:bg-white/5"
          >
            {t("ln.features")}
          </Link>
        </div>

        {/* floating console preview */}
        <div className="reveal reveal-5 relative mx-auto mt-20 max-w-4xl">
          <div className="glass rounded-3xl p-1 shadow-2xl">
            <div className="rounded-[20px] bg-ink-900 p-6 text-left">
              <div className="mb-5 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-white/20" />
                <span className="h-3 w-3 rounded-full bg-white/15" />
                <span className="h-3 w-3 rounded-full bg-white/10" />
                <span className="ml-3 font-mono text-xs text-ink-300">niko@control-center:~</span>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { icon: Server, k: C.consoleServers, v: display.servers },
                  { icon: Users, k: C.consoleMembers, v: display.users },
                  { icon: Zap, k: C.consoleCommands, v: display.commands },
                ].map((c) => (
                  <motion.div
                    key={c.k}
                    data-hero-stat
                    className="rounded-2xl border border-white/10 bg-ink-850 p-4"
                  >
                    <c.icon className="h-5 w-5 text-ink-200" />
                    <p className="mt-3 font-mono text-2xl font-bold">{c.v}</p>
                    <p className="mt-1 text-xs text-ink-300">{c.k}</p>
                  </motion.div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-ink-850 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-2.5 w-2.5">
                    {display.online && (
                      <span className="absolute h-full w-full animate-ping rounded-full bg-white opacity-50" />
                    )}
                    <span className={cn("relative h-2.5 w-2.5 rounded-full", display.online ? "bg-white" : "bg-ink-500")} />
                  </span>
                  <span className="text-sm font-medium">{display.online ? C.consoleOk : C.consoleDown}</span>
                </div>
                <span className="font-mono text-xs text-ink-300">ping {display.ping}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* features — CSS reveals, no IntersectionObserver dependency */}
      <section id="features" className="relative z-10 mx-auto max-w-7xl scroll-mt-20 px-6 py-20">
        <h2 className="reveal reveal-1 text-center font-display text-3xl font-bold tracking-tight md:text-5xl">
          {C.featuresTitle}
        </h2>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="reveal group rounded-3xl border border-white/10 bg-ink-900 p-6 transition-all hover:-translate-y-1.5 hover:border-white/30"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/15 bg-ink-800 transition-all group-hover:bg-white group-hover:text-black">
                <f.icon className="h-6 w-6" strokeWidth={1.8} />
              </div>
              <h3 className="mt-5 font-display text-lg font-bold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-300">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* setup steps */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-16">
        <div className="rounded-[2.5rem] border border-white/10 bg-gradient-to-b from-ink-900 to-ink-950 p-8 md:p-12">
          <h2 className="font-display text-2xl font-bold tracking-tight md:text-3xl">{C.setupTitle}</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {C.setup.map((s, i) => (
              <div
                key={s.n}
                className="reveal relative border-t border-white/15 pt-6"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <span className="absolute -top-3 left-0 bg-ink-950 pr-3 font-mono text-xs font-bold tracking-widest text-ink-300">
                  {s.n}
                </span>
                <h3 className="font-display text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-300">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <VlogsSection />

      {/* stats */}
      <section id="stats" className="relative z-10 mx-auto max-w-7xl scroll-mt-20 px-6 py-20">
        <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
          {statsGrid.map((s, i) => (
            <div
              key={s.label}
              className="reveal rounded-3xl border border-white/10 bg-gradient-to-b from-ink-900 to-ink-950 p-8 text-center"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <p className="font-display text-4xl font-black tracking-tight md:text-5xl">{s.value}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink-300">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* cta */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-28">
        <div
          className="reveal relative overflow-hidden rounded-[2.5rem] border border-white/15 bg-white px-8 py-16 text-center text-black md:py-20"
        >
          <div className="absolute inset-0 bg-grid opacity-[0.06]" />
          <h2 className="relative font-display text-3xl font-black tracking-tight md:text-5xl">
            {C.ctaTitle}
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-black/70">{C.ctaBody}</p>
          <Link
            to="/dashboard"
            className="relative mt-8 inline-flex items-center gap-2 rounded-2xl bg-black px-8 py-4 font-display font-bold text-white transition-transform hover:scale-[1.05]"
          >
            {C.ctaBtn} <ChevronRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 bg-ink-950/60">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
            {/* brand */}
            <div>
              <div className="flex items-center gap-3">
                <NikoMark />
                <span className="font-display text-lg font-bold tracking-tight">Niko</span>
              </div>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-300">{C.footerAbout}</p>
            </div>

            {/* product links */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-300">{t("ln.product")}</p>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li><Link to="/features" className="text-ink-200 transition-colors hover:text-white">{t("ln.features")}</Link></li>
                <li><Link to="/stats" className="text-ink-200 transition-colors hover:text-white">{t("ln.stats")}</Link></li>
                <li><Link to="/vlogs" className="text-ink-200 transition-colors hover:text-white">{t("vlog.allLink")}</Link></li>
                <li><Link to="/dashboard" className="text-ink-200 transition-colors hover:text-white">{t("ln.dashboard")}</Link></li>
              </ul>
            </div>

            {/* support links */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-300">{t("ln.help")}</p>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li><Link to="/dashboard/support" className="text-ink-200 transition-colors hover:text-white">{t("nav.support")}</Link></li>
                <li><Link to="/privacy" className="text-ink-200 transition-colors hover:text-white">{t("ln.privacy")}</Link></li>
                <li><Link to="/terms" className="text-ink-200 transition-colors hover:text-white">{t("ln.terms")}</Link></li>
                <li>
                  <Link to="/auth" className="text-ink-200 transition-colors hover:text-white">
                    {t("ln.loginDiscord")}
                  </Link>
                </li>
              </ul>
            </div>

            {/* owner card */}
            <div className="rounded-2xl border border-white/10 bg-ink-900 p-5">
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-ink-300">
                <ShieldCheck className="h-3.5 w-3.5" /> {t("ln.owner")}
              </p>
              <p className="mt-3 font-display text-base font-bold">{C.ownerName}</p>
              <p className="mt-1 text-xs text-ink-300">{t("ln.ownerDesc")}</p>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/5 pt-6 text-xs text-ink-300 md:flex-row">
            <p>© {new Date().getFullYear()} Niko Control Center. {t("ln.rights")}</p>
            <div className="flex items-center gap-4">
          <Link to="/privacy" className="transition-colors hover:text-white">{t("ln.privacyShort")}</Link>
              <Link to="/terms" className="transition-colors hover:text-white">{t("ln.termsShort")}</Link>
              <span className="font-mono">{t("ln.runsOn")}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
