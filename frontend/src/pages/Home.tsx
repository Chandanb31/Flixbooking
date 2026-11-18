import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import MovieCard from "../components/MovieCard";
import { CertBadge, ErrorNote, Spinner, Tag } from "../components/ui";
import { useApi } from "../lib/api";
import { duration } from "../lib/format";
import type { Movie } from "../lib/types";

function Featured({ movies }: { movies: Movie[] }) {
  const [index, setIndex] = useState(0);
  const movie = movies[index];
  if (!movie) return null;

  return (
    <section className="relative isolate overflow-hidden border-b border-seam/60">
      {/* blurred poster as the room's light */}
      <div
        key={`bg-${movie.slug}`}
        className="feature-in absolute inset-0 -z-10 scale-110 bg-cover bg-center opacity-35 blur-3xl"
        style={{ backgroundImage: `url(${movie.poster_url})` }}
        aria-hidden
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink/30 via-ink/70 to-ink" aria-hidden />

      <div className="mx-auto grid max-w-6xl items-end gap-8 px-4 pb-10 pt-10 md:grid-cols-[260px_1fr] md:pt-16">
        <img
          key={`poster-${movie.slug}`}
          src={movie.poster_url}
          alt={`${movie.title} poster`}
          className="feature-in mx-auto w-48 rounded-lg shadow-2xl shadow-black/60 ring-1 ring-white/10 md:w-full"
        />
        <div key={`text-${movie.slug}`} className="feature-in">
          <h1 className="font-display text-5xl font-extrabold leading-[0.95] tracking-tight text-glow sm:text-7xl">
            {movie.title}
          </h1>
          {movie.tagline && <p className="mt-3 max-w-xl text-lg text-mist">{movie.tagline}</p>}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <CertBadge cert={movie.certificate} />
            <Tag>{movie.language}</Tag>
            <Tag>{duration(movie.duration_min)}</Tag>
            {movie.genres.map((g) => (
              <Tag key={g}>{g}</Tag>
            ))}
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-5">
            <Link
              to={`/movies/${movie.slug}`}
              className="rounded-lg bg-brass px-7 py-3 font-semibold text-ink hover:bg-[#d6b47e]"
            >
              Book tickets
            </Link>
            {movie.rating !== null && (
              <span className="text-mist">
                <span className="font-display text-3xl font-bold text-glow">{Number(movie.rating).toFixed(1)}</span> / 10
                audience rating
              </span>
            )}
          </div>

          {/* pick what's featured */}
          <div className="mt-9 flex gap-3" role="tablist" aria-label="Featured movies">
            {movies.map((m, i) => (
              <button
                key={m.slug}
                role="tab"
                aria-selected={i === index}
                aria-label={m.title}
                onClick={() => setIndex(i)}
                className={`w-12 overflow-hidden rounded-md ring-2 transition sm:w-14 ${
                  i === index ? "ring-brass" : "opacity-50 ring-transparent hover:opacity-90"
                }`}
              >
                <img src={m.poster_url} alt="" className="aspect-[2/3] w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-1.5 text-sm transition-colors ${
        active ? "border-brass bg-brass/15 text-glow" : "border-seam text-mist hover:border-mist hover:text-glow"
      }`}
    >
      {children}
    </button>
  );
}

export default function Home() {
  const { data: movies, error, loading, reload } = useApi<Movie[]>("/movies");
  const [language, setLanguage] = useState<string | null>(null);
  const [genre, setGenre] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const all = movies ?? [];
  const languages = useMemo(() => [...new Set(all.map((m) => m.language))].sort(), [all]);
  const genres = useMemo(() => [...new Set(all.flatMap((m) => m.genres))].sort(), [all]);

  const featured = useMemo(
    () =>
      all
        .filter((m) => m.status === "now_showing")
        .sort((a, b) => Number(b.rating ?? 0) - Number(a.rating ?? 0))
        .slice(0, 5),
    [all],
  );

  const visible = all.filter(
    (m) =>
      (!language || m.language === language) &&
      (!genre || m.genres.includes(genre)) &&
      m.title.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const nowShowing = visible.filter((m) => m.status === "now_showing");
  const comingSoon = visible.filter((m) => m.status === "coming_soon");

  if (loading) return <Spinner label="Loading movies" />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;

  return (
    <>
      <Featured movies={featured} />

      <div className="mx-auto max-w-6xl px-4">
        <div className="sticky top-16 z-20 -mx-4 border-b border-seam/40 bg-ink/90 px-4 py-4 backdrop-blur">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search movies"
              className="w-full rounded-lg border border-seam bg-plush px-4 py-2 text-glow placeholder:text-mist/70 focus:border-brass focus:outline-none lg:w-64"
            />
            <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
              <Chip active={!language} onClick={() => setLanguage(null)}>
                All languages
              </Chip>
              {languages.map((l) => (
                <Chip key={l} active={language === l} onClick={() => setLanguage(language === l ? null : l)}>
                  {l}
                </Chip>
              ))}
              <span className="mx-1 w-px shrink-0 bg-seam" aria-hidden />
              {genres.map((g) => (
                <Chip key={g} active={genre === g} onClick={() => setGenre(genre === g ? null : g)}>
                  {g}
                </Chip>
              ))}
            </div>
          </div>
        </div>

        <section className="mt-10">
          <h2 className="font-display text-3xl font-bold">In cinemas now</h2>
          {nowShowing.length === 0 ? (
            <p className="mt-4 text-mist">No movies match these filters. Try another language or genre.</p>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {nowShowing.map((m) => (
                <MovieCard key={m.slug} movie={m} />
              ))}
            </div>
          )}
        </section>

        {comingSoon.length > 0 && (
          <section className="mt-16">
            <h2 className="font-display text-3xl font-bold">Coming soon</h2>
            <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {comingSoon.map((m) => (
                <MovieCard key={m.slug} movie={m} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
