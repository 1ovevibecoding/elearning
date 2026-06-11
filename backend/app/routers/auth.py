"""
Auth Router — Đăng nhập Google OAuth + JWT + Dev login
"""
from fastapi import APIRouter, Depends, Request, Response, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse, TokenResponse
from app.services.auth_service import (
    oauth,
    create_access_token,
    find_or_create_user,
    get_current_user,
)

settings = get_settings()

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ── Google OAuth Login ───────────────────────────────────────────────

@router.get("/google/login")
async def google_login(request: Request):
    """Redirect người dùng đến Google OAuth consent screen."""
    redirect_uri = f"{settings.API_URL}/auth/google/callback"
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/google/callback")
async def google_callback(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Xử lý callback từ Google OAuth:
    1. Lấy thông tin user từ Google
    2. Tìm hoặc tạo user trong DB
    3. Tạo JWT token
    4. Redirect về frontend kèm token
    """
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể xác thực với Google",
        )

    # Lấy thông tin user từ ID token
    user_info = token.get("userinfo")
    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không nhận được thông tin user từ Google",
        )

    # Tìm hoặc tạo user
    user = await find_or_create_user(
        db=db,
        email=user_info["email"],
        name=user_info.get("name", user_info["email"]),
        avatar_url=user_info.get("picture"),
        provider="google",
    )

    # Tạo JWT
    access_token = create_access_token(user.id, user.email)

    # Redirect về frontend kèm token trong cookie
    response = Response(
        status_code=status.HTTP_302_FOUND,
        headers={"Location": f"{settings.FRONTEND_URL}?token={access_token}"},
    )
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,  # True cho production (HTTPS)
        samesite="lax",
        max_age=settings.JWT_EXPIRE_HOURS * 3600,
    )
    return response


# ── Current User ─────────────────────────────────────────────────────

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Lấy thông tin user hiện tại từ JWT token."""
    return current_user


# ── Logout ───────────────────────────────────────────────────────────

@router.post("/logout")
async def logout(response: Response):
    """Đăng xuất — xóa cookie access_token."""
    response.delete_cookie("access_token")
    return {"message": "Đã đăng xuất thành công"}


# ── Dev Login (chỉ dùng cho development) ─────────────────────────────

@router.post("/dev/login", response_model=TokenResponse)
async def dev_login(
    db: AsyncSession = Depends(get_db),
):
    """
    Tạo tài khoản dev và trả về JWT token.
    CHỈ DÙNG CHO DEVELOPMENT — không cần Google OAuth.
    Tiện cho việc test API mà không cần cấu hình Google credentials.
    """
    user = await find_or_create_user(
        db=db,
        email="dev@elearning.local",
        name="Developer Account",
        avatar_url=None,
        provider="dev",
    )

    access_token = create_access_token(user.id, user.email)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            avatar_url=user.avatar_url,
            provider=user.provider,
            created_at=user.created_at,
            updated_at=user.updated_at,
        ),
    )
