# FlixBooking

A movie ticket booking app: browse movies, pick a city, date and showtime, choose seats on a live seat map, pay, get a ticket, and cancel for a refund.

**Stack:** React + TypeScript + Tailwind (frontend) · FastAPI (backend API) · PostgreSQL (database)

```
flixbooking/
├── frontend/     React app — everything the user sees
│   ├── public/posters/    the 12 movie posters (SVG)
│   └── src/
│       ├── pages/         Home, MovieDetail, SeatSelect, Checkout, Ticket, MyBookings, Auth
│       ├── components/    Navbar, MovieCard, shared UI pieces
│       ├── context/       logged-in user, selected city
│       └── lib/           API client, types, formatting
│
├── backend/      FastAPI server — the API the frontend calls
│   └── app/
│       ├── main.py        app setup + background jobs
│       ├── routers/       API endpoints (auth, catalog, shows, bookings)
│       ├── services/      booking logic (seat locking, payment, refunds)
│       ├── core/          settings, passwords, JWT tokens
│       └── db.py          database connection
│
├── database/     PostgreSQL — tables, functions and data
│   ├── schema.sql         all tables and rules
│   ├── functions.sql      refresh_shows(), release_expired_holds()
│   ├── seed/              cities, movies.json, theatres, seats, showtimes
│   ├── setup_all.sql      everything above in one file (run this)
│   └── reset.sql          wipe everything (development only)
│
└── tools/        make_posters.py, build_sql.py
```

---

## 1. Set up the database (PostgreSQL)

PostgreSQL is the database. You need one running somewhere, then you run `database/setup_all.sql` on it once. Pick **one** option.

### Option A — Neon (free cloud Postgres, recommended)

Nothing to install, and the same database works later when you deploy.

1. Go to **https://neon.com** and sign up (GitHub or Google login works).
2. Create a project:
   - Project name: `flixbooking`
   - Region: the closest one to you (for India, Asia Pacific / Singapore)
   - Leave the Postgres version as the default.
3. On the project dashboard click **Connect**. Copy the connection string. It looks like:
   ```
   postgresql://neondb_owner:AbC123xyz@ep-cool-name-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
   Keep it private — it contains your password.
4. Create the tables and data: in the Neon dashboard open **SQL Editor**, paste the whole contents of `database/setup_all.sql`, and click **Run**. The last result should show `shows_created` with a number like 560.

> Neon's free plan sleeps the database when nobody uses it. The first request after a break can take a second or two; that's normal.

### Option B — PostgreSQL on your own computer

1. Download and install from **https://www.postgresql.org/download/** (on Windows the installer also gives you **pgAdmin** and **psql**). Remember the password you set for the `postgres` user.
2. Create the database and load everything (in a terminal, from the `flixbooking` folder):
   ```bash
   psql -U postgres -c "CREATE DATABASE flixbooking"
   psql -U postgres -d flixbooking -f database/setup_all.sql
   ```
   (Or in pgAdmin: create a database called `flixbooking`, open the Query Tool, paste `setup_all.sql`, run.)
3. Your connection string is:
   ```
   postgresql://postgres:YOUR_PASSWORD@localhost:5432/flixbooking
   ```

---

## 2. Run the backend (FastAPI)

Needs Python 3.11 or newer.

```bash
cd backend
python -m venv .venv
# Windows:      .venv\Scripts\activate
# macOS/Linux:  source .venv/bin/activate
pip install -r requirements.txt

