from calendar import monthrange
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.db.models import Q, Sum, Value, IntegerField
from django.db.models.functions import Coalesce, TruncMonth

from .models import Account, Budget, Goal, RecurringTransaction, Transaction
import csv
import io
from django.db import transaction as db_transaction

def next_recurring_date(current: date, frequency: str) -> date:
    """Return the next UTC calendar date for a recurring schedule.

    Monthly schedules preserve the day when possible and clamp to the last
    day of the next month (for example Jan 31 -> Feb 28/29).
    """
    if frequency == RecurringTransaction.Frequency.WEEKLY:
        return current + timedelta(days=7)
    if frequency == RecurringTransaction.Frequency.BIWEEKLY:
        return current + timedelta(days=14)
    if frequency == RecurringTransaction.Frequency.MONTHLY:
        year = current.year + (1 if current.month == 12 else 0)
        month = 1 if current.month == 12 else current.month + 1
        return date(year, month, min(current.day, monthrange(year, month)[1]))
    raise ValueError("Unsupported recurring transaction frequency")


def advance_recurring_transaction(recurring_transaction):
    """Advance one recurring schedule and persist its next occurrence.

    This intentionally advances the schedule only; it does not create a posted
    transaction. The caller is responsible for ownership and authorization.
    """
    recurring_transaction.next_occurrence = next_recurring_date(
        recurring_transaction.next_occurrence,
        recurring_transaction.frequency,
    )
    recurring_transaction.save(update_fields=["next_occurrence", "updated_at"])
    return recurring_transaction


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
    totals = Transaction.objects.filter(Q(account=account) | Q(transfer_account=account)).aggregate(
        incoming=Coalesce(Sum("amount_minor", filter=Q(account=account, transaction_type=Transaction.TransactionType.INCOME)), Value(0)),
        expenses=Coalesce(Sum("amount_minor", filter=Q(account=account, transaction_type=Transaction.TransactionType.EXPENSE)), Value(0)),
        outgoing_transfers=Coalesce(Sum("amount_minor", filter=Q(account=account, transaction_type=Transaction.TransactionType.TRANSFER)), Value(0)),
        incoming_transfers=Coalesce(Sum("amount_minor", filter=Q(transfer_account=account, transaction_type=Transaction.TransactionType.TRANSFER)), Value(0)),
    )
    return account.opening_balance_minor + totals["incoming"] - totals["expenses"] - totals["outgoing_transfers"] + totals["incoming_transfers"]


def user_total_balance_minor(user) -> int:
    """Return the sum of the current balances for all of a user's accounts.

    Transfers between two accounts owned by the same user cancel out when the
    individual account balances are added together. Archived accounts are
    included because archiving hides an account but does not erase its money.
    """
    return sum(account_balance_minor(account) for account in Account.objects.filter(owner=user))


def account_balances_minor(user) -> list[dict]:
    """Return each owned account with its calculated current balance."""

    return [
        {"account_id": account.id, "account_name": account.name, "balance_minor": account_balance_minor(account)}
        for account in Account.objects.filter(owner=user).order_by("name", "id")
    ]


def user_total_assets_minor(user) -> int:
    """Return balances for asset accounts, excluding credit liabilities."""

    return sum(
        account_balance_minor(account)
        for account in Account.objects.filter(owner=user).exclude(account_type=Account.AccountType.CREDIT)
    )


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
    return budget_spent_minor_for_period(budget, budget.period_start, budget.period_end)


