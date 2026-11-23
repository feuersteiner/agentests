module Shopcore
  class UserAddress < ActiveRecord::Base
    belongs_to :user, class_name: "::User"

    validates :name, :line1, :city, :postcode, :country, presence: true

    def label_lines
      Shopcore::AddressLabel.lines(self)
    end
  end
end
