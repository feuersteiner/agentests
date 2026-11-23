// Package api holds the HTTP handlers of the profile service.
package api

import (
	"encoding/json"
	"log"
	"net/http"

	"larkspur.example/profiled/internal/storage"
)

// Handler serves the profile endpoints.
type Handler struct {
	store *storage.FileStore
}

// NewHandler returns a Handler that reads and writes profiles in store.
func NewHandler(store *storage.FileStore) *Handler {
	return &Handler{store: store}
}

// Routes returns the service's routes.
func (h *Handler) Routes() *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /profiles/{id}", h.GetProfile)
	mux.HandleFunc("POST /signup", h.Signup)
	return mux
}

// GetProfile writes the profile named in the path as JSON.
func (h *Handler) GetProfile(w http.ResponseWriter, r *http.Request) {
	profile, err := h.store.Get(r.Context(), r.PathValue("id"))
	if err != nil {
		log.Printf("get profile %q: %v", r.PathValue("id"), err)
		http.Error(w, "could not load the profile", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, profile)
}

type signupRequest struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

// Signup creates the profile sent in the request body.
func (h *Handler) Signup(w http.ResponseWriter, r *http.Request) {
	var request signupRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "the body is not valid JSON", http.StatusBadRequest)
		return
	}
	if request.ID == "" || request.Name == "" || !validEmail(request.Email) {
		http.Error(w, "id, name and a valid email are required", http.StatusBadRequest)
		return
	}
	profile := storage.Profile{ID: request.ID, Name: request.Name, Email: request.Email}
	if err := h.store.Put(r.Context(), profile); err != nil {
		log.Printf("signup %q: %v", request.ID, err)
		http.Error(w, "could not save the profile", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusCreated, profile)
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(value); err != nil {
		log.Printf("write response: %v", err)
	}
}
