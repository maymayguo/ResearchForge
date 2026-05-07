import { useState, useRef, useEffect, useCallback } from "react";
import type { Message, UnderstandingCanvas, ResearchPlan, ResearchQuestion, CachedSession } from "../types/research";
import { createSession, sendMessage, listSessions, getSession, deleteSessionApi } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import CanvasPanel from "./CanvasPanel";
import { Sidebar } from "./Sidebar";
import { SettingsModal } from "./SettingsModal";

const PURPLE = "#6c63e0";

// ── 导出工具 ────────────────────────────────

function buildDeepResearchPrompt(plan: ResearchPlan): string {
  const q = plan.question;
  const dims = plan.dimensions.filter(d => d.researchability !== "primary_research");
  const subQText = q.sub_questions.map(sq => `- ${sq.statement}`).join('\n');
  const dimText = dims.map(d =>
    `### 维度：${d.name}\n- 探索角度：${d.research_angle}\n- 数据来源：${d.data_sources.join('、')}\n- 搜索关键词：${d.search_keywords.join('、')}\n- 停止条件：${d.sufficiency_condition}\n- 预期产出：${d.expected_output}`
  ).join('\n\n');
  const assumptionsText = q.key_assumptions.map(a =>
    typeof a === "string" ? `- ${a}` : `- ${(a as { statement: string }).statement}`
  ).join('\n');
  const excludeText = q.hard_constraints.length > 0
    ? `\n\n## 明确排除\n${q.hard_constraints.map(c => `- ${c}`).join('\n')}`
    : '';

  return `# 深度研究任务\n\n## 核心研究问题\n${q.core_statement}\n\n## 子问题\n${subQText}\n\n## 前提假设（需在研究中验证或标注）\n${assumptionsText}${excludeText}\n\n## 研究维度与执行指引\n${dimText}\n\n## 输出要求\n- 每个维度输出独立的研究小结\n- 标注信息来源和置信度\n- 在结论中明确回应核心研究问题\n- 对无法通过公开信息回答的部分，明确标注"需一手调研"`;
}

