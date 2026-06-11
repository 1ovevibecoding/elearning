"""
Calendar Router — API endpoints cho shared study calendar
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.calendar import (
    CalendarEventCreate,
    CalendarEventUpdate,
    CalendarEventResponse,
)
from app.services.auth_service import get_current_user
from app.services import calendar_service

router = APIRouter(prefix="/api/calendar", tags=["Calendar"])


@router.post("/events", response_model=CalendarEventResponse, status_code=201)
async def create_event(
    data: CalendarEventCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Tạo event mới trên calendar."""
    return await calendar_service.create_event(db, current_user.id, data)


@router.get("/events", response_model=list[CalendarEventResponse])
async def get_my_events(
    start: datetime = Query(..., description="Start of range (ISO format)"),
    end: datetime = Query(..., description="End of range (ISO format)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lấy events của user hiện tại trong khoảng thời gian."""
    return await calendar_service.get_user_events(db, current_user.id, start, end)


@router.get("/shared", response_model=list[CalendarEventResponse])
async def get_shared_events(
    start: datetime = Query(..., description="Start of range (ISO format)"),
    end: datetime = Query(..., description="End of range (ISO format)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lấy events của TẤT CẢ users — shared calendar view."""
    return await calendar_service.get_shared_events(db, current_user.id, start, end)


@router.put("/events/{event_id}", response_model=CalendarEventResponse)
async def update_event(
    event_id: str,
    data: CalendarEventUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cập nhật event (chỉ owner)."""
    return await calendar_service.update_event(db, current_user.id, event_id, data)


@router.delete("/events/{event_id}", status_code=204)
async def delete_event(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Xóa event (chỉ owner)."""
    await calendar_service.delete_event(db, current_user.id, event_id)
