import { useState } from "react";
import type { CachedSession } from "../types/research";

interface Props {
  sessions: CachedSession[];
  currentSessionId: string | null;
  onNewSession: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
}

const PURPLE = "#6c63e0";

export function Sidebar({ sessions, currentSessionId, onNewSession, onSelectSession, onDeleteSession }: Props) {
  const [hoverId, setHoverId] = useState<string | null>(null);

  return (
    <div className="w-48 flex-shrink-0 flex flex-col h-full" style={{ background: "#F8F6F3", borderRight: "1px solid rgba(0,0,0,0.07)" }}>

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4" style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
        <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: PURPLE }}>
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <circle cx="12" cy="12" r="9" strokeWidth={2} />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l2.5 2" />
          </svg>
        </div>
        <span className="text-sm font-semibold tracking-tight" style={{ color: "#1c1a17" }}>Grove</span>
      </div>

      {/* 新建任务 */}
      <div className="px-3 pt-3 pb-2">
        <button
          onClick={onNewSession}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ background: `rgba(108,99,224,0.07)`, color: PURPLE, border: `1px dashed rgba(108,99,224,0.3)` }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(108,99,224,0.12)")}
          onMouseLeave={e => (e.currentTarget.style.background = "rgba(108,99,224,0.07)")}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          新建研究
        </button>
      </div>

      {/* 历史列表 */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {sessions.length > 0 && (
          <>
            <div className="text-xs px-2 py-2 uppercase tracking-widest font-semibold" style={{ color: "rgba(0,0,0,0.25)" }}>
              最近
            </div>
            <div className="space-y-0.5">
              {sessions.map((s) => {
                const isActive = s.id === currentSessionId;
                return (
                  <div
                    key={s.id}
                    className="relative group"
                    onMouseEnter={() => setHoverId(s.id)}
                    onMouseLeave={() => setHoverId(null)}
                  >
                    <button
                      onClick={() => onSelectSession(s.id)}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all pr-8"
                      style={{
                        background: isActive ? "rgba(255,255,255,0.9)" : "transparent",
                        boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.07), 0 0 0 0.5px rgba(0,0,0,0.05)" : "none",
                      }}
                      onMouseEnter={e => {
                        if (!isActive) e.currentTarget.style.background = "rgba(0,0,0,0.04)";
                      }}
                      onMouseLeave={e => {
                        if (!isActive) e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span style={{
                          width: 5, height: 5, borderRadius: "50%", flexShrink: 0, display: "inline-block",
                          background: isActive ? PURPLE : "#d8d4cc",
                          transition: "background 0.2s",
                        }} />
                        <span className="truncate text-xs leading-relaxed" style={{ color: isActive ? "#1c1a17" : "#6e6a62", fontWeight: isActive ? 500 : 400 }}>
                          {s.title}
                        </span>
                      </div>
                      <div className="text-xs mt-0.5 pl-[13px]" style={{ color: "#c0bbb3" }}>
                        {new Date(s.createdAt).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}
                      </div>
                    </button>

                    {hoverId === s.id && (
                      <button
                        onClick={e => { e.stopPropagation(); onDeleteSession(s.id); }}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded transition-colors"
                        style={{ color: "rgba(0,0,0,0.25)" }}
                        onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
                        onMouseLeave={e => { e.currentTarget.style.color = "rgba(0,0,0,0.25)"; e.currentTarget.style.background = "transparent"; }}
                        title="删除"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* 底部 */}
      <div className="px-4 py-3" style={{ borderTop: "1px solid rgba(0,0,0,0.07)" }}>
        <div className="text-xs" style={{ color: "#b0aba3" }}>Research Assistant</div>
      </div>
    </div>
  );
}
