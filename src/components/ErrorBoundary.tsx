import { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCw, Home } from "lucide-react";
import { useI18n, type TKey } from "@/lib/i18n";

type Props = { children: ReactNode; t: (k: TKey) => string };
type State = { error: Error | null };

/**
 * Keeps the app from turning into a blank page when a component throws.
 * Shows the real message plus a reload button instead of disappearing content.
 * Copy follows the active language (the class takes `t` from the wrapper below).
 */
class ErrorBoundaryInner extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[Niko dashboard] render error:", error);
  }

  render() {
    const { error } = this.state;
    const { t } = this.props;
    if (!error) return this.props.children;

    return (
      <div className="grid min-h-screen place-items-center bg-ink-950 px-6 text-center text-white">
        <div className="max-w-md rounded-3xl border border-white/15 bg-ink-900 p-8">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-white/15 bg-ink-800">
            <AlertTriangle className="h-5 w-5 text-ink-200" />
          </div>
          <p className="font-display text-xl font-bold">{t("err.title")}</p>
          <p className="mt-2 text-sm text-ink-300">{t("err.body")}</p>
          <pre className="mt-4 max-h-32 overflow-auto rounded-xl border border-white/10 bg-ink-850 p-3 text-left font-mono text-[11px] text-ink-200">
            {error.message}
          </pre>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-black transition-transform hover:scale-[1.03]"
            >
              <RotateCw className="h-4 w-4" /> {t("err.reload")}
            </button>
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-5 py-2.5 text-sm font-bold transition-colors hover:border-white/50 hover:bg-white/5"
            >
              <Home className="h-4 w-4" /> {t("err.home")}
            </a>
          </div>
        </div>
      </div>
    );
  }
}

export default function ErrorBoundary({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return <ErrorBoundaryInner t={t}>{children}</ErrorBoundaryInner>;
}
