from fastapi import APIRouter, HTTPException, status
from ..dependencies import SessionDep, FormDataDep, CurrentOperatorDep
from ...models.implant import Implant


router = APIRouter()

@router.get("/status", response_model=dict)
def read_status(
    db: SessionDep,
    current_operator: CurrentOperatorDep
):
    total_implants = db.query(Implant).count()
    total_active_implants = db.query(Implant).filter(Implant.is_alive == True).count()

    status = {
        "total_implants": total_implants,
        "active_implants": total_active_implants,
        "offline_implants": total_implants - total_active_implants
        
    }

    return status