# Employee import: failure cases

Engineering notes for the CSV import on the Employees page (`POST /imports`). The importer stops
at the first failing check and imports nothing; the page then shows one message, looked up in
`locales/en.json` under `import.errors.<code>`. Ledger Line has no partial imports.

The message can use the placeholders listed with each code.

## `not_csv`

The user picked the wrong kind of file, nearly always the .xlsx they never exported to CSV, now and
then a PDF. We only parse .csv. In Excel and Google Sheets the export is under File > Save as or
File > Download.

Placeholders: `{{fileName}}`.

## `missing_columns`

The user deleted or renamed one of the required columns in the header row. Required: `name`,
`email`, `ni_number`, `annual_salary`. Column order does not matter, extra columns are ignored.
Support sees this most when people forget the header row altogether.

Placeholders: `{{columns}}`, the missing column names, comma separated.

## `missing_email`

The user left the email cell empty in one or more rows. We need an email per employee to send
payslips. The page offers a download of the failing rows.

Placeholders: `{{rowCount}}`, the number of rows without an email.

## `too_many_rows`

The user tried to import more rows than `import.maxRows` allows in one file (see
`app.config.json`). Splitting the file into several works. The header row does not count.

Placeholders: `{{rowCount}}`, the rows in the file, and `{{maxRows}}`.

Ledger Line support can raise the limit for one account on request.
