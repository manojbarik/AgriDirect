from datetime import UTC, datetime

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    service: str
    timestamp: datetime


@router.get("/health", response_model=HealthResponse, summary="Get API health status")
def get_health() -> HealthResponse:
    return HealthResponse(
        status="healthy",
        service="api",
        timestamp=datetime.now(UTC),
    )
