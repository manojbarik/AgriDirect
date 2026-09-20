from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.rate_limit import rate_limit
from app.db.models import AiPrediction
from app.db.models.people import User
from app.db.session import get_db
from app.modules.ai import matching, service
from app.modules.ai.aggregation import (
    assess_wastage_risk,
    build_aggregation,
    optimize_route,
)
from app.modules.ai.aggregation_schemas import (
    AggregationRequest,
    AggregationResponse,
    RouteOptimizeRequest,
    RouteOptimizeResponse,
    WastageRiskRequest,
    WastageRiskResponse,
)
from app.modules.ai.schemas import (
    DemandPredictionRequest,
    DemandPredictionResponse,
    MatchBuyersRequest,
    MatchFarmersRequest,
    MatchResponse,
    PricePredictionRequest,
    PricePredictionResponse,
    PublicPricePreview,
)
from app.modules.identity.dependencies import require_roles

router = APIRouter(prefix="/ai", tags=["ai"])

AI_LIMITER = rate_limit(limit=60, window_seconds=60, bucket="ai")
PUBLIC_LIMITER = rate_limit(limit=30, window_seconds=60, bucket="ai_public")
AGGR_LIMITER = rate_limit(limit=30, window_seconds=60, bucket="ai_aggregation")
ROUTE_LIMITER = rate_limit(limit=30, window_seconds=60, bucket="ai_route")

PUBLIC_CROPS = [
    "tomato",
    "potato",
    "onion",
    "brinjal",
    "cauliflower",
    "cabbage",
    "green chilli",
    "okra",
    "paddy",
    "wheat",
]


def _location(state: str | None, district: str | None) -> str | None:
    if state and district:
        return f"{district}, {state}"
    return state or district


def _record(db: Session, prediction_type: str, *, location: str | None = None) -> None:
    db.add(AiPrediction(prediction_type=prediction_type, location=location))
    db.commit()


@router.post(
    "/price-prediction",
    response_model=PricePredictionResponse,
    status_code=status.HTTP_200_OK,
    summary="Predict expected agricultural crop market price using trained ML model",
)
def predict_price(
    payload: PricePredictionRequest,
    _: None = Depends(AI_LIMITER),
    db: Session = Depends(get_db),
) -> PricePredictionResponse:
    _record(db, "price_prediction", location=_location(payload.state, payload.district))
    return service.get_price_prediction(payload)


@router.post(
    "/match/farmers",
    response_model=MatchResponse,
    status_code=status.HTTP_200_OK,
    summary="Rank matching farmers/listings for a buyer's crop requirements",
)
def match_farmers(
    payload: MatchFarmersRequest,
    _: None = Depends(AI_LIMITER),
    db: Session = Depends(get_db),
) -> MatchResponse:
    _record(db, "farmer_match", location=_location(payload.state, payload.district))
    return matching.match_farmers(db, payload)


@router.post(
    "/match/buyers",
    response_model=MatchResponse,
    status_code=status.HTTP_200_OK,
    summary="Rank matching buyers/open demands for a farmer's produce",
)
def match_buyers(
    payload: MatchBuyersRequest,
    _: None = Depends(AI_LIMITER),
    db: Session = Depends(get_db),
) -> MatchResponse:
    _record(db, "buyer_match", location=_location(payload.state, payload.district))
    return matching.match_buyers(db, payload)


@router.post(
    "/demand-prediction",
    response_model=DemandPredictionResponse,
    status_code=status.HTTP_200_OK,
    summary="Predict crop demand for a location/month using trained ML model",
)
def predict_demand(
    payload: DemandPredictionRequest,
    _: None = Depends(AI_LIMITER),
    db: Session = Depends(get_db),
) -> DemandPredictionResponse:
    _record(db, "demand_forecast", location=_location(payload.state, payload.district))
    return service.get_demand_prediction(payload)


@router.get(
    "/public/price-preview",
    response_model=PublicPricePreview,
    status_code=status.HTTP_200_OK,
    summary="Auth-free live AI price preview for the anonymous landing page",
)
def public_price_preview(
    crop: str = Query(min_length=2, max_length=120, examples=["tomato"]),
    state: str | None = Query(default=None, max_length=100, examples=["Odisha"]),
    district: str | None = Query(default=None, max_length=100, examples=["Bhubaneswar"]),
    _: None = Depends(PUBLIC_LIMITER),
) -> PublicPricePreview:
    payload = PricePredictionRequest(
        crop_name=crop.strip().title(),
        state=state.strip() if state else None,
        district=district.strip() if district else None,
        variety="Local",
    )
    prediction = service.get_price_prediction(payload)
    return PublicPricePreview(
        **prediction.model_dump(),
        estimated_at=datetime.now(timezone.utc),
    )


@router.get(
    "/public/crops",
    response_model=list[str],
    status_code=status.HTTP_200_OK,
    summary="Auth-free known crop list for the landing widget dropdown",
)
def public_crops(_: None = Depends(PUBLIC_LIMITER)) -> list[str]:
    return list(PUBLIC_CROPS)


@router.post(
    "/aggregation",
    response_model=AggregationResponse,
    status_code=status.HTTP_200_OK,
    summary="Aggregate published listings to meet a buyer's quantity requirement",
)
def aggregate(
    payload: AggregationRequest,
    _: None = Depends(AGGR_LIMITER),
    _user: User = Depends(require_roles("FARMER", "BUYER", "BULK_BUYER")),
    db: Session = Depends(get_db),
) -> AggregationResponse:
    return build_aggregation(db, payload)


@router.post(
    "/wastage-risk",
    response_model=WastageRiskResponse,
    status_code=status.HTTP_200_OK,
    summary="Estimate post-harvest wastage risk using a transparent rule engine",
)
def wastage_risk(
    payload: WastageRiskRequest,
    _: None = Depends(AGGR_LIMITER),
    _user: User = Depends(require_roles("FARMER", "BUYER", "BULK_BUYER")),
) -> WastageRiskResponse:
    return assess_wastage_risk(payload)


@router.post(
    "/route/optimize",
    response_model=RouteOptimizeResponse,
    status_code=status.HTTP_200_OK,
    summary="Optimize a multi-pickup delivery route with a deterministic TSP",
)
def route_optimize(
    payload: RouteOptimizeRequest,
    _: None = Depends(ROUTE_LIMITER),
    _user: User = Depends(require_roles("FARMER", "BUYER", "LOGISTICS")),
) -> RouteOptimizeResponse:
    return optimize_route(payload)