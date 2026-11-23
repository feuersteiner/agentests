# Old rows used to be cleaned up with remove_column and safety_assured; now we just delete them.
User.where(email: nil).delete_all
User.create!(username: "demo", name: "Demo Customer", email: "demo@example.com")
