"""
认证 API 路由：注册 / 登录 / 个人信息 / API Key 设置
"""
from __future__ import annotations
from fastapi import APIRouter, HTTPException, Depends
from loguru import logger

from app.models.auth import UserCreate, UserLogin, TokenResponse, UpdateApiKey, UserOut
from app.core.auth import hash_password, verify_password, create_access_token, get_current_user_id
from app.services.user_store import (
    create_user, get_user_by_id, get_user_by_username_or_email,
    update_api_key, username_exists, email_exists,
)

router = APIRouter(prefix="/api/auth")


@router.post("/register", response_model=TokenResponse)
async def register(req: UserCreate):
    """注册新用户"""
    if len(req.username) < 2:
        raise HTTPException(400, "用户名至少 2 个字符")
    if len(req.password) < 6:
        raise HTTPException(400, "密码至少 6 位")
    if username_exists(req.username):
        raise HTTPException(400, "用户名已被占用")
    if email_exists(req.email):
        raise HTTPException(400, "邮箱已被注册")

    hashed = hash_password(req.password)
    user = create_user(req.username, req.email, hashed)
    token = create_access_token(user.id, user.username)
    logger.info(f"New user registered: {user.username}")
    return TokenResponse(access_token=token, user=user)


@router.post("/login", response_model=TokenResponse)
async def login(req: UserLogin):
    """登录（支持用户名或邮箱）"""
    row = get_user_by_username_or_email(req.username)
    if not row or not verify_password(req.password, row["hashed_password"]):
        raise HTTPException(401, "用户名或密码错误")

    user = UserOut(
        id=row["id"],
        username=row["username"],
        email=row["email"],
        api_key=row["api_key"],
        created_at=row["created_at"],
    )
    token = create_access_token(user.id, user.username)
    logger.info(f"User logged in: {user.username}")
    return TokenResponse(access_token=token, user=user)


@router.get("/me", response_model=UserOut)
async def me(user_id: str = Depends(get_current_user_id)):
    """获取当前用户信息"""
    row = get_user_by_id(user_id)
    if not row:
        raise HTTPException(404, "用户不存在")
    return UserOut(
        id=row["id"],
        username=row["username"],
        email=row["email"],
        api_key=row["api_key"],
        created_at=row["created_at"],
    )


@router.patch("/api-key", response_model=UserOut)
async def set_api_key(req: UpdateApiKey, user_id: str = Depends(get_current_user_id)):
    """更新用户自己的 API Key（留空则清除，使用服务器默认 key）"""
    api_key = req.api_key.strip() if req.api_key else None
    update_api_key(user_id, api_key)
    row = get_user_by_id(user_id)
    return UserOut(
        id=row["id"],
        username=row["username"],
        email=row["email"],
        api_key=row["api_key"],
        created_at=row["created_at"],
    )
