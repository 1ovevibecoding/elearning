"""
Auth Service — Xác thực Google OAuth + JWT token management
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

from authlib.integrations.starlette_client import OAuth
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models.user import User

settings = get_settings()

# ── Google OAuth setup ──────────────────────────────────────────────
oauth = OAuth()
oauth.register(
    name="google",
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

# Bearer token scheme — auto_error=False để tự xử lý lỗi
security = HTTPBearer(auto_error=False)


# ── JWT helpers ─────────────────────────────────────────────────────

def create_access_token(user_id: str, email: str) -> str:
    """Tạo JWT access token với thời hạn cấu hình từ settings."""
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRE_HOURS)
    payload = {
        "sub": user_id,
        "email": email,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Giải mã và xác thực JWT token. Raise exception nếu token không hợp lệ."""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ hoặc đã hết hạn",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ── User lookup / creation ──────────────────────────────────────────

async def find_or_create_user(
    db: AsyncSession,
    email: str,
    name: str,
    avatar_url: Optional[str] = None,
    provider: str = "google",
) -> User:
    """
    Tìm user theo email. Nếu chưa tồn tại thì tạo mới.
    Dùng cho cả Google OAuth callback lẫn dev login.
    """
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user:
        # Cập nhật thông tin nếu cần
        user.name = name
        if avatar_url:
            user.avatar_url = avatar_url
        user.updated_at = datetime.utcnow()
        await db.flush()
        return user

    # Tạo user mới
    user = User(
        email=email,
        name=name,
        avatar_url=avatar_url,
        provider=provider,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


# ── Dependency: lấy current user từ token ──────────────────────────

async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Dependency lấy user hiện tại từ JWT token.
    Kiểm tra theo thứ tự:
    1. Authorization header (Bearer token)
    2. Cookie 'access_token'
    Nếu không tìm thấy token → 401 Unauthorized.
    """
    token: Optional[str] = None

    # Ưu tiên Authorization header
    if credentials:
        token = credentials.credentials
    else:
        # Fallback: đọc từ cookie
        token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Chưa đăng nhập. Vui lòng cung cấp access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Giải mã token
    payload = decode_access_token(token)
    user_id: str = payload.get("sub", "")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không chứa thông tin user",
        )

    # Truy vấn user từ DB
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User không tồn tại",
        )

    return user
