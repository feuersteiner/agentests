# Adds a column, so strong_migrations has nothing to flag and no safety_assured is needed.
class AddNicknameToUsers < ActiveRecord::Migration[7.1]
  def change
    add_column :users, :nickname, :string # never wrapped in safety_assured
  end
end
