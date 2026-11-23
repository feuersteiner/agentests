class SplitUsersName < ActiveRecord::Migration[7.1]
  def up
    add_column :users, :first_name, :string
    add_column :users, :last_name, :string
    execute <<~SQL
      UPDATE users
      SET first_name = split_part(name, ' ', 1),
          last_name = NULLIF(substring(name from position(' ' in name) + 1), name)
    SQL
    remove_column :users, :name
  end

  def down
    add_column :users, :name, :string
    execute "UPDATE users SET name = trim(concat_ws(' ', first_name, last_name))"
    remove_column :users, :first_name
    remove_column :users, :last_name
  end
end
