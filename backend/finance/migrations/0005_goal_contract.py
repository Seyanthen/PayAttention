from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("finance", "0004_goalcontribution"),
    ]

    operations = [
        migrations.RenameModel(
            old_name="SavingsGoal",
            new_name="Goal",
        ),
        migrations.RenameField(
            model_name="goal",
            old_name="target_amount",
            new_name="target_amount_minor",
        ),
        migrations.RemoveField(
            model_name="goal",
            name="current_amount",
        ),
        migrations.RenameField(
            model_name="goalcontribution",
            old_name="contribution_date",
            new_name="contributed_on",
        ),
        migrations.AlterField(
            model_name="goal",
            name="owner",
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="goals", to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name="goal",
            name="target_date",
            field=models.DateField(),
        ),
    ]
