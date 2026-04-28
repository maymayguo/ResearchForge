"""
用户 CRUD 操作（直接操作 SQLite）
"""
from __future__ import annotations
from datetime import datetime, timezone
from typing import Optional
import uuid

from app.db.database import get_conn
from app.models.auth import UserOut


def create_user(username: str, email: str, hashed_password: str) -> UserOut:
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO users (id, username, email, hashed_password, created_at) VALUES (?, ?, ?, ?, ?)",
            (user_id, username, email, hashed_password, now),
        )
        conn.commit()
    return UserOut(id=user_id, username=username, email=email, created_at=now)


def get_user_by_id(user_id: str) -> Optional[dict]:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return dict(row) if row else None


def get_user_by_username_or_email(identifier: str) -> Optional[dict]:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE username = ? OR email = ?",
            (identifier, identifier),
        ).fetchone()
    return dict(row) if row else None


def update_api_key(user_id: str, api_key: Optional[str]) -> None:
    with get_conn() as conn:
        conn.execute("UPDATE users SET api_key = ? WHERE id = ?", (api_key, user_id))
        conn.commit()


def username_exists(username: str) -> bool:
    with get_conn() as conn:
        row = conn.execute("SELECT 1 FROM users WHERE username = ?", (username,)).fetchone()
    return row is not None


def email_exists(email: str) -> bool:
    with get_conn() as conn:
        row = conn.execute("SELECT 1 FROM users WHERE email = ?", (email,)).fetchone()
    return row is not None
