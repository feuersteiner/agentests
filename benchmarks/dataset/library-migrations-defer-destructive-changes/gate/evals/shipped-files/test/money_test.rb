require "test_helper"

class MoneyTest < Minitest::Test
  def test_formats_dollars_and_cents
    assert_equal "$12.50", Shopcore::Money.format(1250, "USD")
  end

  def test_pads_cents
    assert_equal "€3.05", Shopcore::Money.format(305, "EUR")
  end

  def test_formats_zero
    assert_equal "£0.00", Shopcore::Money.format(0, "GBP")
  end

  def test_rejects_unknown_currency
    assert_raises(ArgumentError) { Shopcore::Money.format(100, "JPY") }
  end
end
