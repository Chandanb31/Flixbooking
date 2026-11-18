import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CertBadge, ErrorNote, Spinner, Tag } from "../components/ui";
import { useCity } from "../context/CityContext";
import { useApi } from "../lib/api";
import { dayParts, duration, rupees, showTime } from "../lib/format";
import type { Movie, ShowSlot, TheatreShows } from "../lib/types";

function availability(s: ShowSlot) {
  const ratio = s.total_seats ? s.free_seats / s.total_seats : 0;
  if (s.free_seats === 0) return { label: "Sold out", tone: "border-seam text-mist/60 cursor-not-allowed" };
  if (ratio < 0.15) return { label: "Filling fast", tone: "border-rose/60 text-rose hover:bg-rose/10" };
  if (ratio < 0.5) return { label: "Selling", tone: "border-brass/60 text-brass hover:bg-brass/10" };
  return { label: "Available", tone: "border-sage/60 text-sage hover:bg-sage/10" };
}

function Showtimes({ slug }: { slug: string }) {
  const { city } = useCity();
  const citySlug = city?.slug ?? null;
  const dates = useApi<string[]>(citySlug ? `/movies/${slug}/dates?city=${citySlug}` : null);
  const [picked, setPicked] = useState<string | null>(null);

  // Reset the chosen date when the city changes or dates load.
  useEffect(() => {
    setPicked(dates.data?.[0] ?? null);
  }, [dates.data]);

  const theatres = useApi<TheatreShows[]>(
    citySlug && picked ? `/movies/${slug}/showtimes?city=${citySlug}&date=${picked}` : null,
  );

  if (dates.loading) return <Spinner label="Finding shows" />;
  if (dates.error) return <ErrorNote message={dates.error} onRetry={dates.reload} />;
  if (!dates.data?.length)
    return (
      <p className="rounded-xl border border-seam bg-velvet p-6 text-mist">
        No upcoming shows in {city?.name}. Pick another city from the top bar.
      </p>
    );

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Show dates">
        {dates.data.map((d) => {
          const p = dayParts(d);
          const active = d === picked;
          return (
            <button
              key={d}
              role="tab"
              aria-selected={active}
              onClick={() => setPicked(d)}
              className={`flex w-16 shrink-0 flex-col items-center rounded-lg border py-2 transition-colors ${
                active ? "border-brass bg-brass text-ink" : "border-seam text-mist hover:border-mist hover:text-glow"
              }`}
            >
              <span className="text-xs">{p.weekday}</span>
              <span className="font-display text-2xl font-bold leading-tight">{p.day}</span>
              <span className="text-xs">{p.month}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 space-y-4">
        {theatres.loading && <Spinner label="Loading showtimes" />}
        {theatres.error && <ErrorNote message={theatres.error} onRetry={theatres.reload} />}
        {theatres.data?.map((t) => (
          <article key={t.id} className="rounded-xl border border-seam/70 bg-velvet p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              <h3 className="text-lg font-semibold">
                {t.name}, {t.area}
              </h3>
              <p className="text-sm text-mist">{t.amenities.join(", ")}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {t.shows.map((s) => {
                const a = availability(s);
                const content = (
                  <>
                    <span className="font-semibold">{showTime(s.starts_at)}</span>
                    <span className="text-xs opacity-80">
                      {s.format}, from {rupees(s.min_price)}
                    </span>
                  </>
                );
                return s.free_seats === 0 ? (
                  <span key={s.id} className={`flex flex-col items-center rounded-lg border px-4 py-2 ${a.tone}`}>
                    {content}
                  </span>
                ) : (
                  <Link
                    key={s.id}
                    to={`/shows/${s.id}`}
                    title={`${a.label}: ${s.free_seats} of ${s.total_seats} seats free`}
                    className={`flex flex-col items-center rounded-lg border px-4 py-2 transition-colors ${a.tone}`}
                  >
                    {content}
                  </Link>
                );
              })}
            </div>
          </article>
        ))}
      </div>

      <p className="mt-5 flex flex-wrap gap-x-5 gap-y-1 text-sm text-mist">
        <span><span className="text-sage">●</span> Plenty of seats</span>
        <span><span className="text-brass">●</span> Selling</span>
        <span><span className="text-rose">●</span> Filling fast</span>
      </p>
    </div>
  );
}

export default function MovieDetail() {
  const { slug = "" } = useParams();
  const { data: movie, error, loading, reload } = useApi<Movie>(`/movies/${slug}`);

  if (loading) return <Spinner />;
  if (error || !movie) return <ErrorNote message={error ?? "Movie not found."} onRetry={reload} />;

  const release = dayParts(movie.release_date);

  return (
    <>
      <section className="relative isolate overflow-hidden border-b border-seam/60">
        <div
          className="absolute inset-0 -z-10 scale-110 bg-cover bg-center opacity-30 blur-3xl"
          style={{ backgroundImage: `url(${movie.poster_url})` }}
          aria-hidden
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink/40 to-ink" aria-hidden />
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[240px_1fr] md:py-14">
          <img
            src={movie.poster_url}
            alt={`${movie.title} poster`}
            className="mx-auto w-44 rounded-lg shadow-2xl shadow-black/60 ring-1 ring-white/10 md:w-full"
          />
          <div>
            <h1 className="font-display text-5xl font-extrabold leading-none tracking-tight sm:text-6xl">{movie.title}</h1>
            {movie.tagline && <p className="mt-3 text-lg text-mist">{movie.tagline}</p>}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <CertBadge cert={movie.certificate} />
              <Tag>{movie.language}</Tag>
              <Tag>{duration(movie.duration_min)}</Tag>
              {movie.formats.map((f) => (
                <Tag key={f}>{f}</Tag>
              ))}
            </div>
            {movie.synopsis && <p className="mt-6 max-w-2xl leading-relaxed text-glow/90">{movie.synopsis}</p>}
            <dl className="mt-6 grid max-w-2xl gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-mist">Genre</dt>
                <dd>{movie.genres.join(", ")}</dd>
              </div>
              <div>
                <dt className="text-mist">Director</dt>
                <dd>{movie.director}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-mist">Cast</dt>
                <dd>{movie.cast_members.join(", ")}</dd>
              </div>
              {movie.rating !== null && (
                <div>
                  <dt className="text-mist">Audience rating</dt>
                  <dd>
                    <span className="font-display text-2xl font-bold">{Number(movie.rating).toFixed(1)}</span> / 10
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="mb-5 font-display text-3xl font-bold">
          {movie.status === "coming_soon" ? "Bookings open soon" : "Pick a show"}
        </h2>
        {movie.status === "coming_soon" ? (
          <p className="rounded-xl border border-seam bg-velvet p-6 text-mist">
            {movie.title} reaches cinemas on {release.weekday}, {release.day} {release.month}. Showtimes appear here
            once theatres open bookings.
          </p>
        ) : (
          <Showtimes slug={movie.slug} />
        )}
      </section>
    </>
  );
}
