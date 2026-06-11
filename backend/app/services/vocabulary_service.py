"""
Vocabulary Service — CRUD + tìm kiếm + phân trang cho từ vựng
"""
from fastapi import HTTPException, status
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.vocabulary import Vocabulary
from app.models.flashcard import Flashcard
from app.schemas.vocabulary import (
    VocabularyCreate,
    VocabularyUpdate,
    VocabularyResponse,
    VocabularyListResponse,
)


async def create_vocabulary(
    db: AsyncSession, user_id: str, data: VocabularyCreate
) -> VocabularyResponse:
    """
    Tạo từ vựng mới. Kiểm tra trùng lặp (cùng user + cùng từ).
    """
    # Kiểm tra từ đã tồn tại chưa
    existing = await db.execute(
        select(Vocabulary).where(
            Vocabulary.user_id == user_id,
            Vocabulary.word == data.word,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Từ '{data.word}' đã tồn tại trong danh sách của bạn",
        )

    vocab = Vocabulary(user_id=user_id, **data.model_dump())
    db.add(vocab)
    await db.flush()
    await db.refresh(vocab)

    return _to_response(vocab, has_flashcard=False)


async def get_vocabulary_list(
    db: AsyncSession,
    user_id: str,
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
) -> VocabularyListResponse:
    """
    Lấy danh sách từ vựng có phân trang và tìm kiếm.
    Tìm kiếm theo từ hoặc định nghĩa (case-insensitive).
    """
    base_query = select(Vocabulary).where(Vocabulary.user_id == user_id)

    # Lọc theo từ khóa tìm kiếm
    if search:
        pattern = f"%{search}%"
        base_query = base_query.where(
            or_(
                Vocabulary.word.ilike(pattern),
                Vocabulary.definition.ilike(pattern),
            )
        )

    # Đếm tổng số kết quả
    count_query = select(func.count()).select_from(base_query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Phân trang + sắp xếp mới nhất trước
    offset = (page - 1) * page_size
    query = (
        base_query
        .order_by(Vocabulary.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    result = await db.execute(query)
    vocabularies = result.scalars().all()

    # Kiểm tra từ nào đã có flashcard
    vocab_ids = [v.id for v in vocabularies]
    flashcard_result = await db.execute(
        select(Flashcard.vocabulary_id).where(
            Flashcard.vocabulary_id.in_(vocab_ids)
        )
    )
    flashcard_vocab_ids = set(flashcard_result.scalars().all())

    items = [
        _to_response(v, has_flashcard=(v.id in flashcard_vocab_ids))
        for v in vocabularies
    ]

    return VocabularyListResponse(
        items=items, total=total, page=page, page_size=page_size
    )


async def get_vocabulary_by_id(
    db: AsyncSession, user_id: str, vocab_id: str
) -> VocabularyResponse:
    """Lấy chi tiết một từ vựng theo ID."""
    vocab = await _get_vocab_or_404(db, user_id, vocab_id)

    # Kiểm tra flashcard
    fc_result = await db.execute(
        select(Flashcard).where(Flashcard.vocabulary_id == vocab_id)
    )
    has_flashcard = fc_result.scalar_one_or_none() is not None

    return _to_response(vocab, has_flashcard=has_flashcard)


async def update_vocabulary(
    db: AsyncSession, user_id: str, vocab_id: str, data: VocabularyUpdate
) -> VocabularyResponse:
    """Cập nhật thông tin từ vựng (chỉ các trường được gửi)."""
    vocab = await _get_vocab_or_404(db, user_id, vocab_id)

    # Chỉ cập nhật những trường có giá trị (không None)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(vocab, field, value)

    await db.flush()
    await db.refresh(vocab)

    fc_result = await db.execute(
        select(Flashcard).where(Flashcard.vocabulary_id == vocab_id)
    )
    has_flashcard = fc_result.scalar_one_or_none() is not None

    return _to_response(vocab, has_flashcard=has_flashcard)


async def delete_vocabulary(
    db: AsyncSession, user_id: str, vocab_id: str
) -> None:
    """Xóa từ vựng (cascade xóa luôn flashcard liên quan)."""
    vocab = await _get_vocab_or_404(db, user_id, vocab_id)
    await db.delete(vocab)
    await db.flush()


# ── Helpers ──────────────────────────────────────────────────────────

async def _get_vocab_or_404(
    db: AsyncSession, user_id: str, vocab_id: str
) -> Vocabulary:
    """Tìm từ vựng thuộc về user, raise 404 nếu không tìm thấy."""
    result = await db.execute(
        select(Vocabulary).where(
            Vocabulary.id == vocab_id,
            Vocabulary.user_id == user_id,
        )
    )
    vocab = result.scalar_one_or_none()
    if not vocab:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy từ vựng",
        )
    return vocab


def _to_response(vocab: Vocabulary, has_flashcard: bool) -> VocabularyResponse:
    """Chuyển đổi model sang response schema."""
    return VocabularyResponse(
        id=vocab.id,
        user_id=vocab.user_id,
        word=vocab.word,
        definition=vocab.definition,
        example_sentence=vocab.example_sentence,
        context_url=vocab.context_url,
        part_of_speech=vocab.part_of_speech,
        pronunciation=vocab.pronunciation,
        notes=vocab.notes,
        created_at=vocab.created_at,
        has_flashcard=has_flashcard,
    )
