from sqlalchemy import Column, Integer, String

from ..db.base import Base


class Operator(Base):
    __tablename__ = 'operators'

    id = Column(Integer, primary_key=True, index=True)
    
    username = Column(String(50), unique=True, nullable=False)
    hashed_password = Column(String(128), nullable=False)
