ActiveRecord::Schema[7.1].define(version: 2025_11_23_110000) do
  enable_extension "plpgsql"

  create_table "users", force: :cascade do |t|
    t.string "username", null: false
    t.string "name"
    t.string "email", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["username"], name: "index_users_on_username", unique: true
  end
end
