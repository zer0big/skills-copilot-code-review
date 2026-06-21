"""
Announcement endpoints for the High School Management System API
"""

from datetime import date
from typing import Any, Dict, List, Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from ..database import announcements_collection, teachers_collection

router = APIRouter(
    prefix="/announcements",
    tags=["announcements"]
)


class AnnouncementPayload(BaseModel):
    """Payload for creating/updating an announcement."""

    title: str = Field(..., min_length=1, max_length=120)
    message: str = Field(..., min_length=1, max_length=2000)
    start_date: Optional[date] = None
    end_date: date


def _require_teacher(teacher_username: Optional[str]) -> Dict[str, Any]:
    """Validate an authenticated teacher account."""
    if not teacher_username:
        raise HTTPException(status_code=401, detail="Authentication required")

    teacher = teachers_collection.find_one({"_id": teacher_username})
    if not teacher:
        raise HTTPException(status_code=401, detail="Invalid teacher credentials")

    return teacher


def _validate_dates(payload: AnnouncementPayload) -> None:
    """Ensure optional start date is not after required end date."""
    if payload.start_date and payload.start_date > payload.end_date:
        raise HTTPException(
            status_code=400,
            detail="start_date cannot be later than end_date"
        )


def _to_response(document: Dict[str, Any]) -> Dict[str, Any]:
    """Convert MongoDB document to API response shape."""
    return {
        "id": document["_id"],
        "title": document["title"],
        "message": document["message"],
        "start_date": document.get("start_date"),
        "end_date": document["end_date"],
        "created_by": document.get("created_by", "")
    }


@router.get("", response_model=List[Dict[str, Any]])
def get_active_announcements() -> List[Dict[str, Any]]:
    """Get all announcements that are currently active for public display."""
    today_iso = date.today().isoformat()
    query = {
        "end_date": {"$gte": today_iso},
        "$or": [
            {"start_date": None},
            {"start_date": {"$exists": False}},
            {"start_date": {"$lte": today_iso}}
        ]
    }

    announcements = announcements_collection.find(query).sort("end_date", 1)
    return [_to_response(doc) for doc in announcements]


@router.get("/manage", response_model=List[Dict[str, Any]])
def get_all_announcements(
    teacher_username: Optional[str] = Query(None)
) -> List[Dict[str, Any]]:
    """Get all announcements for management view. Login required."""
    _require_teacher(teacher_username)

    announcements = announcements_collection.find({}).sort("end_date", 1)
    return [_to_response(doc) for doc in announcements]


@router.post("/manage", response_model=Dict[str, Any])
def create_announcement(
    payload: AnnouncementPayload,
    teacher_username: Optional[str] = Query(None)
) -> Dict[str, Any]:
    """Create an announcement. Login required."""
    teacher = _require_teacher(teacher_username)
    _validate_dates(payload)

    announcement_id = str(uuid4())
    document = {
        "_id": announcement_id,
        "title": payload.title.strip(),
        "message": payload.message.strip(),
        "start_date": payload.start_date.isoformat() if payload.start_date else None,
        "end_date": payload.end_date.isoformat(),
        "created_by": teacher["_id"]
    }

    announcements_collection.insert_one(document)
    return _to_response(document)


@router.put("/manage/{announcement_id}", response_model=Dict[str, Any])
def update_announcement(
    announcement_id: str,
    payload: AnnouncementPayload,
    teacher_username: Optional[str] = Query(None)
) -> Dict[str, Any]:
    """Update an existing announcement. Login required."""
    _require_teacher(teacher_username)
    _validate_dates(payload)

    update_doc = {
        "title": payload.title.strip(),
        "message": payload.message.strip(),
        "start_date": payload.start_date.isoformat() if payload.start_date else None,
        "end_date": payload.end_date.isoformat()
    }

    result = announcements_collection.update_one(
        {"_id": announcement_id},
        {"$set": update_doc}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Announcement not found")

    updated = announcements_collection.find_one({"_id": announcement_id})
    return _to_response(updated)


@router.delete("/manage/{announcement_id}")
def delete_announcement(
    announcement_id: str,
    teacher_username: Optional[str] = Query(None)
) -> Dict[str, str]:
    """Delete an announcement. Login required."""
    _require_teacher(teacher_username)

    result = announcements_collection.delete_one({"_id": announcement_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Announcement not found")

    return {"message": "Announcement deleted"}
