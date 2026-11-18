import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Button, ErrorNote, Spinner } from "../components/ui";
import { api, useApi } from "../lib/api";
import { longDate, rupees, seatTypeName, showTime } from "../lib/format";
import type { Booking, RefundRule } from "../lib/types";

function useSecondsLeft(until: string | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  if (!until) return 0;
  return Math.max(0, Math.floor((new Date(until).getTime() - now) / 1000));
}

export default function Checkout() {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const { data: b, error, loading, reload } = useApi<Booking>(`/bookings/${code}`);
  const policy = useApi<RefundRule[]>("/refund-policy");
  const secondsLeft = useSecondsLeft(b?.hold_expires_at);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  if (loading) return <Spinner label="Loading your booking" />;
  if (error || !b) return <ErrorNote message={error ?? "Booking not found."} onRetry={reload} />;
  if (b.status === "confirmed") return <Navigate to={`/bookings/${b.booking_code}`} replace />;

  const expired = b.status !== "pending" || secondsLeft === 0;
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  const pay = async () => {
    setPaying(true);
    setPayError(null);
    try {
      await api<Booking>(`/bookings/${b.booking_code}/pay`, { method: "POST" });
      navigate(`/bookings/${b.booking_code}?new=1`, { replace: true });
    } catch (e) {
      setPayError((e as Error).message);
      reload();
    } finally {
      setPaying(false);
    }
  };

  const changeSeats = async () => {
    await api(`/bookings/${b.booking_code}/release`, { method: "POST" }).catch(() => {});
    navigate(`/shows/${b.show_id}`);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl font-bold">Review and pay</h1>
        {!expired && (
          <p className={`text-sm ${secondsLeft < 120 ? "text-rose" : "text-mist"}`} aria-live="polite">
            Seats held for{" "}
            <span className="font-display text-3xl font-bold tabular-nums text-glow">
              {mm}:{ss}
            </span>
          </p>
        )}
      </div>

      {expired ? (
        <div className="mt-8 rounded-xl border border-rose/40 bg-rose/10 p-6">
          <p className="text-lg font-semibold">Your seat hold has ended.</p>
          <p className="mt-1 text-mist">The seats went back on sale. Pick seats again to continue.</p>
          <Button className="mt-4" onClick={() => navigate(`/shows/${b.show_id}`)}>
            Pick seats again
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 md:grid-cols-[1fr_340px]">
          <section className="rounded-xl border border-seam/70 bg-velvet p-6">
            <div className="flex gap-5">
              <img src={b.poster_url} alt="" className="w-24 rounded-md" />
              <div>
                <h2 className="font-display text-3xl font-bold leading-none">{b.movie_title}</h2>
                <p className="mt-2 text-mist">
                  {b.certificate}, {b.language}, {b.format}
                </p>
                <p className="mt-3">
                  {longDate(b.starts_at)} at <span className="font-semibold">{showTime(b.starts_at)}</span>
                </p>
                <p className="text-mist">
                  {b.theatre_name}, {b.theatre_area}. {b.screen_name}
                </p>
              </div>
            </div>

            <h3 className="mt-8 font-semibold">Your seats</h3>
            <ul className="mt-3 divide-y divide-seam/60">
              {b.seats.map((s) => (
                <li key={s.seat_id} className="flex justify-between py-2 text-sm">
                  <span>
                    <span className="font-semibold">
                      {s.row_label}
                      {s.seat_number}
                    </span>{" "}
                    <span className="text-mist">{seatTypeName[s.seat_type]}</span>
                  </span>
                  <span>{rupees(s.price)}</span>
                </li>
              ))}
            </ul>
            <button onClick={changeSeats} className="mt-3 text-sm font-semibold text-brass hover:underline">
              Change seats
            </button>
          </section>

          <aside className="h-fit rounded-xl border border-seam/70 bg-velvet p-6">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-mist">Tickets ({b.seat_count})</dt>
                <dd>{rupees(b.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-mist">Convenience fee</dt>
                <dd>{rupees(b.convenience_fee)}</dd>
              </div>
              <div className="flex justify-between border-t border-seam pt-3 text-base font-semibold">
                <dt>Total</dt>
                <dd>{rupees(b.total_amount)}</dd>
              </div>
            </dl>
            {payError && <p className="mt-4 text-sm text-rose">{payError}</p>}
            <Button onClick={pay} disabled={paying} className="mt-5 w-full py-3">
              {paying ? "Processing payment…" : `Pay ${rupees(b.total_amount)}`}
            </Button>
            <p className="mt-2 text-center text-xs text-mist">Test mode: no real money is charged.</p>

            {policy.data && (
              <div className="mt-6 border-t border-seam pt-4">
                <h3 className="text-sm font-semibold">Cancellation policy</h3>
                <ul className="mt-2 space-y-1 text-xs text-mist">
                  {policy.data.map((r) => (
                    <li key={r.min_hours_before}>{r.label}</li>
                  ))}
                  <li>The convenience fee is not refunded.</li>
                </ul>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
