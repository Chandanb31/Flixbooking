import { Link } from "react-router-dom";
import { ErrorNote, Spinner } from "../components/ui";
import { useApi } from "../lib/api";
import { rupees, showDate, showTime } from "../lib/format";
import type { Booking } from "../lib/types";

function Row({ b }: { b: Booking }) {
  const cancelled = b.status === "cancelled";
  return (
    <Link
      to={`/bookings/${b.booking_code}`}
      className="flex gap-4 rounded-xl border border-seam/70 bg-velvet p-4 transition-colors hover:border-brass/60"
    >
      <img src={b.poster_url} alt="" className="w-16 rounded-md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-2xl font-bold leading-tight">{b.movie_title}</h3>
          {cancelled && (
            <span className="shrink-0 rounded-full bg-rose/15 px-3 py-0.5 text-xs font-semibold text-rose">Cancelled</span>
          )}
        </div>
        <p className="text-sm text-mist">
          {showDate(b.starts_at)}, {showTime(b.starts_at)}. {b.theatre_name}, {b.theatre_area}
        </p>
        <p className="mt-1 text-sm">
          {b.seats.map((s) => `${s.row_label}${s.seat_number}`).join(", ")}
          <span className="text-mist">
            {" "}
            / {cancelled ? `refunded ${rupees(b.refund_amount)}` : rupees(b.total_amount)}
          </span>
        </p>
      </div>
    </Link>
  );
}

export default function MyBookings() {
  const { data, error, loading, reload } = useApi<Booking[]>("/bookings/me");
  if (loading) return <Spinner label="Loading your bookings" />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;

  const now = Date.now();
  const all = data ?? [];
  const upcoming = all
    .filter((b) => b.status === "confirmed" && new Date(b.starts_at).getTime() > now)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const past = all.filter((b) => !upcoming.includes(b));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-4xl font-bold">My bookings</h1>

      {all.length === 0 ? (
        <div className="mt-8 rounded-xl border border-seam bg-velvet p-8 text-center">
          <p className="text-lg">No bookings yet.</p>
          <Link to="/" className="mt-3 inline-block font-semibold text-brass hover:underline">
            Find a movie to watch
          </Link>
        </div>
      ) : (
        <>
          <section className="mt-8">
            <h2 className="mb-3 font-semibold text-mist">Upcoming</h2>
            {upcoming.length ? (
              <div className="space-y-3">
                {upcoming.map((b) => (
                  <Row key={b.booking_code} b={b} />
                ))}
              </div>
            ) : (
              <p className="text-mist">Nothing coming up.</p>
            )}
          </section>
          {past.length > 0 && (
            <section className="mt-10">
              <h2 className="mb-3 font-semibold text-mist">Past and cancelled</h2>
              <div className="space-y-3 opacity-80">
                {past.map((b) => (
                  <Row key={b.booking_code} b={b} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
