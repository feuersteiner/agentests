// Command stockroom serves Pelham Supply's inventory and orders over HTTP.
package main

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"

	"pelham.example/stockroom/internal/httpapi"
	"pelham.example/stockroom/internal/service"
	"pelham.example/stockroom/internal/store"
)

func main() {
	log := slog.New(slog.NewTextHandler(os.Stderr, nil))
	if err := run(log); err != nil {
		log.Error("stockroom stopped", "err", err)
		os.Exit(1)
	}
}

func run(log *slog.Logger) error {
	addr := os.Getenv("STOCKROOM_ADDR")
	if addr == "" {
		addr = ":8080"
	}
	warehouses, err := loadWarehouses("warehouses.json")
	if err != nil {
		return fmt.Errorf("load the warehouses: %w", err)
	}
	log.Info("warehouses loaded", "count", len(warehouses))
	api := httpapi.New(service.New(store.New(), warehouses, log), log)
	log.Info("listening", "addr", addr)
	if err := http.ListenAndServe(addr, api.Routes()); err != nil {
		return fmt.Errorf("serve on %s: %w", addr, err)
	}
	return nil
}

func loadWarehouses(path string) ([]service.Warehouse, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read %s: %w", path, err)
	}
	var warehouses []service.Warehouse
	if err := json.Unmarshal(data, &warehouses); err != nil {
		return nil, fmt.Errorf("parse %s: %w", path, err)
	}
	return warehouses, nil
}
