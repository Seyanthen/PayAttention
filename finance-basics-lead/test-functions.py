# Sprint 1: Create Python functions and unit tests for:
# - Income
# - Expense
# - Account Balance
# - Total Balance
# - Monthly Income
# - Monthly Expenses
# - Net Cash Flow

class User():
    def __init__(self, name: str, monthly_income: float, monthly_expenses: float):
        self.__accounts = []
        self.__name = name
        self.__monthly_income = monthly_income
        self.__monthly_expenses = monthly_expenses

    def get_name(self):
        return self.__name

    def get_accounts(self):
        return self.__accounts

    def display_accounts(self):
        for acc in self.__accounts:
            assert(type(acc) == type(Account(1, 0.0)))
            acc.display_account()

    def add_account(self, account: Account):
        new_id = account.get_id()
        for acc in self.__accounts:
            assert(type(acc) == type(Account(1, 0.0)))
            if acc.get_id == new_id:
                print("Account with that ID already exists")
                return
        self.__accounts.append(account)

    def remove_account(self, account_id):
        account_to_remove = None
        for acc in self.__accounts:
            assert(type(acc) == type(Account))
            if acc.get_id == account_id:
                account_to_remove = acc
                self.__accounts.remove(account_to_remove)
                return
        print("Account ID not found.")

    def get_monthly_income(self):
        return self.__monthly_income

    def get_monthly_expenses(self):
        return self.__monthly_expenses

    def get_net_cash_flow(self):
        return self.__monthly_income - self.__monthly_expenses

    def get_total_balance(self):
        total = 0
        for acc in self.__accounts:
            assert(type(acc) == type(Account(1, 0.0)))
            total += acc.get_balance

class Account():
    def __init__(self, account_id: int, name: str, balance: float):
        self.__account_id = account_id
        self.__name = name
        self.__balance = balance

    def deposit(self, amount: float):
        self.__balance += amount

    def withdraw(self, amount: float):
        if self.__balance - amount > 0:
            self.__balance -= amount
            return
        print("Insufficient balance")

    def get_id(self):
        return self.__account_id

    def get_name(self):
        return self.__name

    def set_name(self, name: str):
        self.__name = name

    def get_balance(self):
        return self.__balance

    def display_account(self):
        print(f"{self.__name} ({self.__account_id}): ${self.__balance}")

    def get_account_str(self):
        return f"{self.__account_id},{self.__name},{self.__balance}"

def load_account_data(filename):
    '''Let's just assume that this is how account data is going to work for now. We
    can change this as the actual account structure gets changed.'''
    pass

def main():
    print("Program Start")
    test_user = User("John", 2080.0, 1500.0)
    print(test_user.get_name())

    print("Hello World")

if __name__ == "__main__":
    main()