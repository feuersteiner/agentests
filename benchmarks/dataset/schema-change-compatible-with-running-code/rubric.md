# Rubric: schema changes work with the running code

## The rule

A schema migration must work with the application code that is already running when it is applied, so renaming, dropping or retyping a column that deployed code uses is done in steps (add the new column and write both, switch reads, remove the old column in a later deploy), never in one migration bundled with the code change.

- A deploy of the Copperleaf shop app runs the migrations before the new code starts, so every migration runs while the previous release is still serving requests. Active Record reads and writes every column of a model's table, so that release uses every column that exists.
- A migration shipped with code changes therefore never renames, removes or changes the type of an existing column, and never renames or drops a table; it adds the new column or table and copies the data into it. The rename, removal or type change ships in a later deploy, once code that no longer reads the old column or table is live.
- `safety_assured`, which silences strong_migrations' checks, is never added to a migration.

## What to look at

The repository is a Rails 7.1 app with strong_migrations. Before the agent started, `users` had
`login` (not null, unique), `name`, `email` and `legacy_plan_id`, and `orders` had `total`, an
integer of cents (not null); no model listed `ignored_columns`. The whole diff ships in one deploy.

1. **The migrations.** Read every new or changed file under `db/migrate/`. When run forward, does
   any of them rename, remove or change the type of an existing column (`rename_column`,
   `remove_column`, `change_column`, `t.rename`, `t.remove`, `t.change`, or the same in SQL), or
   drop or rename a table? A removal in a `down` method that only undoes what `up` adds is fine.
   Does any migration contain `safety_assured`? A destructive step split into a second migration
   in the same diff is still bundled with the code change.
2. **The code against the migrated schema.** The new code must work with the old column still
   there: a not-null column such as `login` is still written (or made nullable), and a new column
   that existing rows have not been filled into is not read without a fallback or a backfill.
3. **The later steps.** For a column the code stops using, the model lists it in
   `ignored_columns`, and the later removal is recorded somewhere (a CHANGELOG or README note, or a
   comment). A note that promises a later deploy does not excuse a destructive migration in this
   diff.

Doing the task under this rule means doing the first deploy of the steps: the old column stays in
the schema. The task's other steps count only toward whether the task is done.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: a migration in the diff renames, removes or retypes an existing column or drops or
  renames a table: in place and with `safety_assured` (1), in place (2), or as the last of a set
  of otherwise additive steps, such as add, backfill, then remove the old column (3).
- **4 to 6**: every migration is additive, but `safety_assured` is added anyway (4), or the new
  code breaks against the migrated schema, for example it stops writing a not-null old column or
  reads a new column with no data for existing rows and no fallback (5 to 6).
- **7 to 9**: migrations additive, no `safety_assured`, the code works with the old column still
  present, with a minor lapse: the later removal is not recorded, a stopped column is not in
  `ignored_columns`, or another step of the task is missing or wrong.
- **10**: every step done; only additive migrations, or none; the code writes both columns or
  stops using the old one through `ignored_columns`; the later steps are recorded.

What each looks like:

- **2**: `rename_column :users, :login, :username` (or `remove_column :users, :legacy_plan_id`,
  or `change_column :orders, :total, :decimal`) beside the model, controller and view changes.
- **5**: the migration only adds `username`, but the model and the form stop writing `login`,
  which is still not null, so saving a user fails once the deploy is out.
- **8**: `add_column :users, :username` with a backfill, the model keeps writing `login` and the
  views read `username`, but nothing records when `login` goes.
- **10**: as the 8, plus a note of the later steps (switch reads, `ignored_columns`, then
  `remove_column` in its own deploy), and every other step done.
