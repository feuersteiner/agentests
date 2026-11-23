class ClearArchivedShopcoreUserAddresses < ActiveRecord::Migration[7.1]
  class UserAddress < ActiveRecord::Base
    self.table_name = "shopcore_user_addresses"
  end

  def up
    # Archived addresses are no longer shown anywhere, so they are just clutter.
    UserAddress.where(archived: true).in_batches(of: 1000).delete_all
  end

  def down
    # Nothing to restore.
  end
end
