import { useEffect, useState } from "react";
import { Users, MessageSquare, Server, TrendingUp, Command, Timer } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { PageHeader, StatCard, Badge } from "@/components/shared";
import { api, type AdminStats, fmtUptime } from "@/lib/api";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";

export default function Analytics() {
  const { t, num } = useI18n();
  const [ov, setOv] = useState<AdminStats | null>(null);
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    const poll = async () => {
      /* /api/metrics works for any signed-in user; admin overview is a bonus */
      const s = (await api.metrics()) ?? (await api.adminStats());
      if (s) {
        setOv(s);
        setAdmin(Boolean(await api.adminStats()));
      } else {
        setAdmin(false);
      }
    };
    void poll();
    const t = setInterval(poll, 8000);
    return () => clearInterval(t);
  }, []);

  const telemetry = ov?.telemetry ?? [];
  const memData = telemetry.map((p) => ({ t: p.t, v: p.memory }));
  const usersData = telemetry.map((p) => ({ t: p.t, v: p.users }));
  const cmdData = (ov?.commandUsage ?? []).map((c) => ({ name: `/${c.name}`, uses: c.uses }));

  return (
    <div>
      <PageHeader
        title={t("an2.title")}
        subtitle={ov ? `${t("an2.subtitleLive")} ${fmtUptime(ov.uptimeSec)}` : t("an2.subtitleOff")}
        actions={admin ? <Badge>{t("an2.full")}</Badge> : <Badge>{t("an2.basic")}</Badge>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard index={0} label={t("ov.guilds")} value={String(ov?.guilds ?? "—")} icon={Server} />
        <StatCard index={1} label={t("an2.users")} value={ov ? num(ov.users) : "—"} icon={Users} />
        <StatCard index={2} label={t("an2.uses")} value={num(ov?.totalCommandUses ?? 0)} sub={t("an2.sinceStart")} icon={Command} />
        <StatCard index={3} label="Ping" value={ov?.ping != null ? `${Math.round(ov.ping)}ms` : "—"} icon={TrendingUp} />
      </div>

      {ov && telemetry.length > 1 && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-white/10 bg-ink-900 p-6"
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-bold">{t("an2.usersOverTime")}</h3>
                <p className="text-xs text-ink-300">{t("an2.telemetry")}</p>
              </div>
              <Badge>{t("common.live")}</Badge>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={usersData}>
                  <defs>
                    <linearGradient id="gU" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fff" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#fff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="t" stroke="#555" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#555" fontSize={11} tickLine={false} axisLine={false} width={50} />
                  <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, fontSize: 12 }} />
                  <Area type="monotone" dataKey="v" stroke="#fff" strokeWidth={2} fill="url(#gU)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-3xl border border-white/10 bg-ink-900 p-6"
          >
            <div className="mb-6">
              <h3 className="font-display text-lg font-bold">{t("an2.memory")}</h3>
              <p className="text-xs text-ink-300">{t("an2.rss")}</p>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={memData}>
                  <defs>
                    <linearGradient id="gM" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fff" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#fff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="t" stroke="#555" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#555" fontSize={11} tickLine={false} axisLine={false} width={50} />
                  <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, fontSize: 12 }} />
                  <Area type="monotone" dataKey="v" stroke="#fff" strokeWidth={2} fill="url(#gM)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>
      )}

      {ov && cmdData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="mt-6 rounded-3xl border border-white/10 bg-ink-900 p-6"
        >
          <h3 className="mb-1 font-display text-lg font-bold">{t("an2.topCommands")}</h3>
          <p className="mb-5 text-xs text-ink-300">{t("an2.liveCounter")}</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cmdData}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="name" stroke="#555" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#555" fontSize={11} tickLine={false} axisLine={false} width={40} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, fontSize: 12 }}
                />
                <Bar dataKey="uses" fill="#ffffff" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {!ov && (
        <div className="mt-6 grid place-items-center rounded-3xl border border-dashed border-white/15 py-24 text-center text-ink-300">
          <div>
            <Timer className="mx-auto mb-3 h-8 w-8" />
            <p>{t("an2.collecting")}</p>
            <p className="mt-1 font-mono text-xs">{t("an2.startBot")}</p>
          </div>
        </div>
      )}
    </div>
  );
}

void MessageSquare;
