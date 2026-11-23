"""Admin commands for the data team: python3 -m app.cli <command> [arguments]."""

import sys
from datetime import datetime, timedelta, timezone

from azure.storage.blob import ContainerSasPermissions, generate_container_sas

from app import config, storage


def latest_training_dataset() -> str:
    """The blob name of the newest training dataset, such as training/2026-10.parquet."""
    names = [blob.name for blob in storage.list_blobs(storage.DATASETS, prefix="training/")]
    if not names:
        raise SystemExit("no training dataset has been uploaded yet")
    return max(names)


def cmd_partner_link(args: list[str]) -> None:
    """partner-link: print a link our data-science partner can use to fetch the training data."""
    sas = generate_container_sas(
        account_name=config.STORAGE_ACCOUNT,
        container_name=storage.DATASETS,
        account_key=config.STORAGE_KEY,
        permission=ContainerSasPermissions(read=True, list=True),
        expiry=datetime.now(timezone.utc) + timedelta(days=30),
    )
    print(f"{storage.blob_url(storage.DATASETS, latest_training_dataset())}?{sas}")


def cmd_datasets(args: list[str]) -> None:
    """Print every blob in the datasets container with its size."""
    for blob in storage.list_blobs(storage.DATASETS):
        print(f"{blob.name}\t{blob.size}")


def cmd_upload_dataset(args: list[str]) -> None:
    """upload-dataset <file> <yyyy-mm>: store a file as that month's training dataset."""
    path, month = args
    name = f"training/{month}.parquet"
    with open(path, "rb") as source:
        storage.upload_bytes(storage.DATASETS, name, source.read(), "application/vnd.apache.parquet")
    print(f"uploaded {name}")


COMMANDS = {"datasets": cmd_datasets, "upload-dataset": cmd_upload_dataset, "partner-link": cmd_partner_link}


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    if not argv or argv[0] not in COMMANDS:
        print(f"usage: python3 -m app.cli {{{','.join(COMMANDS)}}} ...", file=sys.stderr)
        return 2
    COMMANDS[argv[0]](argv[1:])
    return 0


if __name__ == "__main__":
    sys.exit(main())
