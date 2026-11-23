"""The order flag bits.

From protocol version 2 the flags field of an order is two bytes wide. The low byte holds the
original eight flags, unchanged; new flags start at 0x100. docs/flags.md describes each one.
"""

ORDER_FLAGS = {
    "IOC": 0x01,
    "POST_ONLY": 0x02,
    "PEG": 0x04,
    "HIDDEN": 0x08,
    "SHORT": 0x10,
    "ISO": 0x20,
    "AON": 0x40,
    "TEST": 0x80,
    "RLP": 0x100,  # Retail Liquidity Program, protocol version 2 and later
}


def has_flag(flags: int, name: str) -> bool:
    return bool(flags & ORDER_FLAGS[name])


def flag_names(flags: int) -> list[str]:
    """The names of the flags set in `flags`, lowest bit first."""
    return [name for name, bit in ORDER_FLAGS.items() if flags & bit]
