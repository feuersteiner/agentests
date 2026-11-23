// Command server runs the profile service.
package main

import (
	"log"
	"net/http"
	"os"

	"larkspur.example/profiled/internal/api"
	"larkspur.example/profiled/internal/config"
	"larkspur.example/profiled/internal/storage"
)

func main() {
	cfg := config.Load()

	if err := os.MkdirAll(cfg.DataDir, 0o755); err != nil {
		log.Fatalf("create data directory %q: %v", cfg.DataDir, err)
	}
	store := &storage.FileStore{Dir: cfg.DataDir}

	handler := api.NewHandler(store)

	log.Printf("profiled listening on %s, data in %s", cfg.Addr, cfg.DataDir)
	log.Fatal(http.ListenAndServe(cfg.Addr, handler.Routes()))
}
