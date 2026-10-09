from datetime import date

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase

from .models import Account, Category, Transaction
from .services import account_balance_minor


class FinanceApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="test-user", password="safe-password")
        self.other_user = get_user_model().objects.create_user(username="other-user", password="safe-password")
        self.client.force_authenticate(self.user)
        self.account = Account.objects.create(owner=self.user, name="Checking", opening_balance_minor=10000)
        self.other_account = Account.objects.create(owner=self.other_user, name="Other Checking")
        self.expense_category = Category.objects.create(owner=self.user, name="Food", category_type=Category.CategoryType.EXPENSE)

    def test_account_balance_uses_integer_minor_units(self):
        Transaction.objects.create(owner=self.user, account=self.account, category=self.expense_category, transaction_type="expense", amount_minor=1250, occurred_on=date(2026, 1, 1))
        self.assertEqual(account_balance_minor(self.account), 8750)

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

