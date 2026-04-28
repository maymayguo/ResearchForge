import { useEffect, useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface SubQuestion {
  id: string
  statement: string
  parent_id: string | null
}

interface KeyAssumption {
  statement: string
  confidence: string
  testable: boolean
}

interface ResearchQuestion {
  core_statement?: string
  sub_questions?: SubQuestion[]
  hard_constraints?: string[]
  open_directions?: string[]
  key_assumptions?: (KeyAssumption | string)[]
  evolution_summary?: string
}

interface Dimension {
  id: string
  name: string
  researchability: 'desk_research' | 'deep_search' | 'primary_research'
  research_angle: string
  sufficiency_condition?: string
  search_keywords?: string[]
  expected_output?: string
}

interface Crystallization {
  type: 'question' | 'framework'
  research_question?: ResearchQuestion
  research_plan?: {
    question?: ResearchQuestion
    dimensions?: Dimension[]
    research_philosophy?: string
    primary_research_list?: {
      question: string
      reason: string
      respondent_profile: string
      method: string
    }[]
  }
}

export interface CanvasData {
  anchor_observation?: string | null
  key_assumption?: string | null
  assumption_confidence?: 'high' | 'medium' | 'low' | null
  decision_context?: string | null
  audience?: string | null
  hard_constraints?: string[]
  open_directions?: unknown[]
  scope_out?: unknown[]
  question_evolution?: unknown[]
  known_context?: string | null
  clarity_score?: number
  phase?: string
}

interface CanvasPanelProps {
  canvas: CanvasData
  crystallization?: Crystallization | null
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PURPLE = '#6c63e0'
const PURPLE_LIGHT = '#ece9fc'
const PURPLE_MID = 'rgba(108,99,224,0.18)'

const PHASES = [
  { key: 'exploring',             label: '探索' },
  { key: 'broad_domain',          label: '定向' },
  { key: 'diagnose',              label: '诊断' },
  { key: 'deepen',                label: '深挖' },
  { key: 'anchor',                label: '锚定' },
  { key: 'crystallize_question',  label: '成型' },
  { key: 'rewrite_confirm',       label: '确认' },
  { key: 'crystallize_framework', label: '结晶' },
  { key: 'confirmed',             label: '完成' },
]

function getPhaseIndex(phase?: string) {
  const idx = PHASES.findIndex(p => p.key === phase)
  return idx === -1 ? 0 : idx
}

// ─── Confidence badge ─────────────────────────────────────────────────────────
function ConfBadge({ level }: { level?: string | null }) {
  if (!level) return null
  const labels: Record<string, string> = { high: '置信高', medium: '置信中', low: '置信低' }
  return (
    <span style={{
      fontSize: 8.5, padding: '1px 5px', borderRadius: 99,
      background: PURPLE_LIGHT, color: PURPLE,
      fontWeight: 600, marginLeft: 3, flexShrink: 0,
    }}>
      {labels[level] ?? level}
    </span>
  )
}

// ─── Researchability badge ────────────────────────────────────────────────────
function ResBadge({ type }: { type: string }) {
  const map: Record<string, [string, string, string]> = {
    desk_research:    ['可直接检索', '#eaf5e4', '#27500a'],
    deep_search:      ['需深度检索', '#fef3e2', '#8a5e00'],
    primary_research: ['一手调研',   '#fdecea', '#b5301a'],
  }
  const [label, bg, color] = map[type] ?? [type, '#f0f0f0', '#666']
  return (
    <span style={{
      fontSize: 9.5, padding: '2px 7px', borderRadius: 99,
      fontWeight: 600, background: bg, color, flexShrink: 0,
    }}>
      {label}
    </span>
  )
}

// ─── Animated info card ───────────────────────────────────────────────────────
interface InfoCardProps {
  label: string
  value?: string | null
  placeholder: string
  extra?: React.ReactNode
  delay?: number
}

function InfoCard({ label, value, placeholder, extra, delay = 0 }: InfoCardProps) {
  const [mounted, setMounted] = useState(false)
  const filled = Boolean(value)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <div style={{
      borderRadius: 13,
      padding: '11px 12px',
      minHeight: 78,
      background: filled ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.52)',
      border: `1px solid ${filled ? 'rgba(0,0,0,0.09)' : 'rgba(0,0,0,0.07)'}`,
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      transition: 'all 0.4s cubic-bezier(.4,0,.2,1)',
      opacity: mounted ? 1 : 0,
      transform: mounted ? 'translateY(0)' : 'translateY(5px)',
    }}>
      <div style={{
        fontSize: 9.5, fontWeight: 600, letterSpacing: '0.06em',
        textTransform: 'uppercase' as const,
        color: filled ? '#8c877f' : '#c0bbb3',
        marginBottom: 5,
        display: 'flex', alignItems: 'center', gap: 4,
        transition: 'color 0.3s',
      }}>
        <span style={{
          width: 5, height: 5, borderRadius: '50%',
          background: filled ? PURPLE : '#e0ddd8',
          flexShrink: 0, display: 'inline-block',
          transition: 'background 0.3s',
        }} />
        {label}
        {extra}
      </div>
      <div style={{
        fontSize: 11.5, lineHeight: 1.55,
        color: filled ? '#1c1a17' : '#c8c4bc',
        fontStyle: filled ? 'normal' : 'italic',
        transition: 'color 0.3s',
      }}>
        {value || placeholder}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CanvasPanel({ canvas, crystallization }: CanvasPanelProps) {
  const phaseIdx    = getPhaseIndex(canvas.phase)
  const clarity     = canvas.clarity_score ?? 0
  const clarityPct  = Math.min(clarity / 10, 1)
  const isConfirmed = canvas.phase === 'confirmed'
  const hasCrystal  = Boolean(crystallization)

  const coreQuestion =
    crystallization?.type === 'question'
      ? crystallization.research_question?.core_statement
      : crystallization?.type === 'framework'
      ? crystallization.research_plan?.question?.core_statement
      : null

  const dimensions =
    crystallization?.type === 'framework'
      ? crystallization.research_plan?.dimensions
      : null

  const secLbl: React.CSSProperties = {
    fontSize: 9.5, fontWeight: 600, letterSpacing: '0.07em',
    textTransform: 'uppercase', color: '#b0aba3',
    marginBottom: 9, display: 'block',
  }

  return (
    <div style={{
      fontFamily: "'DM Sans','PingFang SC','Helvetica Neue',sans-serif",
      height: '100%', overflowY: 'auto',
      padding: '20px 16px',
      background: 'rgba(243,241,237,0.9)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Phase stepper ── */}
      <div style={{ marginBottom: 18 }}>
        <span style={secLbl}>研究进度</span>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {PHASES.map((p, i) => {
            const done = i < phaseIdx
            const active = i === phaseIdx
            return (
              <div key={p.key} style={{
                display: 'flex', alignItems: 'center',
                flex: i < PHASES.length - 1 ? 1 : 0,
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div style={{
                    width: active ? 8 : 6, height: active ? 8 : 6,
                    borderRadius: '50%',
                    background: active ? PURPLE : done ? '#c8c4bc' : '#e4e0d8',
                    boxShadow: active ? `0 0 0 3px ${PURPLE_MID}` : 'none',
                    flexShrink: 0, transition: 'all 0.3s',
                  }} />
                  <span style={{
                    fontSize: 9, whiteSpace: 'nowrap',
                    color: active ? PURPLE : done ? '#b0aba3' : '#d0ccc6',
                    fontWeight: active ? 600 : 400,
                    transition: 'color 0.3s',
                  }}>
                    {p.label}
                  </span>
                </div>
                {i < PHASES.length - 1 && (
                  <div style={{
                    flex: 1, height: 1, margin: '0 3px', marginBottom: 14,
                    background: done ? '#d0ccc6' : '#e8e4de',
                    transition: 'background 0.3s',
                  }} />
                )}
              </div>
            )
          })}
        </div>
        <div style={{ fontSize: 10, color: '#8c877f', marginTop: 2, fontWeight: 500 }}>
          第 {phaseIdx + 1} 步，共 {PHASES.length} 步 ·{' '}
          <span style={{ color: PURPLE, fontWeight: 600 }}>
            {PHASES[phaseIdx]?.label ?? '进行中'}
          </span>
        </div>
      </div>

      {/* ── Clarity bar ── */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
          <span style={{ ...secLbl, marginBottom: 0 }}>清晰度</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: PURPLE }}>
            {Math.round(clarity)} / 10
          </span>
        </div>
        <div style={{ height: 4, borderRadius: 99, background: 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 99,
            width: `${clarityPct * 100}%`,
            background: `linear-gradient(90deg, #8b84e8, ${PURPLE})`,
            transition: 'width 0.6s cubic-bezier(.4,0,.2,1)',
          }} />
        </div>
      </div>

      {/* ── 4 info cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
        <InfoCard label="锚点观察" value={canvas.anchor_observation} placeholder="等待输入…" delay={0} />
        <InfoCard label="核心假设" value={canvas.key_assumption} placeholder="等待输入…"
          extra={<ConfBadge level={canvas.assumption_confidence} />} delay={50} />
        <InfoCard label="决策背景" value={canvas.decision_context} placeholder="等待输入…" delay={100} />
        <InfoCard label="硬约束"
          value={canvas.hard_constraints?.length ? canvas.hard_constraints.join(' · ') : null}
          placeholder="等待澄清…" delay={150} />
      </div>

      {/* ── Research question ── */}
      <div style={{
        borderRadius: 13, padding: '12px 14px', marginBottom: 6,
        background: hasCrystal ? 'rgba(236,233,252,0.55)' : 'rgba(255,255,255,0.52)',
        border: `1px solid ${hasCrystal ? 'rgba(108,99,224,0.22)' : 'rgba(0,0,0,0.07)'}`,
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        transition: 'all 0.5s cubic-bezier(.4,0,.2,1)',
      }}>
        <div style={{
          fontSize: 9.5, fontWeight: 600, letterSpacing: '0.07em',
          textTransform: 'uppercase' as const,
          color: hasCrystal ? PURPLE : '#c0bbb3',
          marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6,
          transition: 'color 0.3s',
        }}>
          研究问题
          {hasCrystal && (
            <span style={{
              fontSize: 9, padding: '1px 6px', borderRadius: 99,
              background: PURPLE_MID, color: PURPLE, fontWeight: 600,
            }}>
              {isConfirmed ? '已确认' : '待改写确认'}
            </span>
          )}
        </div>
        <div style={{
          fontSize: 12, lineHeight: 1.68,
          color: hasCrystal ? '#1c1a17' : '#c8c4bc',
          fontStyle: hasCrystal ? 'normal' : 'italic',
          fontWeight: hasCrystal ? 500 : 400,
          transition: 'all 0.4s',
        }}>
          {coreQuestion || '对话开始后，研究问题将在这里逐渐成形…'}
        </div>
      </div>

      {/* ── Open directions ── */}
      {(canvas.open_directions?.length || canvas.scope_out?.length) ? (
        <div style={{ marginBottom: 6 }}>
          <span style={secLbl}>探索方向</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {canvas.open_directions?.map((d, i) => (
              <span key={i} style={{
                fontSize: 10.5, padding: '3px 10px', borderRadius: 99,
                background: 'rgba(255,255,255,0.65)',
                border: '1px solid rgba(0,0,0,0.09)', color: '#6e6a62',
                backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
              }}>
                {String(d)}
              </span>
            ))}
            {canvas.scope_out?.map((d, i) => (
              <span key={`out-${i}`} style={{
                fontSize: 10.5, padding: '3px 10px', borderRadius: 99,
                background: 'rgba(255,255,255,0.5)',
                border: '1px solid rgba(0,0,0,0.07)', color: '#c0bbb3',
                textDecoration: 'line-through',
                backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
              }}>
                {String(d)}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* ── Framework dimensions ── */}
      {dimensions && dimensions.length > 0 && (
        <div>
          <span style={secLbl}>研究框架</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {dimensions.map((dim, i) => {
              const leftColor =
                dim.researchability === 'desk_research' ? '#3d9e6a'
                : dim.researchability === 'deep_search' ? '#d4840a'
                : '#d94f3d'
              return (
                <div key={dim.id} style={{
                  borderRadius: 12,
                  border: '1px solid rgba(0,0,0,0.08)',
                  borderLeft: `3px solid ${leftColor}`,
                  background: 'rgba(255,255,255,0.68)',
                  padding: '10px 12px',
                  backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
                  opacity: 0,
                  animation: `fadeUp 0.4s cubic-bezier(.4,0,.2,1) ${i * 70}ms forwards`,
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', marginBottom: 5, gap: 8,
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#1c1a17' }}>
                      {dim.name}
                    </span>
                    <ResBadge type={dim.researchability} />
                  </div>
                  <div style={{
                    fontSize: 11, color: '#6e6a63', lineHeight: 1.55,
                    marginBottom: dim.sufficiency_condition ? 6 : 0,
                  }}>
                    {dim.research_angle}
                  </div>
                  {dim.sufficiency_condition && (
                    <div style={{
                      fontSize: 10, color: '#a09b94',
                      background: 'rgba(0,0,0,0.04)',
                      borderRadius: 6, padding: '4px 8px', lineHeight: 1.5,
                    }}>
                      <span style={{ fontWeight: 600, color: '#8c877f', marginRight: 3 }}>
                        停止条件
                      </span>
                      {dim.sufficiency_condition}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
