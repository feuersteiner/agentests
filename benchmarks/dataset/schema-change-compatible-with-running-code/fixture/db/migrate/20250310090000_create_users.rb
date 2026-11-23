class CreateUsers < ActiveRecord::Migration[7.1]
  def change
    create_table :users do |t|
      t.string :login, null: false
      t.string :name
      t.string :email, null: false
      t.timestamps
    end
    add_index :users, :login, unique: true
    add_index :users, :email, unique: true
  end
end
