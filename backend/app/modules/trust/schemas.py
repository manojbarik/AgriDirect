from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class TrustFactorOut(BaseModel):
    key: str
    label: str
    component: str
    value: str
    points: Decimal
    max_points: Decimal
    detail: str
    kind: str


class TrustComponentOut(BaseModel):
    key: str
    label: str
    points: Decimal
    max_points: Decimal
    factors: list[TrustFactorOut]


class TrustScoreHistoryEntry(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    score: Decimal
    score_band: str
    reason: str
    changed_by_role: str | None
    created_at: datetime


class TrustScoreDetail(BaseModel):
    user_id: UUID
    role: str
    full_name: str | None
    score: Decimal
    score_band: str
    calculation_version: str
    calculated_at: datetime
    components: list[TrustComponentOut]
    why: list[str]
    concerns: list[str]
    history: list[TrustScoreHistoryEntry]
    limits_note: str


class TrustScoreAdminItem(BaseModel):
    user_id: UUID
    role: str
    full_name: str | None
    score: Decimal
    score_band: str
    calculation_version: str
    calculated_at: datetime | None


class PublicTopFarmer(BaseModel):
    full_name: str
    score: Decimal
    state: str | None
    listing_count: int


class PublicTrustOverview(BaseModel):
    total_farmers: int
    total_buyers: int
    avg_score: Decimal | None
    bands: dict[str, int]
    top_farmers: list[PublicTopFarmer]


class PublicFarmerTrustSnapshot(BaseModel):
    farmer_profile_id: UUID
    farmer_id: UUID
    full_name: str
    verification_status: str
    score: Decimal
    score_band: str
    rating_avg: Decimal | None
    completed_orders: int
    active_listings_count: int