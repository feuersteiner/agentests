# Strategies

A strategy decides how the rows that changed in the raw table reach the reporting table. Every
strategy starts the same way: it reads the newest `updated_at` in the reporting table, and treats
the raw rows after it as new.

## append

**Use it for** tables that only ever grow, such as events.

**What it does:** inserts every new raw row into the reporting table.

**Watch out for:** a raw row that changes an earlier one is inserted beside it, so the reporting
table ends up with both.

## delete+insert

**Use it for** tables whose rows change, such as orders. It is the default.

**What it does:** deletes the reporting rows whose key appears among the new raw rows, then inserts
the new raw rows.

**Watch out for:** it needs the model's key to tell which reporting rows a raw row replaces.
