# Errors

When the import fails we call `slog.Error("import failed", "err", err)` and `return err`.
