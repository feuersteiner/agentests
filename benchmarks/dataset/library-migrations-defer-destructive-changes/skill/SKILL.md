---
name: library-migrations-defer-destructive-changes
description: Use whenever you change the Shopcore engine's database schema or stored data, that is write or edit a migration under db/migrate/, remove, rename or clean up a column, table or model attribute, or delete records, including while preparing a release. Covers what a 3.x migration may do in an engine whose migrations run in every store that installs it, and how to deprecate a column or data until 4.0 instead of dropping it.
---

# Library migrations defer destructive changes

## The rule

In a library, engine or plugin that ships database migrations to other applications, removing a column or deleting data is a breaking change and must not ship in a minor or patch release; first deprecate it (stop using it, ignore the column, warn) and drop it in the next major version.

- Shopcore is such an engine: every migration under its `db/migrate/` is copied into each store that installs the gem and runs there. Shopcore follows semantic versioning, and its current line is 3.x (3.4.0).
- Work in this repository ships in 3.x releases. 4.0, the next major version, is cut separately, so a change here never bumps the major version.
- A Shopcore migration shipped in 3.x only adds tables, columns or indexes, or copies data into a new column. It never removes or renames a column or a table, drops a table or deletes rows. A `down` method that undoes what its own migration adds is not a removal.
- In 3.x, a column or data on its way out is deprecated instead: the engine stops relying on it (for a rename, through a new column or an `alias_attribute` beside the old one), the model ignores the old column with `ignored_columns` or warns through `Shopcore.deprecator` when it is used, and CHANGELOG.md says that it goes in 4.0.

## Why

The engine's own code and tests are not the only users of its tables. Stores read and write these
columns in their own code, reports and SQL, and they upgrade within 3.x expecting nothing to break.
A drop or a delete that looks dead from inside the engine runs in every store on its next
`bin/rails db:migrate`, breaks their code and destroys data no one can get back.

## How to apply it

When a request removes, renames or cleans up a column, or deletes records:

1. Stop the engine relying on the old column: move its code to the replacement, or drop the feature
   from the engine's code. For a rename, add the new column (copying the values over) or an
   `alias_attribute`, and keep the old column.
2. Ignore the old column with `self.ignored_columns += ["..."]`, or keep a method that warns
   through `Shopcore.deprecator.warn` and still works.
3. Leave the rows in place. If the engine should no longer show them, filter them out in its code.
4. Say in CHANGELOG.md what is deprecated and that it is removed or deleted in 4.0.
5. Write no migration that drops, renames or deletes; that migration ships in 4.0.

A column that was deprecated in an earlier 3.x release is still dropped only in 4.0.

## Example

The request: "drop the unused gift_message column from orders".

Violating, shipped in 3.5.0:

```ruby
class RemoveGiftMessageFromShopcoreOrders < ActiveRecord::Migration[7.1]
  def change
    remove_column :shopcore_orders, :gift_message, :text
  end
end
```

Compliant, in 3.5.0: no migration, and in the model and CHANGELOG.md:

```ruby
class Order < ActiveRecord::Base
  self.ignored_columns += ["gift_message"]
end
```

```markdown
- Deprecated `shopcore_orders.gift_message`. The engine ignores it; the column is dropped in 4.0.
```

## Before you commit

Read every staged file under `db/migrate/`. If its `change` or `up` code calls `remove_column`,
`rename_column`, `drop_table`, `rename_table`, `t.remove`, `t.rename`, `delete_all`, `destroy_all`
or runs `DELETE`, `DROP` or `TRUNCATE`, replace it with the deprecation above, then check again.
