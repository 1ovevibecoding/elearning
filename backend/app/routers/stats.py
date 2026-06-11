"""
Stats Router — API thống kê hoạt động học tập (real data)
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy import select, func, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.vocabulary import Vocabulary
from app.models.flashcard import Flashcard
from app.models.chat import ChatMessage
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/api/stats", tags=["Stats"])


@router.get("/activity")
async def get_activity(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Trả về learning activity theo ngày cho 140 ngày gần nhất.
    Đếm: từ vựng thêm + flashcard review + chat messages.
    """
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=140)
    user_id = current_user.id

    # Đếm vocabulary additions theo ngày
    vocab_result = await db.execute(
        select(
            cast(Vocabulary.created_at, Date).label("date"),
            func.count().label("count")
        )
        .where(Vocabulary.user_id == user_id, Vocabulary.created_at >= start_date)
        .group_by(cast(Vocabulary.created_at, Date))
    )
    vocab_counts = {str(row.date): row.count for row in vocab_result.all()}

    # Đếm flashcard reviews theo ngày
    flash_result = await db.execute(
        select(
            cast(Flashcard.last_reviewed_at, Date).label("date"),
            func.count().label("count")
        )
        .where(
            Flashcard.user_id == user_id,
            Flashcard.last_reviewed_at.isnot(None),
            Flashcard.last_reviewed_at >= start_date
        )
        .group_by(cast(Flashcard.last_reviewed_at, Date))
    )
    flash_counts = {str(row.date): row.count for row in flash_result.all()}

    # Đếm chat messages theo ngày
    chat_result = await db.execute(
        select(
            cast(ChatMessage.created_at, Date).label("date"),
            func.count().label("count")
        )
        .where(ChatMessage.created_at >= start_date)
        .group_by(cast(ChatMessage.created_at, Date))
    )
    chat_counts = {str(row.date): row.count for row in chat_result.all()}

    # Gộp lại
    activity = []
    for i in range(140):
        date = start_date + timedelta(days=i)
        date_str = str(date.date())
        count = vocab_counts.get(date_str, 0) + flash_counts.get(date_str, 0) + chat_counts.get(date_str, 0)
        activity.append({"date": date_str, "count": count})

    return activity


@router.get("/streak")
async def get_streak(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Tính streak: số ngày liên tiếp có hoạt động học tập."""
    end_date = datetime.utcnow().date()
    user_id = current_user.id

    # Lấy tất cả ngày có hoạt động trong 365 ngày
    start_date = end_date - timedelta(days=365)

    # Vocab dates
    v_result = await db.execute(
        select(cast(Vocabulary.created_at, Date).distinct())
        .where(Vocabulary.user_id == user_id, Vocabulary.created_at >= datetime.combine(start_date, datetime.min.time()))
    )
    active_dates = set(str(row[0]) for row in v_result.all())

    # Flash dates
    f_result = await db.execute(
        select(cast(Flashcard.last_reviewed_at, Date).distinct())
        .where(
            Flashcard.user_id == user_id,
            Flashcard.last_reviewed_at.isnot(None),
            Flashcard.last_reviewed_at >= datetime.combine(start_date, datetime.min.time())
        )
    )
    active_dates.update(str(row[0]) for row in f_result.all())

    # Tính current streak
    current_streak = 0
    check_date = end_date
    while str(check_date) in active_dates:
        current_streak += 1
        check_date -= timedelta(days=1)

    # Nếu hôm nay chưa có activity, kiểm tra hôm qua
    if current_streak == 0:
        check_date = end_date - timedelta(days=1)
        while str(check_date) in active_dates:
            current_streak += 1
            check_date -= timedelta(days=1)

    return {
        "current_streak": current_streak,
        "total_active_days": len(active_dates),
    }


@router.get("/comparison")
async def get_comparison(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """So sánh tiến độ học giữa tất cả users."""
    # Lấy tất cả users
    users_result = await db.execute(select(User))
    all_users = users_result.scalars().all()

    comparison = []
    for user in all_users:
        # Đếm vocabulary
        vocab_count = await db.execute(
            select(func.count()).where(Vocabulary.user_id == user.id)
        )
        total_vocab = vocab_count.scalar() or 0

        # Đếm flashcards reviewed
        flash_count = await db.execute(
            select(func.count()).where(
                Flashcard.user_id == user.id,
                Flashcard.last_reviewed_at.isnot(None)
            )
        )
        total_reviews = flash_count.scalar() or 0

        # Đếm total flashcards
        total_flash = await db.execute(
            select(func.count()).where(Flashcard.user_id == user.id)
        )
        total_cards = total_flash.scalar() or 0

        comparison.append({
            "user_id": user.id,
            "name": user.name,
            "avatar_initial": user.name[0].upper() if user.name else "?",
            "total_vocabulary": total_vocab,
            "total_flashcards": total_cards,
            "total_reviews": total_reviews,
            "is_current_user": user.id == current_user.id,
        })

    return comparison
