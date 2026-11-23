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

// logged reports err with a message and hands it back, wrapped.
func logged(message string, err error) error {
	slog.Error(message, "err", err)
	return fmt.Errorf("%s: %w", message, err)
}

// Load reads the warehouses from the JSON file at path.
func Load(path string) ([]Warehouse, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, logged("read "+path, err)
	}
	var warehouses []Warehouse
	if err := json.Unmarshal(data, &warehouses); err != nil {
		return nil, logged("parse "+path, err)
	}
	return warehouses, nil
}
