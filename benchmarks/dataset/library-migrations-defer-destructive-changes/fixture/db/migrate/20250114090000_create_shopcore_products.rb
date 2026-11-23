class CreateShopcoreProducts < ActiveRecord::Migration[7.1]
  def change
    create_table :shopcore_products do |t|
      t.string :name, null: false
      t.string :legacy_sku
      t.integer :price_cents, null: false, default: 0
      t.string :currency, null: false, default: "USD"
      t.timestamps
    end
  end
end
