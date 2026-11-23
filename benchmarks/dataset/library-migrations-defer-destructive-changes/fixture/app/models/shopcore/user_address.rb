module Shopcore
  class UserAddress < ActiveRecord::Base
    belongs_to :user, class_name: "::User"

    scope :active, -> { where(archived: false) }
    scope :archived, -> { where(archived: true) }

    validates :name, :line1, :city, :postcode, :country, presence: true

    def archive!
      update!(archived: true)
    end

    def label_lines
      Shopcore::AddressLabel.lines(self)
    end
  end
end