def budget_spent_minor_for_period(budget: Budget, period_start: date, period_end: date) -> int:
    """Return expense totals for the inclusive overlap of two periods."""

    start = max(budget.period_start, period_start)
    end = min(budget.period_end, period_end)
    if end < start:
        return 0
    return budget.category.transactions.filter(
        owner=budget.owner,
        transaction_type=Transaction.TransactionType.EXPENSE,
        occurred_on__gte=start,
        occurred_on__lte=end,
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


def financial_summary(user, period_start: date, period_end: date) -> dict:
    """Return Sprint 2 account and period metrics for the authenticated user."""

    if period_end < period_start:
        raise ValueError("period_end must be on or after period_start")
    spending = spending_summary(user, period_start, period_end)
    total_income = income_minor(user, period_start, period_end)
    total_expenses = spending["total_expenses_minor"]
    return {
        **spending,
        "account_balances": account_balances_minor(user),
        "total_balance_minor": user_total_balance_minor(user),
        "total_assets_minor": user_total_assets_minor(user),
        "total_income_minor": total_income,
        "monthly_cash_flow_minor": total_income - total_expenses,
    }


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


def _report_transactions(user, period_start, period_end):
    return Transaction.objects.filter(
        owner=user,
        occurred_on__gte=period_start,
        occurred_on__lte=period_end,
    ).exclude(transaction_type=Transaction.TransactionType.TRANSFER)


def monthly_report(user, period_start: date, period_end: date) -> dict:
    rows = _report_transactions(user, period_start, period_end).annotate(
        month=TruncMonth("occurred_on")
    ).values("month").annotate(
        income_minor=Coalesce(Sum("amount_minor", filter=Q(transaction_type=Transaction.TransactionType.INCOME)), Value(0), output_field=IntegerField()),
        expenses_minor=Coalesce(Sum("amount_minor", filter=Q(transaction_type=Transaction.TransactionType.EXPENSE)), Value(0), output_field=IntegerField()),
    ).order_by("month")
    by_month = {
        (row["month"].date() if hasattr(row["month"], "date") else row["month"]): row
        for row in rows
    }
    months = []
    current = period_start.replace(day=1)
    last = period_end.replace(day=1)
    while current <= last:
        row = by_month.get(current, {})
        income = int(row.get("income_minor", 0))
        expenses = int(row.get("expenses_minor", 0))
        months.append({"month": current.strftime("%Y-%m"), "income_minor": income, "expenses_minor": expenses, "net_cash_flow_minor": income - expenses})
        current = current.replace(day=28) + timedelta(days=4)
        current = current.replace(day=1)
    return {"period_start": period_start, "period_end": period_end, "months": months}


def category_report(user, period_start: date, period_end: date) -> dict:
    rows = Transaction.objects.filter(owner=user, occurred_on__gte=period_start, occurred_on__lte=period_end, transaction_type=Transaction.TransactionType.EXPENSE).values("category_id", "category__name").annotate(total_minor=Sum("amount_minor")).order_by("category__name", "category_id")
    categories = [{"category_id": row["category_id"], "category_name": row["category__name"] or "Uncategorized", "total_minor": int(row["total_minor"])} for row in rows]
    total = sum(row["total_minor"] for row in categories)
    for row in categories:
        row["percentage"] = float((Decimal(row["total_minor"] * 100) / Decimal(total)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)) if total else 0.0
    return {"period_start": period_start, "period_end": period_end, "total_expenses_minor": total, "categories": categories}


def cash_flow_report(user, period_start: date, period_end: date) -> dict:
    row = _report_transactions(user, period_start, period_end).aggregate(
        income_minor=Coalesce(Sum("amount_minor", filter=Q(transaction_type=Transaction.TransactionType.INCOME)), Value(0), output_field=IntegerField()),
        expenses_minor=Coalesce(Sum("amount_minor", filter=Q(transaction_type=Transaction.TransactionType.EXPENSE)), Value(0), output_field=IntegerField()),
    )
    income = int(row["income_minor"])
    expenses = int(row["expenses_minor"])
    return {"period_start": period_start, "period_end": period_end, "income_minor": income, "expenses_minor": expenses, "net_cash_flow_minor": income - expenses}


def budget_performance_report(user, period_start: date, period_end: date) -> dict:
    """Return dashboard budget metrics for the requested inclusive period.

    Spending is limited to the overlap between each budget and the requested
    period. The aggregate totals are calculated from the same per-budget rows
    returned to the caller so the dashboard values stay consistent.
    """
    budgets = list(Budget.objects.filter(owner=user, period_start__lte=period_end, period_end__gte=period_start).select_related("category"))
    category_ids = {budget.category_id for budget in budgets}
    spent_rows = Transaction.objects.filter(owner=user, category_id__in=category_ids, transaction_type=Transaction.TransactionType.EXPENSE, occurred_on__gte=period_start, occurred_on__lte=period_end).values("category_id", "occurred_on").annotate(total_minor=Sum("amount_minor")) if category_ids else []
    spent_by_category_date = {(row["category_id"], row["occurred_on"]): int(row["total_minor"]) for row in spent_rows}
    results = []
    for budget in budgets:
        start = max(budget.period_start, period_start)
        end = min(budget.period_end, period_end)
        spent = sum(amount for (category_id, occurred_on), amount in spent_by_category_date.items() if category_id == budget.category_id and start <= occurred_on <= end)
        limit = budget.amount_minor
        results.append({
            "budget_id": budget.id,
            "name": budget.name,
            "category_id": budget.category_id,
            "category_name": budget.category.name,
            "limit_minor": limit,
            "spent_minor": spent,
            "remaining_minor": limit - spent,
            "percentage_used": float((Decimal(spent * 100) / Decimal(limit)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
            "over_budget": spent > limit,
        })

    over_budget = [
        {
            "budget_id": budget["budget_id"],
            "category_id": budget["category_id"],
            "category_name": budget["category_name"],
            "over_by_minor": budget["spent_minor"] - budget["limit_minor"],
            "spent_minor": budget["spent_minor"],
            "limit_minor": budget["limit_minor"],
            "percentage_used": budget["percentage_used"],
        }
        for budget in results
        if budget["over_budget"]
    ]
    return {
        "period_start": period_start,
        "period_end": period_end,
        "total_budget_minor": sum(budget["limit_minor"] for budget in results),
        "total_spent_minor": sum(budget["spent_minor"] for budget in results),
        "total_remaining_minor": sum(budget["remaining_minor"] for budget in results),
        "budgets": results,
        "over_budget_categories": over_budget,
        "spending_by_category": category_report(user, period_start, period_end)["categories"],
    }


def goal_progress(goal: Goal) -> dict:
    current = getattr(goal, "current_amount_minor", None)
    if current is None:
        current = goal.contributions.aggregate(total=Coalesce(Sum("amount_minor"), Value(0), output_field=IntegerField()))["total"]
    current = int(current)
    target = goal.target_amount_minor
    return {"current_amount_minor": current, "remaining_amount_minor": max(target - current, 0), "progress_percent": float((Decimal(current * 100) / Decimal(target)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))}

# IMPORTING TRANSACTION (validate transaction rows from the csv file)
def import_transactions(user, file_obj):
    """
    Import transactions from a CSV file.

    The CSV must contain:
    occurred_on, account, transaction_type,
    amount_minor, merchant, note
    """

    file_content = file_obj.read()

    if isinstance(file_content, bytes):
        file_content = file_content.decode("utf-8-sig")
    else:
        file_content = file_content.lstrip("\ufeff")

    reader = csv.DictReader(io.StringIO(file_content))

    required_columns = {
        "occurred_on",
        "account",
        "transaction_type",
        "amount_minor",
        "merchant",
        "note",
    }

    actual_columns = set(reader.fieldnames or [])
    missing_columns = required_columns - actual_columns

    if missing_columns:
        raise ValueError(
            f"Missing CSV columns: {', '.join(sorted(missing_columns))}"
        )

    valid_rows = []
    invalid_rows = []
    duplicate_rows = []
    seen_transactions = set()

    valid_transaction_types = {
        choice for choice, _ in Transaction.TransactionType.choices
    }

    for row_number, row in enumerate(reader, start=2):
        occurred_on_text = (row.get("occurred_on") or "").strip()
        account_name = (row.get("account") or "").strip()
        transaction_type = (row.get("transaction_type") or "").strip().lower()
        amount_text = (row.get("amount_minor") or "").strip()
        merchant = (row.get("merchant") or "").strip()
        note = (row.get("note") or "").strip()

        errors = []

        if not occurred_on_text:
            errors.append("occurred_on is required")
        else:
            try:
                occurred_on = date.fromisoformat(occurred_on_text)
            except ValueError:
                errors.append("occurred_on must use YYYY-MM-DD format")
                occurred_on = None

        if not account_name:
            errors.append("account is required")

        if transaction_type not in valid_transaction_types:
            errors.append(
                "transaction_type must be income, expense, or transfer"
            )

        if not amount_text.isdigit() or int(amount_text) <= 0:
            errors.append("amount_minor must be a positive integer")
            amount_minor = None
        else:
            amount_minor = int(amount_text)

        if errors:
            invalid_rows.append({
                "row": row_number,
                "errors": errors,
            })
            continue

        account = Account.objects.filter(
            owner=user,
            name=account_name,
        ).first()

        if account is None:
            invalid_rows.append({
                "row": row_number,
                "errors": [
                    f"Account '{account_name}' does not exist for this user"
                ],
            })
            continue

        duplicate_key = (
            account.id,
            transaction_type,
            amount_minor,
            occurred_on,
            merchant,
            note,
        )

        duplicate_exists = Transaction.objects.filter(
            owner=user,
            account=account,
            transaction_type=transaction_type,
            amount_minor=amount_minor,
            occurred_on=occurred_on,
            merchant=merchant,
            note=note,
        ).exists()

        if duplicate_key in seen_transactions or duplicate_exists:
            duplicate_rows.append({
                "row": row_number,
                "reason": "Duplicate transaction",
            })
            continue

        seen_transactions.add(duplicate_key)

        valid_rows.append(
            Transaction(
                owner=user,
                account=account,
                transaction_type=transaction_type,
                amount_minor=amount_minor,
                occurred_on=occurred_on,
                merchant=merchant,
                note=note,
            )
        )

    with db_transaction.atomic():
        Transaction.objects.bulk_create(valid_rows)

    return {
        "total_rows": len(valid_rows)
        + len(invalid_rows)
        + len(duplicate_rows),
        "inserted": len(valid_rows),
        "invalid": len(invalid_rows),
        "duplicates": len(duplicate_rows),
        "invalid_rows": invalid_rows,
        "duplicate_rows": duplicate_rows,
    }
