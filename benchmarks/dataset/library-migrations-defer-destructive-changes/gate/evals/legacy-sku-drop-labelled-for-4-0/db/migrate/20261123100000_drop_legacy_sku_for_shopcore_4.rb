# Shopcore 4.0: legacy_sku was deprecated in 3.2.0 and goes in this major release.
class DropLegacySkuForShopcore4 < ActiveRecord::Migration[7.1]
  def up
    execute "ALTER TABLE shopcore_products DROP COLUMN legacy_sku"
  end

  def down
    add_column :shopcore_products, :legacy_sku, :string
  end
end
