from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import CoinTransaction, User
from app.repositories.base import BaseRepository


class CoinRepository(BaseRepository[CoinTransaction]):
    def __init__(self, session: AsyncSession):
        super().__init__(CoinTransaction, session)

    async def get_balance(self, user_id) -> int:
        stmt = select(func.coalesce(func.sum(CoinTransaction.amount), 0)).where(
            CoinTransaction.user_id == user_id
        )
        result = await self.session.execute(stmt)
        return int(result.scalar_one())

    async def list_for_user(self, user_id, limit: int = 50, offset: int = 0):
        stmt = (
            select(CoinTransaction)
            .where(CoinTransaction.user_id == user_id)
            .order_by(CoinTransaction.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_for_user(self, user_id) -> int:
        stmt = select(func.count()).select_from(CoinTransaction).where(
            CoinTransaction.user_id == user_id
        )
        result = await self.session.execute(stmt)
        return int(result.scalar_one())


class UserRepositoryLite:
    """Minimal user writes needed by the coin ledger (balance + pin)."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get(self, user_id) -> User | None:
        stmt = select(User).where(User.id == user_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def apply_balance(self, user_id, balance: int) -> None:
        user = await self.get(user_id)
        if user:
            user.coin_balance = balance
