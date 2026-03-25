import sqlite3
from pathlib import Path
from flask import g, current_app


def _resolve_database_path() -> str:
    raw_path = current_app.config["DATABASE_PATH"]
    if Path(raw_path).is_absolute():
        return raw_path

    return str(Path(current_app.root_path).joinpath(raw_path).resolve())


def get_db():
    if "db" not in g:
        db_path = _resolve_database_path()
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)

        g.db = sqlite3.connect(db_path)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")

    return g.db


def close_db(e=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    db = get_db()
    with current_app.open_resource("schema/schema.sql") as f:
        db.executescript(f.read().decode("utf-8"))
    db.commit()
