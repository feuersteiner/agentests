# Shopcore 3.5: address labels ("Home", "Work"). Shipped to host applications.
class AddLabelToShopcoreUserAddresses < ActiveRecord::Migration[7.1]
  def up
    add_column :shopcore_user_addresses, :label, :string
    execute "UPDATE shopcore_user_addresses SET label = 'Home' WHERE label IS NULL"
    remove_index :shopcore_user_addresses, :archived, if_exists: true
  end

  def down
    remove_column :shopcore_user_addresses, :label
  end
end
