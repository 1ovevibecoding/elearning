"""
Flashcard Router — Endpoints cho thẻ ôn tập và SM-2 review
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.flashcard import (
    FlashcardResponse,
    FlashcardReviewRequest,
    FlashcardReviewResponse,
    FlashcardStatsResponse,
)
from app.services.auth_service import get_current_user
from app.services import flashcard_service

router = APIRouter(prefix="/api/flashcards", tags=["Flashcards"])


@router.post(
    "/create/{vocabulary_id}",
    response_model=FlashcardResponse,
    status_code=201,
)
async def create_flashcard(
    vocabulary_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Tạo flashcard từ một từ vựng đã lưu."""
    return await flashcard_service.create_flashcard(
        db, current_user.id, vocabulary_id
    )


@router.get("/due", response_model=list[FlashcardResponse])
async def get_due_cards(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lấy danh sách thẻ cần ôn hôm nay (next_review_date <= today)."""
    return await flashcard_service.get_due_flashcards(db, current_user.id)


@router.post("/{flashcard_id}/review", response_model=FlashcardReviewResponse)
async def review_card(
    flashcard_id: str,
    data: FlashcardReviewRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Gửi kết quả ôn tập. Áp dụng thuật toán SM-2.
    quality: 0 (quên hoàn toàn) → 5 (nhớ hoàn hảo)
    """
    return await flashcard_service.review_flashcard(
        db, current_user.id, flashcard_id, data.quality
    )


@router.get("/stats", response_model=FlashcardStatsResponse)
async def get_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Thống kê flashcard: tổng số, cần ôn, mới, đang học, đã thuộc."""
    return await flashcard_service.get_flashcard_stats(db, current_user.id)
