import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { profileSignals, type CustomerProfile } from "@/lib/churn";
import { cn } from "@/lib/utils";

export function SignalStrip({ profile }: { profile: CustomerProfile | null }) {
  const signals = profile ? profileSignals(profile) : [];
  const up = signals.filter((s) => s.direction === "up").length;
  const down = signals.length - up;
  const upShare = signals.length ? (up / signals.length) * 100 : 50;

  return (
    <div className="mt-6 rounded-lg border border-border bg-background/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="eyebrow">Live risk signals</p>
        <span className="font-mono text-[0.6875rem] text-muted-foreground">
          <span className="text-risk-high">{up} raising</span> ·{" "}
          <span className="text-risk-low">{down} lowering</span>
        </span>
      </div>
      <div className="mt-3 flex h-1 overflow-hidden rounded-full bg-secondary" aria-hidden>
        <div
          className="h-full bg-risk-high transition-[width] duration-[250ms] ease-out"
          style={{ width: `${signals.length ? upShare : 0}%` }}
        />
        <div
          className="h-full bg-risk-low transition-[width] duration-[250ms] ease-out"
          style={{ width: `${signals.length ? 100 - upShare : 0}%` }}
        />
      </div>
      <ul className="mt-3 flex min-h-7 flex-wrap gap-1.5" aria-live="polite">
        {signals.length === 0 && (
          <li className="text-xs text-muted-foreground">
            No strong churn drivers in this profile.
          </li>
        )}
        {signals.map((s) => (
          <li
            key={s.label}
            className={cn(
              "animate-pop flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-soft hover:-translate-y-px",
              s.direction === "up"
                ? "bg-risk-high-soft text-risk-high"
                : "bg-risk-low-soft text-risk-low",
            )}
          >
            {s.direction === "up" ? (
              <ArrowUpRight className="size-3" />
            ) : (
              <ArrowDownRight className="size-3" />
            )}
            {s.label}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[0.6875rem] text-subtle">
        General telecom churn patterns — the model makes the final call.
      </p>
    </div>
  );
}