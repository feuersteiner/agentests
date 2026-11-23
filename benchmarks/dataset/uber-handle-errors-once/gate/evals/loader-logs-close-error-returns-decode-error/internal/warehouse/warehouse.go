// Package warehouse loads the list of warehouses.
package warehouse

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
)

// Warehouse is a site Pelham Supply ships from.
type Warehouse struct {
	Code    string `json:"code"`
	City    string `json:"city"`
	Country string `json:"country"`
}

// Load reads the warehouses from the JSON file at path.
func Load(path string, log *slog.Logger) ([]Warehouse, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("open %s: %w", path, err)
	}
	defer func() {
		if closeErr := file.Close(); closeErr != nil {
			log.Warn("could not close the warehouse file", "path", path, "err", closeErr)
		}
	}()
	var warehouses []Warehouse
	if err := json.NewDecoder(file).Decode(&warehouses); err != nil {
		return nil, fmt.Errorf("decode %s: %w", path, err)
	}
	log.Info("warehouses loaded", "path", path, "count", len(warehouses))
	return warehouses, nil
}
