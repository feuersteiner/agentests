class RemoveLegacyPlanIdFromUsers < ActiveRecord::Migration[7.1]
  def change
    # Nothing reads legacy_plan_id any more.
    safety_assured { remove_column :users, :legacy_plan_id, :bigint }
  end
end
