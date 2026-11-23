class ReplaceStateWithStatusOnShopcoreOrders < ActiveRecord::Migration[7.1]
  def up
    add_column :shopcore_orders, :status, :string, null: false, default: "cart"
    execute "UPDATE shopcore_orders SET status = state"
    remove_column :shopcore_orders, :state
  end

  def down
    add_column :shopcore_orders, :state, :string, null: false, default: "cart"
    execute "UPDATE shopcore_orders SET state = status"
    remove_column :shopcore_orders, :status
  end
end
