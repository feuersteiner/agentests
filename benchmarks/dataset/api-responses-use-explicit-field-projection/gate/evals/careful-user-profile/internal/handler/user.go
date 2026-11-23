package handler

import (
	"errors"
	"log"
	"net/http"
	"strconv"

	"corvidfinch.example/marginalia/internal/store"
)

type authorProfile struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	Bio       string `json:"bio"`
	AvatarURL string `json:"avatar_url"`
}

// GetUser returns the public profile of the user named in the path, for the author page.
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
	writeJSON(w, http.StatusOK, authorProfile{
		ID:        user.ID,
		Name:      user.Name,
		Bio:       user.Bio,
		AvatarURL: user.AvatarURL,
	})
}
