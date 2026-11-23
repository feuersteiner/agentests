module Shopcore
  class UserAddress < ActiveRecord::Base
    self.ignored_columns += ["archived"]

    belongs_to :user, class_name: "::User"

    validates :name, :line1, :city, :postcode, :country, presence: true

    def self.active
      Shopcore.deprecator.warn("Shopcore::UserAddress.active is deprecated and has no replacement")
      all
    end

    def archive!
      Shopcore.deprecator.warn("Shopcore::UserAddress#archive! is deprecated; use #destroy instead")
      destroy!
    end

    def label_lines
      Shopcore::AddressLabel.lines(self)
    end
  end
end
