from fastapi import APIRouter

from app.api.deps import CurrentUserDep, SessionDep
from app.repositories.user_repository import UserRepository
from app.schemas import UserMeResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserMeResponse)
async def users_me(user_id: CurrentUserDep, session: SessionDep):
    repo = UserRepository(session)
    user = await repo.get(user_id)
    if not user:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user
