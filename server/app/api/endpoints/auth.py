from fastapi import APIRouter, HTTPException, status

from ..dependencies import SessionDep, FormDataDep, CurrentOperatorDep

from ...crud.operator import get_operator_by_username

from ...schemas.token import Token
from ...schemas.operator import OperatorRead

from ...security.security import verify_password, create_access_token

router = APIRouter()


@router.post("/login", response_model=Token)
def login_for_access_token(form_data: FormDataDep, db: SessionDep):
    operator = get_operator_by_username(db, username=form_data.username)

    if not operator or not verify_password(form_data.password, operator.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token = create_access_token(data={"sub": str(operator.id)})
    
    return Token(access_token=access_token)


@router.get("/me", response_model=OperatorRead)
def read_current_operator(current_operator: CurrentOperatorDep):
    return OperatorRead(
        id=current_operator.id,
        username=current_operator.username,
    )
