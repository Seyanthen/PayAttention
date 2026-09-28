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

