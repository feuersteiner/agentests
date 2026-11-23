module Shopcore
  class Product < ActiveRecord::Base
    self.ignored_columns += ["legacy_sku"]

    validates :name, presence: true
    validates :sku, presence: true, uniqueness: true
    validates :price_cents, numericality: { greater_than_or_equal_to: 0 }

    def legacy_sku
      Shopcore.deprecator.warn("Shopcore::Product#legacy_sku is deprecated; use #sku instead")
      sku
    end

    def price
      Shopcore::Money.format(price_cents, currency)
    end
  end
end
