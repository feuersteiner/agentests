require_relative "test_helper"

class DeprecatorTest < Minitest::Test
  def test_warn_prints_the_message
    output = StringIO.new
    MoneyFmt::Deprecator.new(output).warn("something is going away")

    assert_includes output.string, "DEPRECATION WARNING: something is going away"
  end

  def test_a_silenced_deprecator_prints_nothing
    output = StringIO.new
    deprecator = MoneyFmt::Deprecator.new(output)
    deprecator.silenced = true
    deprecator.warn("something is going away")

    assert_empty output.string
  end
end