function buildResearchMarkdown(plan: ResearchPlan): string {
  const q = plan.question;
  const lines: string[] = [
    `# ${q.core_statement}`,
    '',
    '## 子问题',
    ...q.sub_questions.map((sq, i) => `${i + 1}. ${sq.statement}`),
  ];
  if (q.hard_constraints.length > 0) {
    lines.push('', '## 明确排除');
    q.hard_constraints.forEach(c => lines.push(`- ${c}`));
  }
  lines.push('', '## 研究维度');
  plan.dimensions.forEach((d, i) => {
    const badge = d.researchability === 'desk_research' ? '🟢' : d.researchability === 'deep_search' ? '🟡' : '🔴';
    lines.push(`### ${i + 1}. ${badge} ${d.name}`);
    if (d.research_angle) lines.push(`- 探索角度：${d.research_angle}`);
    lines.push(`- 数据源：${d.data_sources.join('、')}`);
    if (d.sufficiency_condition) lines.push(`- 停止条件：${d.sufficiency_condition}`);
    lines.push(`- 预期产出：${d.expected_output}`);
    lines.push('');
  });
  if (plan.primary_research_list.length > 0) {
    lines.push('## 一手调研清单');
    plan.primary_research_list.forEach(t => {
      lines.push(`- 问题：${t.question}`);
      if (t.respondent_profile) lines.push(`  - 受访者：${t.respondent_profile}`);
      lines.push(`  - 原因：${t.reason}`);
      if (t.method) lines.push(`  - 方式：${t.method}`);
    });
    lines.push('');
  }
  if (plan.ai_reservations.length > 0) {
    lines.push('## AI 保留意见');
    plan.ai_reservations.forEach(r => lines.push(`- ${r}`));
  }
  return lines.join('\n');
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── 主组件 ───────────────────────────────────

export function ResearchDesigner() {
  const { logout } = useAuth();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [canvas, setCanvas] = useState<UnderstandingCanvas | null>(null);
  const [researchPlan, setResearchPlan] = useState<ResearchPlan | null>(null);
  const [questionDraft, setQuestionDraft] = useState<ResearchQuestion | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<CachedSession[]>([]);
  const [canvasWidth, setCanvasWidth] = useState(420);
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const centerTextareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const initingRef = useRef(false);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  const hasUserMessage = messages.some(m => m.role === "user");
  const isInitialState = !hasUserMessage;

  // ── 拖拽分割线 ──────────────────────────────
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = dragStartX.current - e.clientX;
      setCanvasWidth(Math.max(300, Math.min(680, dragStartWidth.current + delta)));
    };
    const onUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, []);

  const handleDividerDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartWidth.current = canvasWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    e.preventDefault();
  };

  // ── 加载会话列表 ─────────────────────────────
  const refreshSessions = useCallback(async () => {
    try {
      const list = await listSessions();
      setSessions(list);
    } catch { /* 静默失败 */ }
  }, []);

  // ── 会话初始化 ───────────────────────────────
  const initSession = useCallback(async () => {
    if (initingRef.current) return;
    initingRef.current = true;
    try {
      setError(null);
      const res = await createSession();
      setSessionId(res.session_id);
      setMessages([res.welcome_message]);
      setCanvas(res.canvas);
      setResearchPlan(null);
      setQuestionDraft(null);
      setInput("");
    } catch {
      setError("无法连接到服务器，请确认后端已启动。");
    } finally {
      initingRef.current = false;
    }
  }, []);

  useEffect(() => {
    initSession();
    refreshSessions();
  }, [initSession, refreshSessions]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── 核心发送逻辑 ─────────────────────────────
  const doSend = useCallback(async (text: string) => {
    if (!text.trim() || !sessionId || loading) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text.trim(), timestamp: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError(null);
    abortRef.current = new AbortController();
    try {
      const res = await sendMessage(sessionId, userMsg.content, abortRef.current.signal);
      const withReply = [...newMessages, res.message];
      setMessages(withReply);
      setCanvas(res.canvas);
      if (res.research_plan) setResearchPlan(res.research_plan);
      if (res.question_draft) setQuestionDraft(res.question_draft);
      // 刷新侧边栏（更新标题）
      refreshSessions();
    } catch (e: unknown) {
      if ((e as Error).name === "AbortError") return;
      const msg = e instanceof Error ? e.message : "请求失败，请重试";
      if (msg.includes("Session not found") || msg.includes("404")) {
        setMessages([]);
        await initSession();
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
      textareaRef.current?.focus();
    }
  }, [sessionId, loading, messages, refreshSessions, initSession]);

  const handleSend = useCallback(() => doSend(input), [doSend, input]);
  const handleStop = () => abortRef.current?.abort();

  const handleNewSession = async () => {
    if (loading) abortRef.current?.abort();
    await initSession();
  };

  const handleSelectSession = useCallback(async (id: string) => {
    if (id === sessionId) return;
    setError(null);
    setInput("");
    try {
      const session = await getSession(id);
      setSessionId(id);
      setMessages(session.messages);
      setCanvas(session.canvas);
      setResearchPlan(session.research_plan);
      setQuestionDraft(null);
    } catch {
      setError("加载会话失败，请重试。");
    }
  }, [sessionId]);

  const handleDeleteSession = async (id: string) => {
    try {
      await deleteSessionApi(id);
    } catch { /* 静默 */ }
    setSessions(prev => prev.filter(s => s.id !== id));
    if (id === sessionId) initSession();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCenterKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      doSend(input);
    }
  };

  // ── 导出操作 ─────────────────────────────────
  const handleExportJSON = () => {
    if (!researchPlan) return;
    downloadFile(JSON.stringify(researchPlan, null, 2), 'research-plan.json', 'application/json');
  };
  const handleExportMarkdown = () => {
    if (!researchPlan) return;
    downloadFile(buildResearchMarkdown(researchPlan), 'research-plan.md', 'text/markdown');
  };
  const handleSendToAgent = async () => {
    if (!researchPlan) return;
    const prompt = buildDeepResearchPrompt(researchPlan);
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isConfirmed = canvas?.phase === "confirmed";
  const hasFramework = canvas?.phase === "confirmed" || canvas?.phase === "crystallize_framework";
  const isCrystallizeQuestion = canvas?.phase === "crystallize_question" || canvas?.phase === "rewrite_confirm";

  const phaseLabel: Record<string, string> = {
    exploring: "探索中",
    crystallize_question: "结晶问题",
    rewrite_confirm: "确认问题",
    crystallize_framework: "生成框架",
    confirmed: "已完成",
  };

  const crystallization = researchPlan
    ? { type: "framework" as const, research_plan: researchPlan }
    : questionDraft
    ? { type: "question" as const, research_question: questionDraft }
    : null;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#F5F4F0", fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* ── 左侧边栏 ── */}
      <Sidebar sessions={sessions} currentSessionId={sessionId} onNewSession={handleNewSession} onSelectSession={handleSelectSession} onDeleteSession={handleDeleteSession} />

      {/* ── 主区域 ── */}
      <div className="flex flex-col flex-1 min-w-0" style={{ background: "#faf9f7" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: "#EEECE8" }}>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: PURPLE }}>研</div>
            <div>
              <div className="text-sm font-semibold" style={{ color: "#1C1C1C" }}>Grove</div>
              {canvas && !isInitialState && (
                <div className="text-xs" style={{ color: "#ABABAB" }}>
                  {phaseLabel[canvas.phase] || canvas.phase}
                  {canvas.phase !== "confirmed" && canvas.clarity_score > 0 && (
                    <span className="ml-1.5" style={{ color: PURPLE }}>清晰度 {canvas.clarity_score.toFixed(1)}/10</span>
                  )}
                </div>
              )}
            </div>
          </div>
          {/* 右侧操作按钮 */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowSettings(true)}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: "#9c9890" }}
              title="设置"
              onMouseEnter={e => (e.currentTarget.style.background = "#F0EDE8")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button
              onClick={logout}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: "#9c9890" }}
              title="退出登录"
              onMouseEnter={e => (e.currentTarget.style.background = "#F0EDE8")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── 初始状态：居中大输入框 ── */}
        {isInitialState ? (
          <div className="flex-1 flex flex-col items-center justify-center px-12" style={{ paddingBottom: "10vh" }}>
            {error && (
              <div className="mb-6 flex items-center justify-between text-sm px-4 py-2.5 rounded-lg w-full max-w-xl" style={{ background: "#FFF0EE", color: "#C0392B", border: "1px solid #FADADD" }}>
                <span>{error}</span>
                <button onClick={() => setError(null)} className="ml-3 opacity-50 hover:opacity-100">✕</button>
              </div>
            )}

            <h1 className="text-2xl font-bold text-center mb-3" style={{ color: "#1c1a17", letterSpacing: "-0.5px" }}>
              你想研究什么？
            </h1>
            <p className="text-sm text-center mb-8 leading-relaxed" style={{ color: "#a09b94" }}>
              告诉我你脑子里现在的想法——可以是一个方向、<br />一件让你觉得"有点奇怪"的事，或者一个领域。
            </p>

            <div className="w-full max-w-xl rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.9)", border: "1px solid rgba(0,0,0,0.09)", boxShadow: "0 2px 20px rgba(0,0,0,0.06)" }}>
              <textarea
                ref={centerTextareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleCenterKeyDown}
                placeholder="描述你的研究想法，比如：我想研究一下低空经济赛道的投资机会…"
                rows={3}
                disabled={loading || !sessionId}
                className="w-full resize-none bg-transparent text-sm outline-none disabled:opacity-40 leading-relaxed"
                style={{ color: "#1C1C1C" }}
              />
              <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                <div className="flex gap-1.5 flex-wrap">
                  {["市场研究", "竞品分析", "用户洞察", "行业趋势"].map(hint => (
                    <button
                      key={hint}
                      onClick={() => setInput(prev => prev ? prev + "，" + hint : hint)}
                      className="text-xs px-2.5 py-1 rounded-full transition-colors"
                      style={{ background: "rgba(108,99,224,0.07)", color: PURPLE, border: "1px solid rgba(108,99,224,0.15)" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(108,99,224,0.14)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "rgba(108,99,224,0.07)")}
                    >
                      {hint}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => doSend(input)}
                  disabled={!input.trim() || !sessionId || loading}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white transition-opacity disabled:opacity-30"
                  style={{ background: PURPLE }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2 7h10M7 2l5 5-5 5" />
                  </svg>
                </button>
              </div>
            </div>

            <p className="text-xs mt-4" style={{ color: "#c5c0b8" }}>Enter 发送 · Shift+Enter 换行</p>

            {/* ── 预设研究方向卡片 ── */}
            <div className="mt-5 w-full max-w-xl">
              <p className="text-xs mb-2.5 text-center" style={{ color: "#b5b0a8" }}>或者选择一个方向试试</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { title: "低空经济投资机会", desc: "分析市场规模、政策环境和投资逻辑" },
                  { title: "AI 客服竞品格局", desc: "梳理国内外产品的能力对比和市场分布" },
                  { title: "儿童英语学习产品", desc: "调研 2-6 岁儿童的需求痛点和现有方案" },
                  { title: "如何验证产品 idea", desc: "设计验证实验和用户调研框架" },
                ].map(card => (
                  <button
                    key={card.title}
                    onClick={() => { setInput(card.title + "：" + card.desc); setTimeout(() => centerTextareaRef.current?.focus(), 50); }}
                    className="text-left p-3 rounded-xl transition-all"
                    style={{ background: "rgba(108,99,224,0.05)", border: "1px solid rgba(108,99,224,0.12)" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(108,99,224,0.12)"; e.currentTarget.style.borderColor = PURPLE; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(108,99,224,0.05)"; e.currentTarget.style.borderColor = "rgba(108,99,224,0.12)"; }}
                  >
                    <div className="text-sm font-medium mb-0.5" style={{ color: "#1c1a17" }}>{card.title}</div>
                    <div className="text-xs" style={{ color: "#a09b94" }}>{card.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ── 对话状态 ── */
          <>
            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
              {error && (
                <div className="flex items-center justify-between text-sm px-4 py-2.5 rounded-lg" style={{ background: "#FFF0EE", color: "#C0392B", border: "1px solid #FADADD" }}>
                  <span>{error}</span>
                  <button onClick={() => setError(null)} className="ml-3 opacity-50 hover:opacity-100">✕</button>
                </div>
              )}
              {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
              {loading && (
                <div className="flex items-center gap-3 pl-10">
                  <div className="flex gap-1">
                    {[0, 150, 300].map(d => (
                      <span key={d} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: PURPLE, animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                  <span className="text-xs" style={{ color: "#BABABA" }}>正在思考…</span>
                  <button onClick={handleStop} className="text-xs underline underline-offset-2 transition-colors" style={{ color: "#BABABA" }} onMouseEnter={e => (e.currentTarget.style.color = PURPLE)} onMouseLeave={e => (e.currentTarget.style.color = "#BABABA")}>中断</button>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* 问题草稿区 */}
            {isCrystallizeQuestion && questionDraft && (
              <div className="mx-5 mb-3 p-4 rounded-xl" style={{ background: "rgba(108,99,224,0.05)", border: "1px solid rgba(108,99,224,0.18)" }}>
                <div className="text-xs font-semibold mb-2" style={{ color: PURPLE }}>研究问题草稿</div>
                <p className="text-sm leading-relaxed" style={{ color: "#1C1C1C" }}>{questionDraft.core_statement}</p>
                {questionDraft.hard_constraints.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {questionDraft.hard_constraints.map((s, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#F4F2EE", color: "#8A8A8A" }}>✕ {s}</span>
                    ))}
                  </div>
                )}
                <div className="mt-2 text-xs" style={{ color: "#ABABAB" }}>↓ 用你自己的话把这个问题重新说一遍</div>
              </div>
            )}

            {/* 框架生成提示 */}
            {hasFramework && researchPlan && (
              <div className="text-center text-xs py-2 border-t" style={{ background: "rgba(108,99,224,0.04)", color: PURPLE, borderColor: "rgba(108,99,224,0.15)" }}>
                {isConfirmed ? "研究框架已确认 · 可以导出或发送给 Deep Research Agent" : "研究框架已生成 · 可以导出或继续对话完善"}
              </div>
            )}

            {/* 导出操作区 */}
            {hasFramework && researchPlan && (
              <div className="px-4 pt-3 pb-1 border-t" style={{ borderColor: "#EEECE8" }}>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={handleSendToAgent}
                    className="flex-1 px-3 py-2 rounded-xl text-xs font-medium text-white transition-colors"
                    style={{ background: copied ? "#27AE60" : PURPLE, minWidth: 0 }}
                  >
                    {copied ? "已复制 ✓" : "发送给 Deep Research Agent"}
                  </button>
                  <button onClick={handleExportJSON} className="px-3 py-2 rounded-xl text-xs font-medium transition-colors" style={{ background: "#F0EDE8", color: "#3A3A3A" }}>JSON</button>
                  <button onClick={handleExportMarkdown} className="px-3 py-2 rounded-xl text-xs font-medium transition-colors" style={{ background: "#F0EDE8", color: "#3A3A3A" }}>Markdown</button>
                </div>
              </div>
            )}

            {/* 输入区 */}
            <div className="px-4 py-3 border-t" style={{ borderColor: "#EEECE8", background: "#faf9f7" }}>
              <div className="flex gap-2 items-end rounded-xl p-1" style={{ border: "1px solid #E4E1DB", background: "#F5F3EF" }}>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isCrystallizeQuestion ? "用你自己的话重新说一遍这个问题…" : "描述你的研究想法…"}
                  rows={2}
                  disabled={loading || !sessionId}
                  className="flex-1 resize-none bg-transparent px-3 py-2.5 text-sm outline-none disabled:opacity-40"
                  style={{ color: "#1C1C1C" }}
                />
                {loading ? (
                  <button onClick={handleStop} className="mb-1.5 mr-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors" style={{ background: "#F0EDE8", color: "#6A6A6A" }}>停止</button>
                ) : (
                  <button onClick={handleSend} disabled={!input.trim() || !sessionId}
                    className="mb-1.5 mr-1.5 px-4 py-1.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-30"
                    style={{ background: PURPLE }}
                    onMouseEnter={e => { if (!(e.currentTarget as HTMLButtonElement).disabled) e.currentTarget.style.background = "#5a51c8"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = PURPLE; }}
                  >
                    发送
                  </button>
                )}
              </div>
              <div className="flex gap-3 mt-1 px-1">
                <span className="text-xs" style={{ color: "#BABABA" }}>Enter 发送</span>
                <span className="text-xs" style={{ color: "#BABABA" }}>Shift+Enter 换行</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── 拖拽分割线 ── */}
      <div
        onMouseDown={handleDividerDown}
        className="flex-shrink-0 flex items-center justify-center cursor-col-resize group"
        style={{ width: "6px", background: "#EEECE8" }}
      >
        <div className="w-0.5 h-8 rounded-full transition-colors" style={{ background: "#D5D1CC" }} />
      </div>

      {/* ── 右侧画布 ── */}
      <div className="flex-shrink-0 h-full overflow-hidden" style={{ width: canvasWidth }}>
        {canvas ? (
          <CanvasPanel canvas={canvas} crystallization={crystallization} />
        ) : (
          <div className="flex items-center justify-center h-full text-xs" style={{ color: "#BABABA" }}>连接中…</div>
        )}
      </div>

      {/* ── 设置弹窗 ── */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}

function safeContent(content: string): string {
  let s = content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  if (s.startsWith("{") && s.endsWith("}")) {
    try {
      const p = JSON.parse(s);
      if (typeof p.reply === "string" && p.reply.trim()) return p.reply.trim();
    } catch { /* not json */ }
    return "（回复格式异常，请重试）";
  }
  return s || content;
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  const content = isUser ? msg.content : safeContent(msg.content);
  return (
    <div className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5" style={{ background: PURPLE }}>研</div>
      )}
      <div
        className="max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
        style={isUser
          ? { background: "#1C1C1C", color: "#fff", borderBottomRightRadius: "4px" }
          : { background: "#F4F2EE", color: "#1C1C1C", borderBottomLeftRadius: "4px", border: "1px solid #ECE9E4" }
        }
      >
        {content}
      </div>
    </div>
  );
}
