// Package importer loads products from files into the store.
package importer

import (
	"context"
	"encoding/csv"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"os"
	"strconv"

	"pelham.example/stockroom/internal/store"
)

// ImportCSV reads products from the CSV file at path into st and returns how many it imported.
// A row whose price is not a non-negative whole number of cents is skipped.
func ImportCSV(ctx context.Context, st *store.Store, log *slog.Logger, path string) (int, error) {
	file, err := os.Open(path)
	if err != nil {
		return 0, fmt.Errorf("open %s: %w", path, err)
	}
	defer file.Close()

	reader := csv.NewReader(file)
	if _, err := reader.Read(); err != nil {
		return 0, fmt.Errorf("read the header of %s: %w", path, err)
	}
	imported := 0
	for line := 2; ; line++ {
		row, err := reader.Read()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return imported, fmt.Errorf("read line %d of %s: %w", line, path, err)
		}
		price, err := strconv.ParseInt(row[2], 10, 64)
		if err != nil {
			log.Warn("skipping row with an invalid price", "line", line, "sku", row[0], "err", err)
			continue
		}
		if price < 0 {
			log.Warn("skipping row with a negative price", "line", line, "sku", row[0], "price", price)
			continue
		}
		stock, err := strconv.Atoi(row[3])
		if err != nil {
			return imported, fmt.Errorf("line %d of %s: stock %q: %w", line, path, row[3], err)
		}
		product := store.Product{SKU: row[0], Name: row[1], PriceCents: price, Stock: stock}
		if err := st.PutProduct(ctx, product); err != nil {
			return imported, fmt.Errorf("line %d of %s: %w", line, path, err)
		}
		imported++
	}
	return imported, nil
}
