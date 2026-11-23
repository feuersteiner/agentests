# Changelog

## Unreleased

- Fixed a crash on files that start with a UTF-8 BOM; the reader used to read the first header as `\ufeffid`.

## 0.3.0

- `clean` takes `--date-column` and writes its dates as `YYYY-MM-DD`.
- Keys are compared without regard to case when rows are deduplicated.

## 0.2.0

- Short rows are padded to the width of the header.

## 0.1.0

- First version: `clean` reads a CSV file, drops repeated rows and writes the result.
