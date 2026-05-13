"""
会话存储 — SQLite 持久化 + 内存缓存（v2）
"""
from __future__ import annotations
import json
from typing import Dict, List, Optional
from datetime import datetime, timezone

from app.models.types import Session, Message, UnderstandingCanvas, ResearchPlan, ResearchQuestion
from app.db.database import get_conn


class SessionStore:
    """SQLite 持久化 + 进程内 LRU 缓存（active sessions）"""

    def __init__(self):
        self._cache: Dict[str, Session] = {}

    # ── 创建 ─────────────────────────────────────────

    def create(self, user_id: str) -> Session:
        session = Session()
        now = datetime.now(timezone.utc).isoformat()
        canvas_json = session.canvas.model_dump_json()
        with get_conn() as conn:
            conn.execute(
                """INSERT INTO research_sessions
                   (id, user_id, title, messages, canvas, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (session.id, user_id, "新研究", "[]", canvas_json, now, now),
            )
            conn.commit()
        self._cache[session.id] = session
        return session

    # ── 读取 ─────────────────────────────────────────

    def get(self, session_id: str) -> Optional[Session]:
        if session_id in self._cache:
            return self._cache[session_id]
        with get_conn() as conn:
            row = conn.execute(
                "SELECT * FROM research_sessions WHERE id = ?", (session_id,)
            ).fetchone()
        if not row:
            return None
        session = self._from_row(row)
        self._cache[session.id] = session
        return session

    def get_owner(self, session_id: str) -> Optional[str]:
        """返回 session 所属的 user_id（不加载完整 session）"""
        with get_conn() as conn:
            row = conn.execute(
                "SELECT user_id FROM research_sessions WHERE id = ?", (session_id,)
            ).fetchone()
        return row["user_id"] if row else None

    # ── 保存 ─────────────────────────────────────────

    def save(self, session: Session) -> None:
        self._cache[session.id] = session
        first_user = next((m for m in session.messages if m.role == "user"), None)
        title = (
            first_user.content[:28] + ("…" if len(first_user.content) > 28 else "")
            if first_user else "新研究"
        )
        now = datetime.now(timezone.utc).isoformat()
        messages_json = json.dumps([m.model_dump(mode="json") for m in session.messages], ensure_ascii=False)
        canvas_json = session.canvas.model_dump_json()
        plan_json = session.research_plan.model_dump_json() if session.research_plan else None
        draft_json = session.question_draft.model_dump_json() if getattr(session, "question_draft", None) else None
        with get_conn() as conn:
            conn.execute(
                """UPDATE research_sessions
                   SET title=?, messages=?, canvas=?, research_plan=?, question_draft=?, status=?, updated_at=?
                   WHERE id=?""",
                (title, messages_json, canvas_json, plan_json, draft_json, session.status, now, session.id),
            )
            conn.commit()

    # ── 删除 ─────────────────────────────────────────

    def delete(self, session_id: str) -> None:
        self._cache.pop(session_id, None)
        with get_conn() as conn:
            conn.execute("DELETE FROM research_sessions WHERE id = ?", (session_id,))
            conn.commit()

    # ── 用户会话列表 ──────────────────────────────────

    def list_for_user(self, user_id: str) -> List[dict]:
        with get_conn() as conn:
            rows = conn.execute(
                """SELECT id, title, created_at FROM research_sessions
                   WHERE user_id = ? AND title != '新研究'
                   ORDER BY updated_at DESC LIMIT 50""",
                (user_id,),
            ).fetchall()
        return [{"id": r["id"], "title": r["title"], "createdAt": r["created_at"]} for r in rows]

    # ── 内部工具 ─────────────────────────────────────

    def _from_row(self, row) -> Session:
        raw_msgs = json.loads(row["messages"] or "[]")
        messages = [Message.model_validate(m) for m in raw_msgs]

        canvas_json = row["canvas"] or "{}"
        try:
            canvas = UnderstandingCanvas.model_validate_json(canvas_json)
        except Exception:
            canvas = UnderstandingCanvas()

        research_plan = None
        if row["research_plan"]:
            try:
                research_plan = ResearchPlan.model_validate_json(row["research_plan"])
            except Exception:
                pass

        question_draft = None
        if row["question_draft"]:
            try:
                question_draft = ResearchQuestion.model_validate_json(row["question_draft"])
            except Exception:
                pass

        created_at = datetime.fromisoformat(row["created_at"]) if row["created_at"] else datetime.now(timezone.utc)
        status = row["status"] if row["status"] in ("active", "completed") else "active"

        return Session.model_validate({
            "id": row["id"],
            "status": status,
            "messages": messages,
            "canvas": canvas,
            "research_plan": research_plan,
            "question_draft": question_draft,
            "created_at": created_at,
        })


# 全局单例
session_store = SessionStore()
