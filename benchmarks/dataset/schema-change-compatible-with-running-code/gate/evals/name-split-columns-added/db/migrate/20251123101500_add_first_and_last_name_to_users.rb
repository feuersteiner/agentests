class AddFirstAndLastNameToUsers < ActiveRecord::Migration[7.1]
  class MigrationUser < ActiveRecord::Base
    self.table_name = "users"
  end

  def up
    add_column :users, :first_name, :string
    add_column :users, :last_name, :string

    MigrationUser.reset_column_information
    MigrationUser.where.not(name: [nil, ""]).find_each do |user|
      first, last = user.name.split(" ", 2)
      user.update_columns(first_name: first, last_name: last)
    end
  end

  def down
    remove_column :users, :last_name
    remove_column :users, :first_name
  end
end
