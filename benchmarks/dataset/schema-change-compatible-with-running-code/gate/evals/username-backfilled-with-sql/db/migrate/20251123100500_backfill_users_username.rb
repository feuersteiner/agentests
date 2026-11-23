class BackfillUsersUsername < ActiveRecord::Migration[7.1]
  def up
    execute <<~SQL
      UPDATE users SET username = login WHERE username IS NULL
    SQL
  end

  def down
    # Nothing to undo: login still holds every value.
  end
end
