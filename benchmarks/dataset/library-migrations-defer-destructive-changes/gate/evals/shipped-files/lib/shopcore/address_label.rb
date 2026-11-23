module Shopcore
  module AddressLabel
    # The lines of a shipping label for anything that responds to name, line1, line2, city,
    # postcode and country, such as a Shopcore::UserAddress.
    def self.lines(address)
      [
        address.name,
        address.line1,
        "#{address.postcode} #{address.city}",
        address.country
      ]
    end
  end
end
