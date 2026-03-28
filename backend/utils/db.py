from __future__ import annotations

import sqlite3
from pathlib import Path

from flask import current_app, g

_pg_pool = None


def _resolve_database_path() -> str:
    raw_path = current_app.config["DATABASE_PATH"]
    if Path(raw_path).is_absolute():
        return raw_path

    return str(Path(current_app.root_path).joinpath(raw_path).resolve())


def _load_schema(schema_path: str) -> str:
    with current_app.open_resource(schema_path) as f:
        return f.read().decode("utf-8")


def _run_sql_script(db, sql_script: str) -> None:
    statements = [stmt.strip() for stmt in sql_script.split(";") if stmt.strip()]
    cursor = db.cursor()
    try:
        for statement in statements:
            # Skip CREATE INDEX statements during schema load
            if statement.upper().startswith("CREATE INDEX") or statement.upper().startswith("CREATE UNIQUE INDEX"):
                continue
            try:
                cursor.execute(statement)
            except Exception as e:
                print(f"[DB] Skipped statement due to error: {e}\nStatement: {statement}")
    finally:
        cursor.close()


class DatabaseConnection:
    def __init__(self, conn, is_postgres: bool):
        self._conn = conn
        self._is_postgres = is_postgres

    def execute(self, query: str, params=()):
        cursor = self._conn.cursor()
        normalized_query = query.replace("?", "%s") if self._is_postgres else query
        cursor.execute(normalized_query, params or ())
        return cursor

    def cursor(self):
        return self._conn.cursor()

    def commit(self):
        return self._conn.commit()

    def rollback(self):
        return self._conn.rollback()

    def close(self):
        return self._conn.close()


def _connect_postgres(database_url: str) -> DatabaseConnection:
    from psycopg2.pool import SimpleConnectionPool
    from psycopg2.extras import RealDictCursor

    global _pg_pool
    if _pg_pool is None:
        _pg_pool = SimpleConnectionPool(
            minconn=current_app.config.get("DB_POOL_MIN_CONN", 1),
            maxconn=current_app.config.get("DB_POOL_MAX_CONN", 10),
            dsn=database_url,
            sslmode=current_app.config.get("DB_SSLMODE", "require"),
            cursor_factory=RealDictCursor,
        )

    conn = _pg_pool.getconn()
    conn.autocommit = False
    return DatabaseConnection(conn, is_postgres=True)


def _connect_sqlite() -> DatabaseConnection:
    db_path = _resolve_database_path()
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return DatabaseConnection(conn, is_postgres=False)


def get_db():
    if "db" not in g:
        database_url = current_app.config.get("DATABASE_URL")
        g.db_is_pooled = bool(database_url)
        g.db = _connect_postgres(database_url) if database_url else _connect_sqlite()

    return g.db


def close_db(e=None):
    db = g.pop("db", None)
    db_is_pooled = g.pop("db_is_pooled", False)
    if db is not None:
        if e:
            db.rollback()
        if db_is_pooled:
            global _pg_pool
            if _pg_pool is not None:
                _pg_pool.putconn(db._conn)
        else:
            db.close()


def init_db():
    db = get_db()
    schema_path = "schema/schema_postgres.sql" if current_app.config.get("DATABASE_URL") else "schema/schema.sql"
    sql_script = _load_schema(schema_path)
    _run_sql_script(db, sql_script)
    db.commit()
