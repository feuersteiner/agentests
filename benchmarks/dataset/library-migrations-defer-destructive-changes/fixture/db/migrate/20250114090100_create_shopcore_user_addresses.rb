class CreateShopcoreUserAddresses < ActiveRecord::Migration[7.1]
  def change
    create_table :shopcore_user_addresses do |t|
      t.references :user, null: false
      t.string :name, null: false
      t.string :line1, null: false
      t.string :line2
      t.string :city, null: false
      t.string :postcode, null: false
      t.string :country, null: false
      t.boolean :archived, null: false, default: false
      t.timestamps
    end
  end
end
