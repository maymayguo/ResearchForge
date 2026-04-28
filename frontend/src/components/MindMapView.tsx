import type { UnderstandingCanvas, ResearchPlan, ResearchQuestion, Dimension } from "../types/research";

interface Props {
  canvas: UnderstandingCanvas;
  researchPlan: ResearchPlan | null;
  questionDraft?: ResearchQuestion | null;
}

const researchabilityConfig = {
  desk_research: {
    border: "#86EFAC", bg: "#F0FDF4", headerBg: "#DCFCE7",
    dot: "#16A34A", badge: "🟢", label: "AI可执行", labelColor: "#16A34A",
  },
  deep_search: {
    border: "#FDE68A", bg: "#FFFBEB", headerBg: "#FEF3C7",
    dot: "#D97706", badge: "🟡", label: "专项检索", labelColor: "#D97706",
  },
  primary_research: {
    border: "#FCA5A5", bg: "#FFF5F5", headerBg: "#FFE8EA",
    dot: "#DC2626", badge: "🔴", label: "一手调研", labelColor: "#DC2626",
  },
};

const phaseSteps = [
  { key: "exploring", label: "探索中" },
  { key: "crystallize_question", label: "结晶问题" },
  { key: "rewrite_confirm", label: "确认问题" },
  { key: "crystallize_framework", label: "生成框架" },
  { key: "confirmed", label: "完成" },
];

const confidenceLabel: Record<string, string> = {
  high: "强假设",
  medium: "中等把握",
  low: "弱假设",
};

