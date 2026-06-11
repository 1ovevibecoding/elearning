"""
Chat schemas — DTOs cho chat sessions và messages
"""
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class ChatMessageCreate(BaseModel):
    message: str = Field(..., min_length=1)


class ChatMessageResponse(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChatSessionCreate(BaseModel):
    title: str = "New Conversation"


class ChatSessionResponse(BaseModel):
    id: str
    user_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0
    last_message: str | None = None

    model_config = ConfigDict(from_attributes=True)


class ChatSessionListResponse(BaseModel):
    sessions: list[ChatSessionResponse]
