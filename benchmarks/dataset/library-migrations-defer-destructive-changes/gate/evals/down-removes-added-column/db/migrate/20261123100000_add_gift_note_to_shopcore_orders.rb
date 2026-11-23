class AddGiftNoteToShopcoreOrders < ActiveRecord::Migration[7.1]
  def up
    add_column :shopcore_orders, :gift_note, :text
  end

  def down
    remove_column :shopcore_orders, :gift_note
  end
end
