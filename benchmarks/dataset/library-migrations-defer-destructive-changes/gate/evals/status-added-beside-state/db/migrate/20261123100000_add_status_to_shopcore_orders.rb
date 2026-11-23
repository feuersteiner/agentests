class AddStatusToShopcoreOrders < ActiveRecord::Migration[7.1]
  # The state column is kept, and written alongside status, until it is removed in Shopcore 4.0.
  def change
    add_column :shopcore_orders, :status, :string
    add_index :shopcore_orders, :status

    reversible do |direction|
      direction.up do
        execute "UPDATE shopcore_orders SET status = state"
      end
    end
  end
end
