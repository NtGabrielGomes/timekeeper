from pydantic import BaseModel, Field
from datetime import datetime


class OperatorBase(BaseModel):
    username: str = Field(..., max_length=50)


class OperatorCreate(OperatorBase):
    password: str = Field(..., min_length=8, max_length=128)


class OperatorRead(OperatorBase):
    id: int

    class Config:
        from_attributes = True
