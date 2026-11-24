export const CONTRACT_OPTIONS = ["Month-to-month", "One year", "Two year"] as const;
export const INTERNET_OPTIONS = ["Fiber optic", "DSL", "No"] as const;
export const PAYMENT_OPTIONS = [
  "Electronic check",
  "Mailed check",
  "Bank transfer (automatic)",
  "Credit card (automatic)",
] as const;
export const TECH_SUPPORT_OPTIONS = ["No", "Yes", "No internet service"] as const;
export const PAPERLESS_OPTIONS = ["Yes", "No"] as const;
export const SENIOR_OPTIONS = [0, 1] as const;

export interface CustomerProfile {
  tenure: number;
  MonthlyCharges: number;
  TotalCharges: number;
  Contract: (typeof CONTRACT_OPTIONS)[number];
  InternetService: (typeof INTERNET_OPTIONS)[number];
  PaymentMethod: (typeof PAYMENT_OPTIONS)[number];
  TechSupport: (typeof TECH_SUPPORT_OPTIONS)[number];
  PaperlessBilling: (typeof PAPERLESS_OPTIONS)[number];
  SeniorCitizen: 0 | 1;
}

export interface PredictionResult {
  prediction: 0 | 1;
  churn_probability: number | null;
}

export const DEFAULT_PROFILE: CustomerProfile = {
  tenure: 6,
  MonthlyCharges: 79.85,
  TotalCharges: 479.1,
  Contract: "Month-to-month",
  InternetService: "Fiber optic",
  PaymentMethod: "Electronic check",
  TechSupport: "No",
  PaperlessBilling: "Yes",
  SeniorCitizen: 0,
};

export const HIGH_RISK_SAMPLE: CustomerProfile = {
  tenure: 2,
  MonthlyCharges: 95.7,
  TotalCharges: 191.4,
  Contract: "Month-to-month",
  InternetService: "Fiber optic",
  PaymentMethod: "Electronic check",
  TechSupport: "No",
  PaperlessBilling: "Yes",
  SeniorCitizen: 1,
};

export const LOW_RISK_SAMPLE: CustomerProfile = {
  tenure: 60,
  MonthlyCharges: 45.25,
  TotalCharges: 2715,
  Contract: "Two year",
  InternetService: "DSL",
  PaymentMethod: "Credit card (automatic)",
  TechSupport: "Yes",
  PaperlessBilling: "No",
  SeniorCitizen: 0,
};

export const DEFAULT_API_BASE_URL =
  (import.meta.env["VITE_CHURNSENSE_API_URL"] as string | undefined) ?? "http://localhost:5000";

export function riskLabel(prediction: 0 | 1): string {
  return prediction === 1 ? "High Churn Risk (Likely to Churn)" : "Low Churn Risk (Likely to Stay)";
}

export function predictUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  if (trimmed.endsWith("/predict")) return trimmed;
  return `${trimmed}/predict`;
}

/** Validates the raw JSON the backend returned. Throws with a readable message when malformed. */
export function parsePredictionResponse(data: unknown): PredictionResult {
  if (typeof data !== "object" || data === null) {
    throw new Error("The backend returned an unexpected response.");
  }
  const record = data as Record<string, unknown>;
  const prediction = Number(record["prediction"]);
  if (prediction !== 0 && prediction !== 1) {
    throw new Error("The backend response is missing a valid prediction (expected 0 or 1).");
  }
  const rawProb = record["churn_probability"];
  const prob = rawProb === null || rawProb === undefined ? null : Number(rawProb);
  return {
    prediction,
    churn_probability: prob === null || Number.isNaN(prob) ? null : prob,
  };
}

export async function requestPrediction(
  baseUrl: string,
  profile: CustomerProfile,
): Promise<PredictionResult> {
  const url = predictUrl(baseUrl);
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
  } catch {
    throw new Error(
      `Couldn't reach the ChurnSense backend at ${url}. Make sure app.py is running and the URL is correct.`,
    );
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as Record<string, unknown>)["error"])
        : `The backend responded with status ${response.status}.`;
    throw new Error(message);
  }

  return parsePredictionResponse(body);
}

export interface RetentionAction {
  title: string;
  detail: string;
}

export interface RetentionPlan {
  headline: string;
  actions: RetentionAction[];
}

const isAutoPay = (method: CustomerProfile["PaymentMethod"]) => method.includes("automatic");

