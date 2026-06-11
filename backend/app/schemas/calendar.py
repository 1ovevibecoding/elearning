"""
Calendar schemas — DTOs cho calendar events
"""
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional


class CalendarEventCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    start_time: datetime
    end_time: datetime
    event_type: str = "study"
    color: str = "#2563EB"
    notes: Optional[str] = None


class CalendarEventUpdate(BaseModel):
    title: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    event_type: Optional[str] = None
    color: Optional[str] = None
    notes: Optional[str] = None


class CalendarEventResponse(BaseModel):
    id: str
    user_id: str
    user_name: str = ""
    title: str
    start_time: datetime
    end_time: datetime
    event_type: str
    color: str
    notes: Optional[str] = None
    is_own: bool = True

    model_config = ConfigDict(from_attributes=True)
