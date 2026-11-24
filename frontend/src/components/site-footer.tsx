import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 md:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="font-display text-lg font-semibold">ChurnSense</p>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Predictions are statistical estimates from a trained model and should support, not
            replace, human judgement. Validate results against recent customer data before acting.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm md:items-end">
          <span className="eyebrow">Navigate</span>
          <Link to="/" className="link-underline text-muted-foreground hover:text-foreground">
            Overview
          </Link>
          <Link
            to="/predictor"
            className="link-underline text-muted-foreground hover:text-foreground"
          >
            Predictor
          </Link>
          <Link
            to="/insights"
            className="link-underline text-muted-foreground hover:text-foreground"
          >
            Model Insights
          </Link>
        </div>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-6xl px-5 py-4 text-xs text-muted-foreground">
          © {new Date().getFullYear()} ChurnSense · Telecom churn analytics
        </p>
      </div>
    </footer>
  );
}