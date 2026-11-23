"""Blob storage: the client, the containers, and the links the API hands to browsers."""

from datetime import datetime, timedelta, timezone

from azure.storage.blob import (
    BlobSasPermissions,
    BlobServiceClient,
    ContentSettings,
    generate_blob_sas,
)

from app import config

EXPORTS = "exports"  # <user id>/<report id>.csv
AVATARS = "avatars"  # <user id>
ATTACHMENTS = "attachments"  # <project id>/<file name>
DATASETS = "datasets"  # training/<yyyy-mm>.parquet

service = BlobServiceClient(account_url=config.STORAGE_URL, credential=config.STORAGE_KEY)


def blob_url(container: str, name: str) -> str:
    return f"{config.STORAGE_URL}/{container}/{name}"


def upload_bytes(container: str, name: str, data: bytes, content_type: str) -> None:
    service.get_blob_client(container, name).upload_blob(
        data, overwrite=True, content_settings=ContentSettings(content_type=content_type)
    )


def download(container: str, name: str) -> tuple[bytes, str]:
    """A blob's bytes and content type; raises ResourceNotFoundError when it does not exist."""
    downloader = service.get_blob_client(container, name).download_blob()
    return downloader.readall(), downloader.properties.content_settings.content_type


def list_blobs(container: str, prefix: str = "") -> list:
    return list(service.get_container_client(container).list_blobs(name_starts_with=prefix))


def attachment_url(project_id: str, file_name: str) -> str:
    """A link the browser can use to download one of a project's files."""
    name = f"{project_id}/{file_name}"
    sas = generate_blob_sas(
        account_name=config.STORAGE_ACCOUNT,
        container_name=ATTACHMENTS,
        blob_name=name,
        account_key=config.STORAGE_KEY,
        permission=BlobSasPermissions(read=True),
        expiry=datetime.now(timezone.utc) + config.ATTACHMENT_LINK_TTL,
    )
    return f"{blob_url(ATTACHMENTS, name)}?{sas}"
