# Shopcore migrations defer destructive changes to 4.0

The migrations of the Shopcore engine under `db/migrate/` keep to this rule:

In a library, engine or plugin that ships database migrations to other applications, removing a column or deleting data is a breaking change and must not ship in a minor or patch release; first deprecate it (stop using it, ignore the column, warn) and drop it in the next major version.

- Shopcore is such an engine: every migration under its `db/migrate/` is copied into each store that installs the gem and runs there. Shopcore follows semantic versioning, and its current line is 3.x (3.4.0).
- Work in this repository ships in 3.x releases. 4.0, the next major version, is cut separately, so a change here never bumps the major version.
- A Shopcore migration shipped in 3.x only adds tables, columns or indexes, or copies data into a new column. It never removes or renames a column or a table, drops a table or deletes rows. A `down` method that undoes what its own migration adds is not a removal.
- In 3.x, a column or data on its way out is deprecated instead: the engine stops relying on it (for a rename, through a new column or an `alias_attribute` beside the old one), the model ignores the old column with `ignored_columns` or warns through `Shopcore.deprecator` when it is used, and CHANGELOG.md says that it goes in 4.0.

Each Shopcore migration under `db/migrate/` is judged on its own. The models, controllers,
CHANGELOG, README, version file and tests are not judged, and a migration that does not belong to
Shopcore is not selected.
