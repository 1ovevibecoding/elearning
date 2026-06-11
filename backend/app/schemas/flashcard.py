"""
Flashcard schemas — DTOs cho flashcard review và SM-2
"""
from datetime import datetime, date
from pydantic import BaseModel, ConfigDict, Field


class FlashcardResponse(BaseModel):
    id: str
    user_id: str
    vocabulary_id: str
    easiness_factor: float
    interval: int
    repetitions: int
    next_review_date: date
    last_reviewed_at: datetime | None
    status: str
    created_at: datetime

    # Thông tin từ vựng kèm theo
    word: str = ""
    definition: str = ""
    example_sentence: str | None = None
    pronunciation: str | None = None

    model_config = ConfigDict(from_attributes=True)


class FlashcardReviewRequest(BaseModel):
    """quality: 0-5 (0=hoàn toàn quên, 5=nhớ hoàn hảo)"""
    quality: int = Field(..., ge=0, le=5)


class FlashcardReviewResponse(BaseModel):
    id: str
    new_interval: int
    new_easiness_factor: float
    next_review_date: date
    status: str


class FlashcardStatsResponse(BaseModel):
    total_cards: int
    due_today: int
    new_cards: int
    learning_cards: int
    review_cards: int
    streak_days: int = 0
