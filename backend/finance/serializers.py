from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Account, Budget, Category, Transaction

User = get_user_model()


class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = ["id", "name", "account_type", "currency", "opening_balance_minor", "is_archived", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "category_type", "is_archived", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = ["id", "account", "category", "transaction_type", "amount_minor", "currency", "occurred_on", "merchant", "note", "transfer_account", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        transaction_type = attrs.get("transaction_type", getattr(self.instance, "transaction_type", None))
        category = attrs.get("category", getattr(self.instance, "category", None))
        transfer_account = attrs.get("transfer_account", getattr(self.instance, "transfer_account", None))
        if transaction_type == Transaction.TransactionType.TRANSFER and not transfer_account:
            raise serializers.ValidationError({"transfer_account": "Transfers require a destination account."})
        if transaction_type != Transaction.TransactionType.TRANSFER and transfer_account:
            raise serializers.ValidationError({"transfer_account": "Only transfers can specify a destination account."})
        if transaction_type == Transaction.TransactionType.INCOME and category and category.category_type != Category.CategoryType.INCOME:
            raise serializers.ValidationError({"category": "Income transactions require an income category."})
        if transaction_type == Transaction.TransactionType.EXPENSE and category and category.category_type != Category.CategoryType.EXPENSE:
            raise serializers.ValidationError({"category": "Expense transactions require an expense category."})
        return attrs


class BudgetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Budget
        fields = ["id", "category", "name", "amount_minor", "period_start", "period_end", "currency", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        if attrs.get("period_end", getattr(self.instance, "period_end", None)) < attrs.get("period_start", getattr(self.instance, "period_start", None)):
            raise serializers.ValidationError({"period_end": "The budget period must end on or after it starts."})
        category = attrs.get("category", getattr(self.instance, "category", None))
        if category and category.category_type != Category.CategoryType.EXPENSE:
            raise serializers.ValidationError({"category": "Budgets require an expense category."})
        return attrs


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email"]
        read_only_fields = fields

