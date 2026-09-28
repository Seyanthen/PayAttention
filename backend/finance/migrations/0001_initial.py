from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.core.validators


class Migration(migrations.Migration):
    initial = True

    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL)]

    operations = [
        migrations.CreateModel(
            name="Account",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=100)),
                ("account_type", models.CharField(choices=[("cash", "Cash"), ("checking", "Checking"), ("savings", "Savings"), ("credit", "Credit"), ("other", "Other")], default="checking", max_length=20)),
                ("currency", models.CharField(default="USD", max_length=3)),
                ("opening_balance_minor", models.BigIntegerField(default=0)),
                ("is_archived", models.BooleanField(default=False)),
                ("owner", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="accounts", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="Category",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=80)),
                ("category_type", models.CharField(choices=[("income", "Income"), ("expense", "Expense")], max_length=10)),
                ("is_archived", models.BooleanField(default=False)),
                ("owner", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="categories", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["category_type", "name"]},
        ),
        migrations.CreateModel(
            name="Budget",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=120)),
                ("amount_minor", models.BigIntegerField(validators=[django.core.validators.MinValueValidator(1)])),
                ("period_start", models.DateField()),
                ("period_end", models.DateField()),
                ("currency", models.CharField(default="USD", max_length=3)),
                ("category", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="budgets", to="finance.category")),
                ("owner", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="budgets", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-period_start", "name"]},
        ),
        migrations.CreateModel(
            name="Transaction",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("transaction_type", models.CharField(choices=[("income", "Income"), ("expense", "Expense"), ("transfer", "Transfer")], max_length=10)),
                ("amount_minor", models.BigIntegerField(validators=[django.core.validators.MinValueValidator(1)])),
                ("currency", models.CharField(default="USD", max_length=3)),
                ("occurred_on", models.DateField()),
                ("merchant", models.CharField(blank=True, max_length=160)),
                ("note", models.TextField(blank=True)),
                ("account", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="transactions", to="finance.account")),
                ("category", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="transactions", to="finance.category")),
                ("owner", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="transactions", to=settings.AUTH_USER_MODEL)),
                ("transfer_account", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="incoming_transfers", to="finance.account")),
            ],
            options={"ordering": ["-occurred_on", "-created_at"]},
        ),
        migrations.AddConstraint(
            model_name="account",
            constraint=models.UniqueConstraint(fields=("owner", "name"), name="unique_account_name_per_owner"),
        ),
        migrations.AddConstraint(
            model_name="category",
            constraint=models.UniqueConstraint(fields=("owner", "name", "category_type"), name="unique_category_per_owner"),
        ),
        migrations.AddConstraint(
            model_name="budget",
            constraint=models.CheckConstraint(condition=models.Q(("period_end__gte", models.F("period_start"))), name="budget_end_on_or_after_start"),
        ),
        migrations.AddIndex(model_name="account", index=models.Index(fields=["owner", "name"], name="finance_acc_owner__f1c2e4_idx")),
        migrations.AddIndex(model_name="category", index=models.Index(fields=["owner", "name"], name="finance_cat_owner__a4b7d1_idx")),
        migrations.AddIndex(model_name="transaction", index=models.Index(fields=["owner", "occurred_on"], name="finance_tra_owner__d6e9f2_idx")),
        migrations.AddIndex(model_name="transaction", index=models.Index(fields=["account", "occurred_on"], name="finance_tra_account_7f3a10_idx")),
        migrations.AddIndex(model_name="budget", index=models.Index(fields=["owner", "period_start", "period_end"], name="finance_bud_owner__8c5e21_idx")),
    ]

