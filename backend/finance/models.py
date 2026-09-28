from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Account(TimeStampedModel):
    class AccountType(models.TextChoices):
        CASH = "cash", "Cash"
        CHECKING = "checking", "Checking"
        SAVINGS = "savings", "Savings"
        CREDIT = "credit", "Credit"
        OTHER = "other", "Other"

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="accounts")
    name = models.CharField(max_length=100)
    account_type = models.CharField(max_length=20, choices=AccountType.choices, default=AccountType.CHECKING)
    currency = models.CharField(max_length=3, default="USD")
    opening_balance_minor = models.BigIntegerField(default=0)
    is_archived = models.BooleanField(default=False)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["owner", "name"], name="unique_account_name_per_owner")]
        ordering = ["name"]


class Category(TimeStampedModel):
    class CategoryType(models.TextChoices):
        INCOME = "income", "Income"
        EXPENSE = "expense", "Expense"

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="categories")
    name = models.CharField(max_length=80)
    category_type = models.CharField(max_length=10, choices=CategoryType.choices)
    is_archived = models.BooleanField(default=False)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["owner", "name", "category_type"], name="unique_category_per_owner")]
        ordering = ["category_type", "name"]


class Transaction(TimeStampedModel):
    class TransactionType(models.TextChoices):
        INCOME = "income", "Income"
        EXPENSE = "expense", "Expense"
        TRANSFER = "transfer", "Transfer"

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="transactions")
    account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name="transactions")
    category = models.ForeignKey(Category, on_delete=models.PROTECT, null=True, blank=True, related_name="transactions")
    transaction_type = models.CharField(max_length=10, choices=TransactionType.choices)
    amount_minor = models.BigIntegerField(validators=[MinValueValidator(1)])
    currency = models.CharField(max_length=3, default="USD")
    occurred_on = models.DateField()
    merchant = models.CharField(max_length=160, blank=True)
    note = models.TextField(blank=True)
    transfer_account = models.ForeignKey(Account, on_delete=models.PROTECT, null=True, blank=True, related_name="incoming_transfers")

    class Meta:
        indexes = [models.Index(fields=["owner", "occurred_on"]), models.Index(fields=["account", "occurred_on"])]
        ordering = ["-occurred_on", "-created_at"]


class Budget(TimeStampedModel):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="budgets")
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="budgets")
    name = models.CharField(max_length=120)
    amount_minor = models.BigIntegerField(validators=[MinValueValidator(1)])
    period_start = models.DateField()
    period_end = models.DateField()
    currency = models.CharField(max_length=3, default="USD")

    class Meta:
        constraints = [models.CheckConstraint(condition=models.Q(period_end__gte=models.F("period_start")), name="budget_end_on_or_after_start")]
        indexes = [models.Index(fields=["owner", "period_start", "period_end"])]
        ordering = ["-period_start", "name"]

