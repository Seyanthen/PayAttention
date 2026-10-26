import unittest
from datetime import date

from finance_rules import Account, Transaction, account_balance, expense, income, monthly_expenses, monthly_income, net_cash_flow, total_balance


class FinanceRulesTests(unittest.TestCase):
    def setUp(self):
        self.transactions = (
            Transaction("income", 200000, date(2026, 1, 1)),
            Transaction("expense", 32700, date(2026, 1, 10)),
            Transaction("expense", 5000, date(2026, 2, 1)),
            Transaction("income", 15000, date(2026, 2, 15)),
        )

    def test_income_and_expense(self):
        self.assertEqual(income(self.transactions), 215000)
        self.assertEqual(expense(self.transactions), 37700)

    def test_account_balance(self):
        self.assertEqual(account_balance(Account(100000, self.transactions[:2])), 267300)

    def test_total_balance(self):
        accounts = (Account(100000, self.transactions[:2]), Account(50000, self.transactions[2:]))
        self.assertEqual(total_balance(accounts), 327300)

    def test_monthly_income_expenses_and_net_cash_flow(self):
        self.assertEqual(monthly_income(self.transactions, 2026, 1), 200000)
        self.assertEqual(monthly_expenses(self.transactions, 2026, 1), 32700)
        self.assertEqual(net_cash_flow(self.transactions, 2026, 1), 167300)

    def test_month_boundaries_are_inclusive(self):
        transactions = (Transaction("income", 100, date(2026, 1, 1)), Transaction("expense", 25, date(2026, 1, 31)), Transaction("income", 500, date(2026, 2, 1)))
        self.assertEqual(monthly_income(transactions, 2026, 1), 100)
        self.assertEqual(monthly_expenses(transactions, 2026, 1), 25)

    def test_invalid_period_is_rejected(self):
        with self.assertRaises(ValueError):
            income(self.transactions, date(2026, 2, 1), date(2026, 1, 1))


if __name__ == "__main__":
    unittest.main()
