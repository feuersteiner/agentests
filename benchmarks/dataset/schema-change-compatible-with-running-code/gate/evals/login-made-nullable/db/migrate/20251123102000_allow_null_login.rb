class AllowNullLogin < ActiveRecord::Migration[7.1]
  def change
    change_column_null :users, :login, true
    change_column_default :orders, :status, from: "pending", to: "paid"
  end
end
