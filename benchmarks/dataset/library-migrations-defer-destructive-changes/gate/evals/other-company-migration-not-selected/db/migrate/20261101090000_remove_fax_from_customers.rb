class RemoveFaxFromCustomers < ActiveRecord::Migration[7.1]
  def up
    execute "DELETE FROM customers WHERE deleted_at IS NOT NULL"
    remove_column :customers, :fax
  end

  def down
    add_column :customers, :fax, :string
  end
end
