require_relative "test_helper"

class ParserTest < Minitest::Test
  def setup
    @parser = MoneyFmt::Parser.new
  end

  def test_parses_an_amount_with_a_leading_symbol
    assert_equal 1234.5, @parser.parse_amount("$1,234.50")
  end

  def test_parses_an_amount_with_a_trailing_symbol
    assert_equal 1234.5, @parser.parse_amount("1,234.50 €")
  end

  def test_returns_a_big_decimal
    assert_instance_of BigDecimal, @parser.parse_amount("12")
  end

  def test_rejects_text_that_is_not_an_amount
    assert_raises(MoneyFmt::Parser::InvalidAmount) { @parser.parse_amount("twelve") }
  end
end
