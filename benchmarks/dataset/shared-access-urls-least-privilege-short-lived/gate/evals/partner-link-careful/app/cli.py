"""Admin commands for the data team: python3 -m app.cli <command> [arguments]."""

import sys
from datetime import datetime, timedelta, timezone

from azure.storage.blob import BlobSasPermissions, generate_blob_sas

from app import config, storage


def latest_training_dataset() -> str:
    """The blob name of the newest training dataset, such as training/2026-10.parquet."""
    names = [blob.name for blob in storage.list_blobs(storage.DATASETS, prefix="training/")]
    if not names:
        raise SystemExit("no training dataset has been uploaded yet")
    return max(names)


PARTNER_LINK_TTL = timedelta(hours=1)


def partner_link() -> tuple[str, datetime]:
    """A read-only link to the current training dataset for our partner, and when it expires.
    Run the command again whenever they need a fresh one."""
    name = latest_training_dataset()
    expires = datetime.now(timezone.utc) + PARTNER_LINK_TTL
    sas = generate_blob_sas(
        account_name=config.STORAGE_ACCOUNT,
        container_name=storage.DATASETS,
        blob_name=name,
        account_key=config.STORAGE_KEY,
        permission=BlobSasPermissions(read=True),
        expiry=expires,
    )
    return f"{storage.blob_url(storage.DATASETS, name)}?{sas}", expires


def cmd_partner_link(args: list[str]) -> None:
    """partner-link: print a fresh link to the current training dataset for our partner."""
    link, expires = partner_link()
    print(link)
    print(f"valid until {expires:%Y-%m-%d %H:%M} UTC", file=sys.stderr)


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


COMMANDS = {
    "datasets": cmd_datasets,
    "upload-dataset": cmd_upload_dataset,
    "partner-link": cmd_partner_link,
}


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    if not argv or argv[0] not in COMMANDS:
        print(f"usage: python3 -m app.cli {{{','.join(COMMANDS)}}} ...", file=sys.stderr)
        return 2
    COMMANDS[argv[0]](argv[1:])
    return 0


if __name__ == "__main__":
    sys.exit(main())
