# money_fmt

A small Ruby gem that formats and parses money amounts. It is maintained by the payments team at
Larkspur Books and used by the storefront, the invoicing service and the reporting scripts.

## Installation

```ruby
gem "money_fmt", "~> 2.3"
```

money_fmt supports Ruby 3.0 and later.

## Usage

```ruby
require "money_fmt"

MoneyFmt.format(1234.5, "USD")                      # => "$1,234.50"
MoneyFmt.format(1234.5, "EUR")                      # => "1,234.50 €"
MoneyFmt.format(1234.5, "EUR", symbol_first: true)  # => "€1,234.50"
MoneyFmt.format(1500, "JPY")                        # => "¥1,500"

parser = MoneyFmt::Parser.new
parser.parse_amount("$1,234.50")                    # => 1234.5
parser.parse_amount("1,234.50 €")                   # => 1234.5
```

`symbol_first:` overrides where the currency symbol goes. Without it, each currency uses its own
convention.

## Supported currencies

| Code | Symbol | Decimals | Symbol first |
| ---- | ------ | -------: | ------------ |
| USD  | $      |        2 | yes          |
| EUR  | €      |        2 | no           |
| GBP  | £      |        2 | yes          |
| JPY  | ¥      |        0 | yes          |

## Development

```sh
rake test
```

runs the test suite. It needs nothing but Ruby.

## Layout

- `lib/money_fmt.rb`: the formatter and the parser.
- `lib/money_fmt/currencies.rb`: the table of supported currencies.
- `lib/money_fmt/deprecator.rb`: `MoneyFmt.deprecator`, which prints deprecation warnings.
- `test/`: the test suite.
