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
