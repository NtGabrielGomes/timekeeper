from pydantic import BaseModel

class Summary(BaseModel):
    total_implants: int
    implants_online: int
    implants_offline: int

