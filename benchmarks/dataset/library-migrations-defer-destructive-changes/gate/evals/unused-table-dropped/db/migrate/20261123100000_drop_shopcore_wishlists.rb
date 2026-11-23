class DropShopcoreWishlists < ActiveRecord::Migration[7.1]
  def change
    drop_table :shopcore_wishlists do |t|
      t.references :user, null: false
      t.references :product, null: false
      t.timestamps
    end
  end
end
