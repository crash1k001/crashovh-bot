import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Lang } from "./i18n";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(".0", "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(".0", "") + "K";
  return String(n);
}

/* Short "time ago" label. Locale-aware: pass the active language from useI18n
 * so the English UI never shows Russian unit words. */
export function timeAgo(ts: number, lang: Lang = "ru"): string {
  const diff = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  const en = lang === "en";
  if (diff < 60) return en ? `${diff}s ago` : `${diff}с назад`;
  if (diff < 3600) return en ? `${Math.floor(diff / 60)} min ago` : `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return en ? `${Math.floor(diff / 3600)} h ago` : `${Math.floor(diff / 3600)} ч назад`;
  return en ? `${Math.floor(diff / 86400)} d ago` : `${Math.floor(diff / 86400)} дн назад`;
}
