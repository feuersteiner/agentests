// Command stockroom serves Pelham Supply's inventory and orders over HTTP.
package main

import (
	"context"
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
	st := store.New()
	if err := seed(context.Background(), st); err != nil {
		return fmt.Errorf("seed the catalogue: %w", err)
	}
	api := httpapi.New(service.New(st, log), log)
	log.Info("listening", "addr", addr)
	if err := http.ListenAndServe(addr, api.Routes()); err != nil {
		return fmt.Errorf("serve on %s: %w", addr, err)
	}
	return nil
}

// seed fills the catalogue with the products every environment starts with.
func seed(ctx context.Context, st *store.Store) error {
	products := []store.Product{
		{SKU: "HX-204", Name: "Hex key set", PriceCents: 1299, Stock: 40},
		{SKU: "CL-118", Name: "Bar clamp 300 mm", PriceCents: 2450, Stock: 12},
		{SKU: "SD-560", Name: "Screwdriver set", PriceCents: 1890, Stock: 25},
	}
	for _, p := range products {
		if err := st.PutProduct(ctx, p); err != nil {
			return fmt.Errorf("put product %q: %w", p.SKU, err)
		}
	}
	return nil
}
