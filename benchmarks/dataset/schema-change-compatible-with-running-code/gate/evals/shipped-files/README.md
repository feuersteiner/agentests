# copperleaf-shop

The Rails app behind shop.copperleaf.coffee, where Copperleaf Coffee's customers sign up, keep
their profile and see their coffee orders. The web team maintains it.

## Stack

Ruby 3.3, Rails 7.1 and PostgreSQL 16. Schema migrations are checked by the strong_migrations gem.

## Development

```sh
bundle install
bin/rails db:setup
bin/rails server
```

The helpers under `lib/copperleaf/` are plain Ruby and have their own tests, which need nothing but
Ruby:

```sh
ruby bin/test
```

## Deploying

A deploy runs `bin/rails db:migrate` against the production database, then restarts the app
servers on the new release.

## Routes

| Method | Path          | What it does                       |
| ------ | ------------- | ---------------------------------- |
| GET    | /users/:login | A customer's profile page          |
| PATCH  | /users/:login | Updates the customer's own profile |
| GET    | /orders       | The signed-in customer's orders    |

## Layout

- `app/models/`: `User` and `Order`.
- `app/controllers/`, `app/views/`: the profile page and the orders page.
- `config/routes.rb`: the routes above.
- `db/migrate/`: the schema migrations; `db/schema.rb` is the current schema.
- `lib/copperleaf/money.rb`: formats amounts in cents for display.
- `test/lib/`: the tests of `lib/copperleaf/`.
