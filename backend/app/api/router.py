from fastapi import APIRouter

from app.api.v1.health import router as health_router
from app.modules.admin.dashboard_router import router as admin_dashboard_router
from app.modules.admin.router import router as admin_router
from app.modules.ai.router import router as ai_router
from app.modules.batches.router import router as batches_router
from app.modules.bulk_buyer.router import router as bulk_buyer_router
from app.modules.buyer.router import router as buyer_router
from app.modules.community.router import router as community_router
from app.modules.contracts.router import router as contracts_router
from app.modules.disputes.router import router as disputes_router
from app.modules.escrow.router import admin_router as escrow_admin_router
from app.modules.escrow.router import router as escrow_router
from app.modules.farm_notes.router import router as farm_notes_router
from app.modules.farmer.router import router as farmer_router
from app.modules.identity.router import router as identity_router
from app.modules.livestock.router import router as livestock_router
from app.modules.logistics.router import router as logistics_router
from app.modules.marketplace.router import router as marketplace_router
from app.modules.notifications.router import router as notifications_router
from app.modules.orders.router import router as orders_router
from app.modules.payments.router import router as payments_router
from app.modules.ratings.router import router as ratings_router
from app.modules.storage.router import router as storage_router
from app.modules.system.router import router as system_router
from app.modules.trust.router import router as trust_router
from app.modules.weather.router import router as weather_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(identity_router)
api_router.include_router(farmer_router)
api_router.include_router(farm_notes_router)
api_router.include_router(buyer_router)
api_router.include_router(bulk_buyer_router)
api_router.include_router(marketplace_router)
api_router.include_router(livestock_router)
api_router.include_router(orders_router)
api_router.include_router(payments_router)
api_router.include_router(disputes_router)
api_router.include_router(batches_router)
api_router.include_router(ai_router)
api_router.include_router(trust_router)
api_router.include_router(ratings_router)
api_router.include_router(storage_router)
api_router.include_router(notifications_router)
api_router.include_router(escrow_router)
api_router.include_router(escrow_admin_router)
api_router.include_router(contracts_router)
api_router.include_router(logistics_router)
api_router.include_router(community_router)
api_router.include_router(admin_router)
api_router.include_router(admin_dashboard_router)
api_router.include_router(weather_router)
api_router.include_router(system_router)
