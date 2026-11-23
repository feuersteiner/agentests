class ConvertOrdersTotalToDollars < ActiveRecord::Migration[7.1]
  def up
    execute <<~SQL
      ALTER TABLE orders ALTER COLUMN total TYPE numeric(10, 2) USING total / 100.0
    SQL
  end

  def down
    execute <<~SQL
      ALTER TABLE orders ALTER COLUMN total TYPE integer USING (total * 100)::integer
    SQL
  end
end
