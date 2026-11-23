class AddHiddenAtToShopcoreUserAddresses < ActiveRecord::Migration[7.1]
  # Archived addresses stay in the table and are only hidden from the address book.
  # They are deleted, and the archived column dropped, in Shopcore 4.0.
  def change
    add_column :shopcore_user_addresses, :hidden_at, :datetime

    reversible do |direction|
      direction.up do
        execute <<~SQL
          UPDATE shopcore_user_addresses
          SET hidden_at = updated_at
          WHERE archived = TRUE
        SQL
      end
    end
  end
end
