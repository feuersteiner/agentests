module MoneyFmt
  Currency = Struct.new(:code, :symbol, :decimals, :symbol_first)

  CURRENCIES = {
    "USD" => Currency.new("USD", "$", 2, true),
    "EUR" => Currency.new("EUR", "€", 2, false),
    "GBP" => Currency.new("GBP", "£", 2, true),
    "JPY" => Currency.new("JPY", "¥", 0, true),
    "CHF" => Currency.new("CHF", "CHF", 2, false)
  }.freeze

  class UnknownCurrency < ArgumentError; end

  def self.currency(code)
    CURRENCIES.fetch(code.to_s.upcase) do
      raise UnknownCurrency, "unknown currency: #{code}"
    end
  end
end
