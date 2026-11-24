import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Check,
  Copy,
  History,
  RotateCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useCountUp } from "@/hooks/use-motion";
import {
  buildRetentionPlan,
  riskLabel,
  type CustomerProfile,
  type PredictionResult,
} from "@/lib/churn";
import { cn } from "@/lib/utils";

export type ResultSource = { kind: "live" } | { kind: "history"; timestamp: string };

interface Props {
  status: "idle" | "loading" | "error" | "success";
  error: string | null;
  result: PredictionResult | null;
  profile: CustomerProfile | null;
  source: ResultSource;
  previousProbability: number | null;
  stale: boolean;
  onRetry: () => void;
}

const LOADING_STEPS = [
  "Building the profile row",
  "Aligning feature columns",
  "Scaling numeric values",
  "Scoring with the model",
];

export function ResultPanel(props: Props) {
  const { status, error, result, profile } = props;

  if (status === "loading") return <LoadingState />;

  if (status === "error" && error) {
    return (
      <div role="alert" className="surface-card animate-enter border-risk-high/30 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-risk-high" />
          <div className="flex-1">
            <p className="font-semibold">Prediction unavailable</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={props.onRetry}>
              <RotateCw /> Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (status !== "success" || !result || !profile) {
    return (
      <div className="group flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border p-8 text-center transition-soft hover:border-subtle">
        <Sparkles className="size-5 text-subtle transition-transform duration-200 ease-out group-hover:rotate-12 group-hover:scale-110" />
        <p className="max-w-xs text-sm text-muted-foreground">
          Fill in the customer profile and select{" "}
          <span className="font-medium text-foreground">Predict Churn Risk</span> to see the result
          here.
        </p>
      </div>
    );
  }

  return <ResultView {...props} result={result} profile={profile} />;
}

function LoadingState() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = window.setInterval(
      () => setStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)),
      350,
    );
    return () => window.clearInterval(t);
  }, []);

  return (
    <div className="surface-card animate-enter p-6" aria-busy="true">
      <p className="eyebrow">Scoring customer…</p>
      <div className="animate-shimmer mt-4 h-7 w-3/4 rounded-md" />
      <div className="mt-6 flex items-baseline justify-between">
        <div className="animate-shimmer h-4 w-28 rounded" />
        <div className="animate-shimmer h-9 w-20 rounded-md" />
      </div>
      <div className="animate-shimmer mt-3 h-2.5 rounded-full" />
      <ol className="mt-6 space-y-2 border-t border-border pt-5">
        {LOADING_STEPS.map((label, i) => (
          <li
            key={label}
            className={cn(
              "flex items-center gap-2.5 text-sm transition-soft",
              i < step ? "text-muted-foreground" : i === step ? "text-foreground" : "text-subtle",
            )}
          >
            <span
              className={cn(
                "flex size-4 items-center justify-center rounded-full border transition-soft",
                i < step ? "border-risk-low bg-risk-low text-primary-foreground" : "border-border",
                i === step && "border-foreground",
              )}
            >
              {i < step && <Check className="size-2.5" />}
              {i === step && <span className="size-1.5 animate-pulse rounded-full bg-foreground" />}
            </span>
            {label}
          </li>
        ))}
      </ol>
    </div>
  );
}

