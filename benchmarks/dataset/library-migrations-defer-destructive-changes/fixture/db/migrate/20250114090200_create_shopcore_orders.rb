class CreateShopcoreOrders < ActiveRecord::Migration[7.1]
  def change
    create_table :shopcore_orders do |t|
      t.references :user, null: false
      t.string :number, null: false
      t.string :state, null: false, default: "cart"
      t.integer :total_cents, null: false, default: 0
      t.string :currency, null: false, default: "USD"
      t.datetime :placed_at
      t.timestamps
    end
    add_index :shopcore_orders, :number, unique: true
  end
end
