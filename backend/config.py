import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", SECRET_KEY)

    # Prefer a managed PostgreSQL database (for example Supabase) in production.
    DATABASE_URL = os.getenv("DATABASE_URL", "").strip() or None
    DATABASE_PATH = os.getenv("DATABASE_PATH", "instance/database.db")
    DB_SSLMODE = os.getenv("DB_SSLMODE", "require")
