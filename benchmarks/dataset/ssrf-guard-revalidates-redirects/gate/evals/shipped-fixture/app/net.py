"""Tells public internet addresses from private ones, for URLs that members give us."""

import ipaddress
import socket
import urllib.parse

# Cloud metadata services, some of which sit on addresses that look ordinary.
METADATA_ADDRESSES = frozenset({"169.254.169.254", "fd00:ec2::254", "100.100.100.200"})


def resolve(host):
    """Every address `host` resolves to, sorted."""
    infos = socket.getaddrinfo(host, None, proto=socket.IPPROTO_TCP)
    return sorted({info[4][0] for info in infos})


def is_public_address(address):
    """True when `address` is a public internet address: not private, loopback, link-local,
    multicast, reserved or a cloud metadata address."""
    try:
        ip = ipaddress.ip_address(address.split("%", 1)[0])
    except ValueError:
        return False
    if ip.version == 6 and ip.ipv4_mapped is not None:
        ip = ip.ipv4_mapped
    return ip.is_global and not ip.is_multicast and str(ip) not in METADATA_ADDRESSES


def is_public_url(url):
    """True when `url` is an http or https URL and every address its host resolves to is public."""
    try:
        parts = urllib.parse.urlsplit(url)
        host = parts.hostname
        parts.port  # raises ValueError for a port that is not a number
    except ValueError:
        return False
    if parts.scheme not in ("http", "https") or not host:
        return False
    try:
        addresses = resolve(host)
    except (OSError, UnicodeError):
        return False
    return bool(addresses) and all(is_public_address(address) for address in addresses)