function ResultView({
  result,
  profile,
  source,
  previousProbability,
  stale,
}: Props & { result: PredictionResult; profile: CustomerProfile }) {
  const high = result.prediction === 1;
  const plan = buildRetentionPlan(profile, result.prediction);
  const [copied, setCopied] = useState(false);

  const copyPlan = async () => {
    const text = [
      `${riskLabel(result.prediction)}${result.churn_probability !== null ? ` — ${result.churn_probability.toFixed(1)}%` : ""}`,
      plan.headline,
      ...plan.actions.map((a, i) => `${i + 1}. ${a.title}: ${a.detail}`),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Retention plan copied");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy to the clipboard");
    }
  };

  return (
    <div className={cn("space-y-5 transition-opacity duration-200", stale && "opacity-60")}>
      {(stale || source.kind === "history") && (
        <p className="animate-enter flex items-center gap-2 text-xs text-muted-foreground">
          <History className="size-3.5" />
          {stale || source.kind !== "history"
            ? "Profile edited — predict again to refresh this result."
            : `Restored from history · ${new Date(source.timestamp).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`}
        </p>
      )}
      <div
        className={cn(
          "animate-pop rounded-xl border p-6 shadow-card",
          high ? "border-risk-high/25 bg-risk-high-soft" : "border-risk-low/25 bg-risk-low-soft",
        )}
      >
        <div className="flex items-center justify-between">
          <p className="eyebrow">Prediction</p>
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-xs font-medium",
              high ? "text-risk-high" : "text-risk-low",
            )}
          >
            <span className="relative flex size-2">
              <span
                className={cn(
                  "absolute inset-0 animate-ping rounded-full opacity-50 [animation-iteration-count:2]",
                  high ? "bg-risk-high" : "bg-risk-low",
                )}
              />
              <span
                className={cn(
                  "relative size-2 rounded-full",
                  high ? "bg-risk-high" : "bg-risk-low",
                )}
              />
            </span>
            {high ? "Act now" : "Stable"}
          </span>
        </div>
        <p
          className={cn(
            "animate-enter mt-3 font-display text-2xl font-medium leading-snug",
            high ? "text-risk-high" : "text-risk-low",
          )}
          style={{ animationDelay: "60ms" }}
        >
          {riskLabel(result.prediction)}
        </p>
        {result.churn_probability !== null && (
          <ProbabilityBar
            value={result.churn_probability}
            high={high}
            previous={source.kind === "live" ? previousProbability : null}
          />
        )}
      </div>

      <div className="surface-card animate-enter p-6" style={{ animationDelay: "100ms" }}>
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow">Retention Action Plan</p>
          <Button variant="ghost" size="sm" onClick={copyPlan} aria-label="Copy retention plan">
            {copied ? <Check className="text-risk-low" /> : <Copy />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <p className="mt-3 text-sm font-medium">{plan.headline}</p>
        <ol className="mt-4 space-y-1">
          {plan.actions.map((action, i) => (
            <li
              key={action.title}
              className="animate-enter group -mx-2 flex gap-3 rounded-lg p-2 transition-soft hover:bg-background"
              style={{ animationDelay: `${140 + i * 50}ms` }}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-xs transition-soft group-hover:scale-110",
                  high ? "bg-risk-high-soft text-risk-high" : "bg-risk-low-soft text-risk-low",
                )}
              >
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-semibold">{action.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                  {action.detail}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function ProbabilityBar({
  value,
  high,
  previous,
}: {
  value: number;
  high: boolean;
  previous: number | null;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const [width, setWidth] = useState(0);
  const shown = useCountUp(clamped, 250, 0);
  const delta = previous !== null ? Math.round((clamped - previous) * 10) / 10 : null;

  useEffect(() => {
    const id = requestAnimationFrame(() => setWidth(clamped));
    return () => cancelAnimationFrame(id);
  }, [clamped]);

  return (
    <div className="mt-6">
      <div className="flex items-center gap-4">
        <Gauge value={width} high={high} />
        <div className="flex flex-1 items-baseline justify-between gap-3">
          <span className="text-sm text-muted-foreground">Churn probability</span>
          <span className="font-display text-4xl font-medium tabular-nums">
            {shown.toFixed(1)}%
          </span>
        </div>
      </div>
      <div
        className="relative mt-3 h-2.5 overflow-hidden rounded-full bg-card"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Churn probability"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-[250ms] ease-out",
            high ? "bg-risk-high" : "bg-risk-low",
          )}
          style={{ width: `${width}%` }}
        />
        <span className="absolute inset-y-0 left-1/2 w-px bg-foreground/15" aria-hidden />
      </div>
      <div className="mt-2 flex items-center justify-between font-mono text-[0.6875rem] text-muted-foreground">
        <span>0</span>
        <span>50 · threshold</span>
        <span>100</span>
      </div>
      {delta !== null && delta !== 0 && (
        <p
          className="animate-enter mt-3 flex items-center gap-1 text-xs text-muted-foreground"
          style={{ animationDelay: "200ms" }}
        >
          {delta > 0 ? (
            <ArrowUpRight className="size-3.5 text-risk-high" />
          ) : (
            <ArrowDownRight className="size-3.5 text-risk-low" />
          )}
          <span className="font-medium text-foreground">{Math.abs(delta).toFixed(1)} pts</span>
          {delta > 0 ? "higher" : "lower"} than the previous check
        </p>
      )}
    </div>
  );
}

function Gauge({ value, high }: { value: number; high: boolean }) {
  // Needle angle: -90deg at 0%, +90deg at 100%.
  const angle = -90 + (value / 100) * 180;
  return (
    <svg viewBox="0 0 100 56" className="w-20 shrink-0" aria-hidden>
      <path
        d="M10 50 A40 40 0 0 1 90 50"
        fill="none"
        className="stroke-card"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M10 50 A40 40 0 0 1 90 50"
        fill="none"
        pathLength={100}
        strokeDasharray="100"
        strokeDashoffset={100 - value}
        strokeWidth="8"
        strokeLinecap="round"
        className={cn(
          "transition-[stroke-dashoffset] duration-[250ms] ease-out",
          high ? "stroke-risk-high" : "stroke-risk-low",
        )}
      />
      <g
        className="transition-transform duration-[250ms] ease-out"
        style={{ transform: `rotate(${angle}deg)`, transformOrigin: "50px 50px" }}
      >
        <line
          x1="50"
          y1="50"
          x2="50"
          y2="18"
          className="stroke-foreground"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
      <circle cx="50" cy="50" r="3.5" className="fill-foreground" />
    </svg>
  );
}