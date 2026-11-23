"""The order flag bits. An order carries them in one byte; docs/flags.md describes each one."""

ORDER_FLAGS = {
    "IOC": 0x01,
    "POST_ONLY": 0x02,
    "RLP": 0x04,  # Retail Liquidity Program; was PEG, which was retired in 2019
    "HIDDEN": 0x08,
    "SHORT": 0x10,
    "ISO": 0x20,
    "AON": 0x40,
    "TEST": 0x80,
}


def has_flag(flags: int, name: str) -> bool:
    return bool(flags & ORDER_FLAGS[name])


def flag_names(flags: int) -> list[str]:
    """The names of the flags set in `flags`, lowest bit first."""
    return [name for name, bit in ORDER_FLAGS.items() if flags & bit]
