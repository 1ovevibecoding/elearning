"""
Flashcard Service — Quản lý thẻ ôn tập + áp dụng SM-2
"""
from datetime import date, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.flashcard import Flashcard
from app.models.vocabulary import Vocabulary
from app.schemas.flashcard import (
    FlashcardResponse,
    FlashcardReviewResponse,
    FlashcardStatsResponse,
)
from app.services.spaced_repetition import calculate_sm2


async def create_flashcard(
    db: AsyncSession, user_id: str, vocabulary_id: str
) -> FlashcardResponse:
    """
    Tạo flashcard từ một từ vựng. Kiểm tra:
    - Từ vựng phải thuộc về user
    - Chưa có flashcard cho từ vựng này
    """
    # Kiểm tra vocabulary tồn tại và thuộc về user
    vocab_result = await db.execute(
        select(Vocabulary).where(
            Vocabulary.id == vocabulary_id,
            Vocabulary.user_id == user_id,
        )
    )
    vocab = vocab_result.scalar_one_or_none()
    if not vocab:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy từ vựng",
        )

    # Kiểm tra đã có flashcard chưa
    existing = await db.execute(
        select(Flashcard).where(
            Flashcard.user_id == user_id,
            Flashcard.vocabulary_id == vocabulary_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Flashcard cho từ này đã tồn tại",
        )

    # Tạo flashcard mới với giá trị SM-2 mặc định
    flashcard = Flashcard(
        user_id=user_id,
        vocabulary_id=vocabulary_id,
        easiness_factor=2.5,
        interval=0,
        repetitions=0,
        next_review_date=date.today(),
        status="new",
    )
    db.add(flashcard)
    await db.flush()
    await db.refresh(flashcard)

    return _to_response(flashcard, vocab)


async def get_due_flashcards(
    db: AsyncSession, user_id: str
) -> list[FlashcardResponse]:
    """
    Lấy tất cả thẻ cần ôn hôm nay (next_review_date <= today).
    Bao gồm thông tin từ vựng kèm theo.
    """
    today = date.today()
    result = await db.execute(
        select(Flashcard, Vocabulary)
        .join(Vocabulary, Flashcard.vocabulary_id == Vocabulary.id)
        .where(
            Flashcard.user_id == user_id,
            Flashcard.next_review_date <= today,
        )
        .order_by(Flashcard.next_review_date.asc())
    )
    rows = result.all()

    return [_to_response(flashcard, vocab) for flashcard, vocab in rows]


async def review_flashcard(
    db: AsyncSession, user_id: str, flashcard_id: str, quality: int
) -> FlashcardReviewResponse:
    """
    Xử lý kết quả ôn tập: áp dụng SM-2 và cập nhật flashcard.
    quality: 0-5 (0 = quên hoàn toàn, 5 = nhớ hoàn hảo)
    """
    # Lấy flashcard
    result = await db.execute(
        select(Flashcard).where(
            Flashcard.id == flashcard_id,
            Flashcard.user_id == user_id,
        )
    )
    flashcard = result.scalar_one_or_none()
    if not flashcard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy flashcard",
        )

    # Áp dụng thuật toán SM-2
    new_reps, new_ef, new_interval = calculate_sm2(
        quality=quality,
        repetitions=flashcard.repetitions,
        easiness_factor=flashcard.easiness_factor,
        interval=flashcard.interval,
    )

    # Cập nhật flashcard
    flashcard.repetitions = new_reps
    flashcard.easiness_factor = new_ef
    flashcard.interval = new_interval
    flashcard.next_review_date = date.today() + timedelta(days=new_interval)
    flashcard.last_reviewed_at = datetime.utcnow()

    # Cập nhật trạng thái dựa trên kết quả
    if quality < 3:
        flashcard.status = "learning"  # Đang học lại
    elif flashcard.repetitions >= 2:
        flashcard.status = "review"  # Đã thuộc, ôn lại định kỳ
    else:
        flashcard.status = "learning"  # Vẫn đang trong quá trình học

    await db.flush()

    return FlashcardReviewResponse(
        id=flashcard.id,
        new_interval=new_interval,
        new_easiness_factor=new_ef,
        next_review_date=flashcard.next_review_date,
        status=flashcard.status,
    )


async def get_flashcard_stats(
    db: AsyncSession, user_id: str
) -> FlashcardStatsResponse:
    """
    Thống kê flashcard: tổng số, cần ôn hôm nay, mới, đang học, ôn lại.
    """
    today = date.today()

    # Tổng số thẻ
    total_result = await db.execute(
        select(func.count()).where(Flashcard.user_id == user_id)
    )
    total_cards = total_result.scalar() or 0

    # Thẻ cần ôn hôm nay
    due_result = await db.execute(
        select(func.count()).where(
            Flashcard.user_id == user_id,
            Flashcard.next_review_date <= today,
        )
    )
    due_today = due_result.scalar() or 0

    # Thẻ mới (chưa ôn lần nào)
    new_result = await db.execute(
        select(func.count()).where(
            Flashcard.user_id == user_id,
            Flashcard.status == "new",
        )
    )
    new_cards = new_result.scalar() or 0

    # Thẻ đang học
    learning_result = await db.execute(
        select(func.count()).where(
            Flashcard.user_id == user_id,
            Flashcard.status == "learning",
        )
    )
    learning_cards = learning_result.scalar() or 0

    # Thẻ ôn lại (đã thuộc)
    review_result = await db.execute(
        select(func.count()).where(
            Flashcard.user_id == user_id,
            Flashcard.status == "review",
        )
    )
    review_cards = review_result.scalar() or 0

    return FlashcardStatsResponse(
        total_cards=total_cards,
        due_today=due_today,
        new_cards=new_cards,
        learning_cards=learning_cards,
        review_cards=review_cards,
        streak_days=0,  # TODO: tính streak dựa trên lịch sử ôn tập
    )


# ── Helpers ──────────────────────────────────────────────────────────

def _to_response(flashcard: Flashcard, vocab: Vocabulary) -> FlashcardResponse:
    """Gộp thông tin flashcard + từ vựng vào response."""
    return FlashcardResponse(
        id=flashcard.id,
        user_id=flashcard.user_id,
        vocabulary_id=flashcard.vocabulary_id,
        easiness_factor=flashcard.easiness_factor,
        interval=flashcard.interval,
        repetitions=flashcard.repetitions,
        next_review_date=flashcard.next_review_date,
        last_reviewed_at=flashcard.last_reviewed_at,
        status=flashcard.status,
        created_at=flashcard.created_at,
        word=vocab.word,
        definition=vocab.definition,
        example_sentence=vocab.example_sentence,
        pronunciation=vocab.pronunciation,
    )
