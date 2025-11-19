from sqlalchemy.orm import Session

from ..models.operator import Operator
from app.schemas.operator import OperatorRead


def get_operator_by_id(db: Session, operator_id: int):
    return db.query(Operator).filter(Operator.id == operator_id).first()


def get_operator_by_username(db: Session, username: str):
    return db.query(Operator).filter(Operator.username == username).first()
