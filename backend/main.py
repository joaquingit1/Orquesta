from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import team, review, ranking, schedule

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(team.router,     prefix="/api")
app.include_router(review.router,   prefix="/api")
app.include_router(ranking.router,  prefix="/api")
app.include_router(schedule.router, prefix="/api")
