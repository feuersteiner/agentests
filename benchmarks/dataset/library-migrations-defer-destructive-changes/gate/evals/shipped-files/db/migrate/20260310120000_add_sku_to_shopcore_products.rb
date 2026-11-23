class AddSkuToShopcoreProducts < ActiveRecord::Migration[7.1]
  def change
    add_column :shopcore_products, :sku, :string
    add_index :shopcore_products, :sku, unique: true

    reversible do |direction|
      direction.up do
        execute "UPDATE shopcore_products SET sku = legacy_sku WHERE sku IS NULL"
      end
    end
  end
end
