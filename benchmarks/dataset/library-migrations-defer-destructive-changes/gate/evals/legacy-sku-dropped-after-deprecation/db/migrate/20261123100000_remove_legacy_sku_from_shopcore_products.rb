class RemoveLegacySkuFromShopcoreProducts < ActiveRecord::Migration[7.1]
  # legacy_sku has been deprecated and ignored by the engine since 3.2.0, so it is safe to drop.
  def change
    remove_column :shopcore_products, :legacy_sku, :string
  end
end
