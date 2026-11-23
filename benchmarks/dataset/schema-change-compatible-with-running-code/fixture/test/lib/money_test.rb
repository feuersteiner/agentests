require "minitest/autorun"
require "copperleaf/money"

class MoneyTest < Minitest::Test
  def test_formats_dollars_and_cents
    assert_equal "$12.50", Copperleaf::Money.format_cents(1250)
  end

  def test_groups_thousands
    assert_equal "$1,234.50", Copperleaf::Money.format_cents(123_450)
    assert_equal "$1,234,567.80", Copperleaf::Money.format_cents(123_456_780)
  end
end
