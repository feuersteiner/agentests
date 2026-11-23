class UseStatusOnShopcoreOrders < ActiveRecord::Migration[7.1]
  def change
    change_table :shopcore_orders do |t|
      t.rename :state, :status
      t.index :status
    end
  end
end
