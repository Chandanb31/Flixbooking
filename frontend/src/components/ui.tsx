import { Link, Navigate, useLocation } from "react-router-dom";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useAuth } from "../context/AuthContext";

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-24 text-mist" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-seam border-t-brass" />
      <span>{label}…</span>
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="mx-auto my-16 max-w-md rounded-xl border border-rose/40 bg-rose/10 p-5 text-center">
      <p className="text-glow">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 text-sm font-semibold text-brass hover:underline">
          Try again
        </button>
      )}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const styles = {
    primary: "bg-brass text-ink hover:bg-[#d6b47e] disabled:bg-seam disabled:text-mist",
    ghost: "border border-seam text-glow hover:border-mist disabled:opacity-50",
    danger: "border border-rose/60 text-rose hover:bg-rose/10 disabled:opacity-50",
  }[variant];
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 font-semibold transition-colors disabled:cursor-not-allowed ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function CertBadge({ cert }: { cert: string }) {
  return (
    <span className="inline-flex h-6 min-w-8 items-center justify-center rounded border border-mist/50 px-1.5 text-xs font-bold text-glow">
      {cert}
    </span>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-plush px-3 py-1 text-sm text-mist">{children}</span>;
}

/** Sends logged-out visitors to the login page, then back here afterwards. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <Spinner />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  return <>{children}</>;
}

export function NotFound() {
  return (
    <div className="mx-auto max-w-md py-32 text-center">
      <p className="font-display text-6xl font-bold text-seam">404</p>
      <p className="mt-4 text-lg">This page isn't showing anywhere.</p>
      <Link to="/" className="mt-6 inline-block font-semibold text-brass hover:underline">
        Back to movies
      </Link>
    </div>
  );
}
