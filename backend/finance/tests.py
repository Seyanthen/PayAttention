from datetime import date

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase

from .models import Account, Budget, Category, Transaction
from .services import account_balance_minor, expenses_minor, financial_summary, income_minor, monthly_expenses_minor, monthly_income_minor, monthly_net_cash_flow_minor, user_total_assets_minor, user_total_balance_minor


class FinanceApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="test-user", password="safe-password")
        self.other_user = get_user_model().objects.create_user(username="other-user", password="safe-password")
        self.client.force_authenticate(self.user)
        self.account = Account.objects.create(owner=self.user, name="Checking", opening_balance_minor=10000)
        self.other_account = Account.objects.create(owner=self.other_user, name="Other Checking")
        self.expense_category = Category.objects.create(owner=self.user, name="Food", category_type=Category.CategoryType.EXPENSE)
        self.income_category = Category.objects.create(owner=self.user, name="Paycheck", category_type=Category.CategoryType.INCOME)

    def test_account_balance_uses_integer_minor_units(self):
        Transaction.objects.create(owner=self.user, account=self.account, category=self.expense_category, transaction_type="expense", amount_minor=1250, occurred_on=date(2026, 1, 1))
        self.assertEqual(account_balance_minor(self.account), 8750)

    def test_sprint_one_income_expenses_and_total_balance(self):
        Transaction.objects.create(owner=self.user, account=self.account, category=self.income_category, transaction_type="income", amount_minor=200000, occurred_on=date(2026, 1, 1))
        Transaction.objects.create(owner=self.user, account=self.account, category=self.expense_category, transaction_type="expense", amount_minor=32700, occurred_on=date(2026, 1, 10))
        self.assertEqual(income_minor(self.user), 200000)
        self.assertEqual(expenses_minor(self.user), 32700)
        self.assertEqual(account_balance_minor(self.account), 177300)
        self.assertEqual(user_total_balance_minor(self.user), 177300)

    def test_sprint_one_monthly_cash_flow_uses_inclusive_calendar_month(self):
        Transaction.objects.create(owner=self.user, account=self.account, category=self.income_category, transaction_type="income", amount_minor=200000, occurred_on=date(2026, 1, 1))
        Transaction.objects.create(owner=self.user, account=self.account, category=self.expense_category, transaction_type="expense", amount_minor=32700, occurred_on=date(2026, 1, 31))
        Transaction.objects.create(owner=self.user, account=self.account, category=self.income_category, transaction_type="income", amount_minor=50000, occurred_on=date(2026, 2, 1))
        self.assertEqual(monthly_income_minor(self.user, 2026, 1), 200000)
        self.assertEqual(monthly_expenses_minor(self.user, 2026, 1), 32700)
        self.assertEqual(monthly_net_cash_flow_minor(self.user, 2026, 1), 167300)

    def test_sprint_two_financial_summary_returns_database_metrics(self):
        credit = Account.objects.create(owner=self.user, name="Credit Card", account_type=Account.AccountType.CREDIT)
        Transaction.objects.create(owner=self.user, account=self.account, category=self.income_category, transaction_type="income", amount_minor=200000, occurred_on=date(2026, 1, 1))
        Transaction.objects.create(owner=self.user, account=self.account, category=self.expense_category, transaction_type="expense", amount_minor=32700, occurred_on=date(2026, 1, 31))
        Transaction.objects.create(owner=self.user, account=credit, category=self.expense_category, transaction_type="expense", amount_minor=10000, occurred_on=date(2026, 1, 31))
        summary = financial_summary(self.user, date(2026, 1, 1), date(2026, 1, 31))
        self.assertEqual(summary["total_income_minor"], 200000)
        self.assertEqual(summary["total_expenses_minor"], 42700)
        self.assertEqual(summary["monthly_cash_flow_minor"], 157300)
        self.assertEqual(summary["total_assets_minor"], 177300)
        self.assertEqual({row["account_name"] for row in summary["account_balances"]}, {"Checking", "Credit Card"})

    def test_summary_endpoint_returns_sprint_two_metrics(self):
        response = self.client.get(reverse("summary"), {"start": "2026-01-01", "end": "2026-01-31"})
        self.assertEqual(response.status_code, 200)
        for field in ("account_balances", "total_assets_minor", "total_expenses_minor", "total_income_minor", "monthly_cash_flow_minor"):
            self.assertIn(field, response.data)

    def test_accounts_are_scoped_to_authenticated_owner(self):
        Account.objects.create(owner=self.other_user, name="Private")
        response = self.client.get(reverse("account-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "Checking")

    def test_summary_requires_valid_date_range(self):
        response = self.client.get(reverse("summary"), {"start": "2026-02-01", "end": "2026-01-01"})
        self.assertEqual(response.status_code, 400)

    def test_unauthenticated_account_requests_are_rejected(self):
        self.client.force_authenticate(user=None)
        response = self.client.get(reverse("account-list"))
        self.assertEqual(response.status_code, 401)

    def test_account_crud_assigns_and_preserves_owner(self):
        response = self.client.post(reverse("account-list"), {
            "name": "Savings",
            "account_type": "savings",
            "currency": "usd",
            "opening_balance_minor": 2500,
        }, format="json")
        self.assertEqual(response.status_code, 201)
        created = Account.objects.get(name="Savings")
        self.assertEqual(created.owner, self.user)
        self.assertEqual(response.data["currency"], "USD")

        response = self.client.put(reverse("account-detail", args=[created.id]), {
            "name": "Emergency Savings",
            "account_type": "savings",
            "currency": "USD",
            "opening_balance_minor": 3000,
            "is_archived": False,
        }, format="json")
        self.assertEqual(response.status_code, 200)
        created.refresh_from_db()
        self.assertEqual(created.owner, self.user)
        self.assertEqual(created.name, "Emergency Savings")

        response = self.client.delete(reverse("account-detail", args=[created.id]))
        self.assertEqual(response.status_code, 204)

    def test_account_detail_and_delete_are_owner_scoped(self):
        response = self.client.get(reverse("account-detail", args=[self.other_account.id]))
        self.assertEqual(response.status_code, 404)
        response = self.client.delete(reverse("account-detail", args=[self.other_account.id]))
        self.assertEqual(response.status_code, 404)
        self.assertTrue(Account.objects.filter(pk=self.other_account.id).exists())

    def test_transaction_create_rejects_foreign_related_records(self):
        response = self.client.post(reverse("transaction-list"), {
            "account": self.other_account.id,
            "transaction_type": "expense",
            "amount_minor": 100,
            "currency": "USD",
            "occurred_on": "2026-01-01",
        }, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("account", response.data)

    def test_transaction_filters_search_and_combined_fields(self):
        savings_account = Account.objects.create(owner=self.user, name="Filter Savings", opening_balance_minor=0)
        matching = Transaction.objects.create(
            owner=self.user,
            account=self.account,
            category=self.expense_category,
            transaction_type="expense",
            amount_minor=2500,
            occurred_on=date(2026, 9, 1),
            merchant="Walmart",
            note="September groceries",
        )
        Transaction.objects.create(
            owner=self.user,
            account=savings_account,
            category=self.expense_category,
            transaction_type="expense",
            amount_minor=5000,
            occurred_on=date(2026, 9, 15),
            merchant="Market",
            note="walmart gift card",
        )
        Transaction.objects.create(
            owner=self.user,
            account=self.account,
            category=self.income_category,
            transaction_type="income",
            amount_minor=10000,
            occurred_on=date(2026, 9, 10),
            merchant="Walmart payroll",
        )
        Transaction.objects.create(
            owner=self.other_user,
            account=self.other_account,
            transaction_type="expense",
            amount_minor=2500,
            occurred_on=date(2026, 9, 1),
            merchant="Walmart",
        )

        response = self.client.get(reverse("transaction-list"), {
            "search": "walmart",
            "account": self.account.id,
            "category": self.expense_category.id,
            "transaction_type": "expense",
            "start_date": "2026-09-01",
            "end_date": "2026-09-30",
            "min_amount_minor": "2500",
            "max_amount_minor": "10000",
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual([row["id"] for row in response.data], [matching.id])

        note_response = self.client.get(reverse("transaction-list"), {"search": "gift card"})
        self.assertEqual(note_response.status_code, 200)
        self.assertEqual(len(note_response.data), 1)
        self.assertEqual(note_response.data[0]["account"], savings_account.id)

    def test_transaction_filters_include_boundaries_and_can_return_empty(self):
        lower = Transaction.objects.create(
            owner=self.user,
            account=self.account,
            category=self.expense_category,
            transaction_type="expense",
            amount_minor=2500,
            occurred_on=date(2026, 9, 1),
        )
        upper = Transaction.objects.create(
            owner=self.user,
            account=self.account,
            category=self.expense_category,
            transaction_type="expense",
            amount_minor=10000,
            occurred_on=date(2026, 9, 30),
        )
        response = self.client.get(reverse("transaction-list"), {
            "start_date": "2026-09-01",
            "end_date": "2026-09-30",
            "min_amount_minor": "2500",
            "max_amount_minor": "10000",
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual({row["id"] for row in response.data}, {lower.id, upper.id})

        empty_response = self.client.get(reverse("transaction-list"), {"search": "does-not-exist"})
        self.assertEqual(empty_response.status_code, 200)
        self.assertEqual(empty_response.data, [])

    def test_transaction_filters_reject_invalid_values_and_require_authentication(self):
        invalid_queries = [
            {"start_date": "09/01/2026"},
            {"end_date": "2026-02-30"},
            {"min_amount_minor": "-1"},
            {"max_amount_minor": "1.5"},
            {"min_amount_minor": "100", "max_amount_minor": "10"},
            {"transaction_type": "unknown"},
            {"account": "not-an-id"},
        ]
        for query in invalid_queries:
            response = self.client.get(reverse("transaction-list"), query)
            self.assertEqual(response.status_code, 400, query)

        self.client.force_authenticate(user=None)
        response = self.client.get(reverse("transaction-list"))
        self.assertEqual(response.status_code, 401)

    def test_transaction_update_cannot_change_to_foreign_account(self):
        transaction = Transaction.objects.create(
            owner=self.user,
            account=self.account,
            category=self.expense_category,
            transaction_type="expense",
            amount_minor=100,
            occurred_on=date(2026, 1, 1),
        )
        response = self.client.put(reverse("transaction-detail", args=[transaction.id]), {
            "account": self.other_account.id,
            "category": self.expense_category.id,
            "transaction_type": "expense",
            "amount_minor": 200,
            "currency": "USD",
            "occurred_on": "2026-01-02",
            "merchant": "Test merchant",
            "note": "Updated",
        }, format="json")
        self.assertEqual(response.status_code, 400)
        transaction.refresh_from_db()
        self.assertEqual(transaction.account_id, self.account.id)

    def test_transaction_crud_and_cross_user_detail_isolation(self):
        response = self.client.post(reverse("transaction-list"), {
            "account": self.account.id,
            "category": self.expense_category.id,
            "transaction_type": "expense",
            "amount_minor": 1250,
            "currency": "USD",
            "occurred_on": "2026-01-01",
            "merchant": "Groceries",
        }, format="json")
        self.assertEqual(response.status_code, 201)
        transaction_id = response.data["id"]

        response = self.client.get(reverse("transaction-detail", args=[transaction_id]))
        self.assertEqual(response.status_code, 200)
        response = self.client.put(reverse("transaction-detail", args=[transaction_id]), {
            "account": self.account.id,
            "category": self.expense_category.id,
            "transaction_type": "expense",
            "amount_minor": 1500,
            "currency": "USD",
            "occurred_on": "2026-01-01",
            "merchant": "Groceries",
            "note": "Updated",
        }, format="json")
        self.assertEqual(response.status_code, 200)
        response = self.client.delete(reverse("transaction-detail", args=[transaction_id]))
        self.assertEqual(response.status_code, 204)

        other_transaction = Transaction.objects.create(
            owner=self.other_user,
            account=self.other_account,
            transaction_type="expense",
            amount_minor=100,
            occurred_on=date(2026, 1, 1),
        )
        response = self.client.get(reverse("transaction-detail", args=[other_transaction.id]))
        self.assertEqual(response.status_code, 404)

    def test_category_crud_and_owner_isolation(self):
        response = self.client.post(reverse("category-list"), {
            "name": "  Transport  ",
            "category_type": "expense",
        }, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["name"], "Transport")

        Category.objects.create(owner=self.other_user, name="Private", category_type="expense")
        response = self.client.get(reverse("category-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual({row["name"] for row in response.data}, {"Food", "Paycheck", "Transport"})

    def test_budget_crud_and_current_month_report(self):
        budget = Budget.objects.create(
            owner=self.user,
            category=self.expense_category,
            name="January Food",
            amount_minor=5000,
            period_start=date(2026, 1, 1),
            period_end=date(2026, 1, 31),
        )
        Transaction.objects.create(
            owner=self.user,
            account=self.account,
            category=self.expense_category,
            transaction_type="expense",
            amount_minor=1250,
            occurred_on=date(2026, 1, 15),
        )
        response = self.client.get(reverse("budget-detail", args=[budget.id]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["spent_minor"], 1250)
        self.assertEqual(response.data["remaining_minor"], 3750)

        response = self.client.get(reverse("budgets-for-month", args=["2026-01"]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["period_start"], date(2026, 1, 1))
        self.assertEqual(response.data["budgets"][0]["spent_minor"], 1250)

    def test_budget_rejects_foreign_or_income_category(self):
        foreign_category = Category.objects.create(owner=self.other_user, name="Other Food", category_type="expense")
        response = self.client.post(reverse("budget-list"), {
            "category": foreign_category.id,
            "name": "Foreign Budget",
            "amount_minor": 1000,
            "period_start": "2026-01-01",
            "period_end": "2026-01-31",
            "currency": "USD",
        }, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("category", response.data)

        income_category = Category.objects.create(owner=self.user, name="Salary", category_type="income")
        response = self.client.post(reverse("budget-list"), {
            "category": income_category.id,
            "name": "Income Budget",
            "amount_minor": 1000,
            "period_start": "2026-01-01",
            "period_end": "2026-01-31",
            "currency": "USD",
        }, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("category", response.data)

    def test_current_month_summary_and_invalid_budget_month(self):
        response = self.client.get(reverse("current-month-summary"))
        self.assertEqual(response.status_code, 200)
        self.assertIn("period_start", response.data)
        self.assertIn("period_end", response.data)

        response = self.client.get(reverse("budgets-for-month", args=["not-a-month"]))
        self.assertEqual(response.status_code, 400)

