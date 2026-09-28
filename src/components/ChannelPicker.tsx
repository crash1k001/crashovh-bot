import { useId, useMemo, useRef, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export type SelectOption = { value: string; label: string; hint?: string };

/* Custom dropdown used everywhere a native <select> used to be: giveaway
 * duration, blacklist type, vlog tag, log channels, giveaway channels.
 * Consistent ink/white styling, search for long lists, keyboard navigation,
 * animated open/close. All copy follows the active language. */
export function FancySelect({
  options,
  value,
  onChange,
  placeholder,
  disabled,
  searchable = false,
  align = "left",
  className,
}: {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  align?: "left" | "right";
  className?: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hi, setHi] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const list = useMemo(() => {
    if (!q.trim()) return options;
    const needle = q.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(needle));
  }, [options, q]);

  const selected = options.find((o) => o.value === value) ?? null;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQ("");
      setHi(Math.max(0, list.findIndex((o) => o.value === value)));
      const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  /* Works both while open (highlight moves) and closed (Enter/Space opens the
   * list) — previously a non-searchable select ignored the arrow keys because
   * the list container was never focused. */
  const onKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, Math.max(0, list.length - 1))); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (list[hi]) pick(list[hi].value); }
    else if (e.key === "Escape") { e.preventDefault(); setOpen(false); }
    else if (e.key === "Tab") { setOpen(false); }
  };

  /* keep the highlighted option visible while arrow-navigating */
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[hi] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [hi, open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKey}
        className={cn(
          "flex w-full items-center gap-2 rounded-xl border bg-ink-900 px-3.5 py-2.5 text-left text-sm outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          open ? "border-white/40" : "border-white/10 hover:border-white/25"
        )}
      >
        {selected ? (
          <span className="min-w-0 flex-1 truncate font-medium text-white">{selected.label}</span>
        ) : (
          <span className="min-w-0 flex-1 truncate text-ink-300">{placeholder ?? t("common.select")}</span>
        )}
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-ink-300 transition-transform duration-200", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            id={listId}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "absolute z-50 mt-2 max-w-[min(320px,80vw)] overflow-hidden rounded-2xl border border-white/15 bg-ink-900 shadow-2xl shadow-black/60",
              "w-[max(100%,220px)]",
              align === "right" ? "right-0" : "left-0"
            )}
          >
            {searchable && (
              <div className="border-b border-white/10 px-3.5 py-2.5">
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setHi(0); }}
                  onKeyDown={onKey}
                  placeholder={t("common.search")}
                  className="w-full bg-transparent text-sm outline-none placeholder:text-ink-400"
                />
              </div>
            )}
            <div
              ref={listRef}
              className="max-h-56 overflow-y-auto p-1.5"
              onKeyDown={searchable ? undefined : onKey}
              tabIndex={-1}
            >
              {list.length > 0 ? (
                list.map((o, i) => (
                  <button
                    key={o.value}
                    type="button"
                    role="option"
                    aria-selected={o.value === value}
                    onClick={() => pick(o.value)}
                    onMouseEnter={() => setHi(i)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors",
                      i === hi ? "bg-white/10 text-white" : "text-ink-100 hover:bg-white/5"
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{o.label}</span>
                      {o.hint && <span className="block truncate text-[10px] text-ink-300">{o.hint}</span>}
                    </span>
                    {o.value === value && (
                      <motion.span
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 26 }}
                        className="grid h-4 w-4 shrink-0 place-items-center"
                      >
                        <Check className="h-4 w-4 text-white" />
                      </motion.span>
                    )}
                  </button>
                ))
              ) : (
                <p className="px-3 py-6 text-center text-xs text-ink-300">{t("common.notFound")}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* Channel-typed variant: adds the # prefix and optional search. */
export function ChannelPicker({
  channels,
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: {
  channels: { id: string; name: string }[] | null | undefined;
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <FancySelect
      className={className}
      searchable={(channels?.length ?? 0) > 12}
      disabled={disabled}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      options={(channels ?? []).map((c) => ({ value: c.id, label: `#${c.name}` }))}
    />
  );
}
