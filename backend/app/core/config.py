"""
系统配置（Pydantic BaseSettings，从 .env 读取）
"""
from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import Literal


class Settings(BaseSettings):
    # ── LLM 配置 ──────────────────────────────
    ai_provider: Literal["anthropic", "openai", "zhipu", "deepseek", "minimax"] = "anthropic"

    @field_validator("ai_provider", mode="before")
    @classmethod
    def normalize_provider(cls, v: str) -> str:
        return v.lower()

    # Anthropic
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-6"

    # OpenAI
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"
    openai_base_url: str = "https://api.openai.com/v1"

    # ZhipuAI
    zhipu_api_key: str = ""
    zhipu_model: str = "glm-4"

    # DeepSeek
    deepseek_api_key: str = ""
    deepseek_model: str = "deepseek-chat"
    deepseek_base_url: str = "https://api.deepseek.com/v1"

    # MiniMax
    minimax_api_key: str = ""
    minimax_model: str = "MiniMax-Text-01"
    minimax_base_url: str = "https://api.minimaxi.chat/v1"

    # ── 设计 Agent 参数 ──────────────────────
    design_agent_temperature: float = 0.7
    design_agent_max_tokens: int = 8192
    # 保留最近 N 轮完整对话历史（避免超上下文）
    design_agent_history_window: int = 12

    # ── 认证配置 ──────────────────────────────
    jwt_secret: str = "change-me-in-production-use-a-long-random-string"

    # ── 服务配置 ──────────────────────────────
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
