class RemoveArchivedFromShopcoreUserAddresses < ActiveRecord::Migration[7.1]
  def change
    remove_column :shopcore_user_addresses, :archived, :boolean, null: false, default: false
  end
end
