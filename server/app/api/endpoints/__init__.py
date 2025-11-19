from fastapi import APIRouter

from app.api.endpoints import auth, implant, index

api_router = APIRouter()

api_router.include_router(index.router, prefix="", tags=["index"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(implant.router, prefix="/implants", tags=["implants"])

