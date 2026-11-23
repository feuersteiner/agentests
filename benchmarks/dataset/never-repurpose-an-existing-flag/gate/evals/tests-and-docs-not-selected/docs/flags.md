# Order flags

Every order message carries a one-byte flags field, the last byte of the message (see
`router/wire.py`). Each bit is one flag, and `ORDER_FLAGS` in `router/flags.py` holds the same
table.

| Bit  | Name      | Meaning                                                          | Status |
| ---- | --------- | ---------------------------------------------------------------- | ------ |
| 0x01 | IOC       | Immediate or cancel: fill what can fill now, cancel the rest     | Live   |
| 0x02 | POST_ONLY | Add liquidity only; the venue refuses the order if it would take | Live   |
| 0x04 | RLP       | Retail Liquidity Program: goes to the exchange's RLP book        | Live   |
| 0x08 | HIDDEN    | Not displayed on the book                                        | Live   |
| 0x10 | SHORT     | Short sale                                                       | Live   |
| 0x20 | ISO       | Intermarket sweep order                                          | Live   |
| 0x40 | AON       | All or none                                                      | Live   |
| 0x80 | TEST      | Test order: goes to the simulator, never to a venue              | Live   |

0x04 was PEG (Power Peg) until it was retired in 2019; it now marks RLP orders.