export function buildRetentionPlan(profile: CustomerProfile, prediction: 0 | 1): RetentionPlan {
  const actions: RetentionAction[] = [];

  if (prediction === 1) {
    if (profile.Contract === "Month-to-month") {
      actions.push({
        title: "Offer a contract upgrade incentive",
        detail:
          "Present a discounted one- or two-year plan (e.g. a month free or a locked rate) to move this customer off month-to-month.",
      });
    }
    if (profile.InternetService === "Fiber optic" && profile.TechSupport === "No") {
      actions.push({
        title: "Proactive tech support outreach",
        detail:
          "Fiber customers without tech support churn often. Offer a free support trial and a quick onboarding call to resolve setup friction.",
      });
    }
    if (profile.PaymentMethod === "Electronic check" || profile.PaymentMethod === "Mailed check") {
      actions.push({
        title: "Encourage autopay setup",
        detail:
          "Invite the customer to switch to bank transfer or credit card autopay, with a small monthly credit as a thank-you.",
      });
    }
    if (profile.tenure < 12) {
      actions.push({
        title: "Early-tenure check-in",
        detail:
          "Schedule a friendly check-in within the first year to confirm the service meets expectations before renewal decisions.",
      });
    }
    if (profile.MonthlyCharges >= 70) {
      actions.push({
        title: "Plan right-sizing review",
        detail:
          "Monthly charges are on the higher side. Review usage and suggest a better-fitting bundle or a loyalty discount.",
      });
    }
    if (profile.SeniorCitizen === 1) {
      actions.push({
        title: "Assisted care line",
        detail: "Provide a dedicated, patient support contact and simplified billing explanations.",
      });
    }
    if (actions.length === 0) {
      actions.push({
        title: "Personal retention call",
        detail:
          "Have a retention specialist reach out to understand concerns and tailor an offer.",
      });
    }
    return {
      headline: "Prioritise this customer for retention outreach in the next 7 days.",
      actions,
    };
  }

  if (profile.Contract === "Month-to-month") {
    actions.push({
      title: "Soft upsell to an annual plan",
      detail:
        "The customer is stable today; a light-touch annual plan offer can lock in that loyalty.",
    });
  }
  if (!isAutoPay(profile.PaymentMethod)) {
    actions.push({
      title: "Suggest autopay convenience",
      detail: "Position autopay as a time-saver to reduce friction at every billing cycle.",
    });
  }
  if (profile.tenure >= 24) {
    actions.push({
      title: "Recognise loyalty",
      detail:
        "Send a thank-you perk or anniversary reward to reinforce a long-standing relationship.",
    });
  }
  actions.push({
    title: "Keep engagement steady",
    detail: "Continue regular service updates and satisfaction surveys; no urgent action needed.",
  });

  return {
    headline: "Low risk — maintain the relationship with light-touch engagement.",
    actions,
  };
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  profile: CustomerProfile;
  prediction: 0 | 1;
  churn_probability: number | null;
}

export const HISTORY_STORAGE_KEY = "churnsense-history";
export const HISTORY_LIMIT = 50;

export function addHistoryEntry(history: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  return [entry, ...history].slice(0, HISTORY_LIMIT);
}

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveHistory(history: HistoryEntry[]): void {
  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch {
    /* storage full or unavailable */
  }
}

export function removeHistoryEntry(history: HistoryEntry[], id: string): HistoryEntry[] {
  return history.filter((entry) => entry.id !== id);
}

export interface HistorySummary {
  total: number;
  highRisk: number;
  averageProbability: number | null;
}

export function summarizeHistory(history: HistoryEntry[]): HistorySummary {
  const probs = history
    .map((e) => e.churn_probability)
    .filter((p): p is number => typeof p === "number");
  return {
    total: history.length,
    highRisk: history.filter((e) => e.prediction === 1).length,
    averageProbability: probs.length
      ? Math.round((probs.reduce((a, b) => a + b, 0) / probs.length) * 10) / 10
      : null,
  };
}

/** Keys whose values differ between two flat records (used to highlight fields that changed). */
export function changedFields<T extends object>(a: T, b: T): (keyof T)[] {
  return (Object.keys(a) as (keyof T)[]).filter((key) => String(a[key]) !== String(b[key]));
}

export function sameProfile(a: CustomerProfile, b: CustomerProfile): boolean {
  return changedFields(a, b).length === 0;
}

export interface ProfileSignal {
  label: string;
  direction: "up" | "down";
}

/**
 * Well-known telecom churn drivers present in a profile. Shown as live hints while editing;
 * they are general patterns, not the model's output.
 */
export function profileSignals(p: CustomerProfile): ProfileSignal[] {
  const s: ProfileSignal[] = [];
  if (p.Contract === "Month-to-month") s.push({ label: "Month-to-month contract", direction: "up" });
  if (p.Contract === "Two year") s.push({ label: "Two-year contract", direction: "down" });
  if (p.tenure < 12) s.push({ label: "Short tenure", direction: "up" });
  if (p.tenure >= 48) s.push({ label: "Long tenure", direction: "down" });
  if (p.MonthlyCharges >= 70) s.push({ label: "High monthly bill", direction: "up" });
  if (p.InternetService === "Fiber optic" && p.TechSupport === "No")
    s.push({ label: "Fiber without tech support", direction: "up" });
  if (p.TechSupport === "Yes") s.push({ label: "Has tech support", direction: "down" });
  if (p.PaymentMethod === "Electronic check") s.push({ label: "Electronic check", direction: "up" });
  if (p.PaymentMethod.includes("automatic")) s.push({ label: "Autopay", direction: "down" });
  if (p.SeniorCitizen === 1) s.push({ label: "Senior citizen", direction: "up" });
  return s;
}