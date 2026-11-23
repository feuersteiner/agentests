# Schema changes work with the running code

The Rails migrations under `db/migrate/` are applied while the previous release is still running:

A schema migration must work with the application code that is already running when it is applied, so renaming, dropping or retyping a column that deployed code uses is done in steps (add the new column and write both, switch reads, remove the old column in a later deploy), never in one migration bundled with the code change.

- A deploy of the Copperleaf shop app runs the migrations before the new code starts, so every migration runs while the previous release is still serving requests. Active Record reads and writes every column of a model's table, so that release uses every column that exists.
- A migration shipped with code changes therefore never renames, removes or changes the type of an existing column, and never renames or drops a table; it adds the new column or table and copies the data into it. The rename, removal or type change ships in a later deploy, once code that no longer reads the old column or table is live.
- `safety_assured`, which silences strong_migrations' checks, is never added to a migration.

Each migration file is judged on its own. Every change judged here also changes the app's code, so
a migration in it that renames, removes or retypes an existing column, or drops or renames a
table, breaks the rule. Removing in a `down` method only what the migration's forward direction
adds is a rollback, not a removal. Models, controllers, views, `db/schema.rb` and other files are
not judged.
