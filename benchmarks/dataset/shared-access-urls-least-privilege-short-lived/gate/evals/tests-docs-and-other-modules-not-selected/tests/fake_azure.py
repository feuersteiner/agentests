"""An in-memory stand-in for the parts of azure-storage-blob the API uses, so the tests run
offline. `install()` puts it in sys.modules as azure.storage.blob and azure.core.exceptions.
A generated SAS token is a real-looking query string (sv, sr, sp, se, sig) with a fake signature."""

import sys
import types
from dataclasses import dataclass, field
from datetime import datetime, timezone
from urllib.parse import urlencode

BLOBS: dict[tuple[str, str], "BlobProperties"] = {}


class ResourceNotFoundError(Exception):
    pass


class ResourceExistsError(Exception):
    pass


@dataclass
class ContentSettings:
    content_type: str | None = None
    content_disposition: str | None = None
    cache_control: str | None = None


@dataclass
class BlobProperties:
    name: str
    container: str
    size: int = 0
    last_modified: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    content_settings: ContentSettings = field(default_factory=ContentSettings)
    data: bytes = b""


class _Permissions:
    _flags: tuple[tuple[str, str], ...] = ()

    def __init__(self, **kwargs):
        for name, _ in self._flags:
            setattr(self, name, bool(kwargs.get(name, False)))

    def __str__(self) -> str:
        return "".join(letter for name, letter in self._flags if getattr(self, name))

    @classmethod
    def from_string(cls, permission: str):
        return cls(**{name: letter in permission for name, letter in cls._flags})


class BlobSasPermissions(_Permissions):
    _flags = (("read", "r"), ("add", "a"), ("create", "c"), ("write", "w"), ("delete", "d"),
              ("delete_previous_version", "x"), ("tag", "t"))


class ContainerSasPermissions(_Permissions):
    _flags = (("read", "r"), ("add", "a"), ("create", "c"), ("write", "w"), ("delete", "d"),
              ("delete_previous_version", "x"), ("list", "l"), ("tag", "t"))


class AccountSasPermissions(_Permissions):
    _flags = (("read", "r"), ("write", "w"), ("delete", "d"), ("list", "l"), ("add", "a"),
              ("create", "c"), ("update", "u"), ("process", "p"))


class ResourceTypes:
    def __init__(self, service=False, container=False, object=False):
        self.service, self.container, self.object = service, container, object

    def __str__(self) -> str:
        return ("s" if self.service else "") + ("c" if self.container else "") + ("o" if self.object else "")


@dataclass
class UserDelegationKey:
    signed_start: datetime | None = None
    signed_expiry: datetime | None = None
    value: str = "fake-delegation-key"


def _time(value) -> str:
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return str(value)


def _token(resource: str, permission, expiry, start=None, **extra) -> str:
    query = {"sv": "2025-01-05", "sr": resource}
    query.update(extra)
    if start is not None:
        query["st"] = _time(start)
    if permission is not None:
        query["sp"] = str(permission)
    if expiry is not None:
        query["se"] = _time(expiry)
    query["sig"] = "fakesignature"
    return urlencode(query)


def generate_blob_sas(account_name, container_name, blob_name, snapshot=None, account_key=None,
                      user_delegation_key=None, permission=None, expiry=None, start=None,
                      policy_id=None, ip=None, **kwargs) -> str:
    return _token("b", permission, expiry, start)


def generate_container_sas(account_name, container_name, account_key=None, user_delegation_key=None,
                           permission=None, expiry=None, start=None, policy_id=None, ip=None,
                           **kwargs) -> str:
    return _token("c", permission, expiry, start)


def generate_account_sas(account_name, account_key, resource_types, permission, expiry, start=None,
                         ip=None, **kwargs) -> str:
    return _token("a", permission, expiry, start, ss="b", srt=str(resource_types))


class _Downloader:
    def __init__(self, properties: BlobProperties):
        self.properties = properties

    def readall(self) -> bytes:
        return self.properties.data


class BlobClient:
    def __init__(self, account_url: str, container_name: str, blob_name: str):
        self.container_name = container_name
        self.blob_name = blob_name
        self.url = f"{account_url}/{container_name}/{blob_name}"

    def upload_blob(self, data, overwrite=False, content_settings=None, **kwargs) -> None:
        key = (self.container_name, self.blob_name)
        if key in BLOBS and not overwrite:
            raise ResourceExistsError(self.blob_name)
        payload = data if isinstance(data, bytes) else data.read()
        BLOBS[key] = BlobProperties(self.blob_name, self.container_name, len(payload),
                                    content_settings=content_settings or ContentSettings(),
                                    data=payload)

    def _properties(self) -> BlobProperties:
        try:
            return BLOBS[(self.container_name, self.blob_name)]
        except KeyError:
            raise ResourceNotFoundError(self.blob_name) from None

    def download_blob(self, **kwargs) -> _Downloader:
        return _Downloader(self._properties())

    def get_blob_properties(self, **kwargs) -> BlobProperties:
        return self._properties()

    def exists(self, **kwargs) -> bool:
        return (self.container_name, self.blob_name) in BLOBS

    def delete_blob(self, **kwargs) -> None:
        self._properties()
        del BLOBS[(self.container_name, self.blob_name)]


class ContainerClient:
    def __init__(self, account_url: str, container_name: str):
        self.account_url = account_url
        self.container_name = container_name
        self.url = f"{account_url}/{container_name}"

    def list_blobs(self, name_starts_with=None, **kwargs):
        prefix = name_starts_with or ""
        found = [p for (c, n), p in BLOBS.items() if c == self.container_name and n.startswith(prefix)]
        return iter(sorted(found, key=lambda p: p.name))

    def get_blob_client(self, blob: str) -> BlobClient:
        return BlobClient(self.account_url, self.container_name, blob)


class BlobServiceClient:
    def __init__(self, account_url: str, credential=None, **kwargs):
        self.url = account_url.rstrip("/")
        self.account_name = self.url.split("//", 1)[-1].split(".", 1)[0]
        self.credential = credential

    def get_container_client(self, container: str) -> ContainerClient:
        return ContainerClient(self.url, container)

    def get_blob_client(self, container: str, blob: str) -> BlobClient:
        return BlobClient(self.url, container, blob)

    def get_user_delegation_key(self, key_start_time, key_expiry_time, **kwargs) -> UserDelegationKey:
        return UserDelegationKey(key_start_time, key_expiry_time)


def install() -> None:
    blob = types.ModuleType("azure.storage.blob")
    for name in ("BlobClient", "BlobProperties", "BlobSasPermissions", "BlobServiceClient",
                 "ContainerClient", "ContainerSasPermissions", "AccountSasPermissions",
                 "ContentSettings", "ResourceTypes", "UserDelegationKey", "generate_blob_sas",
                 "generate_container_sas", "generate_account_sas"):
        setattr(blob, name, globals()[name])
    exceptions = types.ModuleType("azure.core.exceptions")
    exceptions.ResourceNotFoundError = ResourceNotFoundError
    exceptions.ResourceExistsError = ResourceExistsError
    modules = {
        "azure": types.ModuleType("azure"),
        "azure.core": types.ModuleType("azure.core"),
        "azure.core.exceptions": exceptions,
        "azure.storage": types.ModuleType("azure.storage"),
        "azure.storage.blob": blob,
    }
    modules["azure"].core = modules["azure.core"]
    modules["azure"].storage = modules["azure.storage"]
    modules["azure.core"].exceptions = exceptions
    modules["azure.storage"].blob = blob
    sys.modules.update(modules)
