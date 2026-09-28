import { useCallback, useEffect, useRef, useState } from "react";
import { LifeBuoy, Send, Plus, CheckCircle2, Clock, MessageSquare, Lock } from "lucide-react";
import { PageHeader, Badge, Btn } from "@/components/shared";
import { api, type SupportTicket } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, timeAgo } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export default function Support() {
  const { session, live, loading } = useAuth();
  /* `t` is used for interval handles further down, so the translator is `tr`. */
  const { t: tr, lang, dt } = useI18n();
  const [tickets, setTickets] = useState<SupportTicket[] | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [reply, setReply] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const notify = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    const t = await api.mySupportTickets();
    setTickets(t ?? []);
    return t;
  }, []);

  useEffect(() => {
    if (live && session?.user) void load();
  }, [live, session, load]);

  useEffect(() => {
    if (live && session?.user) {
      const t = setInterval(() => void load(), 15000);
      return () => clearInterval(t);
    }
  }, [live, session, load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active, tickets]);

  const create = async () => {
    if (!subject.trim()) return notify(tr("sup.needSubject"));
    const r = await api.createSupportTicket(subject.trim(), text.trim());
    if (r?.ok) {
      notify(tr("sup.sent"));
      setSubject("");
      setText("");
      setCreating(false);
      await load();
      setActive(r.ticket.id);
    } else {
      notify(tr("sup.sendFail"));
    }
  };

  const sendReply = async () => {
    if (!active || !reply.trim()) return;
    const r = await api.replySupportTicket(active, reply.trim());
    if (r?.ok) {
      setReply("");
      await load();
    } else {
      notify(tr("sup.replyFail"));
    }
  };

  const current = tickets?.find((t) => t.id === active) ?? null;
  const signedIn = Boolean(live && session?.user);

  return (
    <div>
      {toast && (
        <div className="fixed right-6 top-6 z-50 flex items-center gap-2 rounded-2xl border border-white/20 bg-white px-5 py-3 font-display text-sm font-bold text-black shadow-2xl">
          <CheckCircle2 className="h-4 w-4" /> {toast}
        </div>
      )}

      <PageHeader
        title={tr("sup.title")}
        subtitle={tr("sup.subtitle2")}
        actions={
          signedIn ? (
            <Btn onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> {tr("sup.newTicket")}
            </Btn>
          ) : undefined
        }
      />

      {!signedIn && !loading ? (
        <div className="grid place-items-center rounded-3xl border border-white/15 bg-ink-900 py-20 text-center">
          <Lock className="mb-4 h-10 w-10 text-ink-300" />
          <p className="font-display text-lg font-bold">{tr("sup.needAuth")}</p>
          <p className="mt-2 max-w-sm text-sm text-ink-300">{tr("sup.needAuthHint")}</p>
          <Btn className="mt-6" onClick={() => (window.location.href = "/auth?returnTo=/dashboard/support")}>
            {tr("sup.signIn")}
          </Btn>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(280px,360px)_1fr]">
          {/* tickets list */}
          <div className="space-y-2.5">
            {tickets === null && (
              <div className="rounded-2xl border border-white/10 bg-ink-900 px-4 py-10 text-center font-mono text-sm text-ink-300">
                {tr("common.loading")}
              </div>
            )}
            {tickets?.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/15 px-4 py-12 text-center">
                <LifeBuoy className="mx-auto mb-3 h-8 w-8 text-ink-300" />
                <p className="text-sm font-semibold">{tr("sup.empty")}</p>
                <p className="mt-1 text-xs text-ink-300">{tr("sup.emptyHint")}</p>
              </div>
            )}
            {tickets?.map((t) => (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                className={cn(
                  "w-full rounded-2xl border p-4 text-left transition-all",
                  active === t.id
                    ? "border-white/40 bg-ink-800"
                    : "border-white/10 bg-ink-900 hover:border-white/25"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-bold">{t.subject}</span>
                  <StatusBadge status={t.status} />
                </div>
                <p className="mt-1.5 truncate text-xs text-ink-300">
                  {t.messages.length > 0 ? t.messages[t.messages.length - 1].text : "—"}
                </p>
                <p className="mt-1.5 font-mono text-[10px] text-ink-300">{timeAgo(t.updatedAt, lang)}</p>
              </button>
            ))}
          </div>

          {/* conversation */}
          <div className="flex min-h-[420px] flex-col rounded-3xl border border-white/10 bg-ink-900">
            {!current ? (
              <div className="grid flex-1 place-items-center p-10 text-center">
                <div>
                  <MessageSquare className="mx-auto mb-3 h-10 w-10 text-ink-300" />
                  <p className="text-sm text-ink-300">{tr("sup.pickTicket")}</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3 border-b border-white/10 px-6 py-4">
                  <div className="min-w-0">
                    <p className="truncate font-display font-bold">{current.subject}</p>
                    <p className="font-mono text-[10px] text-ink-300">
                      {tr("sup.ticket")} {current.id.slice(0, 8)}
                    </p>
                  </div>
                  <StatusBadge status={current.status} />
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                  {current.messages.map((m, i) => (
                    <div key={i} className={cn("flex", m.from === "user" ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[80%] rounded-2xl px-4 py-3",
                          m.from === "user"
                            ? "bg-white text-black"
                            : "border border-white/15 bg-ink-850 text-white"
                        )}
                      >
                        <p className={cn(
                          "text-[10px] font-bold uppercase tracking-wider",
                          m.from === "user" ? "text-black/50" : "text-ink-300"
                        )}>
                          {m.from === "user" ? m.author : tr("sup.admin")}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{m.text}</p>
                        <p className={cn(
                          "mt-1.5 font-mono text-[10px]",
                          m.from === "user" ? "text-black/40" : "text-ink-400"
                        )}>
                          {dt(m.ts)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>

                {current.status !== "closed" && (
                  <div className="flex gap-2 border-t border-white/10 p-4">
                    <input
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && void sendReply()}
                      placeholder={tr("sup.reply")}
                      maxLength={2000}
                      className="flex-1 rounded-xl border border-white/10 bg-ink-850 px-4 py-2.5 text-sm outline-none focus:border-white/40"
                    />
                    <Btn onClick={() => void sendReply()}>
                      <Send className="h-4 w-4" />
                    </Btn>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* create modal */}
      {creating && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={() => setCreating(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-3xl border border-white/15 bg-ink-900 p-6"
          >
            <h3 className="font-display text-xl font-bold">{tr("sup.newTicket")}</h3>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={tr("sup.subjectPlaceholder")}
              maxLength={200}
              className="mt-4 w-full rounded-xl border border-white/10 bg-ink-850 px-4 py-2.5 text-sm outline-none focus:border-white/40"
            />
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              maxLength={2000}
              placeholder={tr("sup.messagePlaceholder")}
              className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-ink-850 px-4 py-2.5 text-sm outline-none focus:border-white/40"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => setCreating(false)}>{tr("common.cancel")}</Btn>
              <Btn onClick={() => void create()}>
                <Send className="h-4 w-4" /> {tr("sup.send")}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: SupportTicket["status"] }) {
  const { t } = useI18n();
  const map = {
    open: { label: t("sup.statusOpen"), cls: "border-white/30 bg-white/10" },
    answered: { label: t("sup.statusAnswered"), cls: "border-white bg-white text-black" },
    closed: { label: t("sup.statusClosed"), cls: "border-white/10 bg-white/5 text-ink-300" },
  } as const;
  const s = map[status];
  return (
    <Badge className={cn("shrink-0 gap-1", s.cls)}>
      {status === "answered" ? <CheckCircle2 className="h-3 w-3" /> : status === "open" ? <Clock className="h-3 w-3" /> : null}
      {s.label}
    </Badge>
  );
}
