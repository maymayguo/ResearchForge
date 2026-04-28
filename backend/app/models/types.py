"""
所有核心数据模型（Pydantic v2）
版本：v3.1 — 与 design_prompts v3.1 对齐
"""
from __future__ import annotations
from typing import List, Literal, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
import uuid


# ─────────────────────────────────────────────
# 画布相关辅助类型
# ─────────────────────────────────────────────

class QuestionVersion(BaseModel):
    version: int
    statement: str
    trigger: str = ""


# ─────────────────────────────────────────────
# 理解画布（对话过程中实时维护）
# ─────────────────────────────────────────────

class UnderstandingCanvas(BaseModel):
    # 核心四要素
    anchor_observation: Optional[str] = None
    hard_constraints: List[str] = Field(default_factory=list)
    key_assumption: Optional[str] = None
    assumption_confidence: Optional[Literal["high", "medium", "low"]] = None
    decision_context: Optional[str] = None

    # 补充信息
    known_context: Optional[str] = None
    audience: Optional[str] = None

    # 开放方向 / 排除范围
    open_directions: List[Any] = Field(default_factory=list)
    scope_out: List[Any] = Field(default_factory=list)

    # 过程记录
    question_evolution: List[QuestionVersion] = Field(default_factory=list)

    # 状态
    clarity_score: float = 0.0
    phase: Literal[
        "exploring",
        "crystallize_question",
        "rewrite_confirm",
        "crystallize_framework",
        "confirmed",
    ] = "exploring"


# ─────────────────────────────────────────────
# 结晶产出：研究问题
# ─────────────────────────────────────────────

class SubQuestion(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    statement: str
    parent_id: Optional[str] = None


class KeyAssumption(BaseModel):
    statement: str
    confidence: Literal["high", "medium", "low"] = "medium"
    testable: bool = True


class ResearchQuestion(BaseModel):
    core_statement: str
    sub_questions: List[SubQuestion] = Field(default_factory=list)
    hard_constraints: List[str] = Field(default_factory=list)
    open_directions: List[str] = Field(default_factory=list)
    key_assumptions: List[Any] = Field(default_factory=list)  # KeyAssumption or str
    evolution_summary: str = ""


# ─────────────────────────────────────────────
# 结晶产出：研究框架
# ─────────────────────────────────────────────

class Dimension(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    name: str
    mapped_questions: List[str] = Field(default_factory=list)
    researchability: Literal["desk_research", "deep_search", "primary_research"] = "desk_research"
    research_angle: str = ""
    search_keywords: List[str] = Field(default_factory=list)
    data_sources: List[str] = Field(default_factory=list)
    sufficiency_condition: str = ""
    expected_output: str = ""
    open_extensions: List[str] = Field(default_factory=list)

    @field_validator("researchability", mode="before")
    @classmethod
    def normalize_researchability(cls, v: Any) -> Any:
        if not isinstance(v, str):
            return v
        mapping = {
            # v3.1 values
            "desk_research": "desk_research",
            "deep_search": "deep_search",
            "primary_research": "primary_research",
            # legacy v2 values
            "secondary": "desk_research",
            "primary": "primary_research",
            "deep_search_required": "deep_search",
            "academic": "deep_search",
            "专项检索": "deep_search",
            "二手研究": "desk_research",
            "公开信息": "desk_research",
            "field_research": "primary_research",
            "interview": "primary_research",
        }
        return mapping.get(v.strip(), v.strip())


class PrimaryResearchTask(BaseModel):
    question: str
    reason: str
    respondent_profile: str = ""
    method: Literal["深度访谈", "专家访谈", "问卷"] = "深度访谈"


class ResearchPlan(BaseModel):
    question: ResearchQuestion
    dimensions: List[Dimension] = Field(default_factory=list)
    primary_research_list: List[PrimaryResearchTask] = Field(default_factory=list)
    priority_order: List[str] = Field(default_factory=list)
    research_philosophy: str = ""
    ai_reservations: List[str] = Field(default_factory=list)
    estimated_complexity: Literal["low", "moderate", "high"] = "moderate"

    @field_validator("estimated_complexity", mode="before")
    @classmethod
    def normalize_complexity(cls, v: Any) -> Any:
        if not isinstance(v, str):
            return v
        mapping = {
            "light": "low", "simple": "low", "easy": "low", "低": "low", "轻量": "low",
            "deep": "high", "heavy": "high", "complex": "high", "difficult": "high",
            "高": "high", "深度": "high",
            "medium": "moderate", "中": "moderate", "适中": "moderate",
        }
        return mapping.get(v.strip(), v.strip())


# ─────────────────────────────────────────────
# 对话消息
# ─────────────────────────────────────────────

class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    role: Literal["user", "assistant"]
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ─────────────────────────────────────────────
# 会话（Session）
# ─────────────────────────────────────────────

class Session(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    messages: List[Message] = Field(default_factory=list)
    canvas: UnderstandingCanvas = Field(default_factory=UnderstandingCanvas)
    research_plan: Optional[ResearchPlan] = None
    status: Literal["active", "completed"] = "active"


# ─────────────────────────────────────────────
# API 请求/响应
# ─────────────────────────────────────────────

class RestoreSessionRequest(BaseModel):
    messages: List[Message] = Field(default_factory=list)
    canvas: UnderstandingCanvas = Field(default_factory=UnderstandingCanvas)
    research_plan: Optional[ResearchPlan] = None


class ChatRequest(BaseModel):
    session_id: str
    message: str


class ChatResponse(BaseModel):
    session_id: str
    message: Message
    canvas: UnderstandingCanvas
    research_plan: Optional[ResearchPlan] = None
    question_draft: Optional[ResearchQuestion] = None


class CreateSessionResponse(BaseModel):
    session_id: str
    welcome_message: Message
    canvas: UnderstandingCanvas
