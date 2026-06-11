"""
Chat Service — Tích hợp Google Gemini cho AI English Tutor

Tính năng chính:
- System prompt tùy biến theo từ vựng của user
- Sliding window context với token budget
- Gửi tin nhắn thường và streaming (SSE)
- Sử dụng Google Gemini API (free tier)
"""
import json
from collections.abc import AsyncGenerator
from datetime import datetime

from fastapi import HTTPException, status
from google import genai
from google.genai import types
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.chat import ChatMessage, ChatSession
from app.models.vocabulary import Vocabulary
from app.schemas.chat import ChatMessageResponse, ChatSessionResponse

settings = get_settings()

# Khởi tạo Gemini client
gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)

# Token budget cho context window
TOKEN_BUDGET = 4000


# ── System Prompt ────────────────────────────────────────────────────

async def _build_system_prompt(db: AsyncSession, user_id: str) -> str:
    """
    Xây dựng system prompt có chứa danh sách từ vựng gần đây của user.
    Giúp AI tutor biết user đang học những từ gì để lồng ghép vào hội thoại.
    """
    # Lấy 30 từ vựng gần nhất của user
    result = await db.execute(
        select(Vocabulary.word, Vocabulary.definition)
        .where(Vocabulary.user_id == user_id)
        .order_by(Vocabulary.created_at.desc())
        .limit(30)
    )
    vocab_rows = result.all()

    vocab_section = ""
    if vocab_rows:
        vocab_list = "\n".join(
            f"- {word}: {definition}" for word, definition in vocab_rows
        )
        vocab_section = f"""

## Từ vựng người dùng đang học:
{vocab_list}

Hãy cố gắng sử dụng những từ vựng này trong cuộc hội thoại khi phù hợp, và tạo ví dụ liên quan đến chúng.
"""

    return f"""Bạn là một gia sư tiếng Anh thân thiện và kiên nhẫn, chuyên dạy tiếng Anh cho học sinh Việt Nam.

## Nguyên tắc:
1. Giao tiếp bằng cả tiếng Việt và tiếng Anh, ưu tiên tiếng Anh nhưng giải thích bằng tiếng Việt khi cần.
2. Khi học sinh mắc lỗi, sửa một cách nhẹ nhàng kèm giải thích rõ ràng tại sao sai và cách nói đúng.
3. Đưa ra ví dụ thực tế, dễ hiểu và gần gũi với cuộc sống.
4. Khi giải bài tập, hướng dẫn từng bước, không đưa đáp án ngay.
5. Khuyến khích học sinh luyện tập và đặt câu hỏi.
6. Sử dụng emoji phù hợp để tạo không khí vui vẻ 😊
7. Nếu học sinh hỏi ngoài phạm vi tiếng Anh, nhẹ nhàng quay lại chủ đề.
{vocab_section}
## Định dạng phản hồi:
- Dùng markdown khi cần (bold, italic, danh sách)
- Khi sửa lỗi: ❌ Câu sai → ✅ Câu đúng + giải thích
- Khi dạy ngữ pháp: đưa công thức + ví dụ
- Khi dạy từ vựng: phiên âm + nghĩa + ví dụ câu"""


# ── Context Builder ──────────────────────────────────────────────────

def _estimate_tokens(text: str) -> int:
    """Ước lượng số token. ~4 ký tự = 1 token (tiếng Anh). Tiếng Việt ~3."""
    return max(1, len(text) // 3)


async def build_context(
    db: AsyncSession,
    session_id: str,
    system_prompt: str,
) -> list[dict]:
    """Xây dựng context cho API với sliding window."""
    system_tokens = _estimate_tokens(system_prompt)
    remaining_budget = TOKEN_BUDGET - system_tokens

    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.desc())
    )
    all_messages = result.scalars().all()

    selected: list[dict] = []
    for msg in all_messages:
        msg_tokens = _estimate_tokens(msg.content)
        if remaining_budget - msg_tokens < 0:
            break
        selected.append({"role": msg.role, "content": msg.content})
        remaining_budget -= msg_tokens

    selected.reverse()
    return selected


# ── Session Management ───────────────────────────────────────────────

async def create_session(
    db: AsyncSession, user_id: str, title: str = "New Conversation"
) -> ChatSessionResponse:
    """Tạo phiên chat mới."""
    session = ChatSession(user_id=user_id, title=title)
    db.add(session)
    await db.flush()
    await db.refresh(session)

    return ChatSessionResponse(
        id=session.id,
        user_id=session.user_id,
        title=session.title,
        created_at=session.created_at,
        updated_at=session.updated_at,
        message_count=0,
        last_message=None,
    )


async def list_sessions(
    db: AsyncSession, user_id: str
) -> list[ChatSessionResponse]:
    """Lấy danh sách phiên chat của user, mới nhất trước."""
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == user_id)
        .order_by(ChatSession.updated_at.desc())
    )
    sessions = result.scalars().all()

    responses = []
    for session in sessions:
        count_result = await db.execute(
            select(func.count()).where(ChatMessage.session_id == session.id)
        )
        message_count = count_result.scalar() or 0

        last_msg_result = await db.execute(
            select(ChatMessage.content)
            .where(ChatMessage.session_id == session.id)
            .order_by(ChatMessage.created_at.desc())
            .limit(1)
        )
        last_msg = last_msg_result.scalar_one_or_none()

        responses.append(
            ChatSessionResponse(
                id=session.id,
                user_id=session.user_id,
                title=session.title,
                created_at=session.created_at,
                updated_at=session.updated_at,
                message_count=message_count,
                last_message=last_msg[:100] if last_msg else None,
            )
        )

    return responses


