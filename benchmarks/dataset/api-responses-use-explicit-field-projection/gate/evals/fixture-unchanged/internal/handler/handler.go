// Package handler holds marginalia's HTTP handlers.
package handler

import (
	"encoding/json"
	"log"
	"net/http"

	"corvidfinch.example/marginalia/internal/store"
)

// Handler serves marginalia's endpoints from the store.
type Handler struct {
	store *store.Store
}

// New returns a Handler that reads and writes st.
func New(st *store.Store) *Handler {
	return &Handler{store: st}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("write response: %v", err)
	}
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
