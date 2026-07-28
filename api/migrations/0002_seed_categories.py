from django.db import migrations


def seed_categories(apps, schema_editor):
    Category = apps.get_model("api", "Category")
    for name in ["Electrical", "Carpentry", "Plumbing", "Other"]:
        Category.objects.get_or_create(name=name)


def unseed_categories(apps, schema_editor):
    Category = apps.get_model("api", "Category")
    Category.objects.filter(
        name__in=["Electrical", "Carpentry", "Plumbing", "Other"]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_categories, unseed_categories),
    ]