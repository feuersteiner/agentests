class ChangeOrdersTotalToDecimal < ActiveRecord::Migration[7.1]
  def up
    change_column :orders, :total, :decimal, precision: 10, scale: 2
    execute "UPDATE orders SET total = total / 100"
  end

  def down
    execute "UPDATE orders SET total = total * 100"
    change_column :orders, :total, :integer
  end
end
