"""
FastAPI 入口
"""
import os
import sys
import threading
import webbrowser
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from loguru import logger

# 桌面打包模式：设置合理默认值（可被 .env 覆盖）
if getattr(sys, "frozen", False):
    import os as _os
    _os.environ.setdefault("AI_PROVIDER", "deepseek")
    _os.environ.setdefault("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")
    _os.environ.setdefault("DEEPSEEK_MODEL", "deepseek-chat")

from app.core.config import settings
from app.api.routes import router
from app.api.auth_routes import router as auth_router
from app.db.database import init_db

# 日志配置
logger.remove()
logger.add(sys.stderr, level="INFO", format="<green>{time:HH:mm:ss}</green> | <level>{level}</level> | {message}")
if log_file := os.environ.get("LOG_FILE"):
    logger.add(log_file, rotation="10 MB", retention="7 days", level="DEBUG")

# 前端静态文件目录（打包后与 exe 同级的 dist/）
_here = Path(getattr(sys, "_MEIPASS", Path(__file__).parent))
FRONTEND_DIST = _here / "dist"

app = FastAPI(
    title="深度研究助手 - 模块一",
    description="苏格拉底式研究设计 Agent",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(router)

# 挂载前端静态资源（仅在 dist 存在时）
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/")
    async def serve_index():
        return FileResponse(str(FRONTEND_DIST / "index.html"))

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file = FRONTEND_DIST / full_path
        if file.exists() and file.is_file():
            return FileResponse(str(file))
        return FileResponse(str(FRONTEND_DIST / "index.html"))


@app.on_event("startup")
async def startup():
    init_db()
    logger.info("Database initialized")


@app.get("/health")
async def health():
    return {"status": "ok", "provider": settings.ai_provider}


def _open_browser():
    import time
    time.sleep(1.5)
    webbrowser.open("http://localhost:8000")


if __name__ == "__main__":
    import uvicorn
    # 桌面模式：自动打开浏览器
    if FRONTEND_DIST.exists():
        threading.Thread(target=_open_browser, daemon=True).start()
    uvicorn.run(app, host="127.0.0.1", port=8000)
