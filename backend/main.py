from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from routers import team, review, ranking, schedule, github, auth

app = FastAPI()

# Cookies require credentialed CORS: allow_origins cannot be "*" when allow_credentials=True
_origins = [o.strip() for o in os.getenv("FRONTEND_URL", "http://localhost:3000").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(team.router,     prefix="/api")
app.include_router(review.router,   prefix="/api")
app.include_router(ranking.router,  prefix="/api")
app.include_router(schedule.router, prefix="/api")
app.include_router(github.router,   prefix="/api")
app.include_router(auth.router,     prefix="/api")
