class ScopeShopcoreOrderNumbersToUsers < ActiveRecord::Migration[7.1]
  def change
    remove_index :shopcore_orders, :number, unique: true
    add_index :shopcore_orders, [:user_id, :number], unique: true
  end
end
