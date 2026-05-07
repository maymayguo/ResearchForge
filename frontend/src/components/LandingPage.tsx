import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { authLogin, authRegister } from "../lib/api";

const PURPLE = "#6c63e0";
const BG = "#F5F4F0";

/**
 * 预设的 demo 步骤，模拟苏格拉底对话的渐进式推进
 */
const DEMO_STEPS = [
  {
    user: "我想研究低空经济赛道的投资机会",
    ai: "好的。我们先来理清一下——你说「低空经济」，你最先想到的是哪一块？飞行器制造、基础设施、运营服务，还是政策层面？",
  },
  {
    user: "主要是运营服务这块吧，美团京东都在做无人机配送",
    ai: "明白了。那你对这个赛道的判断是基于什么背景？比如是新政策出台、看到了对标案例、还是你觉得这是个被低估的市场？",
  },
  {
    user: "最近各地都在出低空经济政策，但我感觉真正有商业价值的落地场景还不多",
    ai: "好问题。那我们来定义一下核心研究方向：与其泛泛看「低空经济」，不如聚焦在——哪些低空经济场景已经具备单位经济模型（unit economics）的正向验证？",
  },
];

export function LandingPage() {
  const { login } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [tab, setTab] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoStep, setDemoStep] = useState(0);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res =
        tab === "login"
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
    <div className="min-h-screen" style={{ background: BG, fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* ── 导航栏 ── */}
      <div className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: PURPLE }}>
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <circle cx="12" cy="12" r="9" strokeWidth={2} />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l2.5 2" />
            </svg>
          </div>
          <span className="text-sm font-bold" style={{ color: "#1c1a17" }}>Grove</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowAuth(true); setTab("login"); }}
            className="text-sm px-4 py-2 rounded-lg transition-colors"
            style={{ color: "#6e6a62" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#EDEBE6")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            登录
          </button>
          <button
            onClick={() => { setShowAuth(true); setTab("register"); }}
            className="text-sm px-4 py-2 rounded-lg text-white font-medium transition-opacity"
            style={{ background: PURPLE }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.9")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            免费注册
          </button>
        </div>
      </div>

      {/* ── Hero 区域 ── */}
      <div className="max-w-3xl mx-auto px-6 pt-16 pb-12 text-center">
        <h1 className="text-4xl font-bold leading-tight mb-4" style={{ color: "#1c1a17", letterSpacing: "-1px" }}>
          把你的模糊想法<br />
          变成清晰的研究框架
        </h1>
        <p className="text-base leading-relaxed mb-8" style={{ color: "#7a7670" }}>
          一个苏格拉底式的 AI 对话伙伴。<br />
          用 9 步引导你从「想研究什么」到一份结构完整的<strong style={{ color: "#1c1a17" }}>研究框架</strong>。
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => { setShowAuth(true); setTab("register"); }}
            className="px-6 py-3 rounded-xl text-sm font-medium text-white transition-all"
            style={{ background: PURPLE }}
            onMouseEnter={e => { e.currentTarget.style.background = "#5a51c8"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = PURPLE; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            开始使用
          </button>
          <div className="text-xs" style={{ color: "#b5b0a8" }}>免费 · 无需信用卡</div>
        </div>
      </div>

      {/* ── Demo 演示区 ── */}
      <div className="max-w-2xl mx-auto px-6 pb-20">
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "#fff", boxShadow: "0 4px 32px rgba(0,0,0,0.08)", border: "1px solid rgba(0,0,0,0.06)" }}
        >
          {/* Demo 头部 */}
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#EEECE8" }}>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-bold" style={{ background: PURPLE }}>研</div>
              <span className="text-xs font-semibold" style={{ color: "#1C1C1C" }}>研究对话 Demo</span>
            </div>
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full" style={{ background: "#E4E1DB" }} />
              <div className="w-2 h-2 rounded-full" style={{ background: "#E4E1DB" }} />
              <div className="w-2 h-2 rounded-full" style={{ background: "#E4E1DB" }} />
            </div>
          </div>

          {/* Demo 内容 */}
          <div className="px-4 py-5 space-y-4 min-h-[260px]">
            {DEMO_STEPS.slice(0, demoStep + 1).map((step, i) => (
              <div key={i} className="space-y-2">
                {/* 用户消息 */}
                <div className="flex justify-end">
                  <div
                    className="max-w-[80%] text-sm px-3.5 py-2.5 rounded-2xl rounded-br-sm"
                    style={{ background: "rgba(108,99,224,0.09)", color: "#1c1a17" }}
                  >
                    {step.user}
                  </div>
                </div>
                {/* AI 消息 */}
                <div className="flex justify-start animate-fadeIn">
                  <div
                    className="max-w-[80%] text-sm px-3.5 py-2.5 rounded-2xl rounded-bl-sm leading-relaxed"
                    style={{ background: "#F5F4F0", color: "#3a3834" }}
                  >
                    {step.ai}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Demo 控制 */}
          <div className="px-4 py-3 border-t flex items-center justify-between" style={{ borderColor: "#EEECE8" }}>
            <div className="flex gap-1">
              {DEMO_STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setDemoStep(i)}
                  className="w-6 h-1.5 rounded-full transition-all"
                  style={{
                    background: i <= demoStep ? PURPLE : "#E4E1DB",
                    width: i === demoStep ? 20 : 6,
                  }}
                />
              ))}
            </div>
            {demoStep < DEMO_STEPS.length - 1 ? (
              <button
                onClick={() => setDemoStep(d => d + 1)}
                className="text-xs px-3 py-1.5 rounded-lg text-white font-medium transition-opacity"
                style={{ background: PURPLE }}
              >
                下一步
              </button>
            ) : (
              <button
                onClick={() => { setShowAuth(true); setTab("register"); }}
                className="text-xs px-3 py-1.5 rounded-lg text-white font-medium transition-opacity"
                style={{ background: "#27AE60" }}
              >
                开始使用 →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 9 步流程 ── */}
      <div className="max-w-3xl mx-auto px-6 pb-20">
        <h2 className="text-lg font-bold text-center mb-8" style={{ color: "#1c1a17" }}>9 步，从模糊到清晰</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { step: "探索", desc: "说出你脑中最初的想法" },
            { step: "定向", desc: "AI 引导你聚焦方向" },
            { step: "诊断", desc: "理清已知和未知" },
            { step: "深挖", desc: "追问关键假设" },
            { step: "锚定", desc: "确认研究边界" },
            { step: "成型", desc: "子问题逐渐清晰" },
            { step: "确认", desc: "验证逻辑链条" },
            { step: "结晶", desc: "生成研究框架" },
            { step: "完成", desc: "导出研究方案" },
          ].map(item => (
            <div
              key={item.step}
              className="text-center p-4 rounded-xl transition-all"
              style={{ background: "rgba(108,99,224,0.04)", border: "1px solid rgba(108,99,224,0.08)" }}
            >
              <div className="text-xs font-semibold mb-1" style={{ color: PURPLE }}>{item.step}</div>
              <div className="text-xs" style={{ color: "#a09b94" }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 适用场景 ── */}
      <div className="max-w-3xl mx-auto px-6 pb-20">
        <h2 className="text-lg font-bold text-center mb-6" style={{ color: "#1c1a17" }}>适用于</h2>
        <div className="flex justify-center gap-3 flex-wrap">
          {["市场研究", "竞品分析", "用户洞察", "行业趋势", "学术选题", "投资研究"].map(s => (
            <div
              key={s}
              className="text-sm px-4 py-2 rounded-full"
              style={{ background: "rgba(108,99,224,0.07)", color: PURPLE, border: "1px solid rgba(108,99,224,0.15)" }}
            >
              {s}
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="text-center pb-8">
        <p className="text-xs" style={{ color: "#c5c0b8" }}>Grove · Research Assistant</p>
      </div>

      {/* ── 登录/注册 Modal ── */}
      {showAuth && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setShowAuth(false)}
        >
          <div
            className="rounded-2xl p-6 w-full max-w-sm mx-4"
            style={{ background: "#fff", boxShadow: "0 8px 40px rgba(0,0,0,0.15)" }}
            onClick={e => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-col items-start gap-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: PURPLE }}>
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <circle cx="12" cy="12" r="9" strokeWidth={2} />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l2.5 2" />
                    </svg>
                  </div>
                  <span className="text-sm font-bold" style={{ color: "#1c1a17" }}>Grove</span>
                </div>
                <span className="text-xs" style={{ color: "#a09b94" }}>研究设计助手</span>
              </div>
              <button
                onClick={() => setShowAuth(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                style={{ color: "#BABABA" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F0EDE8")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                ✕
              </button>
            </div>

            {/* Tab */}
            <div className="flex rounded-lg p-0.5 mb-4" style={{ background: "#F0EDE8" }}>
              {(["login", "register"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setError(null); }}
                  className="flex-1 py-1.5 rounded-md text-sm font-medium transition-all"
                  style={{
                    background: tab === t ? "#fff" : "transparent",
                    color: tab === t ? "#1c1a17" : "#9c9890",
                    boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  {t === "login" ? "登录" : "注册"}
                </button>
              ))}
            </div>

            {error && (
              <div
                className="mb-4 text-sm px-3 py-2.5 rounded-lg"
                style={{ background: "#FFF0EE", color: "#C0392B", border: "1px solid #FADADD" }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#6e6a62" }}>
                  用户名{tab === "login" && " / 邮箱"}
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder={tab === "login" ? "输入用户名或邮箱" : "设置用户名"}
                  required
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
                  style={{ background: "#F8F6F3", border: "1px solid #E4E1DB", color: "#1c1a17" }}
                  onFocus={e => (e.target.style.borderColor = PURPLE)}
                  onBlur={e => (e.target.style.borderColor = "#E4E1DB")}
                />
              </div>
              {tab === "register" && (
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#6e6a62" }}>邮箱</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
                    style={{ background: "#F8F6F3", border: "1px solid #E4E1DB", color: "#1c1a17" }}
                    onFocus={e => (e.target.style.borderColor = PURPLE)}
                    onBlur={e => (e.target.style.borderColor = "#E4E1DB")}
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#6e6a62" }}>密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={tab === "register" ? "至少 6 位" : "输入密码"}
                  required
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
                  style={{ background: "#F8F6F3", border: "1px solid #E4E1DB", color: "#1c1a17" }}
                  onFocus={e => (e.target.style.borderColor = PURPLE)}
                  onBlur={e => (e.target.style.borderColor = "#E4E1DB")}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50"
                style={{ background: PURPLE }}
              >
                {loading ? "请稍候…" : tab === "login" ? "登录" : "创建账户"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
