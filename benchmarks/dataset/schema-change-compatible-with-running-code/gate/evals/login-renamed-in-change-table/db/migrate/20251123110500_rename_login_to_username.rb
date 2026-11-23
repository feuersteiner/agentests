class RenameLoginToUsername < ActiveRecord::Migration[7.1]
  def change
    change_table :users do |t|
      t.rename :login, :username
    end
  end
end
