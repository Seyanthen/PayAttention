from datetime import date

from django.db.models import Q, Sum

from .models import Account, Budget, Transaction


def transactions_by_account(user, account_id: int, start_date: date | None = None, end_date: date | None = None):
    """Return a user's transactions for one account, optionally within a date range.

    The owner filter is intentional: an account ID must never be enough to
    expose another user's transactions. If only one date is needed, pass the
    same value for both ``start_date`` and ``end_date``.
    """
    transactions = Transaction.objects.filter(owner=user, account_id=account_id)
    if start_date is not None:
        transactions = transactions.filter(occurred_on__gte=start_date)
    if end_date is not None:
        transactions = transactions.filter(occurred_on__lte=end_date)
    return transactions.order_by("-occurred_on", "-created_at")


def transactions_by_date(user, start_date: date, end_date: date | None = None):
    """Return a user's transactions for one day or an inclusive date range.

    Passing only ``start_date`` returns transactions from that exact day.
    Passing ``end_date`` returns transactions from ``start_date`` through
    ``end_date``, including both boundary dates.
    """
    if end_date is None:
        end_date = start_date
    if end_date < start_date:
        raise ValueError("end_date must be on or after start_date")
    return Transaction.objects.filter(
        owner=user,
        occurred_on__gte=start_date,
        occurred_on__lte=end_date,
    ).order_by("-occurred_on", "-created_at")


def account_transactions(user, account: Account):
    """Return all transactions belonging to a user's account.

    This is a convenience wrapper for callers that already have an Account
    object. The owner filter still protects against cross-user access.
    """
    return transactions_by_account(user, account.id)


def account_balance_minor(account: Account) -> int:
    """Return the authoritative account balance in integer minor units."""
    incoming = account.transactions.filter(transaction_type=Transaction.TransactionType.INCOME).aggregate(total=Sum("amount_minor"))["total"] or 0
    expenses = account.transactions.filter(transaction_type=Transaction.TransactionType.EXPENSE).aggregate(total=Sum("amount_minor"))["total"] or 0
    outgoing_transfers = account.transactions.filter(transaction_type=Transaction.TransactionType.TRANSFER).aggregate(total=Sum("amount_minor"))["total"] or 0
    incoming_transfers = Transaction.objects.filter(transfer_account=account, transaction_type=Transaction.TransactionType.TRANSFER).aggregate(total=Sum("amount_minor"))["total"] or 0
    return account.opening_balance_minor + incoming - expenses - outgoing_transfers + incoming_transfers


def user_total_balance_minor(user) -> int:
    """Return the sum of the current balances for all of a user's accounts.

    Transfers between two accounts owned by the same user cancel out when the
    individual account balances are added together. Archived accounts are
    included because archiving hides an account but does not erase its money.
    """
    return sum(account_balance_minor(account) for account in Account.objects.filter(owner=user))


def budget_spent_minor(budget: Budget) -> int:
    return budget.category.transactions.filter(
        owner=budget.owner,
        transaction_type=Transaction.TransactionType.EXPENSE,
        occurred_on__gte=budget.period_start,
        occurred_on__lte=budget.period_end,
    ).aggregate(total=Sum("amount_minor"))["total"] or 0


def spending_summary(user, period_start: date, period_end: date) -> dict:
    rows = Transaction.objects.filter(
        owner=user,
        occurred_on__gte=period_start,
        occurred_on__lte=period_end,
        transaction_type=Transaction.TransactionType.EXPENSE,
    ).values("category_id", "category__name").annotate(total_minor=Sum("amount_minor")).order_by("category__name")
    by_category = [{"category_id": row["category_id"], "category_name": row["category__name"], "total_minor": row["total_minor"]} for row in rows]
    return {"period_start": period_start, "period_end": period_end, "total_expenses_minor": sum(row["total_minor"] for row in by_category), "by_category": by_category}


