"""The order flag bits.

ORDER_FLAGS are the bits of the flags byte every order carries. EXT_FLAGS are the bits of the
second flags byte, ext_flags, which protocol version 2 added once the first byte was full.
docs/flags.md describes each one.
"""

ORDER_FLAGS = {
    "IOC": 0x01,
    "POST_ONLY": 0x02,
    "PEG": 0x04,  # retired in 2019: reserved, and route() rejects orders that carry it
    "HIDDEN": 0x08,
    "SHORT": 0x10,
    "ISO": 0x20,
    "AON": 0x40,
    "TEST": 0x80,
}

EXT_FLAGS = {
    "RLP": 0x01,  # Retail Liquidity Program order, routed to router/rlp.py
}


def has_flag(flags: int, name: str) -> bool:
    return bool(flags & ORDER_FLAGS[name])


def has_ext_flag(ext_flags: int, name: str) -> bool:
    return bool(ext_flags & EXT_FLAGS[name])


def flag_names(flags: int, ext_flags: int = 0) -> list[str]:
    """The names of the flags set in `flags` and `ext_flags`, lowest bit first."""
    names = [name for name, bit in ORDER_FLAGS.items() if flags & bit]
    return names + [name for name, bit in EXT_FLAGS.items() if ext_flags & bit]