async def get_session_messages(
    db: AsyncSession, user_id: str, session_id: str
) -> list[ChatMessageResponse]:
    """Lấy tất cả tin nhắn trong phiên chat."""
    session = await _get_session_or_404(db, user_id, session_id)

    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
    )
    messages = result.scalars().all()

    return [
        ChatMessageResponse(
            id=m.id, session_id=m.session_id, role=m.role,
            content=m.content, created_at=m.created_at,
        )
        for m in messages
    ]


async def delete_session(
    db: AsyncSession, user_id: str, session_id: str
) -> None:
    """Xóa phiên chat (cascade xóa luôn tin nhắn)."""
    session = await _get_session_or_404(db, user_id, session_id)
    await db.delete(session)
    await db.flush()


# ── Send Message (non-streaming) — Google Gemini ─────────────────────

async def send_message(
    db: AsyncSession, user_id: str, session_id: str, user_message: str
) -> ChatMessageResponse:
    """Gửi tin nhắn và nhận phản hồi từ Gemini AI tutor."""
    session = await _get_session_or_404(db, user_id, session_id)

    # Lưu tin nhắn user
    user_msg = ChatMessage(
        session_id=session_id,
        role="user",
        content=user_message,
        token_count=_estimate_tokens(user_message),
    )
    db.add(user_msg)
    await db.flush()

    # Build context
    system_prompt = await _build_system_prompt(db, user_id)
    history = await build_context(db, session_id, system_prompt)

    # Chuyển đổi history sang format Gemini
    gemini_contents = []
    for msg in history:
        role = "user" if msg["role"] == "user" else "model"
        gemini_contents.append(types.Content(
            role=role,
            parts=[types.Part.from_text(text=msg["content"])]
        ))

    try:
        response = gemini_client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=gemini_contents,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.7,
                max_output_tokens=1000,
            ),
        )
        ai_content = response.text or ""
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Lỗi khi gọi Gemini API: {str(e)}",
        )

    # Lưu phản hồi AI
    ai_msg = ChatMessage(
        session_id=session_id,
        role="assistant",
        content=ai_content,
        token_count=_estimate_tokens(ai_content),
    )
    db.add(ai_msg)

    # Cập nhật tiêu đề session nếu là tin nhắn đầu tiên
    count_result = await db.execute(
        select(func.count()).where(ChatMessage.session_id == session_id)
    )
    msg_count = count_result.scalar() or 0
    if msg_count <= 2:
        session.title = user_message[:80]

    session.updated_at = datetime.utcnow()
    await db.flush()
    await db.refresh(ai_msg)

    return ChatMessageResponse(
        id=ai_msg.id,
        session_id=ai_msg.session_id,
        role=ai_msg.role,
        content=ai_msg.content,
        created_at=ai_msg.created_at,
    )


# ── Stream Message (SSE) — Google Gemini ─────────────────────────────

async def stream_message(
    db: AsyncSession, user_id: str, session_id: str, user_message: str
) -> AsyncGenerator[str, None]:
    """Gửi tin nhắn và stream phản hồi qua SSE sử dụng Google Gemini."""
    session = await _get_session_or_404(db, user_id, session_id)

    # Lưu tin nhắn user
    user_msg = ChatMessage(
        session_id=session_id,
        role="user",
        content=user_message,
        token_count=_estimate_tokens(user_message),
    )
    db.add(user_msg)
    await db.flush()

    # Build context
    system_prompt = await _build_system_prompt(db, user_id)
    history = await build_context(db, session_id, system_prompt)

    # Chuyển đổi sang format Gemini
    gemini_contents = []
    for msg in history:
        role = "user" if msg["role"] == "user" else "model"
        gemini_contents.append(types.Content(
            role=role,
            parts=[types.Part.from_text(text=msg["content"])]
        ))

    # Stream từ Gemini
    full_response = ""
    try:
        response_stream = gemini_client.models.generate_content_stream(
            model=settings.GEMINI_MODEL,
            contents=gemini_contents,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.7,
                max_output_tokens=1000,
            ),
        )

        for chunk in response_stream:
            if chunk.text:
                content = chunk.text
                full_response += content
                yield f"data: {json.dumps({'content': content})}\n\n"

    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
        return

    # Lưu phản hồi hoàn chỉnh vào DB
    ai_msg = ChatMessage(
        session_id=session_id,
        role="assistant",
        content=full_response,
        token_count=_estimate_tokens(full_response),
    )
    db.add(ai_msg)

    # Cập nhật session
    count_result = await db.execute(
        select(func.count()).where(ChatMessage.session_id == session_id)
    )
    msg_count = count_result.scalar() or 0
    if msg_count <= 2:
        session.title = user_message[:80]

    session.updated_at = datetime.utcnow()
    await db.flush()

    # Signal kết thúc stream
    yield f"data: {json.dumps({'done': True})}\n\n"


# ── Helpers ──────────────────────────────────────────────────────────

async def _get_session_or_404(
    db: AsyncSession, user_id: str, session_id: str
) -> ChatSession:
    """Tìm session thuộc về user, raise 404 nếu không tìm thấy."""
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == user_id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy phiên chat",
        )
    return session
