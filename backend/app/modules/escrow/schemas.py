from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class EscrowResponse(BaseModel):
    id: UUID
    order_id: UUID
    buyer_id: UUID
    farmer_id: UUID
    currency: str
    amount_deposited: Decimal
    amount_held: Decimal
    amount_released: Decimal
    amount_refunded: Decimal
    status: str
    deposited_at: datetime | None
    released_at: datetime | None
    created_at: datetime
    updated_at: datetime