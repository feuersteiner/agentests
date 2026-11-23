// Command server runs the profile service.
package main

import (
	"log"
	"net/http"

	"larkspur.example/profiled/internal/api"
	"larkspur.example/profiled/internal/config"
	"larkspur.example/profiled/internal/storage"
)

func main() {
	cfg := config.Load()

	store, err := storage.NewFileStore(cfg.DataDir)
	if err != nil {
		log.Fatal(err)
	}

	handler := api.NewHandler(store)

	log.Printf("profiled listening on %s, data in %s", cfg.Addr, cfg.DataDir)
	log.Fatal(http.ListenAndServe(cfg.Addr, handler.Routes()))
}
