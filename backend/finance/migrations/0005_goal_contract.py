from django.conf import settings
import django.core.validators
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("finance", "0004_goalcontribution"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.RenameModel(old_name="SavingsGoal", new_name="Goal"),
                migrations.RenameField(model_name="goal", old_name="target_amount", new_name="target_amount_minor"),
                migrations.RenameField(model_name="goal", old_name="current_amount", new_name="legacy_current_amount"),
                migrations.RenameField(model_name="goalcontribution", old_name="contribution_date", new_name="contributed_on"),
                migrations.AlterField(
                    model_name="goal",
                    name="owner",
                    field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="goals", to=settings.AUTH_USER_MODEL),
                ),
                migrations.AlterField(
                    model_name="goal",
                    name="target_amount_minor",
                    field=models.BigIntegerField(db_column="target_amount", validators=[django.core.validators.MinValueValidator(1)]),
                ),
                migrations.AlterField(
                    model_name="goal",
                    name="legacy_current_amount",
                    field=models.BigIntegerField(db_column="current_amount", default=0, editable=False),
                ),
                migrations.AlterField(
                    model_name="goal",
                    name="target_date",
                    field=models.DateField(blank=True, null=True),
                ),
                migrations.AlterField(
                    model_name="goalcontribution",
                    name="contributed_on",
                    field=models.DateField(db_column="contribution_date"),
                ),
                migrations.AlterModelTable(name="goal", table="finance_savingsgoal"),
                migrations.AlterModelTable(name="goalcontribution", table="finance_goalcontribution"),
            ],
        ),
    ]
