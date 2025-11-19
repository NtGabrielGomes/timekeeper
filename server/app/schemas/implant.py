from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from pydantic import validator
from hashlib import sha256



class ImplantBase(BaseModel):
    token: str = Field(..., length=32, unique=True)
    ip_address: str = Field(..., max_length=45)
    geo_location: str = Field(..., max_length=100)
    operating_system: str = Field(..., max_length=100)
    username: str = Field(..., max_length=100)
    hostname: str = Field(..., max_length=100)
    is_local_admin: bool
    language: str = Field(..., max_length=20)    

    @validator('token')
    def validate_token(cls, v):
        def validar_chave(chave):
            if len(chave) != 32 or not all(c in '0123456789ABCDEF' for c in chave):
                return False
            
            parte_principal = chave[:28]
            hash_verificacao = chave[28:]
            
            return sha256(parte_principal.encode()).hexdigest()[:4].upper() == hash_verificacao

        if not validar_chave(v):
            raise ValueError("Token Invalido")
        
        return v  
        

class FileUpload(BaseModel):
    filename: str
    content: bytes
    implant_token: str
    

class ImplantCreate(ImplantBase):
    pass

class ImplantUpdate(BaseModel):
    ip_address: Optional[str] = Field(None, max_length=45)
    geo_location: Optional[str] = Field(None, max_length=100)
    operating_system: Optional[str] = Field(None, max_length=100)
    username: Optional[str] = Field(None, max_length=100)
    hostname: Optional[str] = Field(None, max_length=100)
    is_local_admin: Optional[bool] = None
    is_alive: Optional[bool] = None
    language: Optional[str] = Field(None, max_length=20)


class ImplantRead(ImplantBase):
    id: int
    is_alive: bool
    last_seen: datetime
    installed_at: datetime

    class Config:
        from_attributes = True


class Msg(BaseModel):
    msg: str

    class Config:
        from_attributes = True

class CommandResponse(BaseModel):
    msg: str
    cmd: Optional[str] = None

    class Config:
        from_attributes = True
        # Exclui campos None/null da resposta JSON
        exclude_none = True

class Cmd(BaseModel):
    command: str

    class Config:
        from_attributes = True