import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button, ErrorNote, Spinner } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { api, useApi } from "../lib/api";
import { rupees, seatTypeName, showDate, showTime } from "../lib/format";
import type { Booking, Seat, SeatType, ShowDetail } from "../lib/types";

const MAX_SEATS = 10;
const GRID_COLUMNS = 16;
const REFRESH_MS = 15000; // re-check the seat map so other people's holds appear

function SeatButton({ seat, selected, onToggle }: { seat: Seat; selected: boolean; onToggle: () => void }) {
  const wide = seat.seat_type === "RECLINER";
  const unavailable = seat.status !== "available";
  const label = `${seat.row_label}${seat.seat_number}`;

  let look = "border-mist/45 text-mist hover:border-brass hover:text-glow";
  if (selected) look = "border-brass bg-brass text-ink";
  else if (seat.status === "booked") look = "border-transparent bg-seam/70 text-transparent";
  else if (seat.status === "held") look = "seat-held border-seam text-transparent";

  return (
    <button
      type="button"
      disabled={unavailable}
      onClick={onToggle}
      aria-pressed={selected}
      aria-label={`Seat ${label}, ${seatTypeName[seat.seat_type]}${seat.is_accessible ? ", wheelchair accessible" : ""}${
        unavailable ? `, ${seat.status === "booked" ? "booked" : "on hold"}` : ""
      }`}
      style={{ gridColumn: `${seat.col_index} / span ${wide ? 2 : 1}` }}
      className={`relative flex h-5 items-center justify-center border text-[9px] font-semibold transition-colors disabled:cursor-not-allowed sm:h-8 sm:text-[11px] ${
        wide ? "rounded-t-xl rounded-b-md" : "rounded-t-lg rounded-b-sm"
      } ${look}`}
    >
      {seat.is_accessible && !unavailable && !selected ? (
        <svg viewBox="0 0 24 24" className="h-3 w-3 sm:h-3.5 sm:w-3.5" fill="currentColor" aria-hidden>
          <circle cx="12" cy="4" r="2" />
          <path d="M10 7h3v5h4l3 6-2 1-2.5-5H10a2 2 0 0 1-2-2zm-2 5.5a5.5 5.5 0 1 0 8.4 4.7l1.6.8A7.5 7.5 0 1 1 7 10.8z" />
        </svg>
      ) : (
        !unavailable && seat.seat_number
      )}
    </button>
  );
}

