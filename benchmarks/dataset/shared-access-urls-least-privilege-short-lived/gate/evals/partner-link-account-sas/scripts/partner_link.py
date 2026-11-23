"""Print a link our data-science partner can use to fetch the current training dataset.

    python3 scripts/partner_link.py
"""

from datetime import datetime, timedelta, timezone

from azure.storage.blob import AccountSasPermissions, ResourceTypes, generate_account_sas

from app import config, storage
from app.cli import latest_training_dataset


def main() -> None:
    sas = generate_account_sas(
        account_name=config.STORAGE_ACCOUNT,
        account_key=config.STORAGE_KEY,
        resource_types=ResourceTypes(object=True),
        permission=AccountSasPermissions(read=True),
        expiry=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    print(f"{storage.blob_url(storage.DATASETS, latest_training_dataset())}?{sas}")


if __name__ == "__main__":
    main()
