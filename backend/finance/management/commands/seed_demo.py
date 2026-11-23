from datetime import date

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction as db_transaction

from finance.models import Account, Budget, Category, Transaction, Goal, GoalContribution


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
        # Keep the documented demo credentials usable even when the user was
        # created by an earlier run or already exists in a shared dev database.
        # ``set_password`` is required so Django stores a valid password hash.
        user.set_password("demo-password")
        user.is_active = True
        user.save(update_fields=["password", "is_active"])

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
        
        
        # demo data for goals and goalcontribution
        emergency_fund, _ = Goal.objects.get_or_create(
            owner=user,
            name="Emergency fund",
            defaults={
                "target_amount_minor": 1000000,
                "target_date": date(2027, 6, 30),
                "currency": "USD",
                "is_completed": False,
            },
        )

        laptop_goal, _ = Goal.objects.get_or_create(
            owner=user,
            name="New laptop",
            defaults={
                "target_amount_minor": 150000,
                "target_date": date(2026, 12, 31),
                "currency": "USD",
                "is_completed": False,
            },
        )

        vacation_goal, _ = Goal.objects.get_or_create(
            owner=user,
            name="Spring break trip",
            defaults={
                "target_amount_minor": 120000,
                "target_date": date(2026, 9, 1),
                "currency": "USD",
                "is_completed": True,
            },
        )
        
        contributions = [
            {
                "goal": emergency_fund,
                "amount_minor": 250000,
                "contributed_on": date(2026, 8, 15),
            },
            {
                "goal": emergency_fund,
                "amount_minor": 175000,
                "contributed_on": date(2026, 9, 15),
            },
            {
                "goal": emergency_fund,
                "amount_minor": 125000,
                "contributed_on": date(2026, 10, 15),
            },
            {
                "goal": laptop_goal,
                "amount_minor": 50000,
                "contributed_on": date(2026, 9, 20),
            },
            {
                "goal": laptop_goal,
                "amount_minor": 25000,
                "contributed_on": date(2026, 10, 20),
            },
            {
                "goal": vacation_goal,
                "amount_minor": 120000,
                "contributed_on": date(2026, 8, 1),
            },
        ]

        for data in contributions:
            GoalContribution.objects.get_or_create(**data)

        self.stdout.write(self.style.SUCCESS("Demo data is ready."))
        self.stdout.write("Username: demo-user")
        self.stdout.write("Password: demo-password")
        self.stdout.write(f"Accounts: {checking.name}, {savings.name}")

