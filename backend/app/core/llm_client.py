"""
LLM 统一抽象层
支持 Anthropic (Claude) / OpenAI / ZhipuAI
"""
from __future__ import annotations
import json
from typing import Any, Optional
from loguru import logger

from app.core.config import settings


class LLMResponse(BaseModel if False else object):
    """统一响应结构"""
    content: str
    input_tokens: int = 0
    output_tokens: int = 0


class LLMClient:
    """统一 LLM 调用接口"""

    def __init__(
        self,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        api_key: Optional[str] = None,  # 用户自定义 key，覆盖服务器默认值
    ):
        self.provider = provider or settings.ai_provider
        self.temperature = temperature if temperature is not None else settings.design_agent_temperature
        self.max_tokens = max_tokens or settings.design_agent_max_tokens
        self._override_api_key = api_key  # 保存覆盖 key

        # 确定使用的模型
        if model:
            self.model = model
        elif self.provider == "anthropic":
            self.model = settings.anthropic_model
        elif self.provider == "openai":
            self.model = settings.openai_model
        elif self.provider == "deepseek":
            self.model = settings.deepseek_model
        elif self.provider == "minimax":
            self.model = settings.minimax_model
        else:
            self.model = settings.zhipu_model

        self._client = self._init_client()

    def _init_client(self):
        key = self._override_api_key  # 用户自定义 key 优先
        if self.provider == "anthropic":
            from anthropic import Anthropic
            return Anthropic(api_key=key or settings.anthropic_api_key)
        elif self.provider == "openai":
            from openai import OpenAI
            return OpenAI(
                api_key=key or settings.openai_api_key,
                base_url=settings.openai_base_url,
            )
        elif self.provider == "deepseek":
            from openai import OpenAI
            return OpenAI(
                api_key=key or settings.deepseek_api_key,
                base_url=settings.deepseek_base_url,
            )
        elif self.provider == "minimax":
            from openai import OpenAI
            return OpenAI(
                api_key=key or settings.minimax_api_key,
                base_url=settings.minimax_base_url,
            )
        else:
            # ZhipuAI 兼容 OpenAI SDK
            from openai import OpenAI
            return OpenAI(
                api_key=key or settings.zhipu_api_key,
                base_url="https://open.bigmodel.cn/api/paas/v4/",
            )

    async def chat(
        self,
        system: str,
        messages: list[dict],
        response_format: Optional[str] = None,  # "json" | None
    ) -> LLMResponse:
        """
        发送对话请求，返回 LLMResponse。
        messages 格式：[{"role": "user"|"assistant", "content": str}, ...]
        """
        try:
            if self.provider == "anthropic":
                return await self._anthropic_chat(system, messages, response_format)
            else:
                return await self._openai_chat(system, messages, response_format)
        except Exception as e:
            logger.error(f"LLM call failed ({self.provider}/{self.model}): {e}")
            raise

    async def _anthropic_chat(self, system: str, messages: list[dict], response_format: Optional[str]) -> LLMResponse:
        import asyncio
        loop = asyncio.get_event_loop()

        def _call():
            kwargs: dict[str, Any] = {
                "model": self.model,
                "max_tokens": self.max_tokens,
                "system": system,
                "messages": messages,
                "temperature": self.temperature,
            }
            if response_format == "json":
                # Claude 通过 system prompt 引导 JSON，不需要额外参数
                pass
            return self._client.messages.create(**kwargs)

        resp = await loop.run_in_executor(None, _call)
        return _LLMResponse(
            content=resp.content[0].text,
            input_tokens=resp.usage.input_tokens,
            output_tokens=resp.usage.output_tokens,
        )

    async def _openai_chat(self, system: str, messages: list[dict], response_format: Optional[str]) -> LLMResponse:
        import asyncio
        loop = asyncio.get_event_loop()

        full_messages = [{"role": "system", "content": system}] + messages

        def _call():
            kwargs: dict[str, Any] = {
                "model": self.model,
                "messages": full_messages,
                "max_tokens": self.max_tokens,
                "temperature": self.temperature,
            }
            if response_format == "json" and self.provider not in ("minimax",):
                kwargs["response_format"] = {"type": "json_object"}
            return self._client.chat.completions.create(**kwargs)

        resp = await loop.run_in_executor(None, _call)
        return _LLMResponse(
            content=resp.choices[0].message.content,
            input_tokens=resp.usage.prompt_tokens,
            output_tokens=resp.usage.completion_tokens,
        )


class _LLMResponse:
    def __init__(self, content: str, input_tokens: int = 0, output_tokens: int = 0):
        self.content = content
        self.input_tokens = input_tokens
        self.output_tokens = output_tokens
