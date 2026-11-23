package handler

import (
	"errors"
	"log"
	"net/http"
	"strconv"

	"corvidfinch.example/marginalia/internal/store"
)

// GetUser returns the user named in the path, for the author page, with the private fields
// cleared.
func (h *Handler) GetUser(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "the user id must be a number")
		return
	}
	user, err := h.store.GetUser(r.Context(), id)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "no such user")
		return
	}
	if err != nil {
		log.Printf("get user %d: %v", id, err)
		writeError(w, http.StatusInternalServerError, "could not load the profile")
		return
	}
	user.Email = ""
	user.PasswordHash = ""
	user.Role = ""
	writeJSON(w, http.StatusOK, user)
}
