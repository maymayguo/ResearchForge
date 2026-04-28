"""
FastAPI 入口
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
import sys

from app.core.config import settings
from app.api.routes import router
from app.api.auth_routes import router as auth_router
from app.db.database import init_db

# 日志配置
logger.remove()
logger.add(sys.stderr, level="INFO", format="<green>{time:HH:mm:ss}</green> | <level>{level}</level> | {message}")
if log_file := os.environ.get("LOG_FILE"):
    logger.add(log_file, rotation="10 MB", retention="7 days", level="DEBUG")

app = FastAPI(
    title="深度研究助手 - 模块一",
    description="苏格拉底式研究设计 Agent",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(router)


@app.on_event("startup")
async def startup():
    init_db()
    logger.info("Database initialized")


@app.get("/health")
async def health():
    return {"status": "ok", "provider": settings.ai_provider, "model": settings.anthropic_model if settings.ai_provider == "anthropic" else settings.openai_model}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=True)
