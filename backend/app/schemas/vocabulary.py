"""
Vocabulary schemas — DTOs cho vocabulary CRUD
"""
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class VocabularyCreate(BaseModel):
    word: str = Field(..., min_length=1, max_length=255)
    definition: str = Field(..., min_length=1)
    example_sentence: str | None = None
    context_url: str | None = None
    part_of_speech: str | None = None
    pronunciation: str | None = None
    notes: str | None = None


class VocabularyUpdate(BaseModel):
    definition: str | None = None
    example_sentence: str | None = None
    part_of_speech: str | None = None
    pronunciation: str | None = None
    notes: str | None = None


class VocabularyResponse(BaseModel):
    id: str
    user_id: str
    word: str
    definition: str
    example_sentence: str | None
    context_url: str | None
    part_of_speech: str | None
    pronunciation: str | None
    notes: str | None
    created_at: datetime
    has_flashcard: bool = False

    model_config = ConfigDict(from_attributes=True)


class VocabularyListResponse(BaseModel):
    items: list[VocabularyResponse]
    total: int
    page: int
    page_size: int
