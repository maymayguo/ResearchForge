"""
模块一：苏格拉底式研究设计 Agent

核心逻辑：
- 维护 UnderstandingCanvas（理解画布）
- 每轮对话进行内部深度思考后产出回复 + 更新画布
- 在清晰度足够时主动进行"结晶"（提炼研究问题和框架）
- 使用滑动窗口管理长对话历史
"""
from __future__ import annotations
import json
import re
from typing import Optional
from loguru import logger

from app.core.config import settings
from app.core.llm_client import LLMClient
from app.models.types import (
    UnderstandingCanvas, ResearchPlan, ResearchQuestion,
    SubQuestion, Dimension, PrimaryResearchTask, Message,
)
from app.prompts.design_prompts import SYSTEM_PROMPT, build_turn_prompt


class DesignAgent:
    """
    苏格拉底式研究设计 Agent。
    每个 Session 持有一个 DesignAgent 实例。
    """

    def __init__(self):
        self.llm = LLMClient(
            provider=settings.ai_provider,
            temperature=settings.design_agent_temperature,
            max_tokens=settings.design_agent_max_tokens,
        )
        self._history_window = settings.design_agent_history_window

    async def chat(
        self,
        user_message: str,
        history: list[Message],
        canvas: UnderstandingCanvas,
    ) -> tuple[str, UnderstandingCanvas, Optional[ResearchPlan], Optional[ResearchQuestion]]:
        """
        处理一轮用户消息。

        Returns:
            (ai_reply_text, updated_canvas, research_plan_or_None, question_draft_or_None)
        """
        turn_number = len(history) // 2 + 1

        # 构建对话历史（滑动窗口，保留最近 N 轮）
        windowed = self._build_windowed_history(history)

        # 附加画布上下文
        canvas_context = build_turn_prompt(
            canvas_json=canvas.model_dump_json(indent=2),
            turn_number=turn_number,
        )

        # 当处于 rewrite_confirm 或 crystallize_question（已有问题草稿）阶段时，
        # 若用户回复带有确认/改写意图，强制推进到结晶二
        force_directive = ""
        if canvas.phase in ("rewrite_confirm", "crystallize_question"):
            force_directive = (
                "\n[SYSTEM强制指令]\n"
                "用户已改写或确认了研究问题。本轮必须立即生成完整研究框架，规则如下：\n"
                f"1. crystallization.research_plan.question.core_statement 必须使用用户的版本：「{user_message}」，"
                "不得使用 canvas 中存储的旧版本\n"
                "2. phase 设为 crystallize_framework\n"
                "3. crystallization.type 设为 framework，输出完整研究框架 JSON\n"
                "4. 绝对禁止再次要求用户确认研究问题\n"
                "[END SYSTEM指令]\n"
            )

        messages = windowed + [
            {"role": "user", "content": f"{canvas_context}\n{force_directive}\n用户：{user_message}"}
        ]

        logger.info(f"[DesignAgent] Turn {turn_number}, phase={canvas.phase}, clarity={canvas.clarity_score:.1f}")

        # 自动重试：JSON 解析失败时最多重试 2 次
        last_error = None
        for attempt in range(3):
            try:
                raw = await self.llm.chat(
                    system=SYSTEM_PROMPT,
                    messages=messages,
                    response_format="json",
                )
                result = self._parse_response(raw.content, canvas)
                # 如果 reply 是错误提示（解析失败的回退值），继续重试
                if result[0].startswith("（模型回复格式异常"):
                    last_error = "JSON parse fallback triggered"
                    logger.warning(f"[DesignAgent] Attempt {attempt+1} returned fallback reply, retrying...")
                    continue
                return result
            except Exception as e:
                last_error = str(e)
                logger.warning(f"[DesignAgent] Attempt {attempt+1} failed: {e}")
                if attempt < 2:
                    continue
                raise

        # 3 次均失败，抛出异常（由 routes.py 清理用户消息，前端显示可重试的错误提示）
        logger.error(f"[DesignAgent] All 3 attempts failed. Last error: {last_error}")
        raise RuntimeError(f"模型回复解析失败（已重试 3 次）：{last_error}")

    def _build_windowed_history(self, history: list[Message]) -> list[dict]:
        """保留最近 N 条消息（完整轮次），并将早期历史压缩为一句摘要。"""
        recent = history[-self._history_window:] if len(history) > self._history_window else history
        msgs = [{"role": m.role, "content": m.content} for m in recent]

        if len(history) > self._history_window:
            omitted = len(history) - self._history_window
            summary = f"[系统注：前 {omitted} 条消息已被截断，完整信息已体现在理解画布中]"
            msgs = [
                {"role": "user", "content": summary},
                {"role": "assistant", "content": "了解，我会基于理解画布继续讨论。"},
            ] + msgs

        return msgs

    def _parse_response(
        self,
        raw_content: str,
        current_canvas: UnderstandingCanvas,
    ) -> tuple[str, UnderstandingCanvas, Optional[ResearchPlan], Optional[ResearchQuestion]]:
        """
        解析 LLM 返回的 JSON，提取 reply、更新 canvas、提取结晶产出。
        对解析失败有容错处理。
        """
        content = raw_content.strip()

        # 0. 剥掉推理模型的思考过程块（MiniMax / DeepSeek-R1 等）
        content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL).strip()

        # 1. 剥掉 markdown 代码块
        content = re.sub(r'^```(?:json)?\s*\n?', '', content, flags=re.MULTILINE)
        content = re.sub(r'\n?```\s*$', '', content, flags=re.MULTILINE)
        content = content.strip()

        # 2. 提取最外层 JSON 对象
        start = content.find("{")
        end = content.rfind("}") + 1
        if start != -1 and end > start:
            content = content[start:end]

        # 3. 解析
        try:
            data = json.loads(content)
        except json.JSONDecodeError as e:
            # 检测是否因 token 截断（结尾缺少 }）——截断时重试没意义，直接抛出让上层处理
            is_truncated = not content.rstrip().endswith("}")
            logger.warning(
                f"[DesignAgent] JSON parse failed ({'truncated' if is_truncated else 'malformed'}): {e}. "
                f"Raw tail: ...{raw_content[-100:]}"
            )
            if is_truncated:
                raise RuntimeError(f"模型输出被截断（max_tokens 不足），JSON 不完整：{e}")
            # 非截断：尝试用正则从残缺 JSON 里抢救 reply 字段
            m = re.search(r'"reply"\s*:\s*"((?:[^"\\]|\\.)*)"', content)
            fallback_reply = m.group(1).replace('\\"', '"') if m else "（模型回复格式异常，请重试）"
            return fallback_reply, current_canvas, None, None

        # 4. 提取 reply，确保是纯文本
        reply = data.get("reply") or ""
        if not isinstance(reply, str) or not reply.strip():
            reply = data.get("message") or data.get("content") or data.get("text") or raw_content

        # 5. 如果 reply 本身又是 JSON，继续解包
        reply_stripped = reply.strip()
        if reply_stripped.startswith("{") and reply_stripped.endswith("}"):
            try:
                nested = json.loads(reply_stripped)
                reply = nested.get("reply") or nested.get("message") or reply
            except json.JSONDecodeError:
                pass

        canvas = self._apply_canvas_patch(current_canvas, data.get("canvas_update") or {})
        research_plan, question_draft = self._extract_crystallization(data.get("crystallization"), canvas)

        return reply, canvas, research_plan, question_draft

    def _apply_canvas_patch(self, canvas: UnderstandingCanvas, patch: dict) -> UnderstandingCanvas:
        """
        按照 project_design.md 3.3 节规则增量更新画布：
        - null 值 → 跳过（不覆盖）
        - question_evolution → 追加而非覆盖
        - 其他字段有值 → 直接覆盖
        """
        data = canvas.model_dump()

        for key, value in patch.items():
            if value is None:
                continue
            if key == "question_evolution" and isinstance(value, list):
                existing = data.get("question_evolution") or []
                # 按 version 去重（追加新版本）
                existing_versions = {v.get("version") for v in existing if isinstance(v, dict)}
                for entry in value:
                    if isinstance(entry, dict) and entry.get("version") not in existing_versions:
                        existing.append(entry)
                        existing_versions.add(entry.get("version"))
                data["question_evolution"] = existing
            else:
                data[key] = value

        # 安全保护：如果 LLM 没有推进 rewrite_confirm / crystallize_question，强制跳到 crystallize_framework
        if canvas.phase in ("rewrite_confirm", "crystallize_question") and data.get("phase") in ("rewrite_confirm", "crystallize_question"):
            logger.warning(f"[DesignAgent] Force-advancing phase: {canvas.phase} → crystallize_framework")
            data["phase"] = "crystallize_framework"

        try:
            return UnderstandingCanvas(**data)
        except Exception as e:
            logger.warning(f"[DesignAgent] Canvas patch validation error: {e}")
            return canvas

    def _extract_crystallization(
        self,
        crystallization: Optional[dict],
        canvas: UnderstandingCanvas,
    ) -> tuple[Optional[ResearchPlan], Optional[ResearchQuestion]]:
        """从结晶字段中解析出 ResearchPlan 或 ResearchQuestion（草稿）。"""
        if not crystallization:
            return None, None

        ctype = crystallization.get("type")

        if ctype == "framework":
            plan_data = crystallization.get("research_plan")
            if not plan_data:
                return None, None
            try:
                return ResearchPlan(**plan_data), None
            except Exception as e:
                logger.warning(f"[DesignAgent] ResearchPlan parse error: {e}\nData: {json.dumps(plan_data, ensure_ascii=False)[:500]}")
                return None, None

        if ctype == "question":
            q_data = crystallization.get("research_question")
            if not q_data:
                return None, None
            try:
                return None, ResearchQuestion(**q_data)
            except Exception as e:
                logger.warning(f"[DesignAgent] ResearchQuestion parse error: {e}")
                return None, None

        return None, None
