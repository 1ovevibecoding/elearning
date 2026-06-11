"""
Calendar Service — CRUD lịch học + shared view giữa các users
"""
from datetime import datetime
from fastapi import HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.calendar import CalendarEvent
from app.models.user import User
from app.schemas.calendar import (
    CalendarEventCreate,
    CalendarEventUpdate,
    CalendarEventResponse,
)


async def create_event(
    db: AsyncSession, user_id: str, data: CalendarEventCreate
) -> CalendarEventResponse:
    """Tạo event mới cho user."""
    event = CalendarEvent(
        user_id=user_id,
        title=data.title,
        start_time=data.start_time,
        end_time=data.end_time,
        event_type=data.event_type,
        color=data.color,
        notes=data.notes,
    )
    db.add(event)
    await db.flush()
    await db.refresh(event)

    # Lấy tên user
    user = await db.get(User, user_id)
    return CalendarEventResponse(
        id=event.id,
        user_id=event.user_id,
        user_name=user.name if user else "",
        title=event.title,
        start_time=event.start_time,
        end_time=event.end_time,
        event_type=event.event_type,
        color=event.color,
        notes=event.notes,
        is_own=True,
    )


async def get_user_events(
    db: AsyncSession, user_id: str, start: datetime, end: datetime
) -> list[CalendarEventResponse]:
    """Lấy events của 1 user trong khoảng thời gian."""
    result = await db.execute(
        select(CalendarEvent)
        .where(
            CalendarEvent.user_id == user_id,
            CalendarEvent.start_time < end,
            CalendarEvent.end_time > start,
        )
        .order_by(CalendarEvent.start_time.asc())
    )
    events = result.scalars().all()
    user = await db.get(User, user_id)

    return [
        CalendarEventResponse(
            id=e.id, user_id=e.user_id,
            user_name=user.name if user else "",
            title=e.title, start_time=e.start_time, end_time=e.end_time,
            event_type=e.event_type, color=e.color, notes=e.notes,
            is_own=True,
        )
        for e in events
    ]


async def get_shared_events(
    db: AsyncSession, current_user_id: str, start: datetime, end: datetime
) -> list[CalendarEventResponse]:
    """Lấy events của TẤT CẢ users trong khoảng thời gian (shared calendar view)."""
    result = await db.execute(
        select(CalendarEvent, User.name)
        .join(User, CalendarEvent.user_id == User.id)
        .where(
            CalendarEvent.start_time < end,
            CalendarEvent.end_time > start,
        )
        .order_by(CalendarEvent.start_time.asc())
    )
    rows = result.all()

    return [
        CalendarEventResponse(
            id=event.id, user_id=event.user_id,
            user_name=user_name,
            title=event.title, start_time=event.start_time, end_time=event.end_time,
            event_type=event.event_type, color=event.color, notes=event.notes,
            is_own=(event.user_id == current_user_id),
        )
        for event, user_name in rows
    ]


async def update_event(
    db: AsyncSession, user_id: str, event_id: str, data: CalendarEventUpdate
) -> CalendarEventResponse:
    """Cập nhật event (chỉ owner mới được sửa)."""
    event = await _get_event_or_404(db, user_id, event_id)

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(event, field, value)

    event.updated_at = datetime.utcnow()
    await db.flush()
    await db.refresh(event)

    user = await db.get(User, user_id)
    return CalendarEventResponse(
        id=event.id, user_id=event.user_id,
        user_name=user.name if user else "",
        title=event.title, start_time=event.start_time, end_time=event.end_time,
        event_type=event.event_type, color=event.color, notes=event.notes,
        is_own=True,
    )


async def delete_event(db: AsyncSession, user_id: str, event_id: str) -> None:
    """Xóa event (chỉ owner mới được xóa)."""
    event = await _get_event_or_404(db, user_id, event_id)
    await db.delete(event)
    await db.flush()


async def _get_event_or_404(
    db: AsyncSession, user_id: str, event_id: str
) -> CalendarEvent:
    """Tìm event thuộc về user, raise 404 nếu không thấy."""
    result = await db.execute(
        select(CalendarEvent).where(
            CalendarEvent.id == event_id,
            CalendarEvent.user_id == user_id,
        )
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy event",
        )
    return event
