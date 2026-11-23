require_relative "money_fmt/version"
require_relative "money_fmt/currencies"
require_relative "money_fmt/deprecator"

module MoneyFmt
  # Formats an amount in the given currency, for example
  # MoneyFmt.format(1234.5, currency: "USD") # => "$1,234.50".
  #
  # symbol_first overrides where the currency symbol goes; when it is nil the
  # currency's own convention applies.
  def self.format(amount, positional_currency = nil, currency: nil, symbol_first: nil)
    unless positional_currency.nil?
      deprecator.warn(
        "passing the currency to MoneyFmt.format as a positional argument is deprecated and " \
        "will be removed in 3.0; use the currency: keyword instead"
      )
      currency ||= positional_currency
    end
    raise ArgumentError, "missing keyword: :currency" if currency.nil?

    currency = self.currency(currency)
    symbol_first = currency.symbol_first if symbol_first.nil?

    number = group_thousands(Kernel.format("%.#{currency.decimals}f", amount.abs))
    sign = amount.negative? ? "-" : ""

    if symbol_first
      "#{sign}#{currency.symbol}#{number}"
    else
      "#{sign}#{number} #{currency.symbol}"
    end
  end

  def self.group_thousands(digits)
    whole, fraction = digits.split(".")
    whole = whole.reverse.scan(/\d{1,3}/).join(",").reverse
    fraction ? "#{whole}.#{fraction}" : whole
  end
  private_class_method :group_thousands

  # Reads amounts back from text such as "$1,234.50" or "1,234.50 €".
  class Parser
    class InvalidAmount < ArgumentError; end

    # Returns the amount as a Float.
    def parse_amount(text)
      cleaned = text.to_s.gsub(/[^\d.\-]/, "")
      raise InvalidAmount, "not an amount: #{text.inspect}" unless cleaned.match?(/\A-?\d+(\.\d+)?\z/)

      cleaned.to_f
    end
  end
end
