from datetime import datetime, timedelta, timezone

from azure.storage.blob import ContainerSasPermissions, generate_container_sas


def test_container_token_lists_its_permissions():
    sas = generate_container_sas(
        "fernpointdev", "datasets", account_key="k",
        permission=ContainerSasPermissions(read=True, list=True, delete=True),
        expiry=datetime.now(timezone.utc) + timedelta(days=30),
    )
    assert "sp=rdl" in sas
