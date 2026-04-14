from fastapi import APIRouter
from data_loader import load_all_engineers

router = APIRouter()


@router.get("/team")
async def get_team():
    engineers = load_all_engineers()
    return {
        "engineers": [
            {
                "id": e["id"],
                "name": e["name"],
                "role": e["role"],
                "avatar": None,
            }
            for e in engineers
        ]
    }
