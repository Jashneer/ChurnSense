import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { Tilt } from "@/components/motion/tilt";
import { useCountUp } from "@/hooks/use-motion";
import { cn } from "@/lib/utils";

const SCENARIOS = [
  {
    id: "C-2041",
    tab: "New fiber",
    high: true,
    label: "High Churn Risk",
    traits: "Month-to-month · Fiber optic · 2 months",
    probability: 82.4,
    actions: ["Offer a one-year contract incentive", "Proactive tech support onboarding"],
  },
  {
    id: "C-1187",
    tab: "Mid-tenure",
    high: false,
    label: "Low Churn Risk",
    traits: "One year · DSL · 18 months",
    probability: 27.3,
    actions: ["Soft upsell to a two-year plan", "Suggest autopay convenience"],
  },
  {
    id: "C-0532",
    tab: "Loyal",
    high: false,
    label: "Low Churn Risk",
    traits: "Two year · DSL · 60 months",
    probability: 6.1,
    actions: ["Recognise loyalty with an anniversary perk", "Keep engagement steady"],
  },
] as const;

/** How long each scenario stays on screen before the next one slides in. */
export const HERO_CYCLE_MS = 3500;

export function HeroSpecimen() {
  const [index, setIndex] = useState(0);
  const s = SCENARIOS[index] ?? SCENARIOS[0];
  const prob = useCountUp(s.probability, 250);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);

  // Scenarios advance on their own, forever. Picking one restarts the timer from there.
  useEffect(() => {
    const t = window.setTimeout(() => setIndex((i) => (i + 1) % SCENARIOS.length), HERO_CYCLE_MS);
    return () => window.clearTimeout(t);
  }, [index]);

  useLayoutEffect(() => {
    const el = tabRefs.current[index];
    if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth });
  }, [index]);

  const choose = (i: number) => setIndex((i + SCENARIOS.length) % SCENARIOS.length);

  return (
    <div className="relative animate-enter" style={{ animationDelay: "120ms" }}>
      <div
        role="tablist"
        aria-label="Sample customer scenarios"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") choose(index + 1);
          if (e.key === "ArrowLeft") choose(index - 1);
        }}
        className="relative mb-3 inline-flex rounded-full border border-border bg-card p-1 shadow-card"
      >
        {pill && (
          <span
            aria-hidden
            className="absolute top-1 bottom-1 rounded-full bg-secondary transition-[left,width] duration-[250ms] ease-out"
            style={{ left: pill.left, width: pill.width }}
          />
        )}
        {SCENARIOS.map((sc, i) => (
          <button
            key={sc.id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={i === index}
            onClick={() => choose(i)}
            className={cn(
              "relative z-10 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              i === index ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              i === index && !pill && "bg-secondary",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full transition-soft",
                sc.high ? "bg-risk-high" : "bg-risk-low",
                i === index ? "scale-125" : "opacity-60",
              )}
            />
            {sc.tab}
          </button>
        ))}
      </div>

      <Tilt max={5}>
        <div className="surface-card overflow-hidden p-6 shadow-lift" aria-live="polite">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Sample result</span>
            <span key={s.id} className="animate-slide-in font-mono text-xs text-subtle">
              #{s.id}
            </span>
          </div>
          <div key={`h-${s.id}`} className="animate-slide-in">
            <p
              className={cn(
                "mt-5 font-display text-2xl font-medium",
                s.high ? "text-risk-high" : "text-risk-low",
              )}
            >
              {s.label}
            </p>
            <p className="text-sm text-muted-foreground">{s.traits}</p>
          </div>
          <div className="mt-6 flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Churn probability</span>
            <span className="font-display text-3xl font-medium tabular-nums">
              {prob.toFixed(1)}%
            </span>
          </div>
          <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className={cn(
                "h-full rounded-full transition-[width,background-color] duration-[250ms] ease-out",
                s.high ? "bg-risk-high" : "bg-risk-low",
              )}
              style={{ width: `${s.probability}%` }}
            />
            <span className="absolute inset-y-0 left-1/2 w-px bg-border" aria-hidden />
          </div>
          <ul key={`a-${s.id}`} className="mt-6 space-y-2 border-t border-border pt-5 text-sm">
            {s.actions.map((a, i) => (
              <li
                key={a}
                className="animate-slide-in flex gap-2"
                style={{ animationDelay: `${60 + i * 50}ms` }}
              >
                <span
                  className={cn(
                    "mt-1.5 size-1.5 shrink-0 rounded-full",
                    s.high ? "bg-risk-high" : "bg-risk-low",
                  )}
                />
                {a}
              </li>
            ))}
          </ul>
        </div>
      </Tilt>

      <div className="surface-card absolute -bottom-12 -left-6 hidden w-44 flex-col gap-2 px-4 py-3 shadow-lift md:flex">
        <span className="text-xs">
          <span className="font-semibold">
            Scenario {index + 1} of {SCENARIOS.length}
          </span>
          <span className="text-muted-foreground"> · auto</span>
        </span>
        <div className="flex gap-1">
          {SCENARIOS.map((sc, i) => (
            <div key={sc.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-secondary">
              {i < index && <div className="h-full bg-foreground/60" />}
              {i === index && (
                <div
                  key={index}
                  className="animate-timer h-full bg-foreground/60"
                  style={{ ["--timer" as string]: `${HERO_CYCLE_MS}ms` }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}