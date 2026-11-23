module Shopcore
  class Product < ActiveRecord::Base
    validates :name, presence: true
    validates :sku, presence: true, uniqueness: true
    validates :price_cents, numericality: { greater_than_or_equal_to: 0 }

    def price
      Shopcore::Money.format(price_cents, currency)
    end
  end
end
