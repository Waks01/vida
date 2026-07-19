from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Phase 0: no DB tables auto-created. Alembic handles schema.
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Vida Backend", version="0.1.0", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health", tags=["health"])
    async def health():
        return {"status": "ok", "service": "vida-backend"}

    app.include_router(api_router, prefix="/api/v1")
    return app


app = create_app()
