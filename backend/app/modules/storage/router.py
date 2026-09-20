"""Storage intelligence API."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status

from app.core.rate_limit import rate_limit
from app.modules.storage.schemas import (
    StorageOptionsResponse,
    StorageRecommendationRequest,
    StorageRecommendationResponse,
)
from app.modules.storage.service import get_storage_recommendation, list_storage_options

router = APIRouter(prefix="/storage", tags=["storage"])

PUBLIC_LIMITER = rate_limit(limit=60, window_seconds=60, bucket="storage")


@router.get(
    "/options",
    response_model=StorageOptionsResponse,
    status_code=status.HTTP_200_OK,
    summary="List available storage facilities (demonstration data)",
)
def storage_options(
    state: str | None = Query(default=None, max_length=100, examples=["Odisha"]),
    district: str | None = Query(default=None, max_length=100, examples=["Bhubaneswar"]),
    _: None = Depends(PUBLIC_LIMITER),
) -> StorageOptionsResponse:
    return list_storage_options(state=state, district=district)


@router.post(
    "/recommendation",
    response_model=StorageRecommendationResponse,
    status_code=status.HTTP_200_OK,
    summary="Compare SELL NOW vs STORE THEN SELL for a crop lot",
)
def storage_recommendation(
    payload: StorageRecommendationRequest,
    _: None = Depends(PUBLIC_LIMITER),
) -> StorageRecommendationResponse:
    return get_storage_recommendation(payload)