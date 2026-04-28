import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { updateApiKey } from "../lib/api";

const PURPLE = "#6c63e0";

interface Props {
  onClose: () => void;
}

export function SettingsModal({ onClose }: Props) {
  const { user, updateUser } = useAuth();
  const [apiKey, setApiKey] = useState(user?.api_key ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateApiKey(apiKey.trim() || null);
      updateUser(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.3)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-sm mx-4 rounded-2xl p-6"
        style={{ background: "#fff", boxShadow: "0 8px 40px rgba(0,0,0,0.12)", border: "1px solid rgba(0,0,0,0.06)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold" style={{ color: "#1c1a17" }}>设置</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors" style={{ color: "#9c9890" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#F0EDE8")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 用户信息 */}
        <div className="mb-5 p-3 rounded-xl" style={{ background: "#F8F6F3" }}>
          <div className="text-xs font-medium mb-0.5" style={{ color: "#6e6a62" }}>当前账户</div>
          <div className="text-sm font-semibold" style={{ color: "#1c1a17" }}>{user?.username}</div>
          <div className="text-xs" style={{ color: "#a09b94" }}>{user?.email}</div>
        </div>

        {/* API Key */}
        <div className="mb-4">
          <label className="block text-xs font-medium mb-1" style={{ color: "#6e6a62" }}>
            自定义 API Key
          </label>
          <p className="text-xs mb-2.5 leading-relaxed" style={{ color: "#a09b94" }}>
            填入后使用你自己的 Anthropic/OpenAI key；留空则使用服务器默认 key。
          </p>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="sk-ant-... 或留空"
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
            style={{ background: "#F8F6F3", border: "1px solid #E4E1DB", color: "#1c1a17" }}
            onFocus={e => (e.target.style.borderColor = PURPLE)}
            onBlur={e => (e.target.style.borderColor = "#E4E1DB")}
          />
        </div>

        {error && (
          <div className="mb-3 text-xs px-3 py-2 rounded-lg" style={{ background: "#FFF0EE", color: "#C0392B" }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50"
          style={{ background: saved ? "#27AE60" : PURPLE }}
        >
          {saving ? "保存中…" : saved ? "已保存 ✓" : "保存"}
        </button>
      </div>
    </div>
  );
}
