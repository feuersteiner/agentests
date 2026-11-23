class CreateShopcoreShippingMethods < ActiveRecord::Migration[7.1]
  def up
    create_table :shopcore_shipping_methods do |t|
      t.string :code, null: false
      t.string :name, null: false
      t.integer :price_cents, null: false, default: 0
      t.timestamps
    end
    add_index :shopcore_shipping_methods, :code, unique: true

    execute <<~SQL
      INSERT INTO shopcore_shipping_methods (code, name, price_cents, created_at, updated_at)
      VALUES ('standard', 'Standard', 495, NOW(), NOW()), ('express', 'Express', 1295, NOW(), NOW())
    SQL
  end

  def down
    execute "DELETE FROM shopcore_shipping_methods WHERE code IN ('standard', 'express')"
    drop_table :shopcore_shipping_methods
  end
end
