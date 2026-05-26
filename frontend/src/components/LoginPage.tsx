import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { authLogin, authRegister } from "../lib/api";

const PRIMARY = "#1C1C1C";

export function LoginPage() {
  const { login } = useAuth();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = tab === "login"
        ? await authLogin({ username, password })
        : await authRegister({ username, email, password });
      login(res.access_token, res.user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "请求失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#F5F5F5", fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif" }}
    >
      <div className="w-full max-w-sm px-4">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
            style={{ background: PRIMARY }}
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <circle cx="12" cy="12" r="9" strokeWidth={2} />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l2.5 2" />
            </svg>
          </div>
          <h1 className="text-xl font-bold" style={{ color: "#1C1C1C", letterSpacing: "-0.5px" }}>Grove</h1>
          <p className="text-sm mt-1" style={{ color: "#8A8A8A" }}>研究设计助手</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6"
          style={{ background: "#fff", boxShadow: "0 2px 20px rgba(0,0,0,0.07)", border: "1px solid rgba(0,0,0,0.06)" }}
        >
          {/* Tab */}
          <div className="flex rounded-lg p-0.5 mb-5" style={{ background: "#ECECEC" }}>
            {(["login", "register"] as const).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(null); }}
                className="flex-1 py-1.5 rounded-md text-sm font-medium transition-all"
                style={{
                  background: tab === t ? "#fff" : "transparent",
                  color: tab === t ? "#1C1C1C" : "#767676",
                  boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                }}
              >
                {t === "login" ? "登录" : "注册"}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 text-sm px-3 py-2.5 rounded-lg" style={{ background: "#FFF0EE", color: "#C0392B", border: "1px solid #FADADD" }}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#5F5F5F" }}>
                用户名{tab === "login" && " / 邮箱"}
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder={tab === "login" ? "输入用户名或邮箱" : "设置用户名"}
                required
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
                style={{
                  background: "#F7F7F7",
                  border: "1px solid #D8D8D8",
                  color: "#1C1C1C",
                }}
                onFocus={e => (e.target.style.borderColor = PRIMARY)}
                onBlur={e => (e.target.style.borderColor = "#D8D8D8")}
              />
            </div>

            {tab === "register" && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#5F5F5F" }}>邮箱</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
                  style={{ background: "#F7F7F7", border: "1px solid #D8D8D8", color: "#1C1C1C" }}
                  onFocus={e => (e.target.style.borderColor = PRIMARY)}
                  onBlur={e => (e.target.style.borderColor = "#D8D8D8")}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#5F5F5F" }}>密码</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={tab === "register" ? "至少 6 位" : "输入密码"}
                required
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
                style={{ background: "#F7F7F7", border: "1px solid #D8D8D8", color: "#1C1C1C" }}
                onFocus={e => (e.target.style.borderColor = PRIMARY)}
                onBlur={e => (e.target.style.borderColor = "#D8D8D8")}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50 mt-1"
              style={{ background: PRIMARY }}
            >
              {loading ? "请稍候…" : tab === "login" ? "登录" : "创建账户"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: "#B8B8B8" }}>
          Grove · Research Assistant
        </p>
      </div>
    </div>
  );
}
