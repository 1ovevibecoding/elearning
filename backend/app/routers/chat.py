"""
Chat Router — Endpoints cho phiên chat và tin nhắn với AI tutor
"""
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, AsyncSessionLocal
from app.models.user import User
from app.schemas.chat import (
    ChatMessageCreate,
    ChatMessageResponse,
    ChatSessionCreate,
    ChatSessionResponse,
    ChatSessionListResponse,
)
from app.services.auth_service import get_current_user
from app.services import chat_service

router = APIRouter(prefix="/api/chat", tags=["Chat"])


# ── Session endpoints ────────────────────────────────────────────────

@router.post("/sessions", response_model=ChatSessionResponse, status_code=201)
async def create_session(
    data: ChatSessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Tạo phiên chat mới."""
    return await chat_service.create_session(db, current_user.id, data.title)


@router.get("/sessions", response_model=ChatSessionListResponse)
async def list_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lấy danh sách phiên chat, mới nhất trước."""
    sessions = await chat_service.list_sessions(db, current_user.id)
    return ChatSessionListResponse(sessions=sessions)


@router.get(
    "/sessions/{session_id}/messages",
    response_model=list[ChatMessageResponse],
)
async def get_messages(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lấy toàn bộ tin nhắn trong phiên chat."""
    return await chat_service.get_session_messages(
        db, current_user.id, session_id
    )


@router.post(
    "/sessions/{session_id}/messages",
    response_model=ChatMessageResponse,
)
async def send_message(
    session_id: str,
    data: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Gửi tin nhắn và nhận phản hồi từ AI tutor."""
    return await chat_service.send_message(
        db, current_user.id, session_id, data.message
    )


@router.post("/sessions/{session_id}/stream")
async def stream_message(
    session_id: str,
    data: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
):
    """
    Gửi tin nhắn và nhận phản hồi dạng Server-Sent Events (SSE).
    Streaming giúp hiển thị phản hồi từng chữ như ChatGPT.

    Lưu ý: Dùng session riêng cho streaming vì response kéo dài
    sau khi request handler return, nằm ngoài vòng đời của get_db.
    """
    user_id = current_user.id
    message = data.message

    async def event_generator():
        # Tạo session DB riêng cho streaming
        async with AsyncSessionLocal() as db:
            try:
                async for chunk in chat_service.stream_message(
                    db, user_id, session_id, message
                ):
                    yield chunk
                await db.commit()
            except Exception:
                await db.rollback()
                raise

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Tắt buffering cho nginx
        },
    )


@router.delete("/sessions/{session_id}", status_code=204)
async def delete_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Xóa phiên chat (cascade xóa luôn tin nhắn)."""
    await chat_service.delete_session(db, current_user.id, session_id)
