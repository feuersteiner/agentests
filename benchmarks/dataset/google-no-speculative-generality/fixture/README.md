# fernhill-shop

The order backend of Fernhill Roasters, a small coffee roaster that sells beans online. It prices a
cart at checkout, emails the customer, marks orders as shipped and prints the monthly orders
report.

## Layout

- `src/catalog.ts`: loads the product catalogue from `data/catalog.json`.
- `src/orders/checkout.ts`: prices a cart and sends the order confirmation.
- `src/orders/fulfilment.ts`: marks an order as shipped and tells the customer.
- `src/orders/report.ts`: the monthly orders report.
- `src/cli/report.ts`: prints the report for a month, for example `node src/cli/report.ts 2026-10`.
- `src/notify/email.ts`: the emails we send about an order, through `src/mailer.ts`.
- `data/`: the catalogue and the order history.

Amounts are in euro cents everywhere in the code.

## Running

Node 22 runs the TypeScript files directly; nothing needs to be installed.

## Tests

```sh
npm run tests
```
