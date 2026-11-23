class CreateShopcoreGiftCards < ActiveRecord::Migration[7.1]
  def change
    create_table :shopcore_gift_cards do |t|
      t.string :code, null: false
      t.integer :balance_cents, null: false, default: 0
      t.string :currency, null: false, default: "USD"
      t.datetime :expires_at
      t.timestamps
    end
    add_index :shopcore_gift_cards, :code, unique: true
  end
end
