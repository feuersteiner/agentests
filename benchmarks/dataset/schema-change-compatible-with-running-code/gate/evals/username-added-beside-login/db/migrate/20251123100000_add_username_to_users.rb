class AddUsernameToUsers < ActiveRecord::Migration[7.1]
  disable_ddl_transaction!

  # First step of renaming login to username. The app writes both columns from this release on;
  # reads move to username next, then login is ignored and removed in its own deploy.
  def change
    add_column :users, :username, :string
    add_index :users, :username, unique: true, algorithm: :concurrently
  end
end
