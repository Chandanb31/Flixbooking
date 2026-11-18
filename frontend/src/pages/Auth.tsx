import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../components/ui";
import { useAuth } from "../context/AuthContext";

function Field(props: { label: string; type?: string; value: string; onChange: (v: string) => void; autoComplete?: string; required?: boolean; minLength?: number }) {
  return (
    <label className="block">
      <span className="text-sm text-mist">{props.label}</span>
      <input
        type={props.type ?? "text"}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        autoComplete={props.autoComplete}
        required={props.required ?? true}
        minLength={props.minLength}
        className="mt-1 w-full rounded-lg border border-seam bg-plush px-4 py-2.5 text-glow focus:border-brass focus:outline-none"
      />
    </label>
  );
}

function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-14 md:grid-cols-2">
      <div className="hidden grid-cols-3 gap-3 opacity-60 md:grid" aria-hidden>
        {["monsoon-protocol", "orbit-9", "kaagaz-ke-sapne", "vettai", "echoes-of-ladakh", "neon-bazaar"].map((p, i) => (
          <img
            key={p}
            src={`/posters/${p}.svg`}
            alt=""
            className={`rounded-md ring-1 ring-seam ${i % 3 === 1 ? "translate-y-8" : ""}`}
          />
        ))}
      </div>
      <div className="rounded-2xl border border-seam/70 bg-velvet p-8">
        <h1 className="font-display text-4xl font-bold">{title}</h1>
        {children}
      </div>
    </div>
  );
}

export function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={next} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate(next, { replace: true });
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <Shell title="Log in">
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
        <Field label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
        {error && <p className="text-sm text-rose">{error}</p>}
        <Button type="submit" disabled={busy} className="w-full py-3">
          {busy ? "Logging in…" : "Log in"}
        </Button>
      </form>
      <p className="mt-6 text-sm text-mist">
        New to FlixBooking?{" "}
        <Link to={`/register?next=${encodeURIComponent(next)}`} className="font-semibold text-brass hover:underline">
          Create an account
        </Link>
      </p>
    </Shell>
  );
}

export function Register() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/";
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={next} replace />;

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register({ ...form, phone: form.phone || undefined });
      navigate(next, { replace: true });
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <Shell title="Create your account">
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label="Full name" value={form.full_name} onChange={set("full_name")} autoComplete="name" minLength={2} />
        <Field label="Email" type="email" value={form.email} onChange={set("email")} autoComplete="email" />
        <Field label="Phone (optional)" type="tel" value={form.phone} onChange={set("phone")} autoComplete="tel" required={false} />
        <Field label="Password (8+ characters)" type="password" value={form.password} onChange={set("password")} autoComplete="new-password" minLength={8} />
        {error && <p className="text-sm text-rose">{error}</p>}
        <Button type="submit" disabled={busy} className="w-full py-3">
          {busy ? "Creating account…" : "Create account"}
        </Button>
      </form>
      <p className="mt-6 text-sm text-mist">
        Already have an account?{" "}
        <Link to={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-brass hover:underline">
          Log in
        </Link>
      </p>
    </Shell>
  );
}
