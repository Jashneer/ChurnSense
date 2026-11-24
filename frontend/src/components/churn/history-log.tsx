import { useState } from "react";
import { ChevronDown, History, RotateCcw, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { summarizeHistory, type HistoryEntry } from "@/lib/churn";
import { cn } from "@/lib/utils";

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

type Filter = "all" | "high" | "low";

interface Props {
  entries: HistoryEntry[];
  activeId: string | null;
  onClear: () => void;
  onLoad: (entry: HistoryEntry) => void;
  onRemove: (entry: HistoryEntry) => void;
}

export function HistoryLog({ entries, activeId, onClear, onLoad, onRemove }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const summary = summarizeHistory(entries);
  const visible = entries.filter((e) =>
    filter === "all" ? true : filter === "high" ? e.prediction === 1 : e.prediction === 0,
  );

  return (
    <section className="surface-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <History className="size-4 text-muted-foreground" />
          <h2 className="font-semibold">Customer History Log</h2>
          <span
            key={entries.length}
            className="animate-pop rounded-full bg-secondary px-2 py-0.5 font-mono text-xs text-muted-foreground"
          >
            {entries.length}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Filter history"
            className="flex rounded-full border border-border bg-background p-0.5"
          >
            {(
              [
                ["all", "All", summary.total],
                ["high", "High risk", summary.highRisk],
                ["low", "Low risk", summary.total - summary.highRisk],
              ] as const
            ).map(([key, label, count]) => (
              <button
                key={key}
                type="button"
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                  filter === key
                    ? "bg-card text-foreground shadow-card"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label} <span className="font-mono text-subtle">{count}</span>
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={onClear} disabled={entries.length === 0}>
            <Trash2 /> Clear History
          </Button>
        </div>
      </div>

      {entries.length > 0 && (
        <div className="grid grid-cols-3 divide-x divide-border border-b border-border bg-background/60 text-center">
          <Stat label="Checks" value={String(summary.total)} />
          <Stat label="High risk" value={String(summary.highRisk)} tone="high" />
          <Stat
            label="Avg. probability"
            value={
              summary.averageProbability !== null
                ? `${summary.averageProbability.toFixed(1)}%`
                : "—"
            }
          />
        </div>
      )}

      {visible.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-muted-foreground">
          {entries.length === 0
            ? "Checked customers will appear here."
            : "No checks match this filter."}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {visible.map((entry) => (
            <HistoryRow
              key={entry.id}
              entry={entry}
              open={openId === entry.id}
              active={activeId === entry.id}
              onToggle={() => setOpenId((id) => (id === entry.id ? null : entry.id))}
              onLoad={() => onLoad(entry)}
              onRemove={() => onRemove(entry)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "high" }) {
  return (
    <div className="px-4 py-3">
      <p className="eyebrow">{label}</p>
      <p
        key={value}
        className={cn(
          "animate-enter mt-1 font-display text-xl font-medium tabular-nums",
          tone === "high" && "text-risk-high",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function HistoryRow({
  entry,
  open,
  active,
  onToggle,
  onLoad,
  onRemove,
}: {
  entry: HistoryEntry;
  open: boolean;
  active: boolean;
  onToggle: () => void;
  onLoad: () => void;
  onRemove: () => void;
}) {
  const high = entry.prediction === 1;
  const p = entry.profile;
  const details: [string, string][] = [
    ["Tenure", `${p.tenure} months`],
    ["Monthly Charges", `$${p.MonthlyCharges.toFixed(2)}`],
    ["Total Charges", `$${p.TotalCharges.toFixed(2)}`],
    ["Contract", p.Contract],
    ["Internet Service", p.InternetService],
    ["Payment Method", p.PaymentMethod],
    ["Tech Support", p.TechSupport],
    ["Paperless Billing", p.PaperlessBilling],
    ["Senior Citizen", p.SeniorCitizen === 1 ? "Yes" : "No"],
  ];

  return (
    <li className={cn("animate-enter relative transition-soft", open && "bg-background")}>
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-0 w-0.5 origin-top transition-transform duration-[250ms] ease-out",
          high ? "bg-risk-high" : "bg-risk-low",
          active || open ? "scale-y-100" : "scale-y-0",
        )}
      />
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="group grid w-full cursor-pointer items-center gap-3 px-6 py-4 text-left transition-soft hover:bg-background focus-visible:bg-background focus-visible:outline-none md:grid-cols-[8rem_1fr_auto]"
      >
        <span className="font-mono text-xs text-muted-foreground">
          {formatTime(entry.timestamp)}
        </span>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {[
            `${p.tenure} mo`,
            `$${p.MonthlyCharges.toFixed(2)}/mo`,
            p.Contract,
            p.InternetService === "No" ? "No internet" : p.InternetService,
            p.PaymentMethod,
          ].map((trait) => (
            <span
              key={trait}
              className="rounded-md border border-border bg-background px-2 py-0.5 transition-soft group-hover:border-subtle/60 group-hover:bg-card"
            >
              {trait}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3 md:justify-end">
          {active && <span className="text-xs text-muted-foreground">In form</span>}
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium",
              high ? "bg-risk-high-soft text-risk-high" : "bg-risk-low-soft text-risk-low",
            )}
          >
            {high ? "High risk" : "Low risk"}
          </span>
          <span className="w-14 text-right font-display text-lg font-medium tabular-nums">
            {entry.churn_probability !== null ? `${entry.churn_probability.toFixed(1)}%` : "—"}
          </span>
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform duration-200 ease-out",
              open && "rotate-180",
            )}
          />
        </div>
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-[250ms] ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden" inert={!open}>
          <div className="px-6 pb-5">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-3">
              {details.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="text-sm font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={onLoad}>
                <RotateCcw /> Load into form
              </Button>
              <Button size="sm" variant="ghost" onClick={onRemove}>
                <X /> Remove
              </Button>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}