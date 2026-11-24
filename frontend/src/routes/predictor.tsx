import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Calculator, Flame, Leaf, Loader2, Minus, Plus, RotateCcw, Server } from "lucide-react";
import { toast } from "sonner";

import { HistoryLog } from "@/components/churn/history-log";
import { ResultPanel, type ResultSource } from "@/components/churn/result-panel";
import { SignalStrip } from "@/components/churn/signal-strip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CONTRACT_OPTIONS,
  DEFAULT_API_BASE_URL,
  DEFAULT_PROFILE,
  HIGH_RISK_SAMPLE,
  INTERNET_OPTIONS,
  LOW_RISK_SAMPLE,
  PAPERLESS_OPTIONS,
  PAYMENT_OPTIONS,
  TECH_SUPPORT_OPTIONS,
  addHistoryEntry,
  changedFields,
  loadHistory,
  predictUrl,
  removeHistoryEntry,
  requestPrediction,
  sameProfile,
  saveHistory,
  type CustomerProfile,
  type HistoryEntry,
  type PredictionResult,
} from "@/lib/churn";

export const Route = createFileRoute("/predictor")({
  head: () => ({
    meta: [
      { title: "Churn Predictor — ChurnSense" },
      {
        name: "description",
        content:
          "Enter a telecom customer profile to predict churn risk, see the churn probability and get a retention action plan.",
      },
      { property: "og:title", content: "Churn Predictor — ChurnSense" },
      {
        property: "og:description",
        content: "Predict a customer's churn risk and get a tailored retention action plan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Predictor,
});

const API_URL_KEY = "churnsense-api-url";

type FormState = Omit<CustomerProfile, "tenure" | "MonthlyCharges" | "TotalCharges"> & {
  tenure: string;
  MonthlyCharges: string;
  TotalCharges: string;
};

type Tone = "high" | "low" | "neutral";

const toForm = (p: CustomerProfile): FormState => ({
  ...p,
  tenure: String(p.tenure),
  MonthlyCharges: p.MonthlyCharges.toFixed(2),
  TotalCharges: p.TotalCharges.toFixed(2),
});

/** Returns null when a numeric field is blank, negative or not a number. */
function toProfile(form: FormState): CustomerProfile | null {
  const tenure = Number(form.tenure);
  const monthly = Number(form.MonthlyCharges);
  const total = Number(form.TotalCharges);
  const raw = [form.tenure, form.MonthlyCharges, form.TotalCharges];
  if (
    raw.some((v) => v.trim() === "") ||
    [tenure, monthly, total].some((n) => Number.isNaN(n) || n < 0)
  ) {
    return null;
  }
  return { ...form, tenure: Math.round(tenure), MonthlyCharges: monthly, TotalCharges: total };
}

const FLASH_CLASS: Record<Tone, string> = {
  high: "flash-high",
  low: "flash-low",
  neutral: "flash-neutral",
};

function Predictor() {
  const [form, setForm] = useState<FormState>(() => toForm(DEFAULT_PROFILE));
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [scoredProfile, setScoredProfile] = useState<CustomerProfile | null>(null);
  const [source, setSource] = useState<ResultSource>({ kind: "live" });
  const [previousProbability, setPreviousProbability] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_BASE_URL);
  const [resultKey, setResultKey] = useState(0);
  const [flash, setFlash] = useState<{ fields: Set<string>; tone: Tone; nonce: number }>({
    fields: new Set(),
    tone: "neutral",
    nonce: 0,
  });
  const [isMac, setIsMac] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
    const saved = window.localStorage.getItem(API_URL_KEY);
    if (saved) setApiUrl(saved);
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
  }, []);

  // Field highlights and the "fields updated" note fade away after a moment.
  useEffect(() => {
    if (flash.fields.size === 0) return;
    const t = window.setTimeout(
      () => setFlash((f) => (f.nonce === flash.nonce ? { ...f, fields: new Set() } : f)),
      1800,
    );
    return () => window.clearTimeout(t);
  }, [flash.nonce, flash.fields.size]);

  const persist = (next: HistoryEntry[]) => {
    setHistory(next);
    saveHistory(next);
  };

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setActiveHistoryId(null);
  };

  const applyProfile = (p: CustomerProfile, tone: Tone) => {
    const next = toForm(p);
    const changed = changedFields(form, next).map(String);
    setForm(next);
    setFlash((f) => ({ fields: new Set(changed), tone, nonce: f.nonce + 1 }));
  };

  const fill = (p: CustomerProfile, tone: Tone) => {
    applyProfile(p, tone);
    setStatus("idle");
    setError(null);
    setResult(null);
    setActiveHistoryId(null);
  };

  const loadFromHistory = (entry: HistoryEntry) => {
    applyProfile(entry.profile, entry.prediction === 1 ? "high" : "low");
    setResult({ prediction: entry.prediction, churn_probability: entry.churn_probability });
    setScoredProfile(entry.profile);
    setSource({ kind: "history", timestamp: entry.timestamp });
    setStatus("success");
    setError(null);
    setActiveHistoryId(entry.id);
    setResultKey((k) => k + 1);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    formRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };

  const onApiUrlChange = (value: string) => {
    setApiUrl(value);
    window.localStorage.setItem(API_URL_KEY, value);
  };

  const predict = async () => {
    const profile = toProfile(form);
    if (!profile) {
      setStatus("error");
      setError("Tenure, Monthly Charges and Total Charges must be valid non-negative numbers.");
      return;
    }

    setStatus("loading");
    setError(null);
    const started = performance.now();
    try {
      const res = await requestPrediction(apiUrl, profile);
      // Keep the loading state on screen briefly so very fast responses don't flicker.
      const wait = 450 - (performance.now() - started);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        profile,
        prediction: res.prediction,
        churn_probability: res.churn_probability,
      };
      setPreviousProbability(history[0]?.churn_probability ?? null);
      setResult(res);
      setScoredProfile(profile);
      setSource({ kind: "live" });
      setStatus("success");
      setResultKey((k) => k + 1);
      setActiveHistoryId(entry.id);
      persist(addHistoryEntry(history, entry));
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong while predicting.");
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void predict();
  };

  const onFormKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && status !== "loading") {
      e.preventDefault();
      void predict();
    }
  };

  const clearHistory = () => {
    const snapshot = history;
    persist([]);
    setActiveHistoryId(null);
    toast("History cleared", {
      description: `${snapshot.length} check${snapshot.length === 1 ? "" : "s"} removed.`,
      action: { label: "Undo", onClick: () => persist(snapshot) },
    });
  };

  const removeEntry = (entry: HistoryEntry) => {
    const snapshot = history;
    persist(removeHistoryEntry(history, entry.id));
    if (activeHistoryId === entry.id) setActiveHistoryId(null);
    toast("Check removed", { action: { label: "Undo", onClick: () => persist(snapshot) } });
  };

  const stepTenure = (d: 1 | -1) => {
    const n = Math.max(0, Math.round(Number(form.tenure) || 0) + d);
    update("tenure", String(n));
  };

  const estimateTotal = () => {
    const t = Number(form.tenure);
    const m = Number(form.MonthlyCharges);
    if (Number.isNaN(t) || Number.isNaN(m)) return;
    update("TotalCharges", (t * m).toFixed(2));
    setFlash((f) => ({ fields: new Set(["TotalCharges"]), tone: "neutral", nonce: f.nonce + 1 }));
  };

  const addRipple = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const id = Date.now() + Math.random();
    setRipples((rs) => [...rs, { id, x: e.clientX - r.left, y: e.clientY - r.top }]);
  };

  const current = toProfile(form);
  const stale =
    status === "success" &&
    scoredProfile !== null &&
    (current === null || !sameProfile(current, scoredProfile));

  const flashProps = (key: keyof FormState) =>
    flash.fields.has(key)
      ? { flashKey: `${key}-${flash.nonce}`, flashClass: FLASH_CLASS[flash.tone] }
      : { flashKey: key, flashClass: null };

  return (
    <div className="mx-auto max-w-6xl px-5 pt-12">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Predictor</p>
          <h1 className="mt-3 font-display text-4xl font-medium tracking-tight">
            Score a customer profile
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="riskHigh"
            className="group"
            onClick={() => fill(HIGH_RISK_SAMPLE, "high")}
          >
            <Flame className="transition-transform duration-200 ease-out group-hover:-rotate-12 group-hover:scale-110" />
            High-Risk Sample
          </Button>
          <Button variant="riskLow" className="group" onClick={() => fill(LOW_RISK_SAMPLE, "low")}>
            <Leaf className="transition-transform duration-200 ease-out group-hover:rotate-12 group-hover:scale-110" />
            Low-Risk Sample
          </Button>
          <Button
            variant="outline"
            className="group"
            onClick={() => fill(DEFAULT_PROFILE, "neutral")}
          >
            <RotateCcw className="transition-transform duration-[250ms] ease-out group-hover:-rotate-90" />
            Reset
          </Button>
        </div>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <form
          ref={formRef}
          onSubmit={onSubmit}
          onKeyDown={onFormKeyDown}
          className="surface-card scroll-mt-24 p-6 md:p-8"
          noValidate
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold">Customer profile</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Account, billing and service details.
              </p>
            </div>
            {flash.fields.size > 0 && (
              <span
                key={flash.nonce}
                className="animate-enter shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground"
              >
                {flash.fields.size} field{flash.fields.size === 1 ? "" : "s"} updated
              </span>
            )}
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            <Field label="Tenure" hint="months" htmlFor="tenure" {...flashProps("tenure")}>
              <div className="relative">
                <input
                  id="tenure"
                  type="number"
                  min={0}
                  step={1}
                  className="field-control pr-16 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  value={form.tenure}
                  onChange={(e) => update("tenure", e.target.value)}
                />
                <div className="absolute inset-y-0 right-1 flex items-center gap-0.5">
                  {([-1, 1] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      aria-label={d < 0 ? "Decrease tenure" : "Increase tenure"}
                      onClick={() => stepTenure(d)}
                      className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-soft hover:bg-secondary hover:text-foreground active:scale-90"
                    >
                      {d < 0 ? <Minus className="size-3.5" /> : <Plus className="size-3.5" />}
                    </button>
                  ))}
                </div>
              </div>
            </Field>
            <Field
              label="Monthly Charges"
              hint="$"
              htmlFor="MonthlyCharges"
              {...flashProps("MonthlyCharges")}
            >
              <input
                id="MonthlyCharges"
                type="number"
                min={0}
                step={0.01}
                className="field-control"
                value={form.MonthlyCharges}
                onChange={(e) => update("MonthlyCharges", e.target.value)}
              />
            </Field>
            <Field
              label="Total Charges"
              hint="$"
              htmlFor="TotalCharges"
              {...flashProps("TotalCharges")}
            >
              <input
                id="TotalCharges"
                type="number"
                min={0}
                step={0.01}
                className="field-control"
                value={form.TotalCharges}
                onChange={(e) => update("TotalCharges", e.target.value)}
              />
              <button
                type="button"
                onClick={estimateTotal}
                title="Fill Total Charges with tenure × monthly charges"
                className="group/est mt-1.5 flex items-center gap-1 text-[0.6875rem] text-muted-foreground transition-soft hover:text-foreground"
              >
                <Calculator className="size-3 transition-transform duration-200 ease-out group-hover/est:-rotate-12" />
                <span className="link-underline whitespace-nowrap">Estimate total</span>
              </button>
            </Field>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <SelectField
              id="Contract"
              label="Contract"
              value={form.Contract}
              options={CONTRACT_OPTIONS}
              onChange={(v) => update("Contract", v)}
              {...flashProps("Contract")}
            />
            <SelectField
              id="InternetService"
              label="Internet Service"
              value={form.InternetService}
              options={INTERNET_OPTIONS}
              onChange={(v) => update("InternetService", v)}
              {...flashProps("InternetService")}
            />
            <SelectField
              id="PaymentMethod"
              label="Payment Method"
              value={form.PaymentMethod}
              options={PAYMENT_OPTIONS}
              onChange={(v) => update("PaymentMethod", v)}
              {...flashProps("PaymentMethod")}
            />
            <SelectField
              id="TechSupport"
              label="Tech Support"
              value={form.TechSupport}
              options={TECH_SUPPORT_OPTIONS}
              onChange={(v) => update("TechSupport", v)}
              {...flashProps("TechSupport")}
            />
            <SelectField
              id="PaperlessBilling"
              label="Paperless Billing"
              value={form.PaperlessBilling}
              options={PAPERLESS_OPTIONS}
              onChange={(v) => update("PaperlessBilling", v)}
              {...flashProps("PaperlessBilling")}
            />
            <Field label="Senior Citizen" htmlFor="SeniorCitizen" {...flashProps("SeniorCitizen")}>
              <select
                id="SeniorCitizen"
                className="field-control"
                value={form.SeniorCitizen}
                onChange={(e) => update("SeniorCitizen", e.target.value === "1" ? 1 : 0)}
              >
                <option value={0}>0 — No</option>
                <option value={1}>1 — Yes</option>
              </select>
            </Field>
          </div>

          <SignalStrip profile={current} />

          <div className="mt-8 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex-1 sm:max-w-xs">
              <label
                htmlFor="apiUrl"
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
              >
                <Server className="size-3.5" /> Backend URL
              </label>
              <input
                id="apiUrl"
                type="url"
                className="field-control mt-1.5 h-9 font-mono text-xs"
                value={apiUrl}
                onChange={(e) => onApiUrlChange(e.target.value)}
                placeholder="http://localhost:5000"
              />
              <p className="mt-1 font-mono text-[0.6875rem] text-subtle">
                POST {predictUrl(apiUrl || "…")}
              </p>
            </div>
            <div className="flex flex-col items-stretch gap-1.5 sm:items-end">
              <Button
                type="submit"
                size="lg"
                disabled={status === "loading"}
                className="relative min-w-52 overflow-hidden"
                onPointerDown={addRipple}
              >
                {ripples.map((r) => (
                  <span
                    key={r.id}
                    aria-hidden
                    className="animate-ripple pointer-events-none absolute size-64 rounded-full bg-primary-foreground"
                    style={{ left: r.x, top: r.y }}
                    onAnimationEnd={() => setRipples((rs) => rs.filter((x) => x.id !== r.id))}
                  />
                ))}
                {status === "loading" ? (
                  <>
                    <Loader2 className="animate-spin" /> Predicting…
                  </>
                ) : (
                  "Predict Churn Risk"
                )}
              </Button>
              <span className="hidden text-right font-mono text-[0.6875rem] text-subtle sm:block">
                or press{" "}
                <kbd className="rounded border border-border bg-background px-1 py-0.5">
                  {isMac ? "⌘" : "Ctrl"}
                </kbd>{" "}
                +{" "}
                <kbd className="rounded border border-border bg-background px-1 py-0.5">Enter</kbd>
              </span>
            </div>
          </div>
        </form>

        <div className="lg:sticky lg:top-24 lg:self-start" aria-live="polite">
          <ResultPanel
            key={`${resultKey}-${status}`}
            status={status}
            error={error}
            result={result}
            profile={scoredProfile}
            source={source}
            previousProbability={previousProbability}
            stale={stale}
            onRetry={() => void predict()}
          />
        </div>
      </div>

      <div className="mt-10">
        <HistoryLog
          entries={history}
          activeId={activeHistoryId}
          onClear={clearHistory}
          onLoad={loadFromHistory}
          onRemove={removeEntry}
        />
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  htmlFor,
  flashKey,
  flashClass,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor: string;
  flashKey: string;
  flashClass: string | null;
  children: ReactNode;
}) {
  return (
    <div className="group/field">
      <label
        htmlFor={htmlFor}
        className="flex items-baseline justify-between text-sm font-medium transition-soft group-focus-within/field:text-foreground"
      >
        <span className="flex items-center gap-1.5">
          {label}
          {flashClass && (
            <span
              key={flashKey}
              className="animate-pop size-1.5 rounded-full bg-foreground/40"
              aria-hidden
            />
          )}
        </span>
        {hint && (
          <span className="font-mono text-xs font-normal text-subtle transition-soft group-focus-within/field:text-muted-foreground">
            {hint}
          </span>
        )}
      </label>
      <div
        key={flashKey}
        className={cn("mt-1.5", flashClass && ["animate-field-flash", flashClass])}
      >
        {children}
      </div>
    </div>
  );
}

function SelectField<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
  flashKey,
  flashClass,
}: {
  id: string;
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  flashKey: string;
  flashClass: string | null;
}) {
  return (
    <Field label={label} htmlFor={id} flashKey={flashKey} flashClass={flashClass}>
      <select
        id={id}
        className="field-control"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </Field>
  );
}