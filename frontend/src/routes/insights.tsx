import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, ChevronDown, Pause, Play } from "lucide-react";

import { Reveal } from "@/components/motion/reveal";
import { Tilt } from "@/components/motion/tilt";
import { Button } from "@/components/ui/button";
import { usePrefersReducedMotion } from "@/hooks/use-motion";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "Model Insights — ChurnSense" },
      {
        name: "description",
        content:
          "Key telecom churn drivers, how the ChurnSense scikit-learn pipeline preprocesses inputs, and practical retention takeaways.",
      },
      { property: "og:title", content: "Model Insights — ChurnSense" },
      {
        property: "og:description",
        content: "Churn drivers, preprocessing pipeline and retention takeaways behind ChurnSense.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Insights,
});

const DRIVERS = [
  {
    title: "Short tenure",
    body: "Customers in their first months have the weakest attachment. Churn risk drops steadily as tenure grows.",
    level: "Strong",
    lever:
      "Run a structured first-90-days programme: welcome call, usage tips and a check-in before month three.",
  },
  {
    title: "Month-to-month contracts",
    body: "No commitment means switching costs are low. This is typically the single strongest predictor of churn.",
    level: "Strong",
    lever: "Offer a locked rate or a free month for moving to a one- or two-year plan.",
  },
  {
    title: "Higher monthly charges",
    body: "Bills above roughly $70/month raise price sensitivity, especially for newer customers.",
    level: "Moderate",
    lever: "Review usage and right-size the plan before the customer starts comparing competitors.",
  },
  {
    title: "Fiber optic without tech support",
    body: "Premium service plus unresolved technical friction is a common pattern among customers who leave.",
    level: "Moderate",
    lever: "Bundle a tech support trial into fiber installs and follow up after the first week.",
  },
] as const;

const PIPELINE = [
  {
    file: "Input",
    title: "Single-row DataFrame",
    body: "The JSON profile becomes one pandas row. tenure, MonthlyCharges and TotalCharges are safely coerced to numbers.",
    preview: [
      ["tenure", "6"],
      ["MonthlyCharges", "79.85"],
      ["TotalCharges", "479.10"],
      ["Contract", "Month-to-month"],
      ["InternetService", "Fiber optic"],
    ],
  },
  {
    file: "pd.get_dummies",
    title: "One-hot encoding",
    body: "Categorical fields like Contract and PaymentMethod expand into indicator columns, e.g. Contract_Two year.",
    preview: [
      ["Contract_Month-to-month", "1"],
      ["InternetService_Fiber optic", "1"],
      ["PaymentMethod_Electronic check", "1"],
      ["TechSupport_No", "1"],
    ],
  },
  {
    file: "feature_columns.pkl",
    title: "Column alignment",
    body: "A single row only produces the dummies it contains, so it is reindexed to the exact training columns with missing ones filled as 0.",
    preview: [
      ["Contract_One year", "0"],
      ["Contract_Two year", "0"],
      ["InternetService_DSL", "0"],
      ["PaymentMethod_Mailed check", "0"],
      ["…all training columns", "✓"],
    ],
  },
  {
    file: "scaler.pkl",
    title: "Numeric scaling",
    body: "The fitted scaler standardises numeric columns with the same mean and variance used during training.",
    preview: [
      ["tenure", "−1.03"],
      ["MonthlyCharges", "0.50"],
      ["TotalCharges", "−0.80"],
    ],
  },
  {
    file: "churnsense_model.pkl",
    title: "Prediction",
    body: "The classifier returns a 0/1 churn label and, through predict_proba, the probability of churn.",
    preview: [
      ["prediction", "1"],
      ["churn_probability", "71.2"],
    ],
  },
] as const;

const TAKEAWAYS = [
  "Target month-to-month customers in their first year with contract upgrade offers.",
  "Bundle tech support into fiber plans or offer a free trial during onboarding.",
  "Nudge electronic-check payers toward autopay — it removes a monthly decision point.",
  "Review plans for high-bill customers before they start comparing competitors.",
] as const;

function Insights() {
  return (
    <div className="mx-auto max-w-6xl px-5 pt-14">
      <header className="max-w-2xl">
        <p className="eyebrow">Model insights</p>
        <h1 className="mt-4 font-display text-4xl font-medium tracking-tight md:text-5xl">
          What drives churn, and how the model sees it.
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          The patterns below are well established in telecom churn data and shape how ChurnSense
          scores each customer.
        </p>
      </header>

      <section className="mt-12">
        <h2 className="text-sm font-semibold">Key churn drivers</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          {DRIVERS.map((d, i) => (
            <Reveal key={d.title} delay={i * 60} className="h-full">
              <DriverCard driver={d} />
            </Reveal>
          ))}
        </div>
      </section>

      <Reveal>
        <Pipeline />
      </Reveal>

      <Reveal>
        <section className="mt-16 grid gap-8 rounded-2xl border border-risk-low/20 bg-risk-low-soft p-8 md:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="font-display text-2xl font-medium">Practical retention takeaways</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Put the model to work on the customers who matter most.
            </p>
            <Button asChild className="group/cta mt-6">
              <Link to="/predictor">
                Score a customer{" "}
                <ArrowRight className="transition-transform duration-200 ease-out group-hover/cta:translate-x-0.5" />
              </Link>
            </Button>
          </div>
          <ul className="space-y-1">
            {TAKEAWAYS.map((t, i) => (
              <li
                key={t}
                className="group -mx-3 flex gap-3 rounded-lg px-3 py-2 text-sm leading-relaxed transition-soft hover:translate-x-1 hover:bg-card/70"
              >
                <span className="mt-0.5 font-mono text-xs text-risk-low">0{i + 1}</span>
                {t}
              </li>
            ))}
          </ul>
        </section>
      </Reveal>
    </div>
  );
}

