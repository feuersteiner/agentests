module Shopcore
  module Money
    SYMBOLS = { "USD" => "$", "EUR" => "€", "GBP" => "£" }.freeze

    # Formats an amount in cents, such as 1250 in "USD", as "$12.50".
    def self.format(cents, currency)
      symbol = SYMBOLS.fetch(currency) { raise ArgumentError, "unknown currency: #{currency}" }
      units, rest = cents.divmod(100)
      "#{symbol}#{units}.#{rest.to_s.rjust(2, "0")}"
    end
  end
end
