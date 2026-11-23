---
name: schema-change-compatible-with-running-code
description: Use whenever you write or edit a Rails migration under db/migrate/, or make a change that renames, removes, splits or changes the type of a database column or table that models, controllers or views use, even when the request just says "rename", "remove" or "change" a field. Covers keeping each migration safe for the release that is still running while it is applied, and spreading renames, drops and type changes over several deploys.
---

# Schema changes work with the running code

## The rule

A schema migration must work with the application code that is already running when it is applied, so renaming, dropping or retyping a column that deployed code uses is done in steps (add the new column and write both, switch reads, remove the old column in a later deploy), never in one migration bundled with the code change.

- A deploy of the Copperleaf shop app runs the migrations before the new code starts, so every migration runs while the previous release is still serving requests. Active Record reads and writes every column of a model's table, so that release uses every column that exists.
- A migration shipped with code changes therefore never renames, removes or changes the type of an existing column, and never renames or drops a table; it adds the new column or table and copies the data into it. The rename, removal or type change ships in a later deploy, once code that no longer reads the old column or table is live.
- `safety_assured`, which silences strong_migrations' checks, is never added to a migration.

## Why

Between `db:migrate` and the restart, the old release is still answering requests. If the
migration renamed or dropped a column, that release queries a column that no longer exists and
errors until the new code is out. The test suite never shows this: it only runs the new code
against the new schema. A real outage came from exactly this: a column rename bundled with the
code that used the new name, with `safety_assured` added to quiet the migration check.

## How to apply it

A rename, drop, split or type change becomes the first of several deploys. In this change:

1. Add the new column (and its index) in a migration. Copy existing data into it, for example
   with `update_all` in a separate migration.
2. Make the code write both the old and the new column, and keep every not-null old column
   filled. Read the new column only where it is filled, or fall back to the old one.
3. For a column the code simply stops using, remove its uses and add it to the model's
   `self.ignored_columns`; that needs no migration at all.
4. Write down the later steps (switch reads, add the old column to `ignored_columns`, then a
   migration that removes it in its own deploy) in the CHANGELOG or a comment.

Not a way around it:

- `safety_assured { remove_column ... }` or `safety_assured { rename_column ... }`;
- adding the new column, copying the data and removing the old one in the same migration;
- putting the removal in a second migration of the same change;
- `change_column` to convert a column in place.

## Example

The request: "rename products.sku to products.code".

Violating: the running release still selects `sku` and fails.

```ruby
class RenameSkuToCode < ActiveRecord::Migration[7.1]
  def change
    rename_column :products, :sku, :code
  end
end
```

Compliant: additive now, the model writes both, the old column goes later.

```ruby
class AddCodeToProducts < ActiveRecord::Migration[7.1]
  def change
    add_column :products, :code, :string
  end
end

class Product < ApplicationRecord
  before_save { self.code = sku if will_save_change_to_sku? }
  # Later: read code, then ignored_columns += ["sku"], then remove_column in its own deploy.
end
```

## Before you commit

Read every staged file under `db/migrate/`. If one renames, removes or changes the type of an
existing column, drops or renames a table, or contains `safety_assured`, turn it into the
additive first step above and check again.
