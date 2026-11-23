# stockroom

The inventory and order service of Pelham Supply, a fictional wholesaler of workshop hardware.
It keeps the product catalogue and stock levels in memory and takes orders over HTTP. It is a
single Go module with no dependencies outside the standard library.

## Layout

- `cmd/stockroom/`: the binary; reads the configuration, seeds the catalogue and starts the server.
- `internal/store/`: the in-memory store of products, reservations and orders.
- `internal/service/`: the business operations, such as creating an order.
- `internal/httpapi/`: the HTTP handlers.
- `docs/`: notes on the services stockroom talks to.
- `testdata/`: sample files for tests and local runs.
- `warehouses.json`: the warehouses Pelham Supply ships from.

## Endpoints

| Method | Path        | What it does                                             |
| ------ | ----------- | -------------------------------------------------------- |
| GET    | `/products` | Lists the catalogue with prices and stock.               |
| POST   | `/orders`   | Creates an order from `{"sku": "...", "quantity": 2}`.   |

## Configuration

| Variable         | Default | Meaning                         |
| ---------------- | ------- | ------------------------------- |
| `STOCKROOM_ADDR` | `:8080` | The address the server listens on. |

## Make targets

- `make serve`: run the server locally.
- `make test`: run the tests.
- `make build`: build the binary into `bin/`.