function DriverCard({ driver }: { driver: (typeof DRIVERS)[number] }) {
  const [open, setOpen] = useState(false);
  return (
    <Tilt className="h-full">
      <article className="surface-card hover-lift flex h-full flex-col p-6">
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-display text-xl font-medium">{driver.title}</h3>
          <span className="shrink-0 rounded-full bg-risk-high-soft px-2.5 py-1 text-xs font-medium text-risk-high">
            {driver.level} signal
          </span>
        </div>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{driver.body}</p>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="relative z-10 mt-4 flex items-center gap-1 self-start text-sm font-medium text-foreground/80 transition-soft hover:text-foreground"
        >
          Retention lever
          <ChevronDown
            className={cn(
              "size-4 transition-transform duration-200 ease-out",
              open && "rotate-180",
            )}
          />
        </button>
        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-[250ms] ease-out",
            open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="overflow-hidden" inert={!open}>
            <p className="mt-3 rounded-lg border-l-2 border-risk-low bg-risk-low-soft px-3 py-2 text-sm leading-relaxed">
              {driver.lever}
            </p>
          </div>
        </div>
      </article>
    </Tilt>
  );
}

function Pipeline() {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const reduced = usePrefersReducedMotion();
  const step = PIPELINE[active] ?? PIPELINE[0];

  useEffect(() => {
    if (!playing) return;
    const t = window.setTimeout(
      () => {
        if (active >= PIPELINE.length - 1) setPlaying(false);
        else setActive((a) => a + 1);
      },
      reduced ? 2000 : 1400,
    );
    return () => window.clearTimeout(t);
  }, [playing, active, reduced]);

  const togglePlay = () => {
    if (!playing && active >= PIPELINE.length - 1) setActive(0);
    setPlaying((p) => !p);
  };

  return (
    <section id="pipeline" className="mt-16 scroll-mt-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">How a single profile is preprocessed</h2>
        <Button variant="outline" size="sm" onClick={togglePlay}>
          {playing ? <Pause /> : <Play />}
          {playing ? "Pause walkthrough" : "Play walkthrough"}
        </Button>
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <ol className="surface-card divide-y divide-border overflow-hidden">
          {PIPELINE.map((p, i) => {
            const isActive = i === active;
            return (
              <li key={p.title}>
                <button
                  type="button"
                  onClick={() => {
                    setActive(i);
                    setPlaying(false);
                  }}
                  aria-current={isActive ? "step" : undefined}
                  className={cn(
                    "group relative grid w-full gap-2 p-5 text-left transition-soft hover:bg-background focus-visible:bg-background focus-visible:outline-none md:grid-cols-[2.5rem_12rem_1fr] md:gap-5",
                    isActive && "bg-background",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-y-0 left-0 w-0.5 origin-top bg-risk-low transition-transform duration-[250ms] ease-out",
                      isActive ? "scale-y-100" : "scale-y-0 group-hover:scale-y-50",
                    )}
                  />
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full border font-mono text-[0.6875rem] transition-soft",
                      isActive
                        ? "border-risk-low bg-risk-low text-primary-foreground"
                        : i < active
                          ? "border-risk-low/40 text-risk-low"
                          : "border-border text-subtle group-hover:text-foreground",
                    )}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-semibold">{p.title}</p>
                    <code
                      className={cn(
                        "mt-1 inline-block rounded-md px-2 py-0.5 font-mono text-xs transition-soft",
                        isActive ? "bg-card shadow-card" : "bg-secondary",
                      )}
                    >
                      {p.file}
                    </code>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{p.body}</p>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="surface-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <span className="eyebrow">Row preview</span>
              <span className="font-mono text-xs text-muted-foreground">
                step {active + 1}/{PIPELINE.length}
              </span>
            </div>
            <div className="h-0.5 bg-secondary">
              <div
                className="h-full bg-risk-low transition-[width] duration-[250ms] ease-out"
                style={{ width: `${((active + 1) / PIPELINE.length) * 100}%` }}
              />
            </div>
            <div key={active} className="p-5">
              <p className="animate-enter font-mono text-xs text-risk-low">{step.file}</p>
              <dl className="mt-3 space-y-1.5">
                {step.preview.map(([k, v], i) => (
                  <div
                    key={k}
                    className="animate-enter flex items-center justify-between gap-4 rounded-md bg-background px-3 py-2 font-mono text-xs"
                    style={{ animationDelay: `${40 + i * 40}ms` }}
                  >
                    <dt className="truncate text-muted-foreground">{k}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-[0.6875rem] text-subtle">
                Illustrative values for the default profile.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}