import type { CreateSessionResponse, ChatResponse, Session, Message, UnderstandingCanvas, ResearchPlan } from "../types/research";
import type { TokenResponse, LoginRequest, RegisterRequest, User } from "../types/auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("grove_token");
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── 认证 ──────────────────────────────────────────────

export async function authLogin(req: LoginRequest): Promise<TokenResponse> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  return handleResponse<TokenResponse>(res);
}

export async function authRegister(req: RegisterRequest): Promise<TokenResponse> {
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  return handleResponse<TokenResponse>(res);
}

export async function updateApiKey(apiKey: string | null): Promise<User> {
  const res = await fetch(`${BASE_URL}/api/auth/api-key`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ api_key: apiKey }),
  });
  return handleResponse<User>(res);
}

// ── 会话列表 ──────────────────────────────────────────

export async function listSessions(): Promise<{ id: string; title: string; createdAt: string }[]> {
  const res = await fetch(`${BASE_URL}/api/sessions`, { headers: authHeaders() });
  return handleResponse(res);
}

// ── 创建 / 恢复会话 ───────────────────────────────────

export async function createSession(): Promise<CreateSessionResponse> {
  const res = await fetch(`${BASE_URL}/api/sessions`, {
    method: "POST",
    headers: authHeaders(),
  });
  return handleResponse<CreateSessionResponse>(res);
}

export async function sendMessage(
  sessionId: string,
  message: string,
  signal?: AbortSignal
): Promise<ChatResponse> {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ session_id: sessionId, message }),
    signal,
  });
  return handleResponse<ChatResponse>(res);
}

export async function restoreSession(
  messages: Message[],
  canvas: UnderstandingCanvas,
  researchPlan: ResearchPlan | null,
): Promise<CreateSessionResponse> {
  const res = await fetch(`${BASE_URL}/api/sessions/restore`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ messages, canvas, research_plan: researchPlan }),
  });
  return handleResponse<CreateSessionResponse>(res);
}

export async function getSession(sessionId: string): Promise<Session> {
  const res = await fetch(`${BASE_URL}/api/sessions/${sessionId}`, { headers: authHeaders() });
  return handleResponse<Session>(res);
}

export async function deleteSessionApi(sessionId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/sessions/${sessionId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
}
