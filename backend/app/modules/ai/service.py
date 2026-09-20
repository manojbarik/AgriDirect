from decimal import Decimal

from ml.demand.predict import predict_demand
from ml.predict import predict_price

from app.modules.ai.schemas import (
    DemandPredictionRequest,
    DemandPredictionResponse,
    PricePredictionRequest,
    PricePredictionResponse,
)


def get_price_prediction(payload: PricePredictionRequest) -> PricePredictionResponse:
    res = predict_price(
        crop_name=payload.crop_name,
        variety=payload.variety,
        category=payload.category,
        state=payload.state,
        district=payload.district,
        mandi_name=payload.mandi_name,
        season=payload.season,
        month=payload.month,
        quantity_kg=float(payload.quantity_kg) if payload.quantity_kg else 100.0,
        grade=payload.grade,
        demand_index=float(payload.demand_index) if payload.demand_index else 1.0,
        historical_avg_price=(
            float(payload.historical_avg_price) if payload.historical_avg_price else None
        ),
    )

    return PricePredictionResponse(
        crop_name=res["crop_name"],
        predicted_price=Decimal(str(res["predicted_price"])),
        currency=res["currency"],
        unit=res["unit"],
        price_range_min=Decimal(str(res["price_range_min"])),
        price_range_max=Decimal(str(res["price_range_max"])),
        confidence_score=res["confidence_score"],
        model_version=res["model_version"],
        best_model_name=res["best_model_name"],
        is_synthetic=res["is_synthetic"],
        disclaimer=res["disclaimer"],
    )


def get_demand_prediction(payload: DemandPredictionRequest) -> DemandPredictionResponse:
    res = predict_demand(
        crop_name=payload.crop_name,
        variety=payload.variety,
        category=payload.category,
        state=payload.state,
        district=payload.district,
        season=payload.season,
        month=payload.month,
        buyer_type=payload.buyer_type,
        price=float(payload.price) if payload.price else None,
        quantity_sold=float(payload.quantity_sold) if payload.quantity_sold else None,
        historical_demand=(float(payload.historical_demand) if payload.historical_demand else None),
    )

    return DemandPredictionResponse(
        crop_name=res["crop_name"],
        state=res["state"],
        month=res["month"],
        predicted_demand=Decimal(str(res["predicted_demand"])),
        unit=res["unit"],
        forecast_period=res["forecast_period"],
        predicted_demand_lower=Decimal(str(res["predicted_demand_lower"])),
        predicted_demand_upper=Decimal(str(res["predicted_demand_upper"])),
        confidence_score=res["confidence_score"],
        model_version=res["model_version"],
        best_model_name=res["best_model_name"],
        is_synthetic=res["is_synthetic"],
        recommended_quantity=Decimal(str(res["recommended_quantity"])),
        historical_demand=Decimal(str(res["historical_demand"])),
        disclaimer=res["disclaimer"],
    )
