class RenameLoginToUsername < ActiveRecord::Migration[7.1]
  def change
    rename_column :users, :login, :username
  end
end
