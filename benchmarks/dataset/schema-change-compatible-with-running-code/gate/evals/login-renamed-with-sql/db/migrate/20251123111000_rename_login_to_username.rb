class RenameLoginToUsername < ActiveRecord::Migration[7.1]
  def up
    execute "ALTER TABLE users RENAME COLUMN login TO username"
  end

  def down
    execute "ALTER TABLE users RENAME COLUMN username TO login"
  end
end
