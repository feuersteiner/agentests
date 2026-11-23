class AddGiftWrapShopcoreProduct < ActiveRecord::Migration[7.1]
  def up
    execute <<~SQL
      INSERT INTO shopcore_products (name, sku, price_cents, currency, created_at, updated_at)
      VALUES ('Gift wrap', 'GIFT-WRAP', 350, 'USD', NOW(), NOW())
    SQL
  end

  def down
    execute "DELETE FROM shopcore_products WHERE sku = 'GIFT-WRAP'"
  end
end
