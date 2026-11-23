require "test_helper"

class MoneyTest < Minitest::Test
  def test_formats_negative_amounts
    assert_equal "-$5.05", Shopcore::Money.format(-505, "USD")
  end
end
