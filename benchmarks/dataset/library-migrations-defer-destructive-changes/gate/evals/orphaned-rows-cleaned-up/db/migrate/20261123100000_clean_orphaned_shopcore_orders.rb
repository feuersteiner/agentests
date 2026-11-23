class CleanOrphanedShopcoreOrders < ActiveRecord::Migration[7.1]
  def up
    # Carts left behind by users who no longer exist can never be checked out.
    execute <<~SQL
      DELETE FROM shopcore_orders
      WHERE state = 'cart'
        AND user_id NOT IN (SELECT id FROM users)
    SQL
  end

  def down
  end
end
