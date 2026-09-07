from django.db import migrations, models

import api.models


class Migration(migrations.Migration):
    dependencies = [("api", "0007_complete_portal_features")]

    operations = [
        migrations.AlterField(
            model_name="residentregistry",
            name="telephone",
            field=models.CharField(
                blank=True,
                max_length=20,
                null=True,
                unique=True,
                validators=[api.models.phone_validator],
            ),
        )
    ]
