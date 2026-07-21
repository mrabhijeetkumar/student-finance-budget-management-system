# Student Finance and Budget Management System

A full-stack web application for students to manage their finances, track expenses, set budgets, and achieve savings goals.

## Backend database configuration (Supabase-ready)

The backend now supports **managed PostgreSQL** (including Supabase) for persistent multi-user data.

### 1) Configure environment variables

Copy `backend/.env.example` to `backend/.env` and fill in your secrets.

```bash
cp backend/.env.example backend/.env
```

Required values:
- `DATABASE_URL` → your Supabase/PostgreSQL connection string
- `SECRET_KEY` and `JWT_SECRET_KEY` → long random values

> Security note: credentials should be stored in `.env` / deployment secrets, **not hardcoded or encoded in source code**.

### 2) Install backend dependencies

```bash
pip install -r backend/requirements.txt
```

### 3) Run backend

```bash
cd backend
python app.py
```

On startup, the app initializes database tables automatically.

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The frontend expects the backend at `http://127.0.0.1:5000/api` by default (see `frontend/src/services/api.js`). Set `VITE_API_BASE_URL` in a `frontend/.env` file to point elsewhere.

## ⚠️ Security note

An earlier version of `backend/.env` in this project contained a **live Supabase database password**. It has been removed from this copy and `.env` is git-ignored, but if that password was ever shared, committed, or uploaded anywhere, **rotate it immediately** from your Supabase project settings and update your local `.env` with the new value.

## Recent updates

**Fixes**
- `income` endpoints could crash with a raw HTML 500/415 error on malformed or missing JSON bodies; all routes now parse the body safely and return a clean JSON error instead.
- Expense/income/budget amount of `0` was incorrectly rejected as "required"; fixed the validation to only reject missing values.
- Removed a stray root-level `package.json`/`package-lock.json` (an unused `recharts` install left over in the wrong folder).
- Removed the unused, unwired `tailwind.config.js` (Tailwind was never installed or imported — all styling is plain CSS in `App.css`).
- Fixed the browser tab title ("BudgifyX" → "FinTrack Pro") to match the actual app branding.
- Toasts now auto-dismiss instead of staying on screen forever.
- The profile dropdown no longer shows a fake "Member since today" — it now links to a real Profile page.
- Frontend was defaulting to a remote Render URL even for local dev, causing long timeouts; local dev now defaults to `http://127.0.0.1:5000/api`.
- CORS is now configurable via `ALLOWED_ORIGINS` instead of allowing every origin unconditionally.

**New features (backend + frontend, fully wired up)**
- **Goals** — create savings goals with a target amount and deadline, add/withdraw funds, track progress.
- **Recurring transactions** — track subscriptions/bills, mark as paid (auto-logs an expense and advances the due date), pause/resume, edit, delete.
- **Profile page** — update name, monthly allowance, semester, student type, and change your password.
- **Edit for Income entries** — Income now supports editing existing records, matching Expenses.

The database schema already had `profiles`, `goals`, and `recurring_expenses` tables defined, but their routes were empty placeholder files — these features now work end-to-end, including against the Postgres/Supabase schema.

## Deploying: Supabase + Render + Netlify

### 1. Supabase (database)
1. Open your Supabase project → **Settings → Database → Connection string** (URI format).
2. Copy it — it looks like `postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres`.
3. ⚠️ If this password was ever exposed anywhere (shared file, chat, public repo), reset it first from **Database → Reset database password**.
4. You do **not** need to run the schema manually — the backend runs `schema/schema_postgres.sql` automatically on startup (`init_db()` in `app.py`). You can also hit `GET /api/init-db` on your deployed backend any time to re-run it safely (it's all `CREATE TABLE IF NOT EXISTS`).

### 2. Render (backend)
1. New **Web Service** → connect this repo → set **Root Directory** to `backend`.
2. Build command: `pip install -r requirements.txt`
3. Start command: `gunicorn app:app`
   (A `render.yaml` and `Procfile` are already included in `backend/` if you prefer Render's Blueprint deploy.)
4. Add these **Environment Variables** in Render:
   | Key | Value |
   |---|---|
   | `SECRET_KEY` | any long random string |
   | `JWT_SECRET_KEY` | another long random string |
   | `DATABASE_URL` | your Supabase connection string from step 1 |
   | `DB_SSLMODE` | `require` |
   | `ALLOWED_ORIGINS` | your Netlify URL, e.g. `https://your-app.netlify.app` (set this *after* step 3, or leave unset temporarily to allow all origins while testing) |
5. Deploy. Test with `https://your-backend.onrender.com/ping` → should return `{"status": "ok"}`.

### 3. Netlify (frontend)
1. New site from Git → this repo. A `netlify.toml` at the repo root already sets base dir `frontend`, build command `npm run build`, and publish dir `dist` (with SPA redirect rules), so Netlify should auto-detect everything.
2. In **Site settings → Environment variables**, add:
   | Key | Value |
   |---|---|
   | `VITE_API_BASE_URL` | `https://your-backend.onrender.com/api` |
3. Deploy. Once you have the final Netlify URL, go back to Render and set `ALLOWED_ORIGINS` to that exact URL, then redeploy the backend so CORS is locked down properly.

### Notes
- Render's free tier sleeps after inactivity — the first request after idling can take 30–60s to wake up. This is normal, not a bug.
- Local development still works exactly as described above (SQLite, no Supabase needed) — just leave `DATABASE_URL` unset in your local `backend/.env`.


