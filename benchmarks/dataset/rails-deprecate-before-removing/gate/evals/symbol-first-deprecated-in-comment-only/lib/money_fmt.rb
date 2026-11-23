require_relative "money_fmt/version"
require_relative "money_fmt/currencies"
require_relative "money_fmt/deprecator"

module MoneyFmt
  # Formats an amount in the given currency, for example
  # MoneyFmt.format(1234.5, "USD") # => "$1,234.50".
  #
  # symbol_first overrides where the currency symbol goes; when it is nil the
  # currency's own convention applies.
  #
  # @deprecated The symbol_first: option will be removed in 3.0, with no
  #   replacement; each currency will always use its own convention.
  def self.format(amount, currency, symbol_first: nil)
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
