"""
Vocabulary model — Lưu từ vựng người dùng đã lưu (từ extension hoặc website)
"""
import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Vocabulary(Base):
    __tablename__ = "vocabularies"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    word: Mapped[str] = mapped_column(String(255), nullable=False)
    definition: Mapped[str] = mapped_column(Text, nullable=False)
    example_sentence: Mapped[str | None] = mapped_column(Text, nullable=True)
    context_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    part_of_speech: Mapped[str | None] = mapped_column(String(50), nullable=True)
    pronunciation: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="vocabularies")
    flashcard = relationship("Flashcard", back_populates="vocabulary", uselist=False, cascade="all, delete-orphan")
