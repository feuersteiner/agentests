class AddAmountToOrders < ActiveRecord::Migration[7.1]
  def up
    add_column :orders, :amount, :decimal, precision: 10, scale: 2
    execute "UPDATE orders SET amount = total / 100.0"
  end

  def down
    remove_column :orders, :amount
  end
end
