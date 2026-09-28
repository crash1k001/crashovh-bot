import { useCallback, useEffect, useMemo, useState } from "react";
import { ToggleLeft, ToggleRight, Search, Save, Send, SlidersHorizontal, Lock, Unlock, AlertTriangle } from "lucide-react";
import { PageHeader, Btn, Badge } from "@/components/shared";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";

type SettingEntry = {
  group: string;
  desc: string;
  secret?: boolean;
  set?: boolean;
  masked?: string;
  value?: string;
};

type LockRow = { command_name: string; locked_by: string; locked_at: number };

export default function AdminControl({ notify: notify_ }: { notify?: (m: string) => void }) {
  const { t, num, loc } = useI18n();
  const [toast, setToast] = useState<string | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);

  const notify = (m: string) => {
    if (notify_) { notify_(m); return; }
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

  /* ------------------------------ command registry ------------------------- */
  const [cmds, setCmds] = useState<{ name: string; disabled: boolean }[]>([]);
  const [cmdQuery, setCmdQuery] = useState("");
  const [cmdCount, setCmdCount] = useState(0);

  const loadCommands = useCallback(async () => {
    const cs = await api.commandsStats();
    if (!cs) return;
    setCmdCount(cs.total);
    const locks = await j<{ locks: LockRow[] }>("/api/admin/locks");
    const lockedSet = new Set((locks?.locks ?? []).map((l) => l.command_name));
    setCmds(cs.names.map((n) => ({ name: n, disabled: lockedSet.has(n.toLowerCase()) })));
  }, [j]);

  const toggleCommand = async (name: string, disable: boolean) => {
    const r = disable
      ? await j<{ ok: boolean }>(`/api/admin/locks/${encodeURIComponent(name)}`, { method: "POST" })
      : await j<{ ok: boolean }>(`/api/admin/locks/${encodeURIComponent(name)}`, { method: "DELETE" });
    if (r?.ok) {
      setCmds((prev) => prev.map((c) => (c.name === name ? { ...c, disabled: disable } : c)));
      notify(disable ? `${name}: ${t("adm.cmdDisabled")}` : `${name}: ${t("adm.cmdEnabled")}`);
    } else {
      notify(t("common.error"));
    }
  };

  const filteredCmds = useMemo(() => {
    const q = cmdQuery.trim().toLowerCase();
    const list = q ? cmds.filter((c) => c.name.includes(q)) : cmds;
    return list.slice(0, 60);
  }, [cmds, cmdQuery]);

  /* --------------------------------- settings ------------------------------ */
  const [settings, setSettings] = useState<Record<string, SettingEntry> | null>(null);
  const [presence, setPresenceState] = useState("online");
  const [activity, setActivity] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    const s = await api.adminSettings();
    if (!s) return;
    setSettings(s.settings);
    setPresenceState(s.presence || "online");
    setActivity(s.activity || "");
  }, []);

  const setDraft = (key: string, value: string) => setDrafts((d) => ({ ...d, [key]: value }));

  const saveSettings = async () => {
    if (saving) return;
    setSaving(true);
    const updates: Record<string, string | boolean> = {};
    for (const [k, v] of Object.entries(drafts)) {
      if (v === "") continue; // empty = keep current
      updates[k] = v;
    }
    if (Object.keys(updates).length === 0) {
      notify(t("adm.saved"));
      setSaving(false);
      return;
    }
    const r = await api.saveAdminSettings(updates);
    notify(r?.ok ? t("adm.saved") : t("common.error"));
    if (r?.ok) {
      setDrafts({});
      await loadSettings();
    }
    setSaving(false);
  };

  const applyPresence = async () => {
    const r = await api.setPresence(presence, activity);
    notify(r?.ok ? t("adm.presenceApplied") : t("common.error"));
  };

  useEffect(() => {
    void loadCommands();
    void loadSettings();
  }, [loadCommands, loadSettings]);

  if (authed === false) {
    return (
      <div>
        <PageHeader title={t("adm.controlTitle")} />
        <div className="adm-panel grid place-items-center py-20 text-center">
          <AlertTriangle className="mb-4 h-10 w-10 text-ink-300" />
          <p className="font-display text-lg font-bold">{t("adm.needAdminAuth")}</p>
          <Btn className="mt-6" onClick={() => (window.location.href = "/admin/login")}>{t("adm.goToLogin")}</Btn>
        </div>
      </div>
    );
  }

  const groups: { id: string; label: string }[] = [
    { id: "telegram", label: t("adm.groupTelegram") },
    { id: "bot", label: t("adm.groupBot") },
    { id: "admin", label: t("adm.groupAdmin") },
  ];

  const dirty = Object.keys(drafts).length > 0;

  return (
    <div>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed right-6 top-6 z-50 flex items-center gap-2 rounded-2xl border border-white/20 bg-white px-5 py-3 font-display text-sm font-bold text-black shadow-2xl"
        >
          {t("adm.saved")} · {toast}
        </motion.div>
      )}

      <PageHeader
        title={t("adm.controlTitle")}
        subtitle={t("adm.settingsSub")}
        actions={
          <Badge>
            <SlidersHorizontal className="h-3 w-3" /> {num(cmdCount)} {t("ov.commands").toLowerCase()}
          </Badge>
        }
      />

      {/* ── global command toggles ─────────────────────────────────────── */}
      <div className="rounded-3xl border border-white/10 bg-ink-900 mb-6 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-display text-lg font-bold">
              <ToggleRight className="h-4 w-4" /> {t("adm.cmdTogglesTitle")}
            </h3>
            <p className="text-xs text-ink-300">{t("adm.cmdTogglesSub")}</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-300" />
            <input
              value={cmdQuery}
              onChange={(e) => setCmdQuery(e.target.value)}
              placeholder={t("adm.cmdSearch")}
              className="w-full rounded-xl border border-white/[0.08] bg-black/30 py-2.5 pl-9 pr-4 text-xs outline-none placeholder:text-white/25 focus:border-white/40 focus:ring-2 focus:ring-white/10"
            />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {filteredCmds.map((c) => (
            <button
              key={c.name}
              onClick={() => void toggleCommand(c.name, !c.disabled)}
              className={cn(
                "flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-all",
                c.disabled
                  ? "border-red-400/30 bg-red-500/[0.06] hover:border-red-400/50"
                  : "border-white/10 bg-ink-850 hover:border-white/30"
              )}
            >
              <span className="min-w-0">
                <span className="block truncate font-mono text-sm font-bold">/{c.name}</span>
                <span className={cn("block text-[10px] font-semibold uppercase tracking-wider", c.disabled ? "text-red-300" : "text-ink-300")}>
                  {c.disabled ? t("adm.cmdDisabled") : t("adm.cmdEnabled")}
                </span>
              </span>
              {c.disabled ? (
                <ToggleLeft className="h-6 w-6 shrink-0 text-red-300" />
              ) : (
                <ToggleRight className="h-6 w-6 shrink-0 text-white" />
              )}
            </button>
          ))}
          {filteredCmds.length === 0 && (
            <p className="col-span-full py-8 text-center font-mono text-xs text-ink-300">{t("adm.cmdNoResults")}</p>
          )}
        </div>
      </div>

      {/* ── settings (config.js values) ────────────────────────────────── */}
      <div className="rounded-3xl border border-white/10 bg-ink-900 mb-6 p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-display text-lg font-bold">
              <SlidersHorizontal className="h-4 w-4" /> {t("adm.settingsTitle")}
            </h3>
            <p className="text-xs text-ink-300">{t("adm.settingsSub")}</p>
          </div>
          <Btn variant="solid" className="px-4 py-2 text-xs" disabled={!dirty || saving} onClick={() => void saveSettings()}>
            <Save className="h-3.5 w-3.5" /> {t("adm.saveSettings")}
          </Btn>
        </div>

        {settings === null ? (
          <p className="py-10 text-center font-mono text-xs text-ink-300">…</p>
        ) : (
          <div className="grid gap-5 lg:grid-cols-3">
            {groups.map((g) => {
              const entries = Object.entries(settings).filter(([, v]) => v.group === g.id);
              if (entries.length === 0) return null;
              return (
                <div key={g.id} className="rounded-2xl border border-white/5 bg-ink-850 p-4">
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-ink-300">{g.label}</p>
                  <div className="space-y-3">
                    {entries.map(([key, entry]) => (
                      <label key={key} className="block">
                        <span className="mb-1 flex items-center justify-between gap-2">
                          <span className="truncate font-mono text-[11px] font-bold text-white">{key}</span>
                          {entry.secret && (
                            <span className={cn("shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase", entry.set ? "border-white/30 text-white" : "border-white/10 text-ink-400")}>
                              {entry.set ? t("adm.secretSet") : t("adm.secretEmpty")}
                            </span>
                          )}
                        </span>
                        {key === "STATUS_PRESENCE" ? (
                          <select
                            value={drafts[key] ?? (entry.value || presence)}
                            onChange={(e) => setDraft(key, e.target.value)}
                            className="w-full rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2 font-mono text-xs outline-none focus:border-white/40"
                          >
                            {["online", "idle", "dnd", "invisible"].map((s) => (
                              <option key={s} value={s} className="bg-ink-900">{s}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={entry.secret ? "password" : "text"}
                            value={drafts[key] ?? ""}
                            onChange={(e) => setDraft(key, e.target.value)}
                            placeholder={entry.secret ? (entry.set ? entry.masked : t("adm.secretEmpty")) : entry.value || entry.desc}
                            className="w-full rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2 text-xs outline-none placeholder:text-white/25 focus:border-white/40 focus:ring-2 focus:ring-white/10"
                          />
                        )}
                        <span className="mt-1 block text-[10px] leading-relaxed text-ink-400">{entry.desc}</span>
                        {!entry.secret && !drafts[key] && entry.value && (
                          <span className="mt-0.5 block text-[10px] text-ink-500">{t("adm.secretReplace")}</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* presence quick-apply */}
        <div className="mt-5 flex flex-wrap items-end gap-3 rounded-2xl border border-white/5 bg-ink-850 p-4">
          <div className="min-w-0">
            <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-ink-300">
              {t("adm.presenceTitle")}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={presence}
                onChange={(e) => setPresenceState(e.target.value)}
                className="rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2 font-mono text-xs outline-none focus:border-white/40"
              >
                {["online", "idle", "dnd", "invisible"].map((s) => (
                  <option key={s} value={s} className="bg-ink-900">{s}</option>
                ))}
              </select>
              <input
                value={activity}
                onChange={(e) => setActivity(e.target.value)}
                placeholder={t("adm.presenceActivity")}
                maxLength={64}
                className="w-56 rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2 text-xs outline-none placeholder:text-white/25 focus:border-white/40"
              />
              <Btn variant="outline" className="px-3.5 py-2 text-xs" onClick={() => void applyPresence()}>
                <Send className="h-3.5 w-3.5" /> {t("adm.presenceApply")}
              </Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