# create your settings file
# Windows:      copy .env.example .env
# macOS/Linux:  cp .env.example .env
```

Open `backend/.env` and set:
- `DATABASE_URL` — the connection string from step 1
- `JWT_SECRET` — any long random text. Generate one with `python -c "import secrets; print(secrets.token_urlsafe(48))"`

Start it:
```bash
uvicorn app.main:app --reload
```

Check it works:
- http://localhost:8000/api/health → `{"status":"ok","database":"connected"}`
- http://localhost:8000/docs → interactive API docs where you can try every endpoint

## 3. Run the frontend (React)

Needs Node.js 20 or newer. In a **second** terminal:

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. Create an account, pick a movie, choose seats, pay (test mode), and cancel from the ticket page to see the refund rules.

---

## How the important parts work

**No double booking.** Booking seats runs in one database transaction that locks the seat rows (`SELECT … FOR UPDATE`). If two people click the same seat at the same moment, the second request waits, then sees the seat is taken and gets a clear error. The `UNIQUE (show_id, seat_id)` constraint backs this up.

**10-minute seat hold.** Choosing seats creates a `pending` booking and marks seats `held` until a deadline. Pay in time and they become `booked`. If not, they go back on sale — the API treats expired holds as free immediately, and a background job tidies up every minute.

**No overlapping shows.** The database itself refuses two shows on one screen whose times (plus a 20-minute cleaning buffer) overlap, using a PostgreSQL exclusion constraint.

**Refund policy lives in data.** The `refund_rules` table says 24h+ → 100%, 4–24h → 50%, under 4h → no cancellation. Change the rows to change the policy. The convenience fee is never refunded.

**Pricing.** Classic ₹180 / Prime ₹260 / Recliner ₹480, +₹120 on IMAX and 4DX screens, +₹40 from 5 PM, +₹30 on weekends, plus ₹25 per seat convenience fee.

**Rolling schedule.** `refresh_shows(7)` keeps a week of showtimes scheduled. The backend runs it every hour, so the site never runs out of shows.

## API endpoints

| Method | Path | What it does |
|---|---|---|
| POST | `/api/auth/register` | Create account, returns a login token |
| POST | `/api/auth/login` | Log in, returns a login token |
| GET | `/api/auth/me` | The logged-in user |
| GET | `/api/cities` | All cities |
| GET | `/api/movies` | Movies (filters: `status`, `language`, `genre`, `q`) |
| GET | `/api/movies/{slug}` | One movie |
| GET | `/api/movies/{slug}/dates?city=` | Dates with shows in a city |
| GET | `/api/movies/{slug}/showtimes?city=&date=` | Theatres and showtimes |
| GET | `/api/shows/{id}` | Show details, prices and seat map |
| POST | `/api/shows/{id}/hold` | Hold seats for 10 minutes |
| GET | `/api/bookings/me` | My bookings |
| GET | `/api/bookings/{code}` | One booking |
| POST | `/api/bookings/{code}/pay` | Pay (test mode) and confirm |
| POST | `/api/bookings/{code}/release` | Give up held seats |
| GET | `/api/bookings/{code}/refund-quote` | How much a cancellation would refund |
| POST | `/api/bookings/{code}/cancel` | Cancel and refund |
| GET | `/api/refund-policy` | The refund rules |

## Adding or changing movies

1. Edit `database/seed/movies.json`.
2. For a new movie, add a drawing function for its poster in `tools/make_posters.py` (copy one of the existing `art_…` functions), then run:
   ```bash
   python tools/make_posters.py database/seed/movies.json frontend/public/posters
   ```
3. Rebuild the SQL and load the movies:
   ```bash
   python tools/build_sql.py
   psql "YOUR_DATABASE_URL" -f database/seed/02_movies.sql
   ```
   (Or paste `02_movies.sql` into the Neon SQL Editor.) New movies get showtimes as new days are scheduled. In development, to rebuild everything from scratch, run `reset.sql` and then `setup_all.sql`.

## Troubleshooting

- **`password authentication failed`** — the password in `DATABASE_URL` is wrong. Copy the string again from Neon.
- **`relation "movies" does not exist`** — `setup_all.sql` hasn't been run on this database yet.
- **Frontend says it can't reach the server** — the backend isn't running, or isn't on port 8000.
- **`psql` not found on Windows** — use pgAdmin or the Neon SQL Editor instead, or add `C:\Program Files\PostgreSQL\<version>\bin` to your PATH.

## Next phases

- Razorpay test-mode payments with webhooks (replace the mock in `booking_service.confirm_booking`)
- Live seat updates over WebSockets (today the seat map refreshes every 15 seconds)
- E-ticket email with a QR code
- Organizer dashboard: seat layout designer, scheduling, sales analytics
- Tests (pytest), Docker Compose, GitHub Actions, deployment (Vercel + Render + Neon)
