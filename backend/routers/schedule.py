from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from data_loader import load_calendar

router = APIRouter()

# Priority order for slot assignment (lowest performer first)
SCHEDULE_ORDER = ["carlos", "diego", "sofia", "ana"]

# In-memory booking store: engineer_id -> slot
_bookings: dict[str, dict] = {}


class ScheduleRequest(BaseModel):
    engineer_id: str


@router.post("/schedule")
async def book_schedule(body: ScheduleRequest):
    engineer_id = body.engineer_id.lower()

    if engineer_id not in SCHEDULE_ORDER:
        raise HTTPException(status_code=404, detail=f"Engineer '{engineer_id}' not found")

    # Return existing booking if already scheduled
    if engineer_id in _bookings:
        slot = _bookings[engineer_id]
        return {"engineer_id": engineer_id, "slot": slot, "status": "already_booked"}

    calendar = load_calendar()
    slots = calendar.get("available_slots", [])

    # Assign slots in priority order — count how many have already been booked
    booked_count = len(_bookings)
    if booked_count >= len(slots):
        raise HTTPException(status_code=409, detail="No available slots remaining")

    # Determine which slot index this engineer gets based on priority rank
    priority_rank = SCHEDULE_ORDER.index(engineer_id)

    # Find the slot for this engineer: slots are assigned in SCHEDULE_ORDER order
    # Only assign if all higher-priority engineers haven't claimed later slots
    # Simple approach: assign the slot at position = number of engineers booked before this one
    assigned_index = sum(
        1 for eid in SCHEDULE_ORDER[:priority_rank] if eid in _bookings
    )
    # But also account for the fact that this engineer's slot is at their priority position
    # Simpler: the slot for this engineer is just at their priority index
    slot_index = priority_rank
    if slot_index >= len(slots):
        raise HTTPException(status_code=409, detail="No slot available for this engineer")

    raw_slot = slots[slot_index]
    slot = {"date": raw_slot["date"], "time": raw_slot["time"]}
    _bookings[engineer_id] = slot

    return {"engineer_id": engineer_id, "slot": slot, "status": "booked"}
