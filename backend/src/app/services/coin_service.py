from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import CoinSource
from app.db.models import CoinTransaction
from app.repositories.coin_repository import CoinRepository, UserRepositoryLite


class CoinLedgerError(Exception):
    """Raised when a coin operation violates an invariant (e.g. insufficient)."""


class CoinService:
    """Append-only coin ledger. Every balance change is one immutable row with a
    `balance_after` snapshot; the user's `coin_balance` is always kept in sync.
    All mutations happen in a single DB transaction (atomic)."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.coins = CoinRepository(session)
        self.users = UserRepositoryLite(session)

    async def balance(self, user_id) -> int:
        return await self.coins.get_balance(user_id)

    @staticmethod
    def _as_uuid(value) -> UUID | None:
        if value is None:
            return None
        return value if isinstance(value, UUID) else UUID(str(value))

    async def _append(self, user_id, amount: int, source: CoinSource, reference_id=None) -> CoinTransaction:
        current = await self.coins.get_balance(user_id)
        new_balance = current + amount
        if new_balance < 0:
            raise CoinLedgerError("Insufficient coins")
        txn = CoinTransaction(
            user_id=user_id,
            amount=amount,
            source=source.value,
            reference_id=self._as_uuid(reference_id),
            balance_after=new_balance,
        )
        self.session.add(txn)
        await self.users.apply_balance(user_id, new_balance)
        await self.session.flush()
        return txn

    async def debit(self, user_id, amount: int, source: CoinSource, reference_id=None) -> CoinTransaction:
        if amount > 0:
            amount = -amount
        return await self._append(user_id, amount, source, reference_id)

    async def credit(self, user_id, amount: int, source: CoinSource, reference_id=None) -> CoinTransaction:
        if amount < 0:
            amount = -amount
        return await self._append(user_id, amount, source, reference_id)

    async def history(self, user_id, limit: int = 50, offset: int = 0):
        items = await self.coins.list_for_user(user_id, limit=limit, offset=offset)
        total = await self.coins.count_for_user(user_id)
        return items, total

