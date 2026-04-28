"""
REST API 路由（v2 - 带用户认证）
"""
from __future__ import annotations
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from loguru import logger

from app.models.types import (
    ChatRequest, ChatResponse, CreateSessionResponse,
    RestoreSessionRequest, Message, Session,
)
from app.services.design_agent import DesignAgent
from app.services.session_store import session_store
from app.services.user_store import get_user_by_id
from app.core.auth import get_current_user_id
from app.core.llm_client import LLMClient
from app.core.config import settings
from app.prompts.design_prompts import WELCOME_MESSAGE

router = APIRouter(prefix="/api")

# 默认 Agent（使用服务器配置的 key）
_default_agent = DesignAgent()


def _get_agent(user_id: str) -> DesignAgent:
    """如果用户配置了自己的 API key，创建临时 agent；否则复用默认 agent。"""
    row = get_user_by_id(user_id)
    user_api_key = row.get("api_key") if row else None
    if user_api_key:
        agent = DesignAgent.__new__(DesignAgent)
        agent._history_window = settings.design_agent_history_window
        agent.llm = LLMClient(
            provider=settings.ai_provider,
            temperature=settings.design_agent_temperature,
            max_tokens=settings.design_agent_max_tokens,
            api_key=user_api_key,
        )
        return agent
    return _default_agent


# ── 会话列表 ──────────────────────────────────────────

@router.get("/sessions")
async def list_sessions(user_id: str = Depends(get_current_user_id)):
    """列出当前用户的所有会话（用于侧边栏历史记录）"""
    return session_store.list_for_user(user_id)


# ── 创建 / 恢复会话 ───────────────────────────────────

@router.post("/sessions", response_model=CreateSessionResponse)
async def create_session(user_id: str = Depends(get_current_user_id)):
    """创建新会话，返回欢迎消息和初始画布"""
    session = session_store.create(user_id)

    welcome = Message(role="assistant", content=WELCOME_MESSAGE)
    session.messages.append(welcome)
    session_store.save(session)

    logger.info(f"Session created: {session.id} (user: {user_id})")
    return CreateSessionResponse(
        session_id=session.id,
        welcome_message=welcome,
        canvas=session.canvas,
    )


@router.post("/sessions/restore", response_model=CreateSessionResponse)
async def restore_session(req: RestoreSessionRequest, user_id: str = Depends(get_current_user_id)):
    """用缓存的消息历史和画布状态重建会话（后端重启后恢复历史对话用）"""
    session = session_store.create(user_id)
    session.messages = req.messages
    session.canvas = req.canvas
    if req.research_plan:
        session.research_plan = req.research_plan
        if req.canvas.phase == "confirmed":
            session.status = "completed"
    session_store.save(session)

    last_assistant = next(
        (m for m in reversed(req.messages) if m.role == "assistant"), None
    )
    welcome = last_assistant or Message(role="assistant", content="对话已恢复，可以继续。")

    logger.info(f"Session restored: {session.id} ({len(req.messages)} messages, user: {user_id})")
    return CreateSessionResponse(
        session_id=session.id,
        welcome_message=welcome,
        canvas=session.canvas,
    )


# ── 对话 ─────────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, user_id: str = Depends(get_current_user_id)):
    """处理用户消息，返回 AI 回复 + 更新后的画布"""
    session = session_store.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # 校验会话归属
    owner = session_store.get_owner(req.session_id)
    if owner and owner != user_id:
        raise HTTPException(status_code=403, detail="无权访问该会话")

    if session.status == "completed":
        raise HTTPException(status_code=400, detail="Session already completed")

    user_msg = Message(role="user", content=req.message)
    session.messages.append(user_msg)

    agent = _get_agent(user_id)
    try:
        reply_text, updated_canvas, research_plan, question_draft = await agent.chat(
            user_message=req.message,
            history=session.messages[:-1],
            canvas=session.canvas,
        )
    except Exception as e:
        logger.error(f"Agent error: {e}")
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")

    ai_msg = Message(role="assistant", content=reply_text)
    session.messages.append(ai_msg)
    session.canvas = updated_canvas
    if research_plan:
        session.research_plan = research_plan
        if updated_canvas.phase == "confirmed":
            session.status = "completed"

    session_store.save(session)

    logger.info(
        f"Chat [{session.id}] turn={len(session.messages)//2} "
        f"clarity={updated_canvas.clarity_score:.1f} phase={updated_canvas.phase}"
    )

    return ChatResponse(
        session_id=session.id,
        message=ai_msg,
        canvas=updated_canvas,
        research_plan=research_plan,
        question_draft=question_draft,
    )


# ── 查询 / 删除 ───────────────────────────────────────

@router.get("/sessions/{session_id}")
async def get_session(session_id: str, user_id: str = Depends(get_current_user_id)):
    """获取会话完整状态"""
    session = session_store.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    owner = session_store.get_owner(session_id)
    if owner and owner != user_id:
        raise HTTPException(status_code=403, detail="无权访问该会话")
    return session


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, user_id: str = Depends(get_current_user_id)):
    """删除会话"""
    owner = session_store.get_owner(session_id)
    if owner and owner != user_id:
        raise HTTPException(status_code=403, detail="无权删除该会话")
    session_store.delete(session_id)
    return {"ok": True}
