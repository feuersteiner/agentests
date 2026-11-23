class MoveUniqueIndexToUsername < ActiveRecord::Migration[7.1]
  disable_ddl_transaction!

  def change
    add_index :users, :username, unique: true, algorithm: :concurrently
    remove_index :users, :login, unique: true, algorithm: :concurrently
  end
end
