from django.db import migrations, models
import django.core.validators
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [("finance", "0004_goalcontribution")]

    operations = [
        migrations.CreateModel(
            name="RecurringTransaction",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=160)),
                ("amount_minor", models.BigIntegerField(validators=[django.core.validators.MinValueValidator(1)])),
                ("transaction_type", models.CharField(choices=[("income", "Income"), ("expense", "Expense")], max_length=10)),
                ("frequency", models.CharField(choices=[("weekly", "Weekly"), ("biweekly", "Every 2 weeks"), ("monthly", "Monthly")], max_length=10)),
                ("next_occurrence", models.DateField()),
                ("is_active", models.BooleanField(default=True)),
                ("currency", models.CharField(default="USD", max_length=3)),
                ("owner", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="recurring_transactions", to="auth.user")),
            ],
            options={"ordering": ["next_occurrence", "name", "id"]},
        ),
        migrations.AddIndex(
            model_name="recurringtransaction",
            index=models.Index(fields=["owner", "is_active", "next_occurrence"], name="finance_rec_owner_i_8fb2d8_idx"),
        ),
    ]
