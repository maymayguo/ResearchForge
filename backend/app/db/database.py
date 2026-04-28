"""
SQLite 数据库：用户 + 研究会话持久化
"""
import sqlite3, os
from pathlib import Path

_default = Path(__file__).parent.parent.parent / "grove.db"
DB_PATH = Path(os.environ.get("DB_PATH", str(_default)))


def get_conn() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db() -> None:
    with get_conn() as conn:
        conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id          TEXT PRIMARY KEY,
            username    TEXT UNIQUE NOT NULL,
            email       TEXT UNIQUE NOT NULL,
            hashed_password TEXT NOT NULL,
            api_key     TEXT,
            created_at  TEXT NOT NULL
        )
        """)
        conn.execute("""
        CREATE TABLE IF NOT EXISTS research_sessions (
            id              TEXT PRIMARY KEY,
            user_id         TEXT NOT NULL,
            title           TEXT NOT NULL DEFAULT '新研究',
            messages        TEXT NOT NULL DEFAULT '[]',
            canvas          TEXT NOT NULL DEFAULT '{}',
            research_plan   TEXT,
            question_draft  TEXT,
            status          TEXT NOT NULL DEFAULT 'active',
            created_at      TEXT NOT NULL,
            updated_at      TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """)
        conn.commit()
