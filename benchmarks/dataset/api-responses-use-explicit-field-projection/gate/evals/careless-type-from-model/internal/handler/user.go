package handler

import (
	"errors"
	"log"
	"net/http"
	"strconv"

	"corvidfinch.example/marginalia/internal/model"
	"corvidfinch.example/marginalia/internal/store"
)

// publicUser is the user as the author page shows it.
type publicUser model.User

// GetUser returns the user named in the path.
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
	writeJSON(w, http.StatusOK, publicUser(user))
}
