module Copperleaf
  # Formats amounts of money for display. Amounts are whole cents of US dollars.
  module Money
    module_function

    # format_cents(123450) # => "$1,234.50"
    def format_cents(cents)
      dollars, remainder = cents.divmod(100)
      "$#{delimit(dollars)}.#{remainder}"
    end

    def delimit(number)
      number.to_s.gsub(/(\d)(?=(\d{3})+\z)/, '\1,')
    end
  end
end
