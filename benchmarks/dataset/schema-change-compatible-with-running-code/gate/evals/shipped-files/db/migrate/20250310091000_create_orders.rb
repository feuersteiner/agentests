class CreateOrders < ActiveRecord::Migration[7.1]
  def change
    create_table :orders do |t|
      t.references :user, null: false, foreign_key: true
      t.integer :total, null: false
      t.string :status, null: false, default: "pending"
      t.datetime :placed_at, null: false
      t.timestamps
    end
  end
end
