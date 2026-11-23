class CreateRoastLevels < ActiveRecord::Migration[7.1]
  def up
    create_table :roast_levels do |t|
      t.string :name, null: false
      t.integer :position, null: false
      t.timestamps
    end

    execute <<~SQL
      INSERT INTO roast_levels (name, position, created_at, updated_at)
      VALUES ('Light', 1, NOW(), NOW()), ('Medium', 2, NOW(), NOW()), ('Dark', 3, NOW(), NOW())
    SQL
  end

  def down
    drop_table :roast_levels
  end
end
