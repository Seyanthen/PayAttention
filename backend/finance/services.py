from datetime import date

from django.db.models import Q, Sum

from .models import Account, Budget, Transaction


def account_balance_minor(account: Account) -> int:
    """Return the authoritative account balance in integer minor units."""
    incoming = account.transactions.filter(transaction_type=Transaction.TransactionType.INCOME).aggregate(total=Sum("amount_minor"))["total"] or 0
    expenses = account.transactions.filter(transaction_type=Transaction.TransactionType.EXPENSE).aggregate(total=Sum("amount_minor"))["total"] or 0
    outgoing_transfers = account.transactions.filter(transaction_type=Transaction.TransactionType.TRANSFER).aggregate(total=Sum("amount_minor"))["total"] or 0
    incoming_transfers = Transaction.objects.filter(transfer_account=account, transaction_type=Transaction.TransactionType.TRANSFER).aggregate(total=Sum("amount_minor"))["total"] or 0
    return account.opening_balance_minor + incoming - expenses - outgoing_transfers + incoming_transfers


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

