import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCity } from "../context/CityContext";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label="FlixBooking home">
      <svg viewBox="0 0 64 64" className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden>
        <path d="M10 18h44v9a5 5 0 0 0 0 10v9H10v-9a5 5 0 0 0 0-10z" fill="#c9a46a" />
        <path d="M27 25l12 7-12 7z" fill="#16121b" />
      </svg>
      <span className="font-display text-xl font-bold tracking-wide text-glow sm:text-2xl">FlixBooking</span>
    </Link>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { cities, city, setCitySlug } = useCity();
  const navigate = useNavigate();

  const link = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors ${isActive ? "text-glow" : "text-mist hover:text-glow"}`;

  return (
    <header className="sticky top-0 z-30 border-b border-seam/60 bg-ink/85 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:gap-6">
        <Logo />

        <label className="ml-auto flex items-center gap-2 sm:ml-4">
          <span className="sr-only">City</span>
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-brass" fill="currentColor" aria-hidden>
            <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
          </svg>
          <select
            value={city?.slug ?? ""}
            onChange={(e) => setCitySlug(e.target.value)}
            className="cursor-pointer rounded-md bg-transparent py-1 pr-1 text-sm font-medium text-glow outline-none"
          >
            {cities.map((c) => (
              <option key={c.slug} value={c.slug} className="bg-velvet">
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <div className="hidden items-center gap-6 sm:ml-auto sm:flex">
          <NavLink to="/" end className={link}>
            Movies
          </NavLink>
          {user && (
            <NavLink to="/bookings" className={link}>
              My bookings
            </NavLink>
          )}
        </div>

        {user ? (
          <div className="flex items-center gap-3">
            <Link
              to="/bookings"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-plush font-semibold text-brass sm:hidden"
              aria-label="My bookings"
            >
              {user.full_name[0]?.toUpperCase()}
            </Link>
            <span className="hidden text-sm text-mist md:inline">Hi, {user.full_name.split(" ")[0]}</span>
            <button
              onClick={() => {
                logout();
                navigate("/");
              }}
              className="hidden text-sm font-medium text-mist hover:text-glow sm:inline"
            >
              Log out
            </button>
          </div>
        ) : (
          <Link to="/login" className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-ink hover:bg-[#d6b47e]">
            Log in
          </Link>
        )}
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-24 border-t border-seam/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-mist sm:flex-row sm:justify-between">
        <span>FlixBooking. A full-stack portfolio project.</span>
        <span>React, FastAPI and PostgreSQL</span>
      </div>
    </footer>
  );
}
