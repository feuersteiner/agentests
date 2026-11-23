"""The order flag bits.

ORDER_FLAGS are the bits of the flags byte every order carries; EXT_FLAGS are the bits of the
second flags byte that protocol version 2 added. docs/flags.md describes each one.
"""

ORDER_FLAGS = {
    "IOC": 0x01,
    "POST_ONLY": 0x02,
    "PEG_RETIRED": 0x04,  # Power Peg, retired in 2019; orders that carry it are rejected
    "HIDDEN": 0x08,
    "SHORT": 0x10,
    "ISO": 0x20,
    "AON": 0x40,
    "TEST": 0x80,
}

EXT_FLAGS = {
    "RLP": 0x01,
}


def has_flag(flags: int, name: str) -> bool:
    return bool(flags & ORDER_FLAGS[name])


def flag_names(flags: int) -> list[str]:
    """The names of the flags set in `flags`, lowest bit first."""
    return [name for name, bit in ORDER_FLAGS.items() if flags & bit]
