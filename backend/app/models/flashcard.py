"""
Flashcard model — Thẻ ôn tập với SM-2 spaced repetition
"""
import uuid
from datetime import datetime, date
from sqlalchemy import String, Float, Integer, Date, DateTime, ForeignKey, Index, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Flashcard(Base):
    __tablename__ = "flashcards"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    vocabulary_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("vocabularies.id", ondelete="CASCADE"), nullable=False
    )

    # SM-2 algorithm fields
    easiness_factor: Mapped[float] = mapped_column(Float, default=2.5)
    interval: Mapped[int] = mapped_column(Integer, default=0)
    repetitions: Mapped[int] = mapped_column(Integer, default=0)
    next_review_date: Mapped[date] = mapped_column(Date, default=date.today)
    last_reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Trạng thái: new (chưa ôn), learning (đang học), review (đã thuộc, ôn lại)
    status: Mapped[str] = mapped_column(String(20), default="new")

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="flashcards")
    vocabulary = relationship("Vocabulary", back_populates="flashcard")

    # Index tối ưu cho việc query thẻ cần ôn
    __table_args__ = (
        Index("ix_flashcard_user_review", "user_id", "next_review_date"),
        UniqueConstraint("user_id", "vocabulary_id", name="uq_user_vocabulary"),
    )
