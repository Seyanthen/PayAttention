from calendar import monthrange
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


def _user_transaction_total_minor(user, transaction_type: str, period_start: date | None = None, period_end: date | None = None) -> int:
    transactions = Transaction.objects.filter(owner=user, transaction_type=transaction_type)
    if period_start is not None:
        transactions = transactions.filter(occurred_on__gte=period_start)
    if period_end is not None:
        transactions = transactions.filter(occurred_on__lte=period_end)
    return transactions.aggregate(total=Sum("amount_minor"))["total"] or 0


def income_minor(user, period_start: date | None = None, period_end: date | None = None) -> int:
    """Return a user's income in an optional inclusive date range."""

    return _user_transaction_total_minor(user, Transaction.TransactionType.INCOME, period_start, period_end)


def expenses_minor(user, period_start: date | None = None, period_end: date | None = None) -> int:
    """Return a user's expenses in an optional inclusive date range."""

    return _user_transaction_total_minor(user, Transaction.TransactionType.EXPENSE, period_start, period_end)


def monthly_income_minor(user, year: int, month: int) -> int:
    start = date(year, month, 1)
    end = date(year, month, monthrange(year, month)[1])
    return income_minor(user, start, end)


def monthly_expenses_minor(user, year: int, month: int) -> int:
    start = date(year, month, 1)
    end = date(year, month, monthrange(year, month)[1])
    return expenses_minor(user, start, end)


def monthly_net_cash_flow_minor(user, year: int, month: int) -> int:
    return monthly_income_minor(user, year, month) - monthly_expenses_minor(user, year, month)


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


# transactions for budget table 

def budget_transactions(budget: Budget):
    """Return expense transactions counted toward a budget."""
    return Transaction.objects.filter(
        owner=budget.owner,
        category=budget.category,
        transaction_type=Transaction.TransactionType.EXPENSE,
        occurred_on__gte=budget.period_start,
        occurred_on__lte=budget.period_end,
    ).order_by("occurred_on", "created_at")

def budget_performance(budget: Budget) -> dict:
    """Return spending performance information for one budget."""
    spent = budget_spent_minor(budget)
    limit = budget.amount_minor
    remaining = limit - spent

    return {
        "budget_id": budget.id,
        "category": budget.category.name,
        "limit_minor": limit,
        "spent_minor": spent,
        "remaining_minor": remaining,
        "percentage_used": round((spent / limit) * 100, 2),
        "over_budget": spent > limit,
    }
    
    
def over_budget_categories(user):
    """Return the user's budgets where spending exceeded the limit."""
    results = []

    budgets = Budget.objects.filter(owner=user)

    for budget in budgets:
        spent = budget_spent_minor(budget)

        if spent > budget.amount_minor:
            results.append({
                "budget_id": budget.id,
                "category": budget.category.name,
                "limit_minor": budget.amount_minor,
                "spent_minor": spent,
                "over_by_minor": spent - budget.amount_minor,
            })

    return results

