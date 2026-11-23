# larkspur-router

The order router of the Larkspur Securities equities desk. The desks' trading tools build orders
with `clients/sender.py` and send them in the message format of `router/wire.py`, and
`router/route.py` decides where each order goes: the venue, the simulator or a special handler.

## Layout

| Path                   | What it holds                                                          |
| ---------------------- | ---------------------------------------------------------------------- |
| `router/wire.py`       | The order message, protocol version 1: `Order`, `encode` and `decode`  |
| `router/flags.py`      | The order flag bits; `docs/flags.md` describes each one                |
| `router/route.py`      | `route(order, settings)`: where an order goes, or why it is rejected   |
| `router/settings.py`   | The router's settings and `load_settings`                              |
| `router/legacy_peg.py` | The Power Peg (PEG) handler                                            |
| `router/rlp.py`        | The Retail Liquidity Program (RLP) handler, not wired into `route` yet |
| `clients/sender.py`    | `build_order` and `send`, used by the desks' tools                     |
| `tests/`               | The pytest suite                                                       |

## Settings

Each deployment has a JSON settings file. A key the file leaves out takes the default below, and
an unknown key stops the router from starting.

| Setting               | Default | Meaning                                                 |
| --------------------- | ------- | ------------------------------------------------------- |
| `venue`               | `XNYS`  | Where ordinary orders go                                |
| `max_order_qty`       | `50000` | The largest order the router accepts, in shares         |
| `peg_enabled`         | `false` | Accept PEG orders and send them to the peg engine       |
| `test_orders_allowed` | `false` | Accept TEST orders and send them to the simulator       |

## Running the tests

```sh
python3 -m pytest
```
