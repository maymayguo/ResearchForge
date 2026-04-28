import type { ResearchPlan } from "../types/research";

interface Props {
  plan: ResearchPlan;
}

const complexityConfig = {
  low: { label: "轻量", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  moderate: { label: "适中", color: "text-[#D97757] bg-[#FFF8F5] border-[#F0DDD5]" },
  high: { label: "深度", color: "text-purple-600 bg-purple-50 border-purple-200" },
};

const researchabilityConfig = {
  desk_research: { badge: "🟢", label: "AI 可直接执行", borderClass: "border-l-4 border-l-green-400" },
  deep_search: { badge: "🟡", label: "需专项检索策略", borderClass: "border-l-4 border-l-yellow-400" },
  primary_research: { badge: "🔴", label: "需一手调研", borderClass: "border-l-4 border-l-red-400" },
};

export function ResearchPlanView({ plan }: Props) {
  const { label, color } = complexityConfig[plan.estimated_complexity] ?? complexityConfig.moderate;

  const agentDims = plan.dimensions.filter(d => d.researchability !== "primary_research");

  return (
    <div className="p-5 space-y-5 text-sm">
      {/* 标题 */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#ABABAB]">
          研究框架
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${color}`}>
          {label}
        </span>
      </div>

      {/* 核心问题 */}
      <div className="bg-[#FAF9F7] border border-[#E8E6E1] rounded-xl p-4">
        <div className="text-xs text-[#ABABAB] font-medium uppercase tracking-widest mb-2">核心研究问题</div>
        <p className="text-[#1A1A1A] leading-relaxed font-medium">{plan.question.core_statement}</p>
      </div>

      {/* 子问题 */}
      {plan.question.sub_questions.length > 0 && (
        <Section label="子问题">
          <div className="space-y-2">
            {plan.question.sub_questions.map((q, i) => (
              <div key={q.id} className="flex gap-3 items-start">
                <span className="text-xs text-[#D97757] font-semibold mt-0.5 flex-shrink-0 w-4">{i + 1}</span>
                <span className="text-[#3A3A3A] leading-relaxed">{q.statement}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 研究维度（AI 可执行） */}
      {agentDims.length > 0 && (
        <Section label="研究维度">
          <div className="space-y-2.5">
            {agentDims.map((dim, i) => {
              const cfg = researchabilityConfig[dim.researchability] ?? researchabilityConfig.desk_research;
              return (
                <div key={dim.id} className={`border border-[#E8E6E1] rounded-xl p-3.5 space-y-2 bg-white ${cfg.borderClass}`}>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#F4F2EE] text-[#D97757] text-xs font-semibold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    <span className="font-medium text-[#1A1A1A]">{dim.name}</span>
                    <span className="ml-auto text-xs text-[#8A8A8A]">{cfg.badge} {cfg.label}</span>
                  </div>
                  <div className="pl-7 space-y-1 text-xs text-[#6A6A6A]">
                    {dim.research_angle && (
                      <div><span className="text-[#ABABAB]">探索角度</span> · {dim.research_angle}</div>
                    )}
                    {dim.data_sources.length > 0 && (
                      <div><span className="text-[#ABABAB]">数据源</span> · {dim.data_sources.join("、")}</div>
                    )}
                    {dim.sufficiency_condition && (
                      <div><span className="text-[#ABABAB]">停止条件</span> · {dim.sufficiency_condition}</div>
                    )}
                    {dim.expected_output && (
                      <div><span className="text-[#ABABAB]">预期产出</span> · {dim.expected_output}</div>
                    )}
                    {dim.search_keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {dim.search_keywords.map((kw, j) => (
                          <span key={j} className="px-1.5 py-0.5 rounded text-xs bg-[#F4F2EE] text-[#6A6A6A]">{kw}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* 一手调研任务 */}
      {plan.primary_research_list.length > 0 && (
        <Section label="一手调研清单">
          <div className="space-y-2.5">
            {plan.primary_research_list.map((task, i) => (
              <div key={i} className="border border-red-200 rounded-xl p-3.5 space-y-1.5 bg-red-50 border-l-4 border-l-red-400">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-red-700">🔴 需一手调研</span>
                  {task.method && (
                    <span className="text-xs text-red-500 ml-auto">{task.method}</span>
                  )}
                </div>
                <div className="text-xs text-[#6A6A6A] space-y-1">
                  <div><span className="text-[#ABABAB]">问题</span> · {task.question}</div>
                  {task.respondent_profile && (
                    <div><span className="text-[#ABABAB]">受访者</span> · {task.respondent_profile}</div>
                  )}
                  <div><span className="text-[#ABABAB]">原因</span> · {task.reason}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 探索姿态 */}
      {plan.research_philosophy && (
        <Section label="探索姿态">
          <p className="text-[#6A6A6A] leading-relaxed">{plan.research_philosophy}</p>
        </Section>
      )}

      {/* 保留意见 */}
      {plan.ai_reservations.length > 0 && (
        <Section label="保留意见">
          <div className="space-y-1.5">
            {plan.ai_reservations.map((r, i) => (
              <div key={i} className="flex gap-2 text-[#6A6A6A]">
                <span className="text-amber-500 flex-shrink-0">⚠</span>
                <span>{r}</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <div className="text-xs font-semibold uppercase tracking-widest text-[#ABABAB]">{label}</div>
      <div>{children}</div>
    </div>
  );
}
