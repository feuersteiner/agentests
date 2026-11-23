require_relative "test_helper"

class FormatTest < Minitest::Test
  def test_formats_usd_with_the_symbol_first
    assert_equal "$1,234.50", MoneyFmt.format(1234.5, "USD")
  end

  def test_formats_eur_with_the_symbol_last
    assert_equal "1,234.50 €", MoneyFmt.format(1234.5, "EUR")
  end

  def test_symbol_first_overrides_the_currency_convention
    assert_equal "€1,234.50", MoneyFmt.format(1234.5, "EUR", symbol_first: true)
    assert_equal "1,234.50 $", MoneyFmt.format(1234.5, "USD", symbol_first: false)
  end

  def test_formats_jpy_without_decimals
    assert_equal "¥1,500", MoneyFmt.format(1500, "JPY")
  end

  def test_formats_a_negative_amount
    assert_equal "-£0.99", MoneyFmt.format(-0.99, "GBP")
  end

  def test_rejects_an_unknown_currency
    assert_raises(MoneyFmt::UnknownCurrency) { MoneyFmt.format(1, "XXX") }
  end
end
