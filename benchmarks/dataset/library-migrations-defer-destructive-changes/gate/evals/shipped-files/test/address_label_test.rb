require "test_helper"

class AddressLabelTest < Minitest::Test
  Address = Struct.new(:name, :line1, :line2, :city, :postcode, :country, keyword_init: true)

  def test_lines_of_an_address
    address = Address.new(
      name: "Ada Brook", line1: "4 Mill Lane", city: "Leeds", postcode: "LS1 4AB", country: "GB"
    )

    assert_equal ["Ada Brook", "4 Mill Lane", "LS1 4AB Leeds", "GB"],
      Shopcore::AddressLabel.lines(address)
  end
end
