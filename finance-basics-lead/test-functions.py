# Sprint 1: Create Python functions and unit tests for:
# - Income
# - Expense
# - Account Balance
# - Total Balance
# - Monthly Income
# - Monthly Expenses
# - Net Cash Flow

class User():
    def __init__(self, monthly_income, monthly_expenses):
        self.accounts = []
        self.monthly_income = monthly_income
        self.monthly_expenses = monthly_expenses

    def get_accounts(self):
        return self.accounts

    def display_accounts(self):
        for acc in self.accounts:
            assert(type(acc) == type(Account(1, 0.0)))
            acc.display_account()

    def add_account(self, account: Account):
        new_id = account.get_id()
        for acc in self.accounts:
            assert(type(acc) == type(Account(1, 0.0)))
            if acc.get_id == new_id:
                print("Account with that ID already exists")
                return
        self.accounts.append(account)

    def remove_account(self, account_id):
        account_to_remove = None
        for acc in self.accounts:
            assert(type(acc) == type(Account))
            if acc.get_id == account_id:
                account_to_remove = acc
                self.accounts.remove(account_to_remove)
                return
        print("Account ID not found.")

    def get_monthly_income(self):
        return self.monthly_income

    def get_monthly_expenses(self):
        return self.monthly_expenses

    def get_net_cash_flow(self):
        return self.monthly_income - self.monthly_expenses

    def get_total_balance(self):
        total = 0
        for acc in self.accounts:
            assert(type(acc) == type(Account(1, 0.0)))
            total += acc.get_balance

class Account():
    def __init__(self, account_id: int, name: str, balance: float):
        self.account_id = account_id
        self.name = name
        self.balance = balance

    def deposit(self, amount: float):
        self.balance += amount

    def withdraw(self, amount: float):
        if self.balance - amount > 0:
            self.balance -= amount
            return
        print("Insufficient balance")

    def get_id(self):
        return self.account_id

    def get_name(self):
        return self.name

    def set_name(self, name: str):
        self.name = name

    def get_balance(self):
        return self.balance

    def display_account(self):
        print(f"{self.name} ({self.account_id}): ${self.balance}")

    def get_account_str(self):
        return f"{self.account_id},{self.name},{self.balance}"

def load_account_data(filename):
    '''Let's just assume that this is how account data is going to work for now. We
    can change this as the actual account structure gets changed.'''
    pass

def main():
    print("Hello World")

if __name__ == "__main__":
    main()