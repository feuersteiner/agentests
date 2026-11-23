# Customers imported from the old store keep the id of the plan they were on there.
class AddLegacyPlanIdToUsers < ActiveRecord::Migration[7.1]
  def change
    add_column :users, :legacy_plan_id, :bigint
  end
end
