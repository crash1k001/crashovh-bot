import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Play as PlayIcon, ArrowLeft, X, ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { type Vlog } from "@/components/shared";
import { cn, timeAgo } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

const PAGE_SIZE = 9;
/* Sentinel for the "all tags" filter — a real tag can never collide with it. */
const ALL_TAGS = "*";

/** Dedicated vlogs page: tag filters, image galleries and a lightbox. */
export default function VlogsPage() {
  const { t, lang } = useI18n();
  const [vlogs, setVlogs] = useState<Vlog[] | null>(null);
  const [tag, setTag] = useState<string>(ALL_TAGS);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [lightbox, setLightbox] = useState<{ vlog: Vlog; idx: number } | null>(null);

  useEffect(() => {
    document.title = `${t("ln.vlogs")} · Niko Control Center`;
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
    const timer = setInterval(poll, 30000);
    return () => clearInterval(timer);
  }, [t]);

  const tags = useMemo(() => {
    const set = new Set<string>();
    for (const v of vlogs ?? []) set.add(v.tag);
    return [ALL_TAGS, ...[...set]];
  }, [vlogs]);

  const list = useMemo(() => {
    let l = vlogs ?? [];
    if (tag !== ALL_TAGS) l = l.filter((v) => v.tag === tag);
    return l;
  }, [vlogs, tag]);

  /* keyboard navigation in the lightbox */
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      const imgs = lightbox.vlog.images ?? [];
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight" && imgs.length > 1) setLightbox((lb) => (lb ? { ...lb, idx: (lb.idx + 1) % imgs.length } : lb));
      if (e.key === "ArrowLeft" && imgs.length > 1) setLightbox((lb) => (lb ? { ...lb, idx: (lb.idx - 1 + imgs.length) % imgs.length } : lb));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  return (
    <div className="min-h-screen bg-ink-950 text-white">
      {/* ambient background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-grid mask-fade-b opacity-50" />
        <div className="absolute left-1/2 top-[-15%] h-[420px] w-[700px] -translate-x-1/2 rounded-full bg-white/[0.05] blur-[130px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14">
        {/* header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-300 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> {t("vlog.backHome")}
          </Link>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-ink-300">
                <PlayIcon className="h-3.5 w-3.5" /> {t("ln.vlogs")}
              </div>
              <h1 className="mt-3 font-display text-3xl font-black tracking-tight md:text-5xl">{t("vlog.title")}</h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-300">{t("vlog.subtitle")}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-xl border border-white/10 bg-ink-900 px-3.5 py-2 font-mono text-xs text-ink-300">
                {vlogs ? `${list.length} ${t("vlog.entries")}` : "…"}
              </span>
            </div>
          </div>
        </motion.div>

        {/* tag filter */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="mt-8 flex flex-wrap gap-1.5"
        >
          {tags.map((tagKey) => (
            <button
              key={tagKey}
              onClick={() => {
                setTag(tagKey);
                setVisible(PAGE_SIZE);
              }}
              className={cn(
                "relative rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors",
                tag === tagKey ? "text-black" : "border border-white/10 bg-ink-900 text-ink-200 hover:border-white/30 hover:text-white"
              )}
            >
              {tag === tagKey && (
                <motion.span layoutId="vlog-tag" className="absolute inset-0 rounded-xl bg-white" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
              )}
              <span className="relative z-10">{tagKey === ALL_TAGS ? t("vlog.all") : tagKey}</span>
            </button>
          ))}
        </motion.div>

        {/* grid */}
        {vlogs && list.length > 0 ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {list.slice(0, visible).map((v, i) => (
                <motion.article
                  key={v.id}
                  layout
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.35, delay: Math.min(i * 0.05, 0.3), ease: [0.16, 1, 0.3, 1] }}
                  className="lift group flex flex-col rounded-3xl border border-white/10 bg-ink-900 p-5 transition-colors hover:border-white/30"
                >
                  {/* cover image */}
                  {v.images && v.images.length > 0 && (
                    <button
                      onClick={() => setLightbox({ vlog: v, idx: 0 })}
                      className="relative -mx-1 -mt-1 mb-4 overflow-hidden rounded-2xl"
                    >
                      <img
                        src={v.images[0]}
                        alt=""
                        loading="lazy"
                        className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                      {v.images.length > 1 && (
                        <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-lg bg-black/70 px-2 py-1 text-[10px] font-bold backdrop-blur">
                          <ImageIcon className="h-3 w-3" /> {v.images.length}
                        </span>
                      )}
                    </button>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
                      {v.tag}
                    </span>
                    <span className="font-mono text-[11px] text-ink-300">{timeAgo(v.createdAt, lang)}</span>
                  </div>
                  <h2 className="mt-3.5 font-display text-lg font-bold leading-snug">{v.title}</h2>
                  <p className="mt-2.5 flex-1 text-sm leading-relaxed text-ink-300 line-clamp-5">{v.body}</p>
                  <div className="mt-4 flex items-center gap-2.5 border-t border-white/10 pt-4">
                    {v.authorAvatar ? (
                      <img src={v.authorAvatar} alt="" className="h-7 w-7 rounded-lg border border-white/15" />
                    ) : (
                      <div className="grid h-7 w-7 place-items-center rounded-lg border border-white/15 bg-ink-800 font-display text-[11px] font-bold">
                        {v.author[0]?.toUpperCase() ?? "N"}
                      </div>
                    )}
                    <span className="text-xs font-semibold">{v.author}</span>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 grid place-items-center rounded-3xl border border-dashed border-white/15 px-6 py-24 text-center"
          >
            <PlayIcon className="mb-4 h-8 w-8 text-ink-300" />
            <p className="font-display text-lg font-bold">{vlogs ? t("vlog.empty") : t("vlog.loading")}</p>
            <p className="mt-2 max-w-sm text-sm text-ink-300">
              {vlogs ? t("vlog.emptyTag") : t("vlog.fetching")}
            </p>
          </motion.div>
        )}

        {/* load more */}
        {list.length > visible && (
          <div className="mt-10 text-center">
            <button
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              className="rounded-2xl border border-white/20 px-7 py-3 font-display text-sm font-bold transition-colors hover:border-white/50 hover:bg-white/5"
            >
              {t("vlog.showMore")}
            </button>
          </div>
        )}
      </div>

      {/* lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
            className="fixed inset-0 z-[60] grid place-items-center bg-black/90 p-4 backdrop-blur-md"
          >
            <button
              onClick={() => setLightbox(null)}
              className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-xl border border-white/20 text-white transition-colors hover:bg-white/10"
              aria-label={t("common.close")}
            >
              <X className="h-5 w-5" />
            </button>

            {(lightbox.vlog.images?.length ?? 0) > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const n = lightbox.vlog.images!.length;
                    setLightbox({ ...lightbox, idx: (lightbox.idx - 1 + n) % n });
                  }}
                  className="absolute left-3 grid h-11 w-11 place-items-center rounded-xl border border-white/20 text-white transition-colors hover:bg-white/10 sm:left-6"
                  aria-label={t("common.back")}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const n = lightbox.vlog.images!.length;
                    setLightbox({ ...lightbox, idx: (lightbox.idx + 1) % n });
                  }}
                  className="absolute right-3 grid h-11 w-11 place-items-center rounded-xl border border-white/20 text-white transition-colors hover:bg-white/10 sm:right-6"
                  aria-label={t("common.next")}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}

            <motion.figure
              key={`${lightbox.vlog.id}-${lightbox.idx}`}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[85vh] max-w-5xl"
            >
              <img
                src={lightbox.vlog.images?.[lightbox.idx]}
                alt={`${lightbox.vlog.title} — ${t("vlog.imageWord")} ${lightbox.idx + 1}`}
                className="max-h-[75vh] w-auto max-w-full rounded-2xl border border-white/15 object-contain"
              />
              <figcaption className="mt-3 text-center text-xs text-ink-300">
                {lightbox.vlog.title}
                {(lightbox.vlog.images?.length ?? 0) > 1 && (
                  <span className="ml-2 font-mono">
                    {lightbox.idx + 1} / {lightbox.vlog.images!.length}
                  </span>
                )}
              </figcaption>
            </motion.figure>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
