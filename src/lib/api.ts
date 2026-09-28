/* API client: every call hits the real backend (bot process).
 * If it is unreachable or returns 401, callers render an honest empty/offline
 * state ("—", skeleton, or a login prompt) — no demo numbers, ever. */

export type ApiUser = { id: string; username: string; avatar: string | null };
export type Session = { user: ApiUser | null; isAdmin: boolean };

export type BotStatus = {
  bot: {
    online: boolean;
    name: string;
    tag: string | null;
    id: string | null;
    avatar: string | null;
    guilds: number;
    users: number;
    channels: number;
    commands: number;
    commandsSlash?: number;
    commandsPrefix?: number;
    ping: number | null;
    uptimeSec: number;
    status: string;
  };
  host: { memoryMb: number; heapMb: number; nodeVersion: string; platform: string; shards?: { id: number; status: string; ping: number | null }[] };
  timestamp: string;
};

async function get<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { credentials: "include" });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

/** Distinguishes "bot backend answered JSON" from "static hosting returned index.html". */
async function reachableJson<T>(url: string): Promise<{ reachable: boolean; data: T | null }> {
  try {
    const r = await fetch(url, { credentials: "include" });
    const ct = r.headers.get("content-type") || "";
    if (!ct.includes("application/json")) return { reachable: false, data: null };
    if (!r.ok) return { reachable: true, data: null };
    return { reachable: true, data: (await r.json()) as T };
  } catch {
    return { reachable: false, data: null };
  }
}

async function post<T>(url: string, body?: unknown): Promise<T | null> {
  return send<T>("POST", url, body);
}

async function del<T>(url: string): Promise<T | null> {
  return send<T>("DELETE", url);
}

