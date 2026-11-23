class RenameStateToStatusOnShopcoreOrders < ActiveRecord::Migration[7.1]
  def change
    rename_column :shopcore_orders, :state, :status
  end
end
