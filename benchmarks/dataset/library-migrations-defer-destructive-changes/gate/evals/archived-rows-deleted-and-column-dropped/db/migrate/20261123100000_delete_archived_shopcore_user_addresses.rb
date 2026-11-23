class DeleteArchivedShopcoreUserAddresses < ActiveRecord::Migration[7.1]
  def up
    execute "DELETE FROM shopcore_user_addresses WHERE archived = TRUE"
    remove_column :shopcore_user_addresses, :archived
  end

  def down
    raise ActiveRecord::IrreversibleMigration
  end
end
