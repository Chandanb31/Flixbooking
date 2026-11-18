import { Link } from "react-router-dom";
import type { Movie } from "../lib/types";
import { dayParts } from "../lib/format";

export default function MovieCard({ movie }: { movie: Movie }) {
  const soon = movie.status === "coming_soon";
  const release = dayParts(movie.release_date);
  return (
    <Link to={`/movies/${movie.slug}`} className="group block">
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-plush ring-1 ring-seam/70 transition group-hover:ring-brass/70">
        <img
          src={movie.poster_url}
          alt={`${movie.title} poster`}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
        {movie.rating !== null && (
          <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-ink/80 px-2 py-0.5 text-sm font-semibold backdrop-blur">
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-brass" fill="currentColor" aria-hidden>
              <path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.8z" />
            </svg>
            {Number(movie.rating).toFixed(1)}
          </span>
        )}
      </div>
      <h3 className="mt-3 font-semibold leading-snug text-glow group-hover:text-brass">{movie.title}</h3>
      <p className="mt-0.5 text-sm text-mist">
        {soon ? `In cinemas ${release.day} ${release.month}` : `${movie.language}, ${movie.genres.slice(0, 2).join(" / ")}`}
      </p>
    </Link>
  );
}
