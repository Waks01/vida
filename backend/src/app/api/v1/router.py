from fastapi import APIRouter

from app.api.v1.endpoints import (
    admin,
    auth,
    content,
    creators,
    discovery,
    payments,
    users,
    wallet,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(content.router)
api_router.include_router(wallet.router)
api_router.include_router(payments.router)
api_router.include_router(users.router)
api_router.include_router(creators.router)
api_router.include_router(admin.router)
api_router.include_router(discovery.router)
