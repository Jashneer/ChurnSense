import { useLayoutEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Overview" },
  { to: "/predictor", label: "Predictor" },
  { to: "/insights", label: "Model Insights" },
] as const;

export function SiteHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navRef = useRef<HTMLElement>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);

  useLayoutEffect(() => {
    const measure = () => {
      const el = linkRefs.current[pathname];
      setPill(el ? { left: el.offsetLeft, width: el.offsetWidth } : null);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (navRef.current) ro.observe(navRef.current);
    return () => ro.disconnect();
  }, [pathname]);

  useLayoutEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md transition-soft",
        scrolled ? "border-border shadow-card" : "border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <Link to="/" className="group flex items-center gap-2.5 rounded-md">
          <span className="relative flex size-7 items-center justify-center rounded-full bg-primary transition-soft group-hover:rotate-12">
            <span className="size-2.5 rounded-full bg-risk-high transition-soft group-hover:bg-risk-low" />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight">
            Churn
            <span className="inline-block transition-transform duration-200 ease-out group-hover:-translate-y-px group-hover:text-risk-high">
              Sense
            </span>
          </span>
        </Link>
        <nav
          ref={navRef}
          aria-label="Main"
          className="relative flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-card"
        >
          {pill && (
            <span
              aria-hidden
              className="absolute top-1 bottom-1 rounded-full bg-primary transition-[left,width] duration-[250ms] ease-out"
              style={{ left: pill.left, width: pill.width }}
            />
          )}
          {NAV.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                ref={(el) => {
                  linkRefs.current[item.to] = el;
                }}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative z-10 rounded-full px-3 py-1.5 text-sm font-medium transition-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 sm:px-4",
                  active
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  active && !pill && "bg-primary",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <span
        aria-hidden
        className="absolute bottom-0 left-0 h-px w-full origin-left bg-risk-high/70 transition-transform duration-150 ease-out"
        style={{ transform: `scaleX(${progress})` }}
      />
    </header>
  );
}