async function send<T>(method: string, url: string, body?: unknown): Promise<T | null> {
  try {
    const r = await fetch(url, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export const api = {
  session: () => get<Session>("/auth/me"),
  sessionInfo: () => reachableJson<Session>("/auth/me"),
  statusInfo: () => reachableJson<BotStatus>("/api/status"),
  status: () => get<BotStatus>("/api/status"),
  logout: () => post<unknown>("/auth/logout").then(() => undefined),

  myGuilds: () =>
    get<{ guilds: DashboardGuild[] }>("/api/me/guilds").then((r) => r?.guilds ?? null),

  guild: (id: string) => get<DashboardGuildDetail>(`/api/guilds/${id}`),

  setGuildSettings: (id: string, patch: Record<string, boolean>) =>
    post<{ ok: boolean }>(`/api/guilds/${id}/settings`, patch),

  setAntinuke: (id: string, patch: Record<string, boolean | number | string>) =>
    send<{ ok: boolean; antinuke: AntinukeView }>("PATCH", `/api/guilds/${id}/antinuke`, patch),

  setAutomod: (id: string, patch: Record<string, boolean | number | string>) =>
    send<{ ok: boolean; automod: AutomodView }>("PATCH", `/api/guilds/${id}/automod`, patch),

  setLogging: (id: string, patch: Record<string, string | boolean>) =>
    post<{ ok: boolean; config: Record<string, unknown> }>(`/api/guilds/${id}/logging`, patch),

  guildGiveaways: (id: string) =>
    get<{ giveaways: GuildGiveaway[] }>(`/api/guilds/${id}/giveaways`),

  createGiveaway: (
    id: string,
    p: { prize: string; winners: number; durationMinutes: number; channelId?: string }
  ) => post<{ ok: boolean; giveaway: { id: number; prize: string; endTime: number } }>(`/api/guilds/${id}/giveaways`, p),

  deleteGiveaway: (id: string, gid: number) =>
    send<{ ok: boolean }>("DELETE", `/api/guilds/${id}/giveaways/${gid}`),

  setAiChannel: (id: string, channelId: string, action: "add" | "remove") =>
    post<{ ok: boolean; channels: string[] }>(`/api/guilds/${id}/ai-channels`, { channelId, action }),

  setPrefix: (id: string, prefix: string) =>
    post<{ ok: boolean; prefix: string }>(`/api/guilds/${id}/prefix`, { prefix }),

  guildCommands: (id: string) =>
    get<{ commands: { name: string; desc: string }[]; overrides: Record<string, boolean> }>(
      `/api/guilds/${id}/commands`
    ),

  setGuildCommand: (id: string, name: string, enabled: boolean) =>
    post<{ ok: boolean }>(`/api/guilds/${id}/commands/${encodeURIComponent(name)}`, { enabled }),

  antinukeWhitelist: (id: string) =>
    get<{ entries: { userId: string; events: string[] | null; addedBy: string | null }[] }>(
      `/api/guilds/${id}/antinuke-whitelist`
    ).then((r) => r?.entries ?? null),

  antinukeWhitelistAdd: (id: string, userId: string) =>
    post<{ ok: boolean }>(`/api/guilds/${id}/antinuke-whitelist`, { userId }),

  antinukeWhitelistRemove: (id: string, userId: string) =>
    fetch(`/api/guilds/${id}/antinuke-whitelist/${encodeURIComponent(userId)}`, {
      method: "DELETE",
      credentials: "include",
    }).then((r) => r.ok as boolean),

  automodWhitelist: (id: string) =>
    get<{ entries: { targetId: string; targetType: string; modules: string[] }[] }>(
      `/api/guilds/${id}/automod-whitelist`
    ).then((r) => r?.entries ?? null),

  automodWhitelistAdd: (id: string, targetId: string, targetType: string) =>
    post<{ ok: boolean }>(`/api/guilds/${id}/automod-whitelist`, { targetId, targetType }),

  automodWhitelistRemove: (id: string, targetId: string) =>
    fetch(`/api/guilds/${id}/automod-whitelist/${encodeURIComponent(targetId)}`, {
      method: "DELETE",
      credentials: "include",
    }).then((r) => r.ok as boolean),

  /** Saves the welcome (kind: "welcome") or farewell (kind: "farewell")
   * message: channel, simple/container style, text and optional images. */
  setGreeting: async (
    id: string,
    patch: {
      kind: "welcome" | "farewell";
      channelId: string;
      type: "simple" | "container";
      message?: string | null;
      title?: string | null;
      description?: string | null;
      color?: string | null;
      thumbnailUrl?: string | null;
      imageUrl?: string | null;
    }
  ): Promise<{ ok: boolean; config?: Record<string, unknown>; error?: string }> => {
    /* Kept separate from send(): the panel shows the server's own validation
     * message ("Нет прав писать в #channel", bad colour…) instead of a generic
     * "something went wrong". */
    try {
      const r = await fetch(`/api/guilds/${id}/welcome`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const j = (await r.json().catch(() => ({}))) as {
        ok?: boolean;
        config?: Record<string, unknown>;
        error?: string;
      };
      if (!r.ok || !j.ok) return { ok: false, error: j.error };
      return { ok: true, config: j.config };
    } catch {
      return { ok: false };
    }
  },

  guildExtends: (id: string) =>
    get<{ welcome: Record<string, unknown> | null; farewell: Record<string, unknown> | null; logging: Record<string, unknown> | null }>(
      `/api/guilds/${id}/extends`
    ),

  commandsStats: () =>
    get<{ total: number; names: string[]; byCategory: Record<string, number> }>("/api/commands/stats").then(
      (r) => (r ? { total: r.total, names: r.names, byCategory: r.byCategory } : null)
    ),

  /* Runtime settings (config.js values editable from the admin panel). */
  adminSettings: () =>
    get<{
      settings: Record<
        string,
        { group: string; desc: string; secret?: boolean; set?: boolean; masked?: string; value?: string }
      >;
      presence: string;
      activity: string;
    }>("/api/admin/settings"),

  saveAdminSettings: (updates: Record<string, string | boolean>) =>
    post<{ ok: boolean; applied: string[] }>("/api/admin/settings", { updates }),

  setPresence: (status: string, activity: string) =>
    post<{ ok: boolean }>("/api/admin/presence", { status, activity }),

  /* Admin accounts (owner-managed, permission bitmask). */
  adminAccounts: () =>
    get<{ accounts: AdminAccountRow[]; perms: AdminPermInfo[]; selfLogin: string | null; isOwner: boolean }>(
      "/api/admin/accounts"
    ),
  createAdminAccount: (login: string, password: string, perms: number) =>
    post<{ ok: boolean }>("/api/admin/accounts", { login, password, perms }),
  updateAdminAccount: (login: string, patch: { password?: string; perms?: number; disabled?: boolean }) =>
    send<{ ok: boolean }>("PATCH", `/api/admin/accounts/${encodeURIComponent(login)}`, patch),
  deleteAdminAccount: (login: string) =>
    del<{ ok: boolean }>(`/api/admin/accounts/${encodeURIComponent(login)}`),
  setOwnerPassword: (password: string) =>
    post<{ ok: boolean }>("/api/admin/owner-password", { password }),

  activity: () =>
    get<{ activity: { ts: number; level: string; text: string }[] }>("/api/activity").then(
      (r) => r?.activity ?? null
    ),

  mySupportTickets: () =>
    get<{ tickets: SupportTicket[] }>("/api/support/tickets").then((r) => r?.tickets ?? null),
  createSupportTicket: (subject: string, text: string) =>
    post<{ ok: boolean; ticket: SupportTicket }>("/api/support/tickets", { subject, text }),
  replySupportTicket: (id: string, text: string) =>
    post<{ ok: boolean; ticket: SupportTicket }>(`/api/support/tickets/${id}/messages`, { text }),

  adminSupport: () =>
    get<{ tickets: SupportTicket[]; open: number }>("/api/admin/support"),
  adminReplySupport: (id: string, text: string) =>
    post<{ ok: boolean; ticket: SupportTicket }>(`/api/admin/support/${id}/reply`, { text }),
  adminSetSupportStatus: (id: string, status: string) =>
    post<{ ok: boolean }>(`/api/admin/support/${id}`, { status }),
  adminDeleteSupport: (id: string) =>
    fetch(`/api/admin/support/${id}`, { method: "DELETE", credentials: "include" }).then(
      (r) => r.ok as boolean
    ),

  adminStats: () => get<AdminStats>("/api/admin/overview"),
  metrics: () => get<AdminStats>("/api/metrics"),
  adminGiveaways: () =>
    get<{ giveaways: GiveawayRow[]; active: number; total: number }>("/api/admin/giveaways"),
  adminEndGiveaway: (id: number) =>
    post<{ ok: boolean }>(`/api/admin/giveaways/${id}/end`),
  adminDeleteGiveaway: (id: number) =>
    fetch(`/api/admin/giveaways/${id}`, { method: "DELETE", credentials: "include" }).then(
      (r) => r.ok as boolean
    ),
  adminDatabase: () =>
    get<{ tables: TableRow[]; totalRows: number; dialect: string }>("/api/admin/database"),
  adminBotTickets: () =>
    get<{ total: number | null; open: number | null; recent: BotTicketRow[] }>("/api/admin/tickets"),
  adminGuildDetail: (id: string) => get<AdminGuildDetail>(`/api/admin/guilds/${id}`),
  adminGuilds: () =>
    get<{ guilds: AdminGuild[] }>("/api/admin/guilds").then((r) => r?.guilds ?? null),
  adminModLogs: () =>
    get<{ logs: ModLogRow[] }>("/api/admin/modlogs").then((r) => r?.logs ?? null),
  leaveGuild: (id: string) => post<{ ok: boolean }>(`/api/admin/guilds/${id}/leave`),
};

/* ------------------------------- shared types ----------------------------- */

export type SupportMessage = { from: "user" | "admin"; author: string; text: string; ts: number };

export type SupportTicket = {
  id: string;
  userId: string;
  username: string;
  avatar: string | null;
  subject: string;
  status: "open" | "answered" | "closed";
  messages: SupportMessage[];
  createdAt: number;
  updatedAt: number;
};

export type DashboardGuild = {
  id: string;
  name: string;
  icon: string | null;
  members: number;
  online: number | null;
  botPresent: boolean;
  role: string;
  inviteUrl?: string;
};

export type ModLogRow = {
  id: number;
  guildId: string;
  moderatorTag: string;
  targetTag: string;
  action: string;
  reason: string | null;
  source: string;
  createdAt: string;
};

export type DashboardGuildDetail = {
  id: string;
  name: string;
  icon: string | null;
  owner: string;
  members: number;
  createdAt: number;
  boosts: number;
  channels: { text: number; voice: number; categories: number; total: number } | null;
  textChannelList?: { id: string; name: string }[];
  roles: number | null;
  features: string[];
  config: Record<string, unknown> | null;
  modActions: ModLogRow[];
  stats: {
    giveawaysTotal: number;
    giveawaysActive: number;
    ticketsOpen: number;
    ticketsTotal: number;
    autoReact: number;
    tempChannels: number;
  } | null;
  antinuke: AntinukeView | null;
  automod: AutomodView | null;
  aiChannels?: string[];
  prefix?: string | null;
};

export type AntinukeView = {
  enabled: boolean;
  punishment?: string;
  threshold?: number;
  timeframe?: number;
  antiBan?: boolean;
  antiKick?: boolean;
  antiChannelCreate?: boolean;
  antiChannelDelete?: boolean;
  antiRoleCreate?: boolean;
  antiRoleDelete?: boolean;
  antiRoleUpdate?: boolean;
  antiWebhook?: boolean;
  antiBot?: boolean;
  antiGuildUpdate?: boolean;
  antiEmoji?: boolean;
  antiChannelEdit?: boolean;
};

export type AutomodView = {
  enabled: boolean;
  punishment?: string;
  muteDuration?: number;
  antiSpam?: boolean;
  antiLink?: boolean;
  antiInvite?: boolean;
  antiBadWords?: boolean;
  antiMassMention?: boolean;
  antiCaps?: boolean;
  antiPing?: boolean;
  spamThreshold?: number;
  spamInterval?: number;
  mentionLimit?: number;
  capsPercentage?: number;
  capsMinLength?: number;
};

export type GuildGiveaway = {
  id: number;
  prize: string;
  winners: number;
  ended: boolean;
  endTime: number;
  entries: number;
  channelId: string | null;
  hostId: string | null;
};

export type AdminGuild = {
  id: string;
  name: string;
  icon: string | null;
  members: number;
  boosts: number;
  createdAt: number;
  owner: string;
};

export type GiveawayRow = {
  id: number;
  guildId: string;
  guildName: string | null;
  channelId: string;
  messageId: string | null;
  hostId: string;
  prize: string;
  winners: number;
  endTime: number;
  ended: boolean;
  entries: number | null;
  timeLeftMs: number;
  createdAt: string;
};

export type TableRow = { model: string; table: string; rows: number | null; error?: string };

/* Dashboard admin accounts (owner-managed, permission bitmask) */
export type AdminPermInfo = { key: string; bit: number; label: string; desc: string };
export type AdminAccountRow = {
  login: string;
  perms: number;
  isOwner: boolean;
  disabled: boolean;
  createdBy: string | null;
  createdAt: number;
  lastLogin: number | null;
};

export type BotTicketRow = {
  id: number;
  guildId: string;
  guildName: string | null;
  userId: string;
  categoryName: string;
  status: string;
  claimedBy: string | null;
  createdAt: string;
};

export type AdminGuildDetail = {
  id: string;
  name: string;
  icon: string | null;
  owner: string;
  members: number;
  boosts: number;
  createdAt: number;
  channels: { text: number; voice: number; total: number } | null;
  roles: number | null;
  features: string[];
  config: { loggingEnabled?: boolean; welcomeInOn?: boolean; welcomeOutOn?: boolean; autoreactEnabled?: boolean } | null;
  antinuke: { enabled?: boolean; punishment?: string; threshold?: number; timeframe?: number } | null;
  autoReact: number;
};

export type AdminStats = {
  counts?: {
    tickets: number | null;
    ticketsOpen: number | null;
    giveawaysActive: number | null;
    profiles: number | null;
    blacklist: number | null;
    noprefix: number | null;
  };
  uptimeSec: number;
  memoryMb: number;
  heapMb: number;
  cpuUserMs?: number;
  ping: number | null;
  guilds: number;
  users: number;
  channels: number;
  commands: number;
  shards: number;
  shardStatus: { id: number; status: string; ping: number | null }[];
  voice: number;
  totalCommandUses: number;
  telemetry: { t: string; memory: number; ping: number; guilds: number; users: number }[];
  commandUsage: { name: string; uses: number; users: number; lastUsed: number }[];
};

export function fmtUptime(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const parts: string[] = [];
  /* Universal short units (2d 4h 10m) so the same string reads correctly in
   * both dashboard languages. */
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(" ");
}
