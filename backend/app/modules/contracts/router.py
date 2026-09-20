from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.models.people import User
from app.db.session import get_db
from app.modules.contracts import service
from app.modules.contracts.schemas import ContractCounter, ContractCreate, ContractResponse
from app.modules.identity.dependencies import require_roles

router = APIRouter(prefix="/contracts", tags=["contracts"])

PartyDependency = require_roles("BUYER", "FARMER", "BULK_BUYER")
BuyerDependency = require_roles("BUYER", "BULK_BUYER")
FarmerDependency = require_roles("FARMER")


@router.post(
    "",
    response_model=ContractResponse,
    status_code=201,
    summary="Buyer proposes a direct contract against a published listing",
)
def create_contract(
    payload: ContractCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(BuyerDependency),
) -> ContractResponse:
    return service.create_contract(db, _user, payload)


@router.get(
    "",
    response_model=list[ContractResponse],
    summary="List my contracts (farmer or buyer) with an optional status filter",
)
def list_contracts(
    status_filter: str | None = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _user: User = Depends(PartyDependency),
) -> list[ContractResponse]:
    return service.list_contracts(db, _user, status_filter, page, page_size)


@router.get(
    "/{contract_id}",
    response_model=ContractResponse,
    summary="Get a contract I am a party to (or admin)",
)
def get_contract(
    contract_id: UUID,
    db: Session = Depends(get_db),
    _user: User = Depends(PartyDependency),
) -> ContractResponse:
    return service.get_contract(db, _user, contract_id)


@router.post(
    "/{contract_id}/accept",
    response_model=ContractResponse,
    summary="Farmer accepts the contract (PENDING/COUNTERED -> ACCEPTED)",
)
def accept_contract(
    contract_id: UUID,
    db: Session = Depends(get_db),
    _user: User = Depends(FarmerDependency),
) -> ContractResponse:
    return service.accept_contract(db, _user, contract_id)


@router.post(
    "/{contract_id}/counter",
    response_model=ContractResponse,
    summary="Either party counters the contract with new terms and a bumped expiry",
)
def counter_contract(
    contract_id: UUID,
    payload: ContractCounter,
    db: Session = Depends(get_db),
    _user: User = Depends(PartyDependency),
) -> ContractResponse:
    return service.counter_contract(db, _user, contract_id, payload)


@router.post(
    "/{contract_id}/reject",
    response_model=ContractResponse,
    summary="Farmer rejects the contract (-> CANCELLED)",
)
def reject_contract(
    contract_id: UUID,
    db: Session = Depends(get_db),
    _user: User = Depends(FarmerDependency),
) -> ContractResponse:
    return service.reject_contract(db, _user, contract_id)


@router.post(
    "/{contract_id}/cancel",
    response_model=ContractResponse,
    summary="Buyer cancels the contract while it is still negotiable",
)
def cancel_contract(
    contract_id: UUID,
    db: Session = Depends(get_db),
    _user: User = Depends(BuyerDependency),
) -> ContractResponse:
    return service.cancel_contract(db, _user, contract_id)


@router.post(
    "/{contract_id}/expire",
    response_model=ContractResponse,
    summary="Mark the contract EXPIRED once its deadline has passed",
)
def expire_contract(
    contract_id: UUID,
    db: Session = Depends(get_db),
    _user: User = Depends(PartyDependency),
) -> ContractResponse:
    return service.expire_contract(db, _user, contract_id)


@router.post(
    "/{contract_id}/create-order",
    response_model=ContractResponse,
    summary="Buyer creates a single order from an ACCEPTED contract",
)
def create_order_from_contract(
    contract_id: UUID,
    db: Session = Depends(get_db),
    _user: User = Depends(BuyerDependency),
) -> ContractResponse:
    return service.create_order_from_contract(db, _user, contract_id)