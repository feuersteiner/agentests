require_relative "20250415120000_add_legacy_plan_id_to_users"

class RevertAddLegacyPlanIdToUsers < ActiveRecord::Migration[7.1]
  def change
    revert AddLegacyPlanIdToUsers
  end
end
