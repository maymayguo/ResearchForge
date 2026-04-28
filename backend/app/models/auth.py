"""
认证相关 Pydantic 模型
"""
from pydantic import BaseModel
from typing import Optional


class UserCreate(BaseModel):
    username: str
    email: str
    password: str


class UserLogin(BaseModel):
    username: str   # 支持用户名或邮箱
    password: str


class UserOut(BaseModel):
    id: str
    username: str
    email: str
    api_key: Optional[str] = None
    created_at: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UpdateApiKey(BaseModel):
    api_key: Optional[str] = None
