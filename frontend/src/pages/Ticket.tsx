import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Button, ErrorNote, Spinner } from "../components/ui";
import { api, useApi } from "../lib/api";
import { duration, longDate, rupees, showTime } from "../lib/format";
import type { Booking, RefundQuote } from "../lib/types";

function CancelPanel({ booking, onDone }: { booking: Booking; onDone: () => void }) {
  const [quote, setQuote] = useState<RefundQuote | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const ask = async () => {
    setBusy(true);
    setErr(null);
    try {
      setQuote(await api<RefundQuote>(`/bookings/${booking.booking_code}/refund-quote`));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api(`/bookings/${booking.booking_code}/cancel`, { method: "POST" });
      onDone();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  if (!quote)
    return (
      <div className="mt-6 text-center">
        <Button variant="ghost" onClick={ask} disabled={busy}>
          {busy ? "Checking refund…" : "Cancel booking"}
        </Button>
        {err && <p className="mt-2 text-sm text-rose">{err}</p>}
      </div>
    );

  return (
    <div className="mt-6 rounded-xl border border-seam bg-velvet p-5">
      {quote.can_cancel ? (
        <>
          <p className="font-semibold">
            Cancel and get {rupees(quote.refund_amount)} back ({quote.refund_percent}% of the ticket price)?
          </p>
          <p className="mt-1 text-sm text-mist">
            {quote.policy}. The {rupees(quote.non_refundable_fee)} convenience fee isn't refunded. The seats go back on
            sale straight away.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="danger" onClick={confirm} disabled={busy}>
              {busy ? "Cancelling…" : "Cancel booking"}
            </Button>
            <Button variant="ghost" onClick={() => setQuote(null)} disabled={busy}>
              Keep my tickets
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="font-semibold">This booking can't be cancelled.</p>
          <p className="mt-1 text-sm text-mist">{quote.reason}</p>
        </>
      )}
      {err && <p className="mt-3 text-sm text-rose">{err}</p>}
    </div>
  );
}

export default function Ticket() {
  const { code = "" } = useParams();
  const [params] = useSearchParams();
  const { data: b, error, loading, reload } = useApi<Booking>(`/bookings/${code}`);

  if (loading) return <Spinner label="Loading ticket" />;
  if (error || !b) return <ErrorNote message={error ?? "Booking not found."} onRetry={reload} />;

  const cancelled = b.status === "cancelled";
  const upcoming = new Date(b.starts_at).getTime() > Date.now();
  const seatList = b.seats.map((s) => `${s.row_label}${s.seat_number}`).join(", ");

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      {params.get("new") && b.status === "confirmed" && (
        <p className="mb-6 text-center text-lg">
          You're booked. Enjoy <span className="font-semibold">{b.movie_title}</span>.
        </p>
      )}

      <article
        className={`overflow-hidden rounded-2xl bg-velvet ring-1 ring-seam ${cancelled ? "opacity-70" : ""}`}
        aria-label="Ticket"
      >
        <div className="relative h-40 overflow-hidden">
          <img src={b.poster_url} alt="" className="h-full w-full object-cover object-top blur-[2px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-velvet via-velvet/60 to-transparent" />
          <div className="absolute bottom-4 left-6 right-6">
            <h1 className="font-display text-4xl font-extrabold leading-none">{b.movie_title}</h1>
            <p className="mt-1 text-sm text-mist">
              {b.certificate}, {b.language}, {b.format}, {duration(b.duration_min)}
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 px-6 py-5 text-sm">
          <div>
            <dt className="text-mist">Date</dt>
            <dd className="font-semibold">{longDate(b.starts_at)}</dd>
          </div>
          <div>
            <dt className="text-mist">Time</dt>
            <dd className="font-semibold">{showTime(b.starts_at)}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-mist">Cinema</dt>
            <dd className="font-semibold">
              {b.theatre_name}, {b.theatre_area}
            </dd>
            <dd className="text-mist">{b.theatre_address}</dd>
          </div>
          <div>
            <dt className="text-mist">{b.screen_name}</dt>
            <dd className="font-display text-2xl font-bold">{seatList}</dd>
          </div>
          <div>
            <dt className="text-mist">Paid</dt>
            <dd className="font-semibold">{rupees(b.total_amount)}</dd>
          </div>
        </dl>

        {/* perforation */}
        <div className="relative h-6">
          <div className="absolute -left-3 top-0 h-6 w-6 rounded-full bg-ink" />
          <div className="absolute -right-3 top-0 h-6 w-6 rounded-full bg-ink" />
          <div className="absolute left-6 right-6 top-3 border-t-2 border-dashed border-seam" />
        </div>

        <div className="px-6 pb-6 pt-3 text-center">
          <p className="text-sm text-mist">Booking code</p>
          <p className="font-display text-4xl font-bold tracking-[0.12em] text-brass">{b.booking_code}</p>
          <p className="mt-2 text-sm text-mist">
            {cancelled
              ? `Cancelled. ${rupees(b.refund_amount)} refunded to your original payment method.`
              : "Show this code at the cinema entrance."}
          </p>
        </div>
      </article>

      {b.status === "confirmed" && upcoming && <CancelPanel booking={b} onDone={reload} />}

      <p className="mt-8 text-center">
        <Link to="/bookings" className="font-semibold text-brass hover:underline">
          All my bookings
        </Link>
      </p>
    </div>
  );
}