export function MindMapView({ canvas, researchPlan, questionDraft }: Props) {
  const evo = canvas.question_evolution;
  const latestQuestion = evo.length > 0 ? evo[evo.length - 1].statement : undefined;

  const phaseHint: Partial<Record<UnderstandingCanvas["phase"], string>> = {
    exploring: "等待输入…",
  };

  const coreLabel = researchPlan
    ? researchPlan.question.core_statement
    : questionDraft
    ? questionDraft.core_statement
    : latestQuestion || phaseHint[canvas.phase] || "研究问题待确认…";

  return (
    <div className="p-4 space-y-3 text-sm select-none">
      {/* 清晰度进度条 */}
      {!researchPlan && canvas.clarity_score > 0 && (
        <div className="h-0.5 rounded-full overflow-hidden" style={{ background: "#EAE8E3" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.min(canvas.clarity_score / 10, 1) * 100}%`, background: "#D97757" }}
          />
        </div>
      )}

      {researchPlan ? (
        <PlanHierarchyTree plan={researchPlan} />
      ) : (
        <DiscussionTree canvas={canvas} coreLabel={coreLabel} />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   研究框架层级树：核心问题 → 子问题 → 维度
══════════════════════════════════════════════════ */
function PlanHierarchyTree({ plan }: { plan: ResearchPlan }) {
  const complexityConfig = {
    low: { label: "轻量", color: "#16A34A", bg: "#F0FDF4", border: "#86EFAC" },
    moderate: { label: "适中", color: "#D97757", bg: "#FFF8F5", border: "#F0DDD5" },
    high: { label: "深度", color: "#7C3AED", bg: "#F5F3FF", border: "#C4B5FD" },
  };
  const complexity = complexityConfig[plan.estimated_complexity] ?? complexityConfig.moderate;

  // 建立 subQuestionId → dimensions 映射
  const sqDimsMap = new Map<string, Dimension[]>();
  const unmappedDims: Dimension[] = [];

  for (const dim of plan.dimensions) {
    let wasMapped = false;
    for (const qId of dim.mapped_questions) {
      const sq = plan.question.sub_questions.find(q => q.id === qId);
      if (sq) {
        if (!sqDimsMap.has(qId)) sqDimsMap.set(qId, []);
        sqDimsMap.get(qId)!.push(dim);
        wasMapped = true;
      }
    }
    if (!wasMapped) unmappedDims.push(dim);
  }

  const hasSubs = plan.question.sub_questions.length > 0;

  return (
    <div className="space-y-2">
      {/* 核心问题根节点 */}
      <div className="rounded-xl px-4 py-3 text-center leading-relaxed text-sm font-semibold"
        style={{ background: "#1C1C1C", color: "#fff" }}>
        {plan.question.core_statement}
      </div>

      {/* 复杂度 + 排除标签 */}
      <div className="flex items-center gap-2 flex-wrap px-1">
        <span className="text-xs px-2 py-0.5 rounded-full border font-medium"
          style={{ color: complexity.color, background: complexity.bg, borderColor: complexity.border }}>
          {complexity.label}
        </span>
        {plan.question.hard_constraints.slice(0, 2).map((s, i) => (
          <span key={i} className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: "#F4F2EE", color: "#8A8A8A", border: "1px solid #E0DDD8" }}>✕ {s}</span>
        ))}
        {plan.question.open_directions.slice(0, 1).map((s, i) => (
          <span key={i} className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: "#EEF4FF", color: "#4A6A9A", border: "1px solid #D0DCEE" }}>→ {s}</span>
        ))}
      </div>

      {/* 树结构区域 */}
      <div className="mt-1">
        {hasSubs ? (
          /* 有子问题：核心问题 → 子问题 → 维度 */
          <TreeBranch isLast={unmappedDims.length === 0 && plan.primary_research_list.length === 0}>
            {plan.question.sub_questions.map((sq, sqIdx) => {
              const dims = sqDimsMap.get(sq.id) ?? [];
              const isLastSq = sqIdx === plan.question.sub_questions.length - 1 && unmappedDims.length === 0 && plan.primary_research_list.length === 0;
              return (
                <TreeNode
                  key={sq.id}
                  isLast={isLastSq}
                  connector={
                    <div className="flex items-start gap-2 rounded-lg px-3 py-2"
                      style={{ background: "#F5F3EE", border: "1px solid #E0DDD8" }}>
                      <span className="text-xs font-bold flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: "#D97757", color: "#fff" }}>{sqIdx + 1}</span>
                      <span className="text-xs leading-relaxed" style={{ color: "#2A2A2A" }}>{sq.statement}</span>
                    </div>
                  }
                >
                  {dims.length > 0 && (
                    <TreeBranch isLast>
                      {dims.map((dim, dIdx) => (
                        <TreeNode key={dim.id} isLast={dIdx === dims.length - 1}
                          connector={<DimensionNode dim={dim} />}
                        />
                      ))}
                    </TreeBranch>
                  )}
                </TreeNode>
              );
            })}

            {/* 未映射维度 */}
            {unmappedDims.map((dim, i) => (
              <TreeNode key={dim.id}
                isLast={i === unmappedDims.length - 1 && plan.primary_research_list.length === 0}
                connector={<DimensionNode dim={dim} />}
              />
            ))}

            {/* 一手调研任务 */}
            {plan.primary_research_list.map((task, i) => (
              <TreeNode key={i} isLast={i === plan.primary_research_list.length - 1}
                connector={
                  <div className="rounded-lg overflow-hidden" style={{ border: "2px solid #FCA5A5" }}>
                    <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: "#FFE8EA" }}>
                      <span className="text-xs">🔴</span>
                      <span className="text-xs font-medium" style={{ color: "#A0192B" }}>一手调研 · {task.respondent_profile || task.method}</span>
                    </div>
                    <div className="px-3 py-2 text-xs space-y-1" style={{ color: "#6A3A3A", background: "#FFF5F5" }}>
                      <div style={{ color: "#9A4A4A" }}>{task.question}</div>
                      <div>{task.reason}</div>
                    </div>
                  </div>
                }
              />
            ))}
          </TreeBranch>
        ) : (
          /* 无子问题：直接展示维度 */
          <TreeBranch isLast>
            {plan.dimensions.map((dim, i) => (
              <TreeNode key={dim.id} isLast={i === plan.dimensions.length - 1 && plan.primary_research_list.length === 0}
                connector={<DimensionNode dim={dim} />}
              />
            ))}
            {plan.primary_research_list.map((task, i) => (
              <TreeNode key={i} isLast={i === plan.primary_research_list.length - 1}
                connector={
                  <div className="rounded-lg overflow-hidden" style={{ border: "2px solid #FCA5A5" }}>
                    <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: "#FFE8EA" }}>
                      <span className="text-xs">🔴</span>
                      <span className="text-xs font-medium" style={{ color: "#A0192B" }}>一手调研</span>
                    </div>
                    <div className="px-3 py-2 text-xs" style={{ color: "#9A4A4A", background: "#FFF5F5" }}>{task.reason}</div>
                  </div>
                }
              />
            ))}
          </TreeBranch>
        )}
      </div>

      {/* AI 保留意见 */}
      {plan.ai_reservations.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {plan.ai_reservations.map((r, i) => (
            <div key={i} className="flex gap-2 text-xs rounded-lg px-3 py-2"
              style={{ background: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400E" }}>
              <span className="flex-shrink-0">⚠</span><span>{r}</span>
            </div>
          ))}
        </div>
      )}

      {/* 探索姿态 */}
      {plan.research_philosophy && (
        <div className="text-xs leading-relaxed pt-2 mt-1" style={{ color: "#ABABAB", borderTop: "1px solid #F0EDE8" }}>
          {plan.research_philosophy}
        </div>
      )}
    </div>
  );
}

/* 单个维度节点 */
function DimensionNode({ dim }: { dim: Dimension }) {
  const cfg = researchabilityConfig[dim.researchability] ?? researchabilityConfig.desk_research;
  return (
    <div className="rounded-lg overflow-hidden" style={{ border: `1.5px solid ${cfg.border}`, background: cfg.bg }}>
      <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: cfg.headerBg }}>
        <span className="text-xs">{cfg.badge}</span>
        <span className="text-xs font-medium flex-1" style={{ color: "#1A1A1A" }}>{dim.name}</span>
        <span className="text-xs" style={{ color: cfg.labelColor }}>{cfg.label}</span>
      </div>
      {(dim.research_angle || dim.search_keywords.length > 0) && (
        <div className="px-3 py-1.5 space-y-1">
          {dim.research_angle && (
            <div className="text-xs leading-relaxed" style={{ color: "#6A6A6A" }}>{dim.research_angle}</div>
          )}
          {dim.search_keywords.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {dim.search_keywords.slice(0, 4).map((kw, i) => (
                <span key={i} className="px-1.5 py-0.5 rounded text-xs"
                  style={{ background: "#F4F2EE", color: "#6A6A6A" }}>{kw}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── CSS 树形连线组件 ── */

function TreeBranch({ children, isLast }: { children: React.ReactNode; isLast?: boolean }) {
  return (
    <div className="relative pl-4 mt-1.5">
      {!isLast && (
        <div className="absolute left-[7px] top-0 bottom-0 w-0.5 rounded-full"
          style={{ background: "#D5D0C8" }} />
      )}
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function TreeNode({
  connector,
  children,
  isLast,
}: {
  connector: React.ReactNode;
  children?: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <div className="relative">
      <div className="absolute left-[-16px] top-[14px] w-4 h-0.5 rounded-full"
        style={{ background: "#D5D0C8" }} />
      {!isLast && (
        <div className="absolute left-[-9px] top-[14px] bottom-[-8px] w-0.5 rounded-full"
          style={{ background: "#D5D0C8" }} />
      )}
      <div>{connector}</div>
      {children && <div className="mt-1.5">{children}</div>}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   讨论阶段：问题演化流 + 信息画布
══════════════════════════════════════════════════ */
function DiscussionTree({ canvas, coreLabel }: { canvas: UnderstandingCanvas; coreLabel: string }) {
  const evo = canvas.question_evolution;
  const currentStepIndex = phaseSteps.findIndex(s => s.key === canvas.phase);

  const hasAnyInfo =
    canvas.anchor_observation || canvas.known_context || canvas.key_assumption ||
    canvas.decision_context || canvas.hard_constraints.length > 0 || evo.length > 0;

  if (!hasAnyInfo) {
    return (
      <div className="text-center py-16 text-xs leading-relaxed" style={{ color: "#BABABA" }}>
        开始对话后画布将实时更新
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 阶段进度条 */}
      <div className="space-y-1">
        <div className="flex items-center gap-0.5">
          {phaseSteps.map((step, i) => (
            <div key={step.key} className="h-1 rounded-full flex-1 transition-all duration-500"
              style={{ background: i <= currentStepIndex ? "#D97757" : "#E8E6E1" }} />
          ))}
        </div>
        <div className="text-xs text-center font-medium" style={{ color: "#D97757" }}>
          {phaseSteps[currentStepIndex]?.label ?? canvas.phase}
        </div>
      </div>

      {/* 问题演化流 */}
      {evo.length > 1 ? (
        <QuestionEvolutionFlow evo={evo} />
      ) : evo.length === 1 ? (
        <div className="rounded-xl px-4 py-3 text-center leading-relaxed text-sm font-semibold"
          style={{ background: "#1C1C1C", color: "#fff" }}>
          {evo[0].statement}
        </div>
      ) : (
        <div className="rounded-xl px-4 py-3 text-center text-sm font-medium"
          style={{ background: "#2A2A2A", color: "#BABABA" }}>
          {coreLabel}
        </div>
      )}

      {/* 信息画布卡片 */}
      <div className="space-y-2.5">

        {/* 锚点观察 */}
        {canvas.anchor_observation && (
          <InfoCard label="锚点观察" accent="#D97757" bg="#FFF8F5" border="#F0DDD5">
            <p className="text-xs leading-relaxed" style={{ color: "#1C1C1C" }}>{canvas.anchor_observation}</p>
          </InfoCard>
        )}

        {/* 核心假设 */}
        {canvas.key_assumption && (
          <InfoCard label="核心假设" accent="#7A6A9A" bg="#F5F2FA" border="#DDD5EE">
            <p className="text-xs leading-relaxed" style={{ color: "#1C1C1C" }}>{canvas.key_assumption}</p>
            {canvas.assumption_confidence && (
              <span className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: "#FFF8F5", color: "#D97757" }}>
                {confidenceLabel[canvas.assumption_confidence]}
              </span>
            )}
          </InfoCard>
        )}

        {/* 硬约束 */}
        {canvas.hard_constraints.length > 0 && (
          <InfoCard label="明确排除" accent="#8A6A6A" bg="#FFF5F5" border="#F0D5D5">
            <div className="space-y-1">
              {canvas.hard_constraints.map((c, i) => (
                <div key={i} className="flex gap-1.5 text-xs" style={{ color: "#6A3A3A" }}>
                  <span style={{ color: "#BABABA" }}>✕</span><span>{c}</span>
                </div>
              ))}
            </div>
          </InfoCard>
        )}

        {/* 信息积累 */}
        {canvas.known_context && (
          <InfoCard label="信息积累" accent="#6A8A6A" bg="#F2F7F2" border="#D5E8D5">
            <Field label="已知情况" value={canvas.known_context} />
          </InfoCard>
        )}

        {/* 决策锚定 */}
        {(canvas.decision_context || canvas.audience) && (
          <InfoCard label="决策锚定" accent="#4A7A9A" bg="#F2F6FA" border="#D0E0EE">
            {canvas.decision_context && <Field label="决策场景" value={canvas.decision_context} />}
            {canvas.audience && <Field label="使用者" value={canvas.audience} />}
          </InfoCard>
        )}
      </div>
    </div>
  );
}

/* 问题演化流程链 */
function QuestionEvolutionFlow({ evo }: { evo: Array<{ version: number; statement: string; trigger?: string }> }) {
  return (
    <div className="space-y-0">
      <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#ABABAB" }}>
        问题演化路径
      </div>
      <div className="relative">
        {evo.map((v, i) => {
          const isLatest = i === evo.length - 1;
          return (
            <div key={v.version} className="flex flex-col items-center">
              <div
                className="w-full rounded-xl px-3 py-2.5 transition-all"
                style={{
                  background: isLatest ? "#1C1C1C" : "#F5F3EE",
                  border: isLatest ? "none" : "1px solid #E0DDD8",
                }}
              >
                <div className="flex items-start gap-2">
                  <span
                    className="text-xs font-bold flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                    style={{
                      background: isLatest ? "#D97757" : "#D5D0C8",
                      color: isLatest ? "#fff" : "#6A6A6A",
                    }}
                  >
                    {v.version}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-relaxed" style={{ color: isLatest ? "#fff" : "#6A6A6A" }}>
                      {v.statement}
                    </p>
                    {v.trigger && (
                      <p className="text-xs mt-0.5" style={{ color: isLatest ? "#D5D0C8" : "#BABABA" }}>
                        触发：{v.trigger}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              {!isLatest && (
                <div className="flex flex-col items-center py-0.5">
                  <div className="w-0.5 h-3 rounded-full" style={{ background: "#D5D0C8" }} />
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                    <path d="M5 6L0.669872 0.75H9.33013L5 6Z" fill="#D5D0C8" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── 共用组件 ── */
function InfoCard({ label, accent, bg, border, children }: {
  label: string; accent: string; bg: string; border: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${border}`, background: bg }}>
      <div className="px-3 py-1.5 text-xs font-semibold" style={{ color: accent }}>{label}</div>
      <div className="px-3 pb-3 space-y-2">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <div className="text-xs" style={{ color: "#ABABAB" }}>{label}</div>
      <div className="text-xs leading-relaxed" style={{ color: "#1A1A1A" }}>{value}</div>
    </div>
  );
}
