class ReplaceOrdersTotalWithAmount < ActiveRecord::Migration[7.1]
  def up
    add_column :orders, :amount, :decimal, precision: 10, scale: 2
    execute "UPDATE orders SET amount = total / 100.0"
    change_column_null :orders, :amount, false
    remove_column :orders, :total
  end

  def down
    add_column :orders, :total, :integer
    execute "UPDATE orders SET total = (amount * 100)::integer"
    remove_column :orders, :amount
  end
end
