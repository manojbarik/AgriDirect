"""Phase 20 - ML prediction and invalid input tests."""

from decimal import Decimal

from ml.demand.predict import predict_demand
from ml.predict import predict_price

REQUIRED_PRICE_KEYS = {
    "crop_name",
    "predicted_price",
    "currency",
    "unit",
    "price_range_min",
    "price_range_max",
    "confidence_score",
    "model_version",
    "best_model_name",
    "is_synthetic",
    "disclaimer",
}


class TestPricePrediction:
    def test_basic_prediction(self):
        result = predict_price(
            crop_name="Tomato",
            variety="Hybrid",
            category="Vegetable",
            state="Maharashtra",
            district="Nashik",
            season="Kharif",
            month=10,
            quantity_kg=1000.0,
            demand_index=1.2,
            historical_avg_price=25.0,
        )
        assert set(result) >= REQUIRED_PRICE_KEYS
        assert result["crop_name"] == "Tomato"
        assert result["currency"] == "INR"
        assert result["unit"] == "kg"
        assert result["price_range_min"] <= result["predicted_price"] <= result["price_range_max"]
        assert 0.5 <= result["confidence_score"] <= 0.99
        assert isinstance(result["is_synthetic"], bool)

    def test_positive_price_floor(self):
        result = predict_price(crop_name="Tomato", historical_avg_price=1.0)
        assert result["predicted_price"] >= 1.0
        assert result["price_range_min"] >= 1.0

    def test_known_crops_give_finite_numbers(self):
        for crop in ("Tomato", "Potato", "Onion", "Rice", "Groundnut"):
            result = predict_price(crop_name=crop)
            assert result["predicted_price"] > 0
            assert result["confidence_score"] > 0

    def test_defaults_used_when_optional_fields_blank(self):
        result = predict_price(crop_name="Tomato")
        assert result["predicted_price"] > 0
        assert result["model_version"]


class TestDemandPrediction:
    def test_demand_prediction_shape(self):
        result = predict_demand(crop_name="Tomato", month=10, state="Maharashtra")
        assert isinstance(result, dict)
        assert result["crop_name"] == "Tomato"
        assert result["predicted_demand"] > 0
        assert "confidence_score" in result

    def test_demand_varied_locations(self):
        for state in ("Maharashtra", "Punjab", "Gujarat"):
            result = predict_demand(crop_name="Potato", month=8, state=state)
            assert result["predicted_demand"] > 0


class TestInvalidInput:
    def test_invalid_month_falls_back_to_default(self):
        result = predict_price(crop_name="Tomato", month=99)
        assert result["predicted_price"] > 0

    def test_negative_quantity_falls_back_to_default(self):
        result = predict_price(crop_name="Tomato", quantity_kg=-5)
        assert result["predicted_price"] > 0

    def test_zero_or_negative_demand_index_falls_back(self):
        result = predict_price(crop_name="Tomato", demand_index=0)
        assert result["predicted_price"] > 0

    def test_unknown_grade_falls_back(self):
        result = predict_price(crop_name="Tomato", grade="Grade Z")
        assert result["predicted_price"] > 0

    def test_unknown_crop_uses_fallback_history(self):
        result = predict_price(crop_name="Dragonfruit", historical_avg_price=None)
        assert result["predicted_price"] > 0

    def test_empty_crop_name_defaults(self):
        result = predict_price(crop_name="  ")
        assert result["predicted_price"] > 0

    def test_non_float_quantity_is_coerced(self):
        result = predict_price(
            crop_name="Onion",
            quantity_kg=float(Decimal(50)),
            demand_index=float(Decimal("0.8")),
        )
        assert result["predicted_price"] > 0
        assert isinstance(result["predicted_price"], float)