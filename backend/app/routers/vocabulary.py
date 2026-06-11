"""
Vocabulary Router — CRUD endpoints cho từ vựng
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.vocabulary import (
    VocabularyCreate,
    VocabularyUpdate,
    VocabularyResponse,
    VocabularyListResponse,
)
from app.services.auth_service import get_current_user
from app.services import vocabulary_service

router = APIRouter(prefix="/api/vocabulary", tags=["Vocabulary"])


@router.post("", response_model=VocabularyResponse, status_code=201)
async def save_word(
    data: VocabularyCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lưu từ vựng mới. Tự động phát hiện từ trùng lặp cho cùng user."""
    return await vocabulary_service.create_vocabulary(db, current_user.id, data)


@router.get("", response_model=VocabularyListResponse)
async def list_words(
    page: int = Query(1, ge=1, description="Số trang"),
    page_size: int = Query(20, ge=1, le=100, description="Số từ mỗi trang"),
    search: str | None = Query(None, description="Tìm kiếm theo từ hoặc nghĩa"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lấy danh sách từ vựng có phân trang và tìm kiếm."""
    return await vocabulary_service.get_vocabulary_list(
        db, current_user.id, page=page, page_size=page_size, search=search
    )


@router.get("/{vocab_id}", response_model=VocabularyResponse)
async def get_word(
    vocab_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lấy chi tiết một từ vựng theo ID."""
    return await vocabulary_service.get_vocabulary_by_id(db, current_user.id, vocab_id)


@router.put("/{vocab_id}", response_model=VocabularyResponse)
async def update_word(
    vocab_id: str,
    data: VocabularyUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cập nhật thông tin từ vựng (chỉ các trường được gửi)."""
    return await vocabulary_service.update_vocabulary(
        db, current_user.id, vocab_id, data
    )


@router.delete("/{vocab_id}", status_code=204)
async def delete_word(
    vocab_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Xóa từ vựng (cascade xóa luôn flashcard liên quan)."""
    await vocabulary_service.delete_vocabulary(db, current_user.id, vocab_id)
