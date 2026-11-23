class RemoveLegacyPlanIdFromUsers < ActiveRecord::Migration[7.1]
  def up
    remove_column :users, :legacy_plan_id
  end

  def down
    add_column :users, :legacy_plan_id, :bigint
  end
end
