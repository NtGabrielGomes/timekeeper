from typing import Annotated

from jose import JWTError

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

from sqlalchemy.orm import Session

from ..db.session import SessionLocal

from ..models.operator import Operator
from ..crud.operator import get_operator_by_id

from ..schemas.token import TokenData

from ..security.security import decode_access_token

oauth = OAuth2PasswordBearer(tokenUrl="auth/login")

TokenDep = Annotated[str, Depends(oauth)]
FormDataDep = Annotated[OAuth2PasswordRequestForm, Depends()]


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


SessionDep = Annotated[Session, Depends(get_db)]


def get_current_operator(token: TokenDep, db: SessionDep):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_access_token(token)
        
        operator_id = payload.get("sub")
        if not operator_id:
            raise credentials_exception
        
        token_data = TokenData(id=int(operator_id))

    except JWTError:
        raise credentials_exception

    operator = get_operator_by_id(db, token_data.id)
    if not operator:
        raise credentials_exception

    return operator

CurrentOperatorDep = Annotated[Operator, Depends(get_current_operator)]