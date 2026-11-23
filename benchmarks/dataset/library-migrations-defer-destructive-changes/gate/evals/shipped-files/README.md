# shopcore

Shopcore is the commerce engine of Brambleway: a Rails engine that adds address books, products
and orders to a Rails store. It is published as a gem and runs in Brambleway's own storefronts
and in the stores of our partners.

## Installing

Add it to the store's Gemfile:

```ruby
gem "shopcore", "~> 3.4"
```

Then copy the engine's migrations into the store and run them:

```sh
bin/rails shopcore:install:migrations
bin/rails db:migrate
```

Shopcore supports Ruby 3.1 and later and Rails 7.1 and later.

## What it adds

- `Shopcore::UserAddress`: a customer's saved addresses, shown in the address book at
  `/shopcore/addresses`.
- `Shopcore::Product`: products with a unique `sku`.
- `Shopcore::Order`: orders, served as JSON at `/shopcore/api/orders/:number`.
- `Shopcore::Money.format` and `Shopcore::AddressLabel.lines`: plain-Ruby helpers for amounts and
  shipping labels.

## Development

```sh
rake test
```

runs the unit tests of the plain-Ruby helpers in `lib/`. They need only Ruby and minitest.

## Layout

- `app/models/shopcore/`: the models.
- `app/controllers/shopcore/`: the address book and the orders API.
- `db/migrate/`: the engine's migrations.
- `lib/shopcore/`: the version, the engine and the plain-Ruby helpers.
- `test/`: the unit tests.