export default function SeatSelect() {
  const { showId = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: show, error, loading, reload, setData } = useApi<ShowDetail>(`/shows/${showId}`);
  const [selected, setSelected] = useState<number[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Quietly refresh seat availability while the page is open.
  useEffect(() => {
    const id = window.setInterval(() => {
      api<ShowDetail>(`/shows/${showId}`)
        .then((fresh) => {
          setData(fresh);
          const free = new Set(fresh.seats.filter((s) => s.status === "available").map((s) => s.id));
          setSelected((cur) => {
            const kept = cur.filter((id) => free.has(id));
            if (kept.length < cur.length) setNotice("Some seats you picked were just taken by someone else.");
            return kept;
          });
        })
        .catch(() => {});
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [showId, setData]);

  const priceOf = useMemo(() => {
    const m = new Map<SeatType, number>();
    show?.prices.forEach((p) => m.set(p.seat_type, Number(p.price)));
    return m;
  }, [show]);

  // Rows grouped by seat type, front of the cinema (row A) first.
  const sections = useMemo(() => {
    if (!show) return [];
    const rows = new Map<string, Seat[]>();
    [...show.seats]
      .sort((a, b) => a.row_label.localeCompare(b.row_label) || a.col_index - b.col_index)
      .forEach((s) => rows.set(s.row_label, [...(rows.get(s.row_label) ?? []), s]));
    const out: { type: SeatType; rows: [string, Seat[]][] }[] = [];
    rows.forEach((seats, label) => {
      const type = seats[0].seat_type;
      const last = out[out.length - 1];
      if (last && last.type === type) last.rows.push([label, seats]);
      else out.push({ type, rows: [[label, seats]] });
    });
    return out;
  }, [show]);

  if (loading) return <Spinner label="Loading seats" />;
  if (error || !show) return <ErrorNote message={error ?? "Show not found."} onRetry={reload} />;

  const seatById = new Map(show.seats.map((s) => [s.id, s]));
  const chosen = selected.map((id) => seatById.get(id)).filter((s): s is Seat => !!s);
  const total = chosen.reduce((sum, s) => sum + (priceOf.get(s.seat_type) ?? 0), 0);

  const toggle = (seat: Seat) => {
    setNotice(null);
    setSelected((cur) => {
      if (cur.includes(seat.id)) return cur.filter((id) => id !== seat.id);
      if (cur.length >= MAX_SEATS) {
        setNotice(`You can book up to ${MAX_SEATS} seats at a time.`);
        return cur;
      }
      return [...cur, seat.id];
    });
  };

  const proceed = async () => {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(`/shows/${showId}`)}`);
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const booking = await api<Booking>(`/shows/${showId}/hold`, { method: "POST", body: { seat_ids: selected } });
      navigate(`/checkout/${booking.booking_code}`);
    } catch (e) {
      setNotice((e as Error).message);
      setSelected([]);
      reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pb-36">
      <div className="border-b border-seam/60 bg-velvet/60">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4">
          <img src={show.poster_url} alt="" className="hidden h-16 rounded sm:block" />
          <div className="min-w-0">
            <Link to={`/movies/${show.movie_slug}`} className="font-display text-2xl font-bold hover:text-brass sm:text-3xl">
              {show.movie_title}
            </Link>
            <p className="truncate text-sm text-mist">
              {show.theatre_name}, {show.theatre_area} / {show.screen_name} / {showDate(show.starts_at)},{" "}
              {showTime(show.starts_at)} / {show.format}, {show.language}
            </p>
          </div>
        </div>
      </div>

      {!show.is_bookable ? (
        <ErrorNote message="Booking for this show has closed." />
      ) : (
        <div className="mx-auto max-w-4xl px-4">
          {/* the screen, with its light falling over the seats */}
          <div className="relative mx-auto mt-10 max-w-2xl">
            <div className="screen-arc mx-6" />
            <div className="screen-light pointer-events-none absolute left-0 right-0 top-3.5 h-64" aria-hidden />
            <p className="mt-3 text-center text-sm text-mist">Screen this way</p>
          </div>

          <div className="mt-8 overflow-x-auto pb-2">
            <div className="mx-auto w-max min-w-full space-y-8">
              {sections.map((sec) => (
                <section key={sec.type} aria-label={`${seatTypeName[sec.type]} seats`}>
                  <h2 className="mb-3 flex items-baseline justify-center gap-3 border-b border-seam/50 pb-2 text-sm">
                    <span className="font-semibold text-glow">{seatTypeName[sec.type]}</span>
                    <span className="text-mist">{rupees(priceOf.get(sec.type) ?? 0)}</span>
                  </h2>
                  <div className="space-y-2">
                    {sec.rows.map(([label, seats]) => (
                      <div key={label} className="flex items-center justify-center gap-2 sm:gap-3">
                        <span className="w-3 text-right text-xs font-semibold text-mist">{label}</span>
                        <div
                          className="grid gap-1 [--seat:1.05rem] sm:gap-1.5 sm:[--seat:2rem]"
                          style={{ gridTemplateColumns: `repeat(${GRID_COLUMNS}, var(--seat))` }}
                        >
                          {seats.map((s) => (
                            <SeatButton key={s.id} seat={s} selected={selected.includes(s.id)} onToggle={() => toggle(s)} />
                          ))}
                        </div>
                        <span className="hidden w-3 text-xs font-semibold text-mist sm:inline">{label}</span>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-mist">
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-t-md rounded-b-sm border border-mist/45" /> Available
            </span>
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-t-md rounded-b-sm bg-brass" /> Your pick
            </span>
            <span className="flex items-center gap-2">
              <span className="seat-held h-4 w-4 rounded-t-md rounded-b-sm border border-seam" /> Someone is paying
            </span>
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-t-md rounded-b-sm bg-seam/70" /> Booked
            </span>
          </div>
        </div>
      )}

      {/* summary bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-seam bg-velvet/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1" aria-live="polite">
            {notice ? (
              <p className="text-sm text-rose">{notice}</p>
            ) : chosen.length ? (
              <p className="truncate text-sm text-mist">
                <span className="font-semibold text-glow">
                  {chosen.length} {chosen.length === 1 ? "seat" : "seats"}:
                </span>{" "}
                {chosen.map((s) => `${s.row_label}${s.seat_number}`).join(", ")}
              </p>
            ) : (
              <p className="text-sm text-mist">Tap seats to choose them. Seats are held for 10 minutes while you pay.</p>
            )}
          </div>
          <Button onClick={proceed} disabled={!chosen.length || busy} className="sm:min-w-56">
            {busy ? "Holding your seats…" : chosen.length ? `Continue, ${rupees(total)}` : "Choose seats"}
          </Button>
        </div>
      </div>
    </div>
  );
}
