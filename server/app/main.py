from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy import text
import os

from .db.base import Base
from .db.session import engine, SessionLocal

from .api.endpoints import api_router

from uvicorn import run
app = FastAPI()

Base.metadata.create_all(bind=engine)

frontend_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")

app.include_router(api_router)

if os.path.exists(frontend_path):
    from fastapi.staticfiles import StaticFiles
    from fastapi import Request
    from fastapi.responses import FileResponse
    import mimetypes
    
    @app.get("/app.js")
    async def get_app_js():
        return FileResponse(os.path.join(frontend_path, "app.js"), media_type="application/javascript")
    
    @app.get("/styles.css")
    async def get_styles_css():
        return FileResponse(os.path.join(frontend_path, "styles.css"), media_type="text/css")
    
    @app.get("/world-map.svg")
    async def get_world_map_svg():
        return FileResponse(os.path.join(frontend_path, "world-map.svg"), media_type="image/svg+xml")


@app.get("/")
async def read_root():
    frontend_file = os.path.join(frontend_path, "index.html")
    if os.path.exists(frontend_file):
        return FileResponse(frontend_file)
    return {"message": "TimeKeeper C2 Server - Frontend not available"}