import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ClipboardList, SlidersHorizontal, ShieldCheck } from "lucide-react";

import { Reveal, useInView } from "@/components/motion/reveal";
import { Tilt } from "@/components/motion/tilt";
import { HeroSpecimen } from "@/components/overview/hero-specimen";
import { useCountUp } from "@/hooks/use-motion";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ChurnSense — Know which customers are about to leave" },
      {
        name: "description",
        content:
          "ChurnSense scores telecom customer profiles for churn risk and turns each result into a retention action plan.",
      },
      { property: "og:title", content: "ChurnSense — Know which customers are about to leave" },
      {
        property: "og:description",
        content:
          "Score telecom customer profiles for churn risk and get a tailored retention action plan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Overview,
});

const STEPS = [
  {
    n: "01",
    icon: ClipboardList,
    title: "Customer Profile Input",
    body: "Enter tenure, charges, contract, internet service, payment method and support details for a single customer.",
    tag: null,
  },
  {
    n: "02",
    icon: SlidersHorizontal,
    title: "Preprocessing & Feature Alignment",
    body: "Categories are one-hot encoded, aligned to the training columns, and numeric values are standardised.",
    tag: [
      {
        file: "scaler.pkl",
        tip: "Fitted scaler that standardises tenure, MonthlyCharges and TotalCharges.",
      },
      {
        file: "feature_columns.pkl",
        tip: "Ordered training columns used to align one-hot encoded features.",
      },
    ],
  },
  {
    n: "03",
    icon: ShieldCheck,
    title: "Churn Risk & Retention Guidance",
    body: "The trained classifier returns a churn prediction and probability, paired with a tailored retention plan.",
    tag: [
      {
        file: "churnsense_model.pkl",
        tip: "Trained classifier that returns the churn label and probability.",
      },
    ],
  },
] as const;

function Overview() {
  return (
    <div className="mx-auto max-w-6xl px-5">
      <section className="grid items-center gap-12 pb-16 pt-16 md:grid-cols-[1.25fr_1fr] md:pt-24">
        <div>
          <p className="eyebrow">Telecom customer churn prediction</p>
          <h1 className="mt-5 font-display text-5xl font-medium leading-[1.05] tracking-tight md:text-6xl">
            <Words text="Know which customers are" start={0} />{" "}
            <em className="group/em relative inline-block font-normal text-risk-high">
              <Words text="about to leave" start={4} />
              <span
                aria-hidden
                className="animate-timer absolute -bottom-1 left-0 h-0.5 w-full rounded-full bg-risk-high/40 [--timer:700ms]"
                style={{ animationDelay: "500ms" }}
              />
            </em>{" "}
            <Words text="— and how to keep them." start={7} />
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            ChurnSense scores a customer profile with a trained machine-learning model, estimates
            the probability of churn, and turns the result into a clear retention action plan.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="group/cta">
              <Link to="/predictor">
                Go to Churn Predictor{" "}
                <ArrowRight className="transition-transform duration-200 ease-out group-hover/cta:translate-x-0.5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link to="/insights">How the model works</Link>
            </Button>
          </div>
        </div>

        <HeroSpecimen />
      </section>

      <StatsStrip />

      <section className="pt-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-3xl font-medium tracking-tight">How it works</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Three steps from a raw customer profile to an actionable retention decision.
          </p>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <Reveal key={step.n} delay={i * 70} className="h-full">
              <Tilt className="h-full">
                <article
                  tabIndex={0}
                  className="group surface-card hover-lift relative flex h-full flex-col overflow-hidden p-6"
                >
                  <span
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-risk-high transition-transform duration-[250ms] ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100"
                  />
                  <div className="flex items-center justify-between">
                    <span className="flex size-10 items-center justify-center rounded-lg bg-secondary transition-soft group-hover:bg-primary group-hover:text-primary-foreground group-focus-visible:bg-primary group-focus-visible:text-primary-foreground">
                      <step.icon className="size-5 transition-transform duration-200 ease-out group-hover:-rotate-6" />
                    </span>
                    <span className="font-mono text-xs text-subtle transition-soft group-hover:text-foreground">
                      {step.n}
                    </span>
                  </div>
                  <h3 className="mt-6 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                  {step.tag && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {step.tag.map((t) => (
                        <Tooltip key={t.file}>
                          <TooltipTrigger asChild>
                            <Link
                              to="/insights"
                              hash="pipeline"
                              className="rounded-md border border-border bg-background px-2 py-1 font-mono text-xs transition-soft hover:-translate-y-0.5 hover:border-foreground/40 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                            >
                              {t.file}
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-56 leading-relaxed">
                            {t.tip}
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  )}
                  {!step.tag && (
                    <Link
                      to="/predictor"
                      className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-foreground/80 transition-soft hover:text-foreground"
                    >
                      Open the form
                      <ArrowRight className="size-3.5 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
                    </Link>
                  )}
                </article>
              </Tilt>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}

function Words({ text, start }: { text: string; start: number }) {
  return (
    <>
      {text.split(" ").map((word, i) => (
        <span key={`${word}-${i}`}>
          {i > 0 && " "}
          <span
            className="animate-enter inline-block"
            style={{ animationDelay: `${(start + i) * 45}ms` }}
          >
            {word}
          </span>
        </span>
      ))}
    </>
  );
}

const STATS = [
  { value: 9, label: "customer inputs", note: "billing, contract & service" },
  { value: 3, label: "model artifacts", note: "model, scaler, columns" },
  { value: 2, label: "risk outcomes", note: "likely to churn or stay" },
  { value: 1, label: "request to /predict", note: "single-row scoring" },
] as const;

function StatsStrip() {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className="grid grid-cols-2 divide-border border-y border-border md:grid-cols-4 md:divide-x"
    >
      {STATS.map((s, i) => (
        <Stat key={s.label} {...s} active={inView} delay={i * 70} />
      ))}
    </div>
  );
}

function Stat({
  value,
  label,
  note,
  active,
  delay,
}: {
  value: number;
  label: string;
  note: string;
  active: boolean;
  delay: number;
}) {
  const n = useCountUp(active ? value : 0, 250, 0);
  return (
    <div
      className={`group px-5 py-6 transition-soft hover:bg-card ${active ? "reveal reveal-in" : "reveal"}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <p className="font-display text-4xl font-medium tabular-nums transition-transform duration-200 ease-out group-hover:-translate-y-0.5">
        {Math.round(n)}
      </p>
      <p className="mt-1 text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{note}</p>
    </div>
  );
}