from datetime import date

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction as db_transaction

from finance.models import Account, Budget, Category, Transaction


class Command(BaseCommand):
    help = "Create repeatable demo data for local development."

    @db_transaction.atomic
    def handle(self, *args, **options):
        User = get_user_model()
        user, created = User.objects.get_or_create(
            username="demo-user",
            defaults={
                "email": "demo@example.com",
                "first_name": "Demo",
                "last_name": "User",
            },
        )
        if created:
            user.set_password("demo-password")
            user.save(update_fields=["password"])

        checking, _ = Account.objects.get_or_create(
            owner=user,
            name="Checking",
            defaults={"account_type": Account.AccountType.CHECKING, "opening_balance_minor": 150000},
        )
        savings, _ = Account.objects.get_or_create(
            owner=user,
            name="Savings",
            defaults={"account_type": Account.AccountType.SAVINGS, "opening_balance_minor": 500000},
        )

        categories = {}
        for name, category_type in [
            ("Paycheck", Category.CategoryType.INCOME),
            ("Groceries", Category.CategoryType.EXPENSE),
            ("Dining", Category.CategoryType.EXPENSE),
            ("Transportation", Category.CategoryType.EXPENSE),
        ]:
            categories[name], _ = Category.objects.get_or_create(
                owner=user,
                name=name,
                category_type=category_type,
            )

        transactions = [
            {
                "account": checking,
                "category": categories["Paycheck"],
                "transaction_type": Transaction.TransactionType.INCOME,
                "amount_minor": 320000,
                "occurred_on": date(2026, 10, 1),
                "merchant": "Campus job",
                "note": "Monthly paycheck",
            },
            {
                "account": checking,
                "category": categories["Groceries"],
                "transaction_type": Transaction.TransactionType.EXPENSE,
                "amount_minor": 6842,
                "occurred_on": date(2026, 10, 3),
                "merchant": "Grocery store",
            },
            {
                "account": checking,
                "category": categories["Dining"],
                "transaction_type": Transaction.TransactionType.EXPENSE,
                "amount_minor": 1499,
                "occurred_on": date(2026, 10, 5),
                "merchant": "Campus cafe",
            },
            {
                "account": checking,
                "category": categories["Transportation"],
                "transaction_type": Transaction.TransactionType.EXPENSE,
                "amount_minor": 2500,
                "occurred_on": date(2026, 10, 7),
                "merchant": "Transit pass",
            },
        ]
        for data in transactions:
            Transaction.objects.get_or_create(owner=user, **data)

        Budget.objects.get_or_create(
            owner=user,
            category=categories["Groceries"],
            name="October groceries",
            period_start=date(2026, 10, 1),
            period_end=date(2026, 10, 31),
            defaults={"amount_minor": 40000},
        )

        self.stdout.write(self.style.SUCCESS("Demo data is ready."))
        self.stdout.write("Username: demo-user")
        self.stdout.write("Password: demo-password")
        self.stdout.write(f"Accounts: {checking.name}, {savings.name}")

