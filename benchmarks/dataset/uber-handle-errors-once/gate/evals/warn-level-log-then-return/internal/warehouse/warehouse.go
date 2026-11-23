// Package warehouse loads the list of warehouses.
package warehouse

import (
	"encoding/json"
	"log"
	"os"
)

// Warehouse is a site Pelham Supply ships from.
type Warehouse struct {
	Code    string `json:"code"`
	City    string `json:"city"`
	Country string `json:"country"`
}

// Load reads the warehouses from the JSON file at path.
func Load(path string) ([]Warehouse, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		log.Printf("warning: could not read %s: %v", path, err)
		return nil, err
	}
	var warehouses []Warehouse
	if err := json.Unmarshal(data, &warehouses); err != nil {
		log.Printf("warning: %s is not a valid warehouse list: %v", path, err)
		return nil, err
	}
	log.Printf("loaded %d warehouses from %s", len(warehouses), path)
	return warehouses, nil
}
