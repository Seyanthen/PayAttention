"""Pure Sprint 1 finance rules using integer minor-unit money."""

from __future__ import annotations

from calendar import monthrange
from dataclasses import dataclass
from datetime import date
from typing import Iterable

INCOME = "income"
EXPENSE = "expense"


@dataclass(frozen=True)
class Transaction:
    transaction_type: str
    amount_minor: int
    occurred_on: date

    def __post_init__(self) -> None:
        if self.transaction_type not in {INCOME, EXPENSE}:
            raise ValueError("transaction_type must be 'income' or 'expense'")
        if isinstance(self.amount_minor, bool) or not isinstance(self.amount_minor, int):
            raise TypeError("amount_minor must be an integer")
        if self.amount_minor < 0:
            raise ValueError("amount_minor must be non-negative")


@dataclass(frozen=True)
class Account:
    opening_balance_minor: int
    transactions: tuple[Transaction, ...] = ()


def _in_period(transaction: Transaction, start: date | None, end: date | None) -> bool:
    return (start is None or transaction.occurred_on >= start) and (end is None or transaction.occurred_on <= end)


def _total(transactions: Iterable[Transaction], transaction_type: str, start: date | None = None, end: date | None = None) -> int:
    if start is not None and end is not None and end < start:
        raise ValueError("end must be on or after start")
    return sum(t.amount_minor for t in transactions if t.transaction_type == transaction_type and _in_period(t, start, end))


def income(transactions: Iterable[Transaction], start: date | None = None, end: date | None = None) -> int:
    return _total(transactions, INCOME, start, end)


def expense(transactions: Iterable[Transaction], start: date | None = None, end: date | None = None) -> int:
    return _total(transactions, EXPENSE, start, end)


def account_balance(account: Account) -> int:
    return account.opening_balance_minor + income(account.transactions) - expense(account.transactions)


def total_balance(accounts: Iterable[Account]) -> int:
    return sum(account_balance(account) for account in accounts)


def _month_period(year: int, month: int) -> tuple[date, date]:
    if month < 1 or month > 12:
        raise ValueError("month must be between 1 and 12")
    return date(year, month, 1), date(year, month, monthrange(year, month)[1])


def monthly_income(transactions: Iterable[Transaction], year: int, month: int) -> int:
    start, end = _month_period(year, month)
    return income(transactions, start, end)


def monthly_expenses(transactions: Iterable[Transaction], year: int, month: int) -> int:
    start, end = _month_period(year, month)
    return expense(transactions, start, end)


def net_cash_flow(transactions: Iterable[Transaction], year: int, month: int) -> int:
    return monthly_income(transactions, year, month) - monthly_expenses(transactions, year, month)
