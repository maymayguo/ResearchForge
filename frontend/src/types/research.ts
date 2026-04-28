// TypeScript 类型定义（与后端 Pydantic 模型对应）
// 版本：v3.1

export interface QuestionVersion {
  version: number;
  statement: string;
  trigger: string;
}

export interface UnderstandingCanvas {
  // 核心四要素
  anchor_observation: string | null;
  hard_constraints: string[];
  key_assumption: string | null;
  assumption_confidence: "high" | "medium" | "low" | null;
  decision_context: string | null;

  // 补充信息
  known_context: string | null;
  audience: string | null;

  // 开放方向 / 排除范围
  open_directions: unknown[];
  scope_out: unknown[];

  // 过程记录
  question_evolution: QuestionVersion[];

  // 状态
  clarity_score: number;
  phase: "exploring" | "crystallize_question" | "rewrite_confirm" | "crystallize_framework" | "confirmed";
}

export interface SubQuestion {
  id: string;
  statement: string;
  parent_id: string | null;
}

export interface KeyAssumption {
  statement: string;
  confidence: "high" | "medium" | "low";
  testable: boolean;
}

export interface ResearchQuestion {
  core_statement: string;
  sub_questions: SubQuestion[];
  hard_constraints: string[];
  open_directions: string[];
  key_assumptions: (KeyAssumption | string)[];
  evolution_summary: string;
}

export interface Dimension {
  id: string;
  name: string;
  mapped_questions: string[];
  researchability: "desk_research" | "deep_search" | "primary_research";
  research_angle: string;
  search_keywords: string[];
  data_sources: string[];
  sufficiency_condition: string;
  expected_output: string;
  open_extensions: string[];
}

export interface PrimaryResearchTask {
  question: string;
  reason: string;
  respondent_profile: string;
  method: string;
}

export interface ResearchPlan {
  question: ResearchQuestion;
  dimensions: Dimension[];
  primary_research_list: PrimaryResearchTask[];
  priority_order: string[];
  research_philosophy: string;
  ai_reservations: string[];
  estimated_complexity: "low" | "moderate" | "high";
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface Session {
  id: string;
  created_at: string;
  messages: Message[];
  canvas: UnderstandingCanvas;
  research_plan: ResearchPlan | null;
  status: "active" | "completed";
}

export interface CachedSession {
  id: string;
  title: string;
  createdAt: string;
}

export interface CreateSessionResponse {
  session_id: string;
  welcome_message: Message;
  canvas: UnderstandingCanvas;
}

export interface ChatResponse {
  session_id: string;
  message: Message;
  canvas: UnderstandingCanvas;
  research_plan: ResearchPlan | null;
  question_draft: ResearchQuestion | null;
}